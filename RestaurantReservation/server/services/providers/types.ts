export interface ProviderAdapter {
  readonly name: string;
  isAvailable(): boolean;
  processChat(message: string, context?: string): Promise<string>;
  processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse>;
  getMcpTools(): Promise<any[]>;
  analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string>;
  suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[]; reasoning: string }>;
  generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string,
  ): Promise<string>;
}

export type ChatMessage = {
  role: string;
  content: string;
  tool_calls?: any;
  tool_results?: any;
  tool_call_id?: string;
  function_name?: string;
};

export type McpResponse = {
  role: string;
  content: string;
  tool_calls?: any[];
};
