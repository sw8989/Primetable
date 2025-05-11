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
    // Register standard tools
    this.registerStandardTools();
    
    // Try to register external tools (Smithery, etc.)
    try {
      await this.registerExternalTools();
    } catch (error) {
      console.error('Failed to register external tools:', error);
    }
  }
  
  /**
   * Register standard built-in tools
   */
  private registerStandardTools() {
    // Restaurant search tool
    this.tools.push({
      type: 'function',
      function: {
        name: 'search_restaurants',
        description: 'Search for restaurants based on criteria like cuisine, location, or booking difficulty',
        parameters: {
          type: 'object',
          properties: {
            cuisine: {
              type: 'string',
              description: 'Cuisine type (e.g., French, Italian, Japanese)',
            },
            location: {
              type: 'string',
              description: 'Location in London (e.g., Mayfair, Soho, Shoreditch)',
            },
            difficulty: {
              type: 'string',
              description: 'Booking difficulty level (easy, medium, hard)',
            },
            query: {
              type: 'string',
              description: 'Free text search query',
            }
          },
          required: []
        }
      }
    });
    
    // Check availability tool
    this.tools.push({
      type: 'function',
      function: {
        name: 'check_availability',
        description: 'Check if a restaurant has available reservations for a given date and time',
        parameters: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'number',
              description: 'ID of the restaurant to check',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            time: {
              type: 'string',
              description: 'Time in HH:MM format (24-hour)',
            },
            party_size: {
              type: 'number',
              description: 'Number of people in the party',
            }
          },
          required: ['restaurant_id', 'date', 'time', 'party_size']
        }
      }
    });
    
    // Book restaurant tool
    this.tools.push({
      type: 'function',
      function: {
        name: 'book_restaurant',
        description: 'Book a reservation at a restaurant',
        parameters: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'number',
              description: 'ID of the restaurant to book',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            time: {
              type: 'string',
              description: 'Time in HH:MM format (24-hour)',
            },
            party_size: {
              type: 'number',
              description: 'Number of people in the party',
            },
            name: {
              type: 'string',
              description: 'Name for the reservation',
            },
            email: {
              type: 'string',
              description: 'Contact email',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number',
            },
            special_requests: {
              type: 'string',
              description: 'Any special requests or notes',
            }
          },
          required: ['restaurant_id', 'date', 'time', 'party_size', 'name']
        }
      }
    });
    
    // Platform detection tool
    this.tools.push({
      type: 'function',
      function: {
        name: 'detect_booking_platform',
        description: 'Detect which booking platform a restaurant uses based on its website URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The restaurant website URL to analyze',
            }
          },
          required: ['url']
        }
      }
    });
    
    // Web search tool
    this.tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information about restaurants',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for finding restaurant information',
            }
          },
          required: ['query']
        }
      }
    });
  }
  
  /**
   * Register external tools from services like Smithery
   */
  private async registerExternalTools() {
    try {
      // Fetch external tools from the server
      const response = await fetch('/api/mcp/tools');
      if (!response.ok) {
        throw new Error(`Failed to fetch external tools: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.tools && Array.isArray(data.tools)) {
        // Add each external tool to our tools array
        for (const tool of data.tools) {
          // Only add if it's a valid MCPX tool
          if (
            tool.type === 'function' && 
            tool.function && 
            tool.function.name && 
            tool.function.description
          ) {
            this.tools.push(tool);
          }
        }
        
        console.log(`Registered ${data.tools.length} external tools`);
      }
    } catch (error) {
      console.error('Error registering external tools:', error);
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
    
    // Generate assistant response
    const assistantResponse = await this.generateResponse();
    this.messages.push(assistantResponse);
    
    // Process any tool calls
    if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
      // Execute each tool call
      for (const toolCall of assistantResponse.tool_calls) {
        const toolResult = await this.executeToolCall(toolCall);
        
        // Add tool result to conversation
        this.messages.push({
          role: 'tool',
          name: toolCall.function.name,
          content: toolResult.function.content,
          tool_results: [toolResult]
        });
      }
      
      // Generate follow-up response after tool calls
      const followUpResponse = await this.generateResponse();
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
      
      // Return a fallback message
      return {
        role: 'assistant',
        content: 'I apologize, but I encountered an issue while processing your request. Please try again or ask a different question.'
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
        throw new Error(`Tool execution error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Format as MCP tool result
      return {
        tool_call_id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.function.name,
          content: JSON.stringify(result)
        }
      };
    } catch (error) {
      console.error(`Error executing tool ${toolCall.function.name}:`, error);
      
      // Return error result
      return {
        tool_call_id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.function.name,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          })
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
}

// Export a function to create MCPX client
export function createMCPXClient(options: {
  restaurants: Restaurant[];
  simulationMode?: boolean;
  initialSystemPrompt?: string;
}): MCPXClient {
  return new MCPXClient(options);
}