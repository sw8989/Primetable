import openaiService from "./openaiService";
import anthropicService from "./anthropicService";
import config from "../config";

/**
 * Unified AI Service that acts as a facade over different AI providers
 *
 * This service will use OpenAI, Anthropic, or DeepSeek based on what's available
 * and configured in the application's settings. It implements the Model Context
 * Protocol (MCP) standard for consistent AI interactions across different providers.
 */
class AiService {
  private preferredProvider: string;
  private availableProviders: { [key: string]: boolean };

  constructor() {
    // Get AI configuration from config
    this.preferredProvider = config.services.ai.preferredProvider;
    this.availableProviders = config.services.ai.providers;

    // Check for Smithery availability
    this.availableProviders.smithery = false; // Temporarily disabled until properly imported

    if (this.isAvailable()) {
      // If Smithery is available and preferred provider is not set or not available, use Smithery
      if (
        this.availableProviders.smithery &&
        (!this.preferredProvider ||
          !this.availableProviders[this.preferredProvider])
      ) {
        this.preferredProvider = "smithery";
      }

      console.log(
        `AI service initialized. Using ${this.preferredProvider} as the preferred provider.`,
      );

      // Log which providers are available
      const providers = Object.entries(this.availableProviders)
        .filter(([_, available]) => available)
        .map(([name, _]) => name)
        .join(", ");

      console.log(`Available AI providers: ${providers || "None"}`);
    } else {
      console.warn("No AI providers available. AI features will be disabled.");
    }
  }

  /**
   * Check if any AI service is available
   */
  isAvailable(): boolean {
    return Object.values(this.availableProviders).some(
      (available) => available,
    );
  }

  /**
   * Get the appropriate service based on availability and preference
   */
  getService(): any {
    // First try the preferred provider
    if (this.availableProviders[this.preferredProvider]) {
      if (this.preferredProvider === "anthropic") return anthropicService;
      if (this.preferredProvider === "deepseek") return deepseekService;
      if (this.preferredProvider === "smithery") return smitheryService;
      return openaiService;
    }

    // If preferred provider is not available, try any available provider in priority order
    if (this.availableProviders.smithery) return smitheryService;
    if (this.availableProviders.anthropic) return anthropicService;
    if (this.availableProviders.deepseek) return deepseekService;
    if (this.availableProviders.openai) return openaiService;

    // Return null if no providers are available
    return null;
  }

  /**
   * Analyzes a restaurant's booking patterns
   */
  async analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string> {
    const service = this.getService();

    if (!service) {
      return "AI service unavailable. Using standard booking strategy.";
    }

    return service.analyzeBookingStrategy(
      restaurantName,
      bookingInfo,
      difficulty,
    );
  }

  /**
   * Analyzes availability patterns and suggests alternative times or dates
   */
  async suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[] }> {
    const service = this.getService();

    if (!service) {
      return { suggestions: [] };
    }

    return service.suggestAlternativeTimes(
      restaurantName,
      preferredDate,
      preferredTime,
      partySize,
    );
  }

  /**
   * Generates personalized booking confirmation messages
   */
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

    return service.generateBookingMessage(
      restaurantName,
      date,
      time,
      partySize,
      userName,
    );
  }

  /**
   * Process a chat message using the preferred AI service
   *
   * @param message The user's message
   * @param context Optional context about a specific restaurant
   * @returns AI response
   */
  async processChat(message: string, context?: string): Promise<string> {
    const service = this.getService();

    if (!service || !service.processChat) {
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Our AI services will be fully operational soon.";
    }

    return service.processChat(message, context);
  }
}

const aiService = new AiService();
export default aiService;
