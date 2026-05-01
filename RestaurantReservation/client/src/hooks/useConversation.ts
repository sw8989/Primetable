import { useState, useEffect, useCallback, useRef } from 'react';
import type { MCPXMessage } from '@/lib/mcp/MCPXClient';
import {
  loadConversationId,
  saveConversationId,
  clearConversationId,
  fetchConversationMessages,
} from '@/lib/conversationStorage';

interface ConversationState {
  conversationId: number | null;
  previousConversationId: number | null;
  preloadedMessages: MCPXMessage[];
  isLoading: boolean;
}

export interface UseConversationResult {
  conversationId: number | null;
  hasPreviousThread: boolean;
  preloadedMessages: MCPXMessage[];
  isLoading: boolean;
  startNewThread: () => void;
  resumePreviousThread: () => void;
  onConversationCreated: (id: number) => void;
}

export function useConversation(restaurantId?: number): UseConversationResult {
  const [state, setState] = useState<ConversationState>(() => {
    const stored = loadConversationId(restaurantId);
    return {
      conversationId: stored,
      previousConversationId: null,
      preloadedMessages: [],
      isLoading: stored != null,
    };
  });

  // Fix 1: Add unmount guard
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Fix 2: Use ref for previousConversationId to avoid unnecessary function recreation
  const previousConversationIdRef = useRef<number | null>(state.previousConversationId);
  useEffect(() => {
    previousConversationIdRef.current = state.previousConversationId;
  }, [state.previousConversationId]);

  useEffect(() => {
    const stored = loadConversationId(restaurantId);
    if (stored === null) {
      setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, isLoading: true }));

    fetchConversationMessages(stored)
      .then(msgs => {
        if (cancelled || !isMountedRef.current) return;
        if (msgs === null) {
          clearConversationId(restaurantId);
          setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
        } else {
          setState(prev => ({ ...prev, conversationId: stored, preloadedMessages: msgs, isLoading: false }));
        }
      })
      .catch(() => {
        if (cancelled || !isMountedRef.current) return;
        clearConversationId(restaurantId);
        setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      });

    return () => { cancelled = true; };
  }, [restaurantId]);

  const startNewThread = useCallback(() => {
    setState(prev => ({
      conversationId: null,
      previousConversationId: prev.conversationId,
      preloadedMessages: [],
      isLoading: false,
    }));
    clearConversationId(restaurantId);
  }, [restaurantId]);

  const resumePreviousThread = useCallback(() => {
    const prevId = previousConversationIdRef.current;
    if (prevId == null) return;

    setState(prev => ({ ...prev, isLoading: true, previousConversationId: null }));

    fetchConversationMessages(prevId)
      .then(msgs => {
        if (!isMountedRef.current) return;
        saveConversationId(prevId, restaurantId);
        setState({
          conversationId: prevId,
          previousConversationId: null,
          preloadedMessages: msgs ?? [],
          isLoading: false,
        });
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        clearConversationId(restaurantId);
        setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      });
  }, [restaurantId]);

  const onConversationCreated = useCallback((id: number) => {
    saveConversationId(id, restaurantId);
    setState(prev => ({ ...prev, conversationId: id }));
  }, [restaurantId]);

  return {
    conversationId: state.conversationId,
    hasPreviousThread: state.previousConversationId != null,
    preloadedMessages: state.preloadedMessages,
    isLoading: state.isLoading,
    startNewThread,
    resumePreviousThread,
    onConversationCreated,
  };
}
