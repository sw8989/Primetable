import OpenAI from "openai";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";
import { runOpenAICompatibleMcpChat } from "./openaiCompatible";

export class KimiAdapter implements ProviderAdapter {
  readonly name = "kimi";
  readonly model: string;
  private client: OpenAI | null = null;

  constructor() {
    this.model = process.env.KIMI_MODEL || "moonshot-v1-8k";

    if (!process.env.KIMI_API_KEY) {
      console.warn(
        "WARNING: KIMI_API_KEY not set. AI features will be disabled.",
      );
    } else {
      try {
        this.client = new OpenAI({
          apiKey: process.env.KIMI_API_KEY,
          baseURL: "https://api.moonshot.cn/v1",
        });
        console.log("Kimi API initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize Kimi client:", error);
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
                   and optimal times for securing reservations at popular restaurants.
                   Return ONLY a JSON array of objects with "suggestions" and "reasoning" keys.`,
          },
        ],
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
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Please ask our team to enable the Kimi integration for full AI-powered assistance.";
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

      const kimiError = error as any;
      if (
        kimiError.status === 429 ||
        (kimiError.error && kimiError.error.code === "insufficient_quota")
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
      return await runOpenAICompatibleMcpChat(this.client, this.model, "Kimi", messages, context, userId);
    } catch (error) {
      console.error("Error processing MCP chat:", error);
      const err = error as any;
      if (err.status === 429 || (err.error && err.error.code === "insufficient_quota")) {
        return { role: "assistant", content: "I apologize, but our AI service has reached its usage limit for now." };
      }
      if (process.env.NODE_ENV === "development") {
        return { role: "assistant", content: `Error in Kimi MCPX processing: ${err.message || "unknown error"}` };
      }
      return { role: "assistant", content: "I apologize, but I encountered an error while processing your request. Please try again later." };
    }
  }

  async getMcpTools(): Promise<any[]> {
    return getMcpToolDefinitions();
  }
}

export const kimiAdapter = new KimiAdapter();
export default kimiAdapter;
