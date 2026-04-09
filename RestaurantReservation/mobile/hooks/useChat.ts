import { useCallback, useEffect, useRef, useState } from 'react';
import { executeToolCall, fetchTools, sendChatMessage } from '@/lib/api';
import type { MCPXMessage, MCPXTool, MCPXToolCall } from '@/lib/types';

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

  // Fetch available tools on mount
  useEffect(() => {
    fetchTools()
      .then(tools => { toolsRef.current = tools; })
      .catch(() => { toolsRef.current = []; });
  }, []);

  const send = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isProcessing) return;

      const userMsg: MCPXMessage = { role: 'user', content: userText };

      setMessages(prev => [...prev, userMsg]);
      setIsProcessing(true);

      try {
        const systemMsg: MCPXMessage = {
          role: 'system',
          content: SYSTEM_PROMPT(name, postcode, partySize),
        };

        // Build full history for the API (system + all messages + new user msg)
        const history = [systemMsg, ...messages, userMsg];

        let assistantResponse = await sendChatMessage(history, toolsRef.current);
        setMessages(prev => [...prev, assistantResponse]);

        // Handle tool calls (same loop as MCPXClient on web)
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

          setMessages(prev => [...prev, ...toolMessages]);

          const updatedHistory = [
            systemMsg,
            ...messages,
            userMsg,
            assistantResponse,
            ...toolMessages,
          ];
          assistantResponse = await sendChatMessage(updatedHistory, toolsRef.current);
          setMessages(prev => [...prev, assistantResponse]);
        }
      } catch {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, messages, name, postcode, partySize]
  );

  const reset = useCallback(() => {
    setMessages([WELCOME(name)]);
  }, [name]);

  return { messages, isProcessing, send, reset };
}
