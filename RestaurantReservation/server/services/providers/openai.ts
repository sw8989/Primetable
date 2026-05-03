import OpenAI from "openai";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";
import { runOpenAICompatibleMcpChat } from "./openaiCompatible";

const LOG_PREVIEW_CHARS = 160;

export function summarizeTextForLog(value: string, maxChars = LOG_PREVIEW_CHARS): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}... [truncated ${value.length - maxChars} chars]`;
}

export function summarizeMcpMessagesForLog(
  messages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    tool_call_id?: string;
    function_name?: string;
    name?: string;
  }>,
): Array<Record<string, unknown>> {
  return messages.map((message) => ({
    role: message.role,
    tool_call_id: message.tool_call_id,
    name: message.function_name || message.name,
    tool_calls_count: Array.isArray(message.tool_calls) ? message.tool_calls.length : 0,
    content_preview:
      typeof message.content === "string"
        ? summarizeTextForLog(message.content)
        : undefined,
  }));
}

export class OpenAIAdapter implements ProviderAdapter {
  readonly name = "openai";
  private client: OpenAI | null = null;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "WARNING: OPENAI_API_KEY environment variable is not set. AI features will be disabled.",
      );
    } else {
      try {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
      } catch (error) {
        console.error("Failed to initialize OpenAI client:", error);
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
      // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
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

      // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
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

      // Parse the JSON response
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

      // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
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
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Please ask our team to enable the OpenAI integration for full AI-powered assistance.";
    }

    try {
      const systemMessage =
        context ||
        "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants. " +
          "Provide detailed, personalized advice on booking strategies and restaurant recommendations.";

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
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

      // Check for quota/rate limit errors
      const openAIError = error as any;
      if (
        openAIError.status === 429 ||
        (openAIError.error && openAIError.error.code === "insufficient_quota")
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
    if (!this.client) return { role: "assistant", content: "I'm a restaurant booking assistant. How can I assist you today?" };
    try {
      return await runOpenAICompatibleMcpChat(this.client, "gpt-4o", "OpenAI", messages, context, userId);
    } catch (error) {
      console.error("Error processing MCP chat:", error);
      const err = error as any;
      if (err.status === 429 || (err.error && err.error.code === "insufficient_quota")) {
        return { role: "assistant", content: "I apologize, but our AI service has reached its usage limit for now." };
      }
      if (process.env.NODE_ENV === "development") {
        return { role: "assistant", content: `Error in OpenAI MCPX processing: ${err.message || "unknown error"}` };
      }
      return { role: "assistant", content: "I apologize, but I encountered an error while processing your request. Please try again later." };
    }
  }

  async getMcpTools(): Promise<any[]> {
    return getMcpToolDefinitions();
  }
}

export const openAIAdapter = new OpenAIAdapter();
export default openAIAdapter;
