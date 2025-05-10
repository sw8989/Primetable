import {
  MCPMessage,
  MessageRole,
  ToolCall,
  ToolResult,
  AVAILABLE_TOOLS,
  executeToolCall
} from './agentProtocol';
import { fetchSmitheryTools, registerSmitheryTools } from './SmitheryTools';
import type { Restaurant } from '@shared/schema';

// Placeholder for actual AI service integration - in a real app, this would call an LLM API
// For now we'll simulate responses based on our booking workflow
class AIService {
  async generateResponse(
    messages: MCPMessage[],
    availableTools: string[]
  ): Promise<MCPMessage> {
    // Extract the last user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();
    
    if (!lastUserMessage) {
      return {
        role: 'assistant',
        content: "I'm not sure what to help you with. Could you please ask a question?"
      };
    }
    
    const userMessage = lastUserMessage.content.toLowerCase();
    
    // Check if the user message contains booking-related intent
    if (this.hasBookingIntent(userMessage)) {
      // If we don't have restaurant details yet, use search tool
      if (!this.hasRestaurantInfo(messages)) {
        return {
          role: 'assistant',
          content: "I'll help you find a restaurant to book.",
          tool_calls: [{
            tool: 'search_restaurants_tool',
            parameters: {
              query: userMessage
            }
          }]
        };
      }
      // If we have restaurant but not date/time, ask for it or use availability tool
      else if (this.hasRestaurantInfo(messages) && !this.hasDateTimeInfo(messages)) {
        // Extract restaurant ID from previous messages
        const restaurantId = this.extractRestaurantId(messages);
        
        if (this.hasDateIntent(userMessage) && this.hasTimeIntent(userMessage)) {
          // Extract date and time from message
          const date = this.extractDate(userMessage);
          const time = this.extractTime(userMessage);
          const partySize = this.extractPartySize(userMessage) || 2; // Default to 2
          
          if (date && time && restaurantId) {
            return {
              role: 'assistant',
              content: "Let me check if that time is available.",
              tool_calls: [{
                tool: 'check_availability_tool',
                parameters: {
                  restaurant_id: restaurantId,
                  date: date,
                  time: time,
                  party_size: partySize
                }
              }]
            };
          }
        }
        
        // If we couldn't extract date/time, just ask for it
        return {
          role: 'assistant',
          content: "When would you like to book a table, and for how many people?"
        };
      }
      // If we have all the information needed, use booking tool
      else if (this.hasRestaurantInfo(messages) && this.hasDateTimeInfo(messages) && this.hasConfirmation(userMessage)) {
        const restaurantId = this.extractRestaurantId(messages);
        const date = this.extractDateFromMessages(messages);
        const time = this.extractTimeFromMessages(messages);
        const partySize = this.extractPartySizeFromMessages(messages) || 2;
        
        if (restaurantId && date && time) {
          return {
            role: 'assistant',
            content: "I'll make that booking for you right away.",
            tool_calls: [{
              tool: 'booking_tool',
              parameters: {
                restaurant_id: restaurantId,
                date: date,
                time: time,
                party_size: partySize,
                special_requests: this.extractSpecialRequests(messages),
                use_real_scraping: false // Default to simulation for safety
              }
            }]
          };
        }
      }
    }
    
    // If the message contains a search intent
    if (this.hasSearchIntent(userMessage)) {
      return {
        role: 'assistant',
        content: "I'll search for restaurants matching your criteria.",
        tool_calls: [{
          tool: 'search_restaurants_tool',
          parameters: {
            query: userMessage,
            cuisine: this.extractCuisine(userMessage),
            location: this.extractLocation(userMessage)
          }
        }]
      };
    }
    
    // Default fallback response
    return {
      role: 'assistant',
      content: "I'm here to help you book a table at London's finest restaurants. Would you like me to help you find a restaurant or check availability somewhere specific?"
    };
  }
  
  // Helper methods to analyze messages
  private hasBookingIntent(message: string): boolean {
    const bookingKeywords = ['book', 'reserve', 'reservation', 'table', 'booking'];
    return bookingKeywords.some(keyword => message.includes(keyword));
  }
  
