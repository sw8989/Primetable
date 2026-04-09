import { useCallback, useEffect, useRef, useState } from 'react';
import { confirmBooking, executeToolCall, fetchTools, sendChatMessage } from '@/lib/api';
import type { BookingProposal, MCPXMessage, MCPXTool } from '@/lib/types';

const MAX_TOOL_ROUNDS = 10;

let _msgCounter = 0;
function newId(): string {
  return `msg-${++_msgCounter}`;
}

const SYSTEM_PROMPT = (name: string, postcode: string, partySize: number) =>
  `You are the Prime Table AI booking assistant for London's most exclusive restaurants. ` +
  `The user's name is ${name}, they are based near ${postcode}, and their usual party size is ${partySize}. ` +
  `Help them find and book restaurants. Always be helpful, concise, and focused on booking assistance. ` +
  `Use the available tools to search restaurants, check availability, and make bookings.`;

const WELCOME = (name: string): MCPXMessage => ({
  id: newId(),
  role: 'assistant',
  content: `Good evening, ${name}. Where would you like to dine?`,
});

/** Try to parse JSON safely — returns undefined on failure */
function tryParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

/** Extract a BookingProposal from a book_restaurant tool result if possible */
function extractProposal(
  args: Record<string, unknown>,
  result: unknown,
): BookingProposal | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  const name =
    typeof r.restaurantName === 'string' ? r.restaurantName :
    typeof r.restaurant === 'string' ? r.restaurant :
    typeof args.restaurant_name === 'string' ? args.restaurant_name : '';
  if (!name) return undefined;
  return {
    restaurantName: name,
    address: typeof r.address === 'string' ? r.address : '',
    neighbourhood: typeof r.neighbourhood === 'string' ? r.neighbourhood : '',
    date: typeof r.date === 'string' ? r.date : (typeof args.date === 'string' ? args.date : ''),
    time: typeof r.time === 'string' ? r.time : (typeof args.time === 'string' ? args.time : ''),
    partySize: typeof r.partySize === 'number' ? r.partySize : Number(args.party_size ?? 2),
    restaurantId: typeof r.restaurantId === 'number' ? r.restaurantId : undefined,
    bookingId: typeof r.id === 'number' ? r.id : (typeof r.bookingId === 'number' ? r.bookingId : undefined),
  };
}

export function useChat(name: string, postcode: string, partySize: number) {
  const [messages, setMessages] = useState<MCPXMessage[]>([WELCOME(name)]);
  const [isProcessing, setIsProcessing] = useState(false);
  const toolsRef = useRef<MCPXTool[]>([]);
  const isProcessingRef = useRef(false);
  // Keep a ref in sync with state for reading inside send() without stale closure
  const messagesRef = useRef<MCPXMessage[]>([WELCOME(name)]);

  useEffect(() => {
    fetchTools()
      .then(tools => { toolsRef.current = tools; })
      .catch(() => { toolsRef.current = []; });
  }, []);

  const send = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);

      const userMsg: MCPXMessage = { id: newId(), role: 'user', content: userText };
      setMessages(prev => {
        const next = [...prev, userMsg];
        messagesRef.current = next;
        return next;
      });

      try {
        const systemMsg: MCPXMessage = {
          role: 'system',
          content: SYSTEM_PROMPT(name, postcode, partySize),
        };

        // Use a local variable for history so the tool-call loop never reads stale state
        let currentHistory: MCPXMessage[] = [systemMsg, ...messagesRef.current];

        let assistantResponse = await sendChatMessage(currentHistory, toolsRef.current);
        assistantResponse = { ...assistantResponse, id: newId() };
        currentHistory = [...currentHistory, assistantResponse];
        setMessages(prev => {
          const next = [...prev, assistantResponse];
          messagesRef.current = next;
          return next;
        });

        // Tool-call loop: execute tools, append results, call AI again
        let rounds = 0;
        while (
          assistantResponse.tool_calls &&
          assistantResponse.tool_calls.length > 0 &&
          rounds < MAX_TOOL_ROUNDS
        ) {
          rounds++;
          const toolMessages: MCPXMessage[] = [];
          let pendingProposal: BookingProposal | undefined;

          for (const toolCall of assistantResponse.tool_calls) {
            const parsed = tryParseJson(toolCall.function.arguments);
            const args = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
            let result: unknown;
            try {
              result = await executeToolCall(toolCall.function.name, args);
            } catch {
              result = { error: 'Tool call failed' };
            }

            toolMessages.push({
              id: newId(),
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
              function_name: toolCall.function.name,
            });

            // Extract booking proposal from book_restaurant result
            if (toolCall.function.name === 'book_restaurant') {
              pendingProposal = extractProposal(args, result);
            }
          }

          currentHistory = [...currentHistory, ...toolMessages];
          setMessages(prev => {
            const next = [...prev, ...toolMessages];
            messagesRef.current = next;
            return next;
          });

          assistantResponse = await sendChatMessage(currentHistory, toolsRef.current);
          assistantResponse = {
            ...assistantResponse,
            id: newId(),
            ...(pendingProposal ? { bookingProposal: pendingProposal } : {}),
          };
          currentHistory = [...currentHistory, assistantResponse];
          setMessages(prev => {
            const next = [...prev, assistantResponse];
            messagesRef.current = next;
            return next;
          });
        }
      } catch {
        const errorMsg: MCPXMessage = {
          id: newId(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        };
        setMessages(prev => {
          const next = [...prev, errorMsg];
          messagesRef.current = next;
          return next;
        });
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [name, postcode, partySize] // `messages` removed — history tracked via messagesRef
  );

  const reset = useCallback(() => {
    const welcome = WELCOME(name);
    messagesRef.current = [welcome];
    setMessages([welcome]);
  }, [name]);

  const confirm = useCallback(async (bookingId: number) => {
    await confirmBooking(bookingId);
    // Remove the bookingProposal from the message once confirmed
    setMessages(prev => prev.map(m =>
      m.bookingProposal?.bookingId === bookingId
        ? { ...m, bookingProposal: undefined }
        : m
    ));
  }, []);

  return { messages, isProcessing, send, reset, confirm };
}
