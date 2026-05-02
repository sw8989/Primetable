import type { ProviderAdapter } from "./providers/types";
import { registry } from "./providers/registry";
import { anthropicAdapter } from "./providers/anthropic";
import { openAIAdapter } from "./providers/openai";
import { kimiAdapter } from "./providers/kimi";

registry.register(anthropicAdapter);
registry.register(openAIAdapter);
registry.register(kimiAdapter);

type ChatMessage = {
  role: string;
  content: string;
  tool_calls?: any;
  tool_results?: any;
  tool_call_id?: string;
  function_name?: string;
};

type McpResponse = {
  role: string;
  content: string;
  tool_calls?: any[];
};

class AiService {
  isAvailable(): boolean {
    return registry.getProvider() !== null;
  }

  getService(): ProviderAdapter | null {
    return registry.getProvider();
  }

  get name(): string {
    return registry.getProvider()?.name ?? "none";
  }

  async analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string> {
    const service = this.getService();
    if (!service) return "AI service unavailable. Using standard booking strategy.";
    return service.analyzeBookingStrategy(restaurantName, bookingInfo, difficulty);
  }

  async suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[]; reasoning: string }> {
    const service = this.getService();
    if (!service) return { suggestions: [], reasoning: "" };
    return service.suggestAlternativeTimes(restaurantName, preferredDate, preferredTime, partySize);
  }

  async generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string,
  ): Promise<string> {
    const service = this.getService();
    if (!service) return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    return service.generateBookingMessage(restaurantName, date, time, partySize, userName);
  }

  async processChat(message: string, context?: string): Promise<string> {
    const service = this.getService();
    if (!service) return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    return service.processChat(message, context);
  }

  async processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse> {
    const service = this.getService();
    if (!service) return { role: "assistant", content: "I'm the Prime Table booking assistant. How can I assist you today?" };
    return service.processMcpChat(messages, context, restaurant, userId);
  }

  async getMcpTools(): Promise<any[]> {
    const service = this.getService();
    if (!service) return [];
    return service.getMcpTools();
  }
}

const aiService = new AiService();
export default aiService;