  private hasSearchIntent(message: string): boolean {
    const searchKeywords = ['find', 'search', 'looking for', 'want', 'interested in'];
    return searchKeywords.some(keyword => message.includes(keyword));
  }
  
  private hasDateIntent(message: string): boolean {
    const dateKeywords = ['today', 'tomorrow', 'next', 'on', 'date'];
    return dateKeywords.some(keyword => message.includes(keyword)) || 
           /\d{1,2}[\/\-\.]\d{1,2}/.test(message); // Simple date regex
  }
  
  private hasTimeIntent(message: string): boolean {
    const timeKeywords = ['at', 'pm', 'am', 'evening', 'lunch', 'dinner'];
    return timeKeywords.some(keyword => message.includes(keyword)) ||
           /\d{1,2}[:]\d{2}/.test(message) || // HH:MM format
           /\d{1,2}\s?(am|pm)/.test(message); // 7pm format
  }
  
  private hasConfirmation(message: string): boolean {
    const confirmKeywords = ['yes', 'confirm', 'book it', 'proceed', 'go ahead'];
    return confirmKeywords.some(keyword => message.includes(keyword));
  }
  
  private hasRestaurantInfo(messages: MCPMessage[]): boolean {
    // Check if restaurant information is in the conversation
    return messages.some(msg => 
      (msg.role === 'tool' && msg.tool_results?.some(result => 
        result.result.restaurants || result.result.restaurant
      ))
    );
  }
  
  private hasDateTimeInfo(messages: MCPMessage[]): boolean {
    // Check if date and time information is in the conversation
    const dateTimeRegex = /\d{4}-\d{2}-\d{2}/; // YYYY-MM-DD
    const timeRegex = /\d{2}:\d{2}/; // HH:MM
    
    return messages.some(msg => 
      dateTimeRegex.test(msg.content) && timeRegex.test(msg.content) ||
      (msg.role === 'tool' && msg.tool_results?.some(result => 
        result.result.date && result.result.time
      ))
    );
  }
  
