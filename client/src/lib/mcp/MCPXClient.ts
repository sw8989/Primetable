/**
 * MCPXClient.ts
 * 
 * This file implements the Model Context Protocol eXtended (MCPX) client
 * that handles the interaction between an AI model (e.g., OpenAI) and tools.
 * 
 * Based on the MCP standard: https://docs.mcp.run/
 */

import type { Restaurant } from '@shared/schema';

// Standard MCP Message format
export interface MCPXMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  name?: string;  // Used for tool messages
  tool_calls?: MCPXToolCall[];
  tool_results?: MCPXToolResult[];
  tool_call_id?: string;  // Used for tool messages to link to the original tool call
  function_name?: string;  // Used for tool messages to specify the function name (for OpenAI API)
  
  // Legacy format support (for compatibility with previous MCP versions)
  tool?: string;  // Legacy format for tool name 
  parameters?: Record<string, any>;  // Legacy format for tool parameters
}

// Tool call format for MCPX
export interface MCPXToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Tool result format for MCPX
export interface MCPXToolResult {
  tool_call_id: string;
  type: 'function';
  function: {
    name: string;
    content: string; // JSON string of the result
  };
}

// Tool definition format
export interface MCPXTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * MCPX Client class
 * Manages the conversation flow with tool execution following the MCP standard
 */
export class MCPXClient {
  private messages: MCPXMessage[] = [];
  private tools: MCPXTool[] = [];
  private restaurants: Restaurant[] = [];
  private simulationMode: boolean = false;
  
  /**
   * Initialize the MCPX client
   */
  constructor(options: {
    restaurants: Restaurant[];
    simulationMode?: boolean;
    initialSystemPrompt?: string;
  }) {
    this.restaurants = options.restaurants;
    this.simulationMode = options.simulationMode || false;
    
    // Initialize with system message if provided
    if (options.initialSystemPrompt) {
      this.messages.push({
        role: 'system',
        content: options.initialSystemPrompt
      });
    }
    
    // Add welcome message
    this.messages.push({
      role: 'assistant',
      content: "Hello! I'm your restaurant booking assistant for London's most exclusive restaurants. How can I help you today? I can help you find restaurants, check availability, and make bookings."
    });
    
    // Register tools
    this.registerTools();
  }
  
  /**
   * Register available tools for the client
   */
  private async registerTools() {
    // Fetch tools from the server - this is the single source of truth
    try {
      await this.registerExternalTools();
    } catch (error) {
      console.error('Failed to register tools:', error);
    }
  }
  
