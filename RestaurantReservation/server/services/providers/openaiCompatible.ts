import OpenAI from "openai";
import type { ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";
import { summarizeMcpMessagesForLog } from "./openai";

export function buildOpenAIMessages(messages: ChatMessage[], context: string): any[] {
  const openaiMessages: any[] = [{ role: "system", content: context }];
  for (const msg of messages) {
    if (msg.role === "user") {
      openaiMessages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant" && !msg.tool_calls) {
      openaiMessages.push({ role: "assistant", content: msg.content || "" });
    } else if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
      openaiMessages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: msg.tool_calls.map((tc: any, i: number) => ({
          id: tc.id || `call_${Date.now()}_${i}`,
          type: "function",
          function: { name: tc.function?.name || "unknown", arguments: tc.function?.arguments || "{}" },
        })),
      });
    } else if (msg.role === "tool") {
      openaiMessages.push({ role: "tool", tool_call_id: msg.tool_call_id, content: msg.content, name: msg.function_name });
    }
  }
  return openaiMessages;
}

export async function runOpenAICompatibleMcpChat(
  client: OpenAI,
  model: string,
  providerName: string,
  messages: ChatMessage[],
  context: string,
  userId?: number,
): Promise<McpResponse> {
  const openaiMessages = buildOpenAIMessages(messages, context);

  if (process.env.NODE_ENV === "development") {
    console.log(`${providerName} messages prepared for API call:`, summarizeMcpMessagesForLog(openaiMessages));
  }

  const tools = await getMcpToolDefinitions();
  const formattedTools = tools.map((tool) => ({
    type: "function",
    function: { name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters },
  })) as any;

  const response = await client.chat.completions.create({
    model,
    messages: openaiMessages,
    tools: formattedTools,
    tool_choice: "auto",
    max_tokens: 800,
    temperature: 0.7,
  });

  const responseMessage = response.choices[0].message;
  const mcpResponse: McpResponse = { role: "assistant", content: responseMessage.content || "" };

  if (responseMessage.tool_calls?.length > 0) {
    mcpResponse.tool_calls = responseMessage.tool_calls;
    const firstTool = responseMessage.tool_calls[0];
    if (firstTool?.function) {
      try {
        const args = JSON.parse(firstTool.function.arguments);
        if ((firstTool.function.name === "makeReservation" || firstTool.function.name === "book_restaurant") && !args.userId && userId) args.userId = userId;
        (mcpResponse as any).tool = firstTool.function.name;
        (mcpResponse as any).parameters = args;
      } catch {
        (mcpResponse as any).tool = firstTool.function.name;
        (mcpResponse as any).parameters = {};
      }
    }
  }

  return mcpResponse;
}
