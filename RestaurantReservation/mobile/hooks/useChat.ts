import { useCallback, useEffect, useRef, useState } from 'react';
import { executeToolCall, fetchTools, sendChatMessage } from '@/lib/api';
import type { MCPXMessage, MCPXTool } from '@/lib/types';

const SYSTEM_PROMPT = (name: string, postcode: string, partySize: number) =>
  `You are the Prime Table AI booking assistant for London's most exclusive restaurants. ` +
  `The user's name is ${name}, they are based near ${postcode}, and their usual party size is ${partySize}. ` +
  `Help them find and book restaurants. Always be helpful, concise, and focused on booking assistance. ` +
  `Use the available tools to search restaurants, check availability, and make bookings.`;

const WELCOME = (name: string): MCPXMessage => ({
  role: 'assistant',
  content: `Good evening, ${name}. Where would you like to dine?`,
});

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

      const userMsg: MCPXMessage = { role: 'user', content: userText };
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
        currentHistory = [...currentHistory, assistantResponse];
        setMessages(prev => {
          const next = [...prev, assistantResponse];
          messagesRef.current = next;
          return next;
        });

        // Tool-call loop: execute tools, append results, call AI again
        while (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
          const toolMessages: MCPXMessage[] = [];

          for (const toolCall of assistantResponse.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            const result = await executeToolCall(toolCall.function.name, args);
            toolMessages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
              function_name: toolCall.function.name,
            });
          }

          currentHistory = [...currentHistory, ...toolMessages];
          setMessages(prev => {
            const next = [...prev, ...toolMessages];
            messagesRef.current = next;
            return next;
          });

          assistantResponse = await sendChatMessage(currentHistory, toolsRef.current);
          currentHistory = [...currentHistory, assistantResponse];
          setMessages(prev => {
            const next = [...prev, assistantResponse];
            messagesRef.current = next;
            return next;
          });
        }
      } catch {
        const errorMsg: MCPXMessage = { role: 'assistant', content: 'Something went wrong. Please try again.' };
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

  return { messages, isProcessing, send, reset };
}