  /**
   * Register tools from the server API
   */
  private async registerExternalTools() {
    try {
      // Fetch all tools from the server - no client-side tool definitions
      const response = await fetch('/api/mcp/tools');
      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.tools && Array.isArray(data.tools)) {
        // Replace all tools with server-provided tools
        this.tools = data.tools.filter(tool => 
          tool.type === 'function' && 
          tool.function && 
          tool.function.name && 
          tool.function.description
        );
        
        console.log(`Registered ${this.tools.length} external tools`);
      }
    } catch (error) {
      console.error('Error registering tools:', error);
      this.tools = []; // Fallback to no tools if server unavailable
    }
  }
  
  /**
   * Process a user message and generate responses
   */
  async processMessage(userMessage: string): Promise<MCPXMessage[]> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage
    });
    
    console.log('Processing user message:', userMessage);
    console.log('Current conversation history:', this.messages.length, 'messages');
    
    // Generate assistant response
    const assistantResponse = await this.generateResponse();
    console.log('Assistant response:', assistantResponse);
    this.messages.push(assistantResponse);
    
    // Process any tool calls
    if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
      console.log(`Assistant requested ${assistantResponse.tool_calls.length} tool calls`);
      
      // Execute each tool call sequentially
      for (const toolCall of assistantResponse.tool_calls) {
        console.log('Processing tool call:', toolCall);
        const toolResult = await this.executeToolCall(toolCall);
        
        // Create a properly formatted tool response message for OpenAI
        // According to OpenAI docs, tool response messages:
        // 1. Must have role = 'tool'
        // 2. Must have tool_call_id matching the original tool_call
        // 3. Must have content with the result string (JSON-stringified result)
        // 4. Must NOT have tool_calls property or it will confuse OpenAI
        const toolMessage: MCPXMessage = {
          role: 'tool',
          content: toolResult.function.content,
          tool_call_id: toolResult.tool_call_id,
          // Include function_name as a separate property for the server-side API
          function_name: toolResult.function.name
        };
        
        console.log('Adding tool response to conversation:', toolMessage);
        this.messages.push(toolMessage);
      }
      
      // After all tool calls are processed, generate a follow-up response
      console.log('Generating follow-up response after tool execution');
      const followUpResponse = await this.generateResponse();
      console.log('Follow-up response:', followUpResponse);
      this.messages.push(followUpResponse);
    }
    
    return [...this.messages];
  }
  
  /**
   * Generate a response from the AI model
   */
  private async generateResponse(): Promise<MCPXMessage> {
    try {
      // Prepare request payload
      const payload = {
        messages: this.messages,
        tools: this.tools.length > 0 ? this.tools : undefined
      };
      
      // Call the server-side endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Extract and return the assistant message
      return result.message;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Create a more detailed error message
      let errorDetail = '';
      if (error instanceof Error) {
        errorDetail = `Error: ${error.message}`;
        if (error.stack) {
          console.error('Error stack:', error.stack);
        }
      } else {
        errorDetail = 'Unknown error occurred';
      }
      
      // Return a message with detailed error information for debugging
      return {
        role: 'assistant',
        content: `[MCPX Client Error] ${errorDetail}\n\nPlease try again with a different query or check the console for more details.`
      };
    }
  }
  
  /**
   * Execute a tool call and return the result
   */
  private async executeToolCall(toolCall: MCPXToolCall): Promise<MCPXToolResult> {
    try {
      // Parse the arguments
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`Executing tool call: ${toolCall.function.name}`, args);
      
      // Call the server-side endpoint
      const response = await fetch('/api/mcp/tool-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tool: toolCall.function.name,
          parameters: args
        })
      });
      
      if (!response.ok) {
        // Get more detailed error information if available
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || `HTTP error ${response.status}`;
          throw new Error(`Tool execution error: ${errorMessage} (Status: ${response.status})`);
        } catch (parseError) {
          // If we can't parse the error JSON, use the status code
          throw new Error(`Tool execution error: HTTP ${response.status}`);
        }
      }
      
      const result = await response.json();
      console.log(`Tool execution result for ${toolCall.function.name}:`, result);
      
      // Format as MCP tool result - ensure proper formatting for OpenAI
      const toolResult: MCPXToolResult = {
        tool_call_id: toolCall.id,  // This is critical - must match the original tool call's ID
        type: 'function',
        function: {
          name: toolCall.function.name,
          content: JSON.stringify(result)
        }
      };
      
      console.log('Formatted tool result for MCP:', toolResult);
      return toolResult;
    } catch (error) {
      console.error(`Error executing tool ${toolCall.function.name}:`, error);
      
      // Prepare error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Enhanced debugging information
      const debugInfo = {
        toolName: toolCall.function.name,
        toolArguments: toolCall.function.arguments,
        errorDetails: errorMessage,
        timestamp: new Date().toISOString()
      };
      console.log('Tool execution debug info:', debugInfo);
      
      // Format error content based on the tool type for better UX
      // Include detailed error information for debugging in development mode
      const debuggingInfo = `Debug: Error calling ${toolCall.function.name} with args ${toolCall.function.arguments}: ${errorMessage}`;
      
      let errorContent;
      if (toolCall.function.name === 'detect_booking_platform') {
        errorContent = JSON.stringify({
          success: false,
          error: errorMessage,
          debugInfo: debuggingInfo,
          platform: 'unknown',
          platformName: 'Unknown Platform',
          confidence: 0
        });
      } else if (toolCall.function.name === 'search_restaurants') {
        errorContent = JSON.stringify({
          success: false,
          error: errorMessage,
          debugInfo: debuggingInfo,
          restaurants: []
        });
      } else if (toolCall.function.name === 'check_availability') {
        errorContent = JSON.stringify({
          success: false,
          error: errorMessage,
          debugInfo: debuggingInfo,
          available: false,
          alternatives: []
        });
      } else {
        // Default error format
        errorContent = JSON.stringify({
          success: false,
          error: errorMessage,
          debugInfo: debuggingInfo
        });
      }
      
      // Return error result
      return {
        tool_call_id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.function.name,
          content: errorContent
        }
      };
    }
  }
  
  /**
   * Get all messages in the conversation
   */
  getMessages(): MCPXMessage[] {
    return [...this.messages];
  }
  
  /**
   * Helper method to normalize tool calls in messages
   * Handles both MCPX and legacy MCP formats for compatibility
   */
  normalizeToolCalls(message: MCPXMessage): MCPXMessage {
    // If it's already in MCPX format (has tool_calls), return as is
    if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return message;
    }
    
    // If it's in legacy format (has tool property), convert to MCPX format
    if (message.tool && typeof message.tool === 'string') {
      const normalizedMessage: MCPXMessage = {
        ...message,
        tool_calls: [{
          id: `legacy-tool-${Date.now()}`,
          type: 'function',
          function: {
            name: message.tool,
            arguments: message.parameters ? JSON.stringify(message.parameters) : '{}'
          }
        }]
      };
      return normalizedMessage;
    }
    
    // If no tool calls at all, return original
    return message;
  }
  
  /**
   * Reset the conversation
   */
  reset(): void {
    // Keep the system message if it exists
    const systemMessage = this.messages.find(msg => msg.role === 'system');
    
    this.messages = systemMessage ? [systemMessage] : [];
    
    // Add welcome message
    this.messages.push({
      role: 'assistant',
      content: "Hello! I'm your restaurant booking assistant for London's most exclusive restaurants. How can I help you today? I can help you find restaurants, check availability, and make bookings."
    });
  }
  
  /**
   * Test function to verify format conversion between legacy and MCPX
   * This can be used to ensure our normalization works correctly
   */
  testFormatConversion(): void {
    // Create a legacy format message
    const legacyMessage: MCPXMessage = {
      role: 'assistant',
      content: '',
      tool: 'search_restaurants',
      parameters: {
        query: 'Italian restaurants in Soho',
        cuisine: 'Italian',
        location: 'Soho'
      }
    };
    
    // Normalize to MCPX format
    const normalizedMessage = this.normalizeToolCalls(legacyMessage);
    
    // Log both formats for inspection
    console.log('Original legacy format:', legacyMessage);
    console.log('Normalized MCPX format:', normalizedMessage);
    
    // Verify tool_calls was created with the correct structure
    if (normalizedMessage.tool_calls && 
        normalizedMessage.tool_calls.length > 0 &&
        normalizedMessage.tool_calls[0].function?.name === 'search_restaurants') {
      console.log('✓ Format conversion successful');
    } else {
      console.error('✗ Format conversion failed');
    }
  }
}

// Export a function to create MCPX client
export function createMCPXClient(options: {
  restaurants: Restaurant[];
  simulationMode?: boolean;
  initialSystemPrompt?: string;
}): MCPXClient {
  return new MCPXClient(options);
}