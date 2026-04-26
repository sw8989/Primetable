import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    const stored = loadConversationId(restaurantId);
    if (!stored) {
      setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    fetchConversationMessages(stored)
      .then(msgs => {
        if (msgs === null) {
          clearConversationId(restaurantId);
          setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
        } else {
          setState(prev => ({ ...prev, conversationId: stored, preloadedMessages: msgs, isLoading: false }));
        }
      })
      .catch(() => {
        clearConversationId(restaurantId);
        setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      });
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
    setState(prev => {
      if (prev.previousConversationId == null) return prev;
      const prevId = prev.previousConversationId;
      saveConversationId(prevId, restaurantId);

      fetchConversationMessages(prevId)
        .then(msgs => {
          setState({
            conversationId: prevId,
            previousConversationId: null,
            preloadedMessages: msgs ?? [],
            isLoading: false,
          });
        })
        .catch(() => {
          clearConversationId(restaurantId);
          setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
        });

      return { ...prev, previousConversationId: null, isLoading: true };
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
