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

// Real AI service integration that connects to the backend API
class AIService {
  // Connect to the backend API for OpenAI integration
  async generateResponse(
    messages: MCPMessage[],
    availableTools: string[]
  ): Promise<MCPMessage> {
    try {
      // Create a simplified request (removing any undefined or circular references)
      const cleanMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_results: msg.tool_results 
          ? msg.tool_results.map(tr => ({
              name: tr.tool || tr.name,
              result: tr.result
            }))
          : undefined
      }));
      
      // Call the server-side API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: cleanMessages,
          use_mcp: true, // Tell the server to use MCP protocol
          context: `You are a restaurant booking assistant specialized in securing tables at London's exclusive restaurants. 
                   Help users find and book tables at hard-to-book restaurants. When they ask about a specific restaurant,
                   provide details on booking policies and availability.`
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // If we get MCP format directly
      if (data.role && typeof data.content === 'string') {
        return data as MCPMessage;
      }
      
      // If we get a simple response, convert to MCP format
      if (data.response) {
        return {
          role: 'assistant',
          content: data.response
        };
      }
      
      // Fallback
      return {
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now."
      };
    } catch (error) {
      console.error('Error calling AI service:', error);
      
      // For fallback, use the following simple patterns to generate responses
      // if the API call fails
      return this.generateFallbackResponse(messages);
    }
  }
  
  // Generate a fallback response if API fails
  private generateFallbackResponse(messages: MCPMessage[]): MCPMessage {
    // Get the last user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();
      
    if (!lastUserMessage) {
      return {
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. How can I help you with restaurant bookings?"
      };
    }
    
    const userMessage = lastUserMessage.content.toLowerCase();
    
    // Simple fallback logic
    if (userMessage.includes('book') || userMessage.includes('reservation')) {
      return {
        role: 'assistant',
        content: "I'd be happy to help you book a table. Could you tell me which restaurant you're interested in?"
      };
    } else if (userMessage.includes('time') || userMessage.includes('date')) {
      return {
        role: 'assistant',
        content: "What date and time are you looking for? And how many people will be dining?"
      };
    } else if (userMessage.includes('help') || userMessage.includes('how')) {
      return {
        role: 'assistant',
        content: "I can help you find and book tables at London's most exclusive restaurants. Just let me know which restaurant you're interested in and when you'd like to dine."
      };
    } else {
      return {
        role: 'assistant',
        content: "I apologize, but I'm experiencing connection issues. Please try again in a moment."
      };
    }
  }
}

/**
 * MCPAgent - A client for the Model Context Protocol
 * Manages the conversation flow and tool execution
 */
export class MCPAgent {
  private messages: MCPMessage[] = [];
  private aiService: AIService;
  private restaurants: Restaurant[];
  private availableTools: { name: string, description: string, parameters: any, required_parameters: string[] }[] = [];
  
  constructor(restaurants: Restaurant[]) {
    this.aiService = new AIService();
    this.restaurants = restaurants;
    
    // Initialize with welcome message
    this.messages = [{
      role: 'assistant',
      content: "Hello! I'm your restaurant booking assistant for London's most exclusive restaurants. How can I help you today? I can help you find restaurants, check availability, and make bookings."
    }];
    
    // Register available tools
    this.registerTools();
  }
  
  /**
   * Register available MCP tools
   */
  private async registerTools() {
    // Load default tools
    this.availableTools = [...AVAILABLE_TOOLS];
    
    try {
      // Load additional tools from Smithery MCP
      const smitheryTools = await registerSmitheryTools();
      this.availableTools = [...this.availableTools, ...smitheryTools];
      console.log('MCP Agent now has', this.availableTools.length, 'tools available');
    } catch (error) {
      console.error('Failed to register Smithery MCP tools:', error);
    }
  }
  
  /**
   * Format tool result as user-friendly text
   */
  private formatToolResultAsText(toolCall: ToolCall, toolResult: ToolResult): string {
    // Format based on tool type
    const tool = toolCall.tool;
    
    if (tool === 'search_restaurants_tool') {
      const results = toolResult.result?.restaurants || [];
      if (results.length === 0) {
        return "I couldn't find any restaurants matching your criteria.";
      }
      
      return `I found ${results.length} restaurant(s) that might interest you.`;
    }
    
    if (tool === 'check_availability_tool') {
      const result = toolResult.result;
      if (result.available) {
        return `Good news! There's availability for your requested time.`;
      } else {
        return `I'm afraid there's no availability for your requested time.`;
      }
    }
    
    // Generic formatting
    return JSON.stringify(toolResult.result);
  }
  
  /**
   * Process a user message and generate a response
   */
  async processUserMessage(userMessage: string): Promise<MCPMessage[]> {
    // Add user message to conversation
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
      content: "Hello! I'm your restaurant booking assistant for London's most exclusive restaurants. How can I help you today?"
    }];
  }
}