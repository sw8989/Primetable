import openaiService from "./openaiService";
import anthropicService from "./anthropicService";
import config from "../config";

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
  private preferredProvider: string;
  private availableProviders: { [key: string]: boolean };

  constructor() {
    this.preferredProvider = config.services.ai.preferredProvider;
    this.availableProviders = {
      openai: config.services.ai.providers.openai ?? false,
      anthropic: config.services.ai.providers.anthropic ?? false,
    };

    if (this.isAvailable()) {
      console.log(`AI service initialized. Preferred provider: ${this.preferredProvider}`);
      const providers = Object.entries(this.availableProviders)
        .filter(([, available]) => available)
        .map(([name]) => name)
        .join(", ");
      console.log(`Available AI providers: ${providers || "None"}`);
    } else {
      console.warn("No AI providers available. AI features will be disabled.");
    }
  }

  isAvailable(): boolean {
    return Object.values(this.availableProviders).some((available) => available);
  }

  getService(): typeof openaiService | typeof anthropicService | null {
    if (this.availableProviders[this.preferredProvider]) {
      if (this.preferredProvider === "anthropic") return anthropicService;
      return openaiService;
    }
    if (this.availableProviders.anthropic) return anthropicService;
    if (this.availableProviders.openai) return openaiService;
    return null;
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
    if (!service) {
      return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    }
    return service.generateBookingMessage(restaurantName, date, time, partySize, userName);
  }

  async processChat(message: string, context?: string): Promise<string> {
    const service = this.getService();
    if (!service || !service.processChat) {
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    }
    return service.processChat(message, context);
  }

  async processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse> {
    const service = this.getService();
    if (!service || !service.processMcpChat) {
      return {
        role: "assistant",
        content: "I'm the Prime Table booking assistant. How can I assist you today?",
      };
    }
    return service.processMcpChat(messages, context, restaurant, userId);
  }

  get name(): string {
    if (this.availableProviders[this.preferredProvider]) {
      return this.preferredProvider;
    }
    if (this.availableProviders.anthropic) return "anthropic";
    if (this.availableProviders.openai) return "openai";
    return "none";
  }

  async getMcpTools(): Promise<any[]> {
    const service = this.getService();
    if (!service || !("getMcpTools" in service)) return [];
    return (service as any).getMcpTools();
  }
}

const aiService = new AiService();
export default aiService;
