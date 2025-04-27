/**
 * MCP (Model Context Protocol) Implementation
 * Based on Anthropic's protocol: https://docs.anthropic.com/en/docs/agents-and-tools/mcp
 * 
 * This implements a simplified version of the protocol for our booking agent
 */

import type { Restaurant, Booking } from '@shared/schema';

// Tool definitions

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required_parameters: string[];
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  result: Record<string, unknown>;
  error?: string;
}

// MCP message types
export type MessageRole = 'user' | 'assistant' | 'tool';

export interface MCPMessage {
  role: MessageRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

// Define the booking tool schema
export const BOOKING_TOOL: Tool = {
  name: 'booking_tool',
  description: 'Creates a booking at a specified restaurant',
  parameters: {
    restaurant_id: {
      type: 'number',
      description: 'The ID of the restaurant to book'
    },
    date: {
      type: 'string',
      description: 'The date of the booking in YYYY-MM-DD format'
    },
    time: {
      type: 'string',
      description: 'The time of the booking in 24-hour format (HH:MM)'
    },
    party_size: {
      type: 'number',
      description: 'The number of people in the party'
    },
    special_requests: {
      type: 'string',
      description: 'Any special requests for the booking (optional)'
    },
    use_real_scraping: {
      type: 'boolean',
      description: 'Whether to use real web scraping to check availability'
    }
  },
  required_parameters: ['restaurant_id', 'date', 'time', 'party_size', 'use_real_scraping']
};

// Define the restaurant search tool schema
export const SEARCH_TOOL: Tool = {
  name: 'search_restaurants_tool',
  description: 'Searches for restaurants by cuisine, location, or other criteria',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query'
    },
    cuisine: {
      type: 'string',
      description: 'Type of cuisine (optional)'
    },
    location: {
      type: 'string',
      description: 'London location (optional)'
    },
    difficulty: {
      type: 'string',
      description: 'Booking difficulty level (optional): easy, medium, hard'
    }
  },
  required_parameters: ['query']
};

// Define the availability check tool schema
export const AVAILABILITY_TOOL: Tool = {
  name: 'check_availability_tool',
  description: 'Checks if tables are available at specified restaurants',
  parameters: {
    restaurant_id: {
      type: 'number',
      description: 'The ID of the restaurant to check'
    },
    date: {
      type: 'string',
      description: 'The date to check in YYYY-MM-DD format'
    },
    time: {
      type: 'string',
      description: 'The time to check in 24-hour format (HH:MM)'
    },
    party_size: {
      type: 'number',
      description: 'The number of people in the party'
    }
  },
  required_parameters: ['restaurant_id', 'date', 'time', 'party_size']
};

// Define all tools available to the agent
export const AVAILABLE_TOOLS = [
  BOOKING_TOOL,
  SEARCH_TOOL,
  AVAILABILITY_TOOL
];

/**
 * Executes a tool call and returns the result
 */
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  try {
    switch (toolCall.tool) {
      case 'booking_tool':
        return await executeBookingTool(toolCall.parameters);
      case 'search_restaurants_tool':
        return await executeSearchTool(toolCall.parameters);
      case 'check_availability_tool':
        return await executeAvailabilityTool(toolCall.parameters);
      default:
        return {
          result: {},
          error: `Unknown tool: ${toolCall.tool}`
        };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolCall.tool}:`, error);
    return {
      result: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Implementation of booking_tool
 */
async function executeBookingTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { restaurant_id, date, time, party_size, special_requests, use_real_scraping } = parameters;
  
  // Validate required parameters
  if (!restaurant_id || !date || !time || !party_size) {
    return {
      result: {},
      error: 'Missing required parameters for booking_tool'
    };
  }
  
  try {
    // Construct the booking request
    const bookingData = {
      restaurantId: restaurant_id as number,
      userId: 1, // Default user ID if not available
      date: new Date(date as string).toISOString(),
      time: time as string,
      partySize: party_size as number,
      specialRequests: (special_requests as string) || '',
      status: 'pending',
      useScraper: use_real_scraping as boolean
    };
    
    // Make the API call
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    
    if (!response.ok) {
      throw new Error(`Booking failed with status: ${response.status}`);
    }
    
    const booking = await response.json();
    
    return {
      result: {
        success: true,
        booking: booking,
        message: 'Booking created successfully'
      }
    };
  } catch (error) {
    return {
      result: {
        success: false
      },
      error: error instanceof Error ? error.message : 'Failed to create booking'
    };
  }
}

/**
 * Implementation of search_restaurants_tool
 */
async function executeSearchTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { query, cuisine, location, difficulty } = parameters;
  
  // Validate required parameters
  if (!query) {
    return {
      result: {},
      error: 'Missing required parameters for search_restaurants_tool'
    };
  }
  
  try {
    // Construct the search URL
    let searchUrl = `/api/restaurants/search?q=${encodeURIComponent(query as string)}`;
    
    // Add optional filters if present
    const filters: Record<string, string[]> = {};
    if (cuisine) filters.cuisine = [cuisine as string];
    if (location) filters.location = [location as string];
    if (difficulty) filters.difficulty = [difficulty as string];
    
    // If we have filters, use the filter endpoint instead
    let response;
    if (Object.keys(filters).length > 0) {
      response = await fetch('/api/restaurants/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });
    } else {
      response = await fetch(searchUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }
    
    const restaurants = await response.json();
    
    return {
      result: {
        success: true,
        restaurants: restaurants,
        count: restaurants.length,
        query: query
      }
    };
  } catch (error) {
    return {
      result: {
        success: false,
        restaurants: []
      },
      error: error instanceof Error ? error.message : 'Failed to search restaurants'
    };
  }
}

/**
 * Implementation of check_availability_tool
 */
async function executeAvailabilityTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { restaurant_id, date, time, party_size } = parameters;
  
  // Validate required parameters
  if (!restaurant_id || !date || !time || !party_size) {
    return {
      result: {},
      error: 'Missing required parameters for check_availability_tool'
    };
  }
  
  try {
    // In a real implementation, this would check availability against the booking platforms
    // For now, we'll simulate availability with a random result
    
    // First get the restaurant details
    const restaurantResponse = await fetch(`/api/restaurants/${restaurant_id}`);
    if (!restaurantResponse.ok) {
      throw new Error(`Failed to get restaurant details: ${restaurantResponse.status}`);
    }
    
    const restaurant = await restaurantResponse.json();
    
    // Simulate availability check
    const isAvailable = Math.random() > 0.5; // 50% chance of availability
    
    return {
      result: {
        success: true,
        is_available: isAvailable,
        restaurant: restaurant,
        date: date,
        time: time,
        party_size: party_size,
        alternative_times: isAvailable ? [] : [
          // Suggest alternative times if not available
          { time: '18:00', is_available: Math.random() > 0.3 },
          { time: '21:30', is_available: Math.random() > 0.3 }
        ]
      }
    };
  } catch (error) {
    return {
      result: {
        success: false,
        is_available: false
      },
      error: error instanceof Error ? error.message : 'Failed to check availability'
    };
  }
}