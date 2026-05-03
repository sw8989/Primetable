import OpenAI from "openai";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";
import { summarizeMcpMessagesForLog, summarizeTextForLog } from "./openai";

export class DeepSeekAdapter implements ProviderAdapter {
  readonly name = "deepseek";
  readonly model: string;
  private client: OpenAI | null = null;

  constructor() {
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn(
        "WARNING: DEEPSEEK_API_KEY not set. DeepSeek features will be disabled.",
      );
    } else {
      try {
        this.client = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: "https://api.deepseek.com/v1",
        });
      } catch (error) {
        console.error("Failed to initialize DeepSeek client:", error);
      }
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string> {
    if (!this.client) {
      return `For booking ${restaurantName} (${difficulty} difficulty), monitor the booking platform regularly, especially early morning and late at night when cancellations often occur.`;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert in securing reservations at exclusive restaurants. Provide detailed, actionable booking strategies.",
          },
          {
            role: "user",
            content: `Analyze the best strategy for booking a table at ${restaurantName}.
                   Booking information: ${bookingInfo || "No additional information available"}
                   Difficulty level: ${difficulty}

                   Provide a specific strategy with timing recommendations and approach.`,
          },
        ],
        max_tokens: 250,
      });

      return (
        response.choices[0].message.content ||
        "Could not generate a booking strategy at this time."
      );
    } catch (error) {
      console.error("Error analyzing booking strategy:", error);
      return "Could not generate a booking strategy due to a service error. Please try again later.";
    }
  }

  async suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[]; reasoning: string }> {
    if (!this.client) {
      const day = preferredDate.getDay();
      const isWeekend = day === 0 || day === 6;

      return {
        suggestions: [
          isWeekend
            ? "Try a weekday instead - Tuesdays or Wednesdays are typically less busy"
            : "Earlier in the week, like Monday or Tuesday",
          "Earlier dining time, like 5:30 PM or 6:00 PM",
          "Later dining time, after 9:00 PM",
        ],
        reasoning:
          "Based on standard restaurant patterns, these times typically have better availability.",
      };
    }

    try {
      const dateStr = preferredDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert in restaurant booking patterns and availability.",
          },
          {
            role: "user",
            content: `For a booking at ${restaurantName} on ${dateStr} at ${preferredTime} for ${partySize} people,
                   suggest 3 alternative times or dates that might have better availability.
                   Consider typical restaurant booking patterns, weekend vs weekday differences,
                   and optimal times for securing reservations at popular restaurants.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        suggestions: result.suggestions || [],
        reasoning: result.reasoning || "",
      };
    } catch (error) {
      console.error("Error suggesting alternative times:", error);
      return {
        suggestions: [],
        reasoning:
          "Could not generate alternative suggestions due to a service error.",
      };
    }
  }

  async generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string,
  ): Promise<string> {
    if (!this.client) {
      return `Dear ${userName}, your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people has been confirmed. We look forward to serving you! - The Prime Table Team`;
    }

    try {
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a professional restaurant booking assistant. Create a personalized, enthusiastic booking confirmation message.`,
          },
          {
            role: "user",
            content: `Create a personalized booking confirmation message for ${userName}'s reservation at ${restaurantName}.
                   Reservation details: ${dateStr} at ${time} for ${partySize} people.
                   Keep it concise, professional, but with personality. Include a greeting and sign-off.`,
          },
        ],
        max_tokens: 200,
      });

      return (
        response.choices[0].message.content ||
        "Your booking has been processed successfully."
      );
    } catch (error) {
      console.error("Error generating booking message:", error);
      return `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    }
  }

  async processChat(message: string, context?: string): Promise<string> {
    if (!this.client) {
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Please ask our team to enable the DeepSeek integration for full AI-powered assistance.";
    }

    try {
      const systemMessage =
        context ||
        "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants. " +
          "Provide detailed, personalized advice on booking strategies and restaurant recommendations.";

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      return (
        response.choices[0].message.content ||
        "I'm sorry, I couldn't process your request right now. Please try again."
      );
    } catch (error) {
      console.error("Error processing chat:", error);

      const deepSeekError = error as any;
      if (
        deepSeekError.status === 429 ||
        (deepSeekError.error && deepSeekError.error.code === "insufficient_quota")
      ) {
        return "I apologize, but our AI service has reached its usage limit for now. The system is working in simulation mode. In a production environment, you would receive AI-powered booking advice for London's exclusive restaurants. Please try the MCP Booking Agent tab for a demonstration of our booking capabilities.";
      }

      return "I apologize, but I encountered an error while processing your request. Please try again later.";
    }
  }

  async processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse> {
    if (!this.client) {
      return {
        role: "assistant",
        content:
          "I'm a restaurant booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?",
      };
    }

    try {
      const openaiMessages: any[] = [];

      openaiMessages.push({
        role: "system",
        content: context,
      });

      for (const msg of messages) {
        if (msg.role === "user") {
          openaiMessages.push({
            role: "user",
            content: msg.content,
          });
        } else if (msg.role === "assistant" && !msg.tool_calls) {
          openaiMessages.push({
            role: "assistant",
            content: msg.content || "",
          });
        } else if (
          msg.role === "assistant" &&
          msg.tool_calls &&
          msg.tool_calls.length > 0
        ) {
          const toolCallsMessage: any = {
            role: "assistant",
            content: msg.content || "",
            tool_calls: msg.tool_calls.map((toolCall: any, index: number) => {
              return {
                id: toolCall.id || `call_${Date.now()}_${index}`,
                type: "function",
                function: {
                  name: toolCall.function?.name || "unknown",
                  arguments: toolCall.function?.arguments || "{}",
                },
              };
            }),
          };
          openaiMessages.push(toolCallsMessage);
        } else if (msg.role === "tool") {
          const toolMessage: any = {
            role: "tool",
            tool_call_id: msg.tool_call_id,
            content: msg.content,
            name: msg.function_name,
          };

          console.log("Adding formatted tool message:", {
            tool_call_id: toolMessage.tool_call_id,
            name: toolMessage.name,
            content_preview:
              typeof toolMessage.content === "string"
                ? summarizeTextForLog(toolMessage.content, 80)
                : "non-string content",
          });

          openaiMessages.push(toolMessage);
        }
      }

      console.log(
        "DeepSeek messages prepared for API call:",
        summarizeMcpMessagesForLog(openaiMessages),
      );

      const tools = await getMcpToolDefinitions();

      const openaiTools = tools.map((tool) => {
        if (typeof tool.type === "string") {
          return {
            type: "function",
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters,
            },
          };
        }
        return tool;
      }) as any;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools: openaiTools as any,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      });

      const responseMessage = response.choices[0].message;

      console.log("DeepSeek response format:", {
        has_content: !!responseMessage.content,
        has_tool_calls: !!responseMessage.tool_calls,
        tool_calls_count: responseMessage.tool_calls?.length || 0,
        first_tool_call:
          responseMessage.tool_calls && responseMessage.tool_calls.length > 0
            ? {
                id: responseMessage.tool_calls[0].id,
                type: responseMessage.tool_calls[0].type,
                function_name: responseMessage.tool_calls[0].function?.name,
              }
            : null,
      });

      const mcpResponse: McpResponse = {
        role: "assistant",
        content: responseMessage.content || "",
      };

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        mcpResponse.tool_calls = responseMessage.tool_calls;

        const firstTool = responseMessage.tool_calls[0];
        if (firstTool && firstTool.function) {
          try {
            const args = JSON.parse(firstTool.function.arguments);
            const toolName = firstTool.function.name;

            if (
              toolName === "makeReservation" ||
              toolName === "findAvailability" ||
              toolName === "getRestaurantInfo"
            ) {
              if (toolName === "makeReservation" && !args.userId && userId) {
                args.userId = userId;
              }
            }

            (mcpResponse as any).tool = toolName;
            (mcpResponse as any).parameters = args;
          } catch (error) {
            console.error("Error parsing tool call arguments:", error);
            (mcpResponse as any).tool = firstTool.function.name;
            (mcpResponse as any).parameters = {};
          }
        }
      }

      return mcpResponse;
    } catch (error) {
      console.error("Error processing MCP chat:", error);

      const deepSeekError = error as any;
      if (
        deepSeekError.status === 429 ||
        (deepSeekError.error && deepSeekError.error.code === "insufficient_quota")
      ) {
        return {
          role: "assistant",
          content:
            "I apologize, but our AI service has reached its usage limit for now. I can still help you with basic restaurant information and booking guidance.",
        };
      }

      let errorDetail = "";
      if (deepSeekError.status) {
        errorDetail += `Status: ${deepSeekError.status}. `;
      }
      if (deepSeekError.code) {
        errorDetail += `Code: ${deepSeekError.code}. `;
      }
      if (deepSeekError.param) {
        errorDetail += `Parameter: ${deepSeekError.param}. `;
      }
      if (deepSeekError.error && deepSeekError.error.message) {
        errorDetail += `Message: ${deepSeekError.error.message}`;
      } else if (deepSeekError.message) {
        errorDetail += `Message: ${deepSeekError.message}`;
      }

      if (process.env.NODE_ENV === "development") {
        return {
          role: "assistant",
          content: `Error in MCPX processing: ${errorDetail}`,
        };
      }

      return {
        role: "assistant",
        content:
          "I apologize, but I encountered an error while processing your request. Please try again later.",
      };
    }
  }

  async getMcpTools(): Promise<any[]> {
    return getMcpToolDefinitions();
  }
}

export const deepSeekAdapter = new DeepSeekAdapter();
export default deepSeekAdapter;