  // Extraction helpers
  private extractRestaurantId(messages: MCPMessage[]): number | null {
    // Look through tool results for restaurant ID
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_results) {
        for (const result of msg.tool_results) {
          // Check if restaurant property exists and has an id
          const resultObj = result.result as any;
          if (resultObj.restaurant && typeof resultObj.restaurant === 'object' && resultObj.restaurant.id) {
            return resultObj.restaurant.id as number;
          }
          
          // Check in search results
          if (resultObj.restaurants && Array.isArray(resultObj.restaurants) && resultObj.restaurants.length > 0) {
            return resultObj.restaurants[0].id;
          }
        }
      }
    }
    return null;
  }
  
  private extractDate(message: string): string | null {
    // Simple date extraction - in reality, we'd use a date parsing library
    const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{4}|\d{2}))?/;
    const match = message.match(dateRegex);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
      
      // Format as YYYY-MM-DD
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    
    // Check for words like "today" or "tomorrow"
    const today = new Date();
    if (message.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (message.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    return null;
  }
  
  private extractTime(message: string): string | null {
    // Extract time in HH:MM format
    const timeRegex = /(\d{1,2}):(\d{2})/;
    let match = message.match(timeRegex);
    
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Check for "7pm" format
    const timeRegex2 = /(\d{1,2})\s?(am|pm)/i;
    match = message.match(timeRegex2);
    
    if (match) {
      let hours = parseInt(match[1], 10);
      const ampm = match[2].toLowerCase();
      
      if (ampm === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:00`;
    }
    
    // Check for common meal times
    if (message.includes('lunch')) return '13:00';
    if (message.includes('dinner')) return '19:00';
    if (message.includes('evening')) return '19:30';
    
    return null;
  }
  
  private extractPartySize(message: string): number | null {
    // Extract numbers that could be party size
    const partySizeRegex = /(\d+)\s+(people|person|diners|guests|party size)/i;
    const match = message.match(partySizeRegex);
    
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Look for simpler number mentions that might be party size
    const simpleNumberRegex = /for\s+(\d+)/i;
    const simpleMatch = message.match(simpleNumberRegex);
    
    if (simpleMatch) {
      const number = parseInt(simpleMatch[1], 10);
      if (number > 0 && number <= 20) { // Reasonable party size
        return number;
      }
    }
    
    return null;
  }
  
  private extractCuisine(message: string): string | null {
    // Common cuisines
    const cuisines = [
      'italian', 'japanese', 'chinese', 'indian', 'french', 
      'british', 'modern european', 'peruvian', 'spanish', 'thai'
    ];
    
    for (const cuisine of cuisines) {
      if (message.toLowerCase().includes(cuisine)) {
        return cuisine;
      }
    }
    
    return null;
  }
  
  private extractLocation(message: string): string | null {
    // Common London locations
    const locations = [
      'mayfair', 'soho', 'shoreditch', 'covent garden', 'knightsbridge',
      'chelsea', 'marylebone', 'fitzrovia', 'city', 'notting hill'
    ];
    
    for (const location of locations) {
      if (message.toLowerCase().includes(location)) {
        return location;
      }
    }
    
    return null;
  }
  
  private extractDateFromMessages(messages: MCPMessage[]): string | null {
    // Look through messages for date information
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_results) {
        for (const result of msg.tool_results) {
          if (result.result.date) {
            return result.result.date as string;
          }
        }
      }
      
      // Try to extract from content
      const date = this.extractDate(msg.content);
      if (date) return date;
    }
    return null;
  }
  
  private extractTimeFromMessages(messages: MCPMessage[]): string | null {
    // Look through messages for time information
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_results) {
        for (const result of msg.tool_results) {
          if (result.result.time) {
            return result.result.time as string;
          }
        }
      }
      
      // Try to extract from content
      const time = this.extractTime(msg.content);
      if (time) return time;
    }
    return null;
  }
  
  private extractPartySizeFromMessages(messages: MCPMessage[]): number | null {
    // Look through messages for party size information
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_results) {
        for (const result of msg.tool_results) {
          if (result.result.party_size) {
            return result.result.party_size as number;
          }
        }
      }
      
      // Try to extract from content
      const partySize = this.extractPartySize(msg.content);
      if (partySize) return partySize;
    }
    return null;
  }
  
  private extractSpecialRequests(messages: MCPMessage[]): string | null {
    // Look for special requests in user messages
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastMessages = userMessages.slice(-2); // Get last two user messages
    
    for (const msg of lastMessages) {
      // If the message is long and doesn't seem to be about booking specifics, it might be special requests
      if (msg.content.length > 20 && 
          !this.hasDateIntent(msg.content) && 
          !this.hasTimeIntent(msg.content) && 
          !this.extractPartySize(msg.content)) {
        return msg.content;
      }
    }
    
    return null;
  }
}

/**
 * MCPAgent class that implements the MCP protocol
 * This agent handles the conversation flow and tool execution
 */
export class MCPAgent {
  private messages: MCPMessage[] = [];
  private aiService: AIService;
  private restaurants: Restaurant[] = [];
  private availableTools = AVAILABLE_TOOLS;
  private smitheryInitialized = false;
  
  constructor(initialRestaurants: Restaurant[] = []) {
    this.aiService = new AIService();
    this.restaurants = initialRestaurants;
    
    // Add initial system message
    this.messages.push({
      role: 'assistant',
      content: "Hello! I'm your Prime Table booking assistant for London's exclusive restaurants. How can I help you today?"
    });
    
    // Initialize Smithery tools
    this.initializeSmitheryTools();
  }
  
  /**
   * Initialize and register tools from Smithery MCP Marketplace
   */
  private async initializeSmitheryTools(): Promise<void> {
    try {
      console.log('Initializing Smithery MCP tools...');
      this.availableTools = await registerSmitheryTools();
      this.smitheryInitialized = true;
      console.log(`MCP Agent now has ${this.availableTools.length} tools available`);
    } catch (error) {
      console.error('Failed to initialize Smithery tools:', error);
      // Continue with default tools
      this.availableTools = AVAILABLE_TOOLS;
    }
  }
  
  /**
   * Process a user message and return the updated conversation
   */
  async processUserMessage(userMessage: string): Promise<MCPMessage[]> {
    // Add user message to conversation history
    this.messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Generate assistant response with potential tool calls
    const assistantResponse = await this.aiService.generateResponse(
      this.messages,
      this.availableTools.map(tool => tool.name)
    );
    
    // Add assistant response to conversation
    this.messages.push(assistantResponse);
    
    // If the response includes tool calls, execute them
    if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
      for (const toolCall of assistantResponse.tool_calls) {
        // Execute the tool
        const toolResult = await executeToolCall(toolCall);
        
        // Create a tool message with the result
        const toolMessage: MCPMessage = {
          role: 'tool',
          content: this.formatToolResultAsText(toolCall, toolResult),
          tool_results: [toolResult]
        };
        
        // Add tool message to conversation
        this.messages.push(toolMessage);
      }
      
      // Generate a follow-up response based on tool results
      const followUpResponse = await this.aiService.generateResponse(
        this.messages,
        this.availableTools.map(tool => tool.name)
      );
      
      // Add follow-up response to conversation
      this.messages.push(followUpResponse);
    }
    
    // Return the updated conversation
    return this.getMessages();
  }
  
  /**
   * Get the current conversation history
   */
  getMessages(): MCPMessage[] {
    return [...this.messages];
  }
  
  /**
   * Reset the conversation
   */
  reset(): void {
    this.messages = [{
      role: 'assistant',
      content: "Hello! I'm your Prime Table booking assistant for London's exclusive restaurants. How can I help you today?"
    }];
  }
  
  /**
   * Format tool result as human-readable text
   */
  private formatToolResultAsText(toolCall: ToolCall, toolResult: ToolResult): string {
    if (toolResult.error) {
      return `Error using ${toolCall.tool}: ${toolResult.error}`;
    }
    
    switch (toolCall.tool) {
      case 'booking_tool': {
        const success = toolResult.result.success as boolean;
        if (success) {
          return `Successfully created a booking. Booking reference: ${(toolResult.result.booking as any)?.id || 'N/A'}`;
        } else {
          return `Failed to create booking: ${toolResult.result.message || 'Unknown error'}`;
        }
      }
      
      case 'search_restaurants_tool': {
        const restaurants = toolResult.result.restaurants as Restaurant[];
        const count = toolResult.result.count as number;
        
        if (count === 0) {
          return 'No restaurants found matching your criteria.';
        }
        
        let result = `Found ${count} restaurants matching your criteria. Here are the top results:\n\n`;
        restaurants.slice(0, 3).forEach((restaurant, index) => {
          result += `${index + 1}. ${restaurant.name} - ${restaurant.cuisine} cuisine in ${restaurant.location}\n`;
          result += `   Booking difficulty: ${restaurant.bookingDifficulty}\n`;
        });
        
        return result;
      }
      
      case 'check_availability_tool': {
        const isAvailable = toolResult.result.is_available as boolean;
        const restaurant = toolResult.result.restaurant as Restaurant;
        const date = toolResult.result.date as string;
        const time = toolResult.result.time as string;
        
        if (isAvailable) {
          return `Good news! ${restaurant.name} has availability on ${new Date(date).toLocaleDateString()} at ${time} for your party.`;
        } else {
          const alternativeTimes = toolResult.result.alternative_times as { time: string, is_available: boolean }[];
          let result = `Unfortunately, ${restaurant.name} doesn't have availability on ${new Date(date).toLocaleDateString()} at ${time}.`;
          
          if (alternativeTimes && alternativeTimes.length > 0) {
            const availableAlternatives = alternativeTimes.filter(alt => alt.is_available);
            if (availableAlternatives.length > 0) {
              result += ` However, they do have tables available at: ${availableAlternatives.map(alt => alt.time).join(', ')}`;
            } else {
              result += ' There are no alternative times available for this date.';
            }
          }
          
          return result;
        }
      }
      
      default:
        return `Tool ${toolCall.tool} executed successfully.`;
    }
  }
}