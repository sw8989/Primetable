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

// Define the Serper web search tool schema
export const WEB_SEARCH_TOOL: Tool = {
  name: 'web_search_tool',
  description: 'Searches the web for information about restaurants using Serper',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query for finding restaurant information online'
    }
  },
  required_parameters: ['query']
};

// Define the FireCrawl web search tool schema
export const FIRECRAWL_SEARCH_TOOL: Tool = {
  name: 'firecrawl_search_tool',
  description: 'Searches the web for detailed restaurant information using FireCrawl',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query for finding detailed restaurant information online'
    }
  },
  required_parameters: ['query']
};

// Define all tools available to the agent
export const AVAILABLE_TOOLS = [
  BOOKING_TOOL,
  SEARCH_TOOL,
  AVAILABILITY_TOOL,
  WEB_SEARCH_TOOL,
  FIRECRAWL_SEARCH_TOOL
];

/**
 * Smithery Tools Implementation
 * These functions handle the tools exposed by the Smithery MCP Marketplace
 */

/**
 * Implementation for Smithery search_restaurants tool
 */
async function executeSmitherySearchTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { query, location, cuisine } = parameters;
  
  try {
    // Construct the query based on parameters
    const searchParams = new URLSearchParams();
    if (query) searchParams.append('query', query as string);
    
    // Make the search request
    const searchUrl = `/api/restaurants/search?${searchParams.toString()}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to search restaurants: ${response.status}`);
    }
    
    let restaurants = await response.json();
    
    // Apply additional filters if provided
    if (location || cuisine) {
      // Additional client-side filtering
      if (location) {
        const locationStr = (location as string).toLowerCase();
        restaurants = restaurants.filter((r: any) => 
          r.location && r.location.toLowerCase().includes(locationStr)
        );
      }
      
      if (cuisine) {
        const cuisineStr = (cuisine as string).toLowerCase();
        restaurants = restaurants.filter((r: any) => 
          r.cuisine && r.cuisine.toLowerCase().includes(cuisineStr)
        );
      }
    }
    
    return {
      result: {
        success: true,
        restaurants: restaurants,
        count: restaurants.length,
        query: query,
        filters: { location, cuisine }
      }
    };
  } catch (error) {
    console.error('Error executing Smithery search tool:', error);
    return {
      result: {
        success: false,
        restaurants: [],
        message: error instanceof Error ? error.message : 'Search failed'
      }
    };
  }
}

/**
 * Implementation for Smithery check_availability tool
 */
async function executeSmitheryAvailabilityTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { restaurant, date, time, party_size } = parameters;
  
  try {
    // First, find the restaurant by name
    let restaurantObj = null;
    
    if (typeof restaurant === 'string') {
      // Search for the restaurant by name
      const response = await fetch(`/api/restaurants/search?query=${encodeURIComponent(restaurant)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to find restaurant: ${response.status}`);
      }
      
      const restaurants = await response.json();
      
      if (restaurants && restaurants.length > 0) {
        restaurantObj = restaurants[0];
      } else {
        throw new Error(`Restaurant '${restaurant}' not found`);
      }
    } else {
      throw new Error('Restaurant name must be a string');
    }
    
    // Simulate availability check
    const isAvailable = Math.random() > 0.5; // 50% chance of availability
    const parsedDate = typeof date === 'string' ? date : new Date().toISOString().split('T')[0];
    const parsedTime = typeof time === 'string' ? time : '19:00';
    const parsedPartySize = typeof party_size === 'number' ? party_size : 2;
    
    return {
      result: {
        success: true,
        is_available: isAvailable,
        restaurant: restaurantObj,
        date: parsedDate,
        time: parsedTime,
        party_size: parsedPartySize,
        alternative_times: isAvailable ? [] : [
          // Suggest alternative times if not available
          { time: '18:00', is_available: Math.random() > 0.3 },
          { time: '21:30', is_available: Math.random() > 0.3 }
        ]
      }
    };
  } catch (error) {
    console.error('Error executing Smithery availability tool:', error);
    return {
      result: {
        success: false,
        is_available: false,
        message: error instanceof Error ? error.message : 'Availability check failed'
      }
    };
  }
}

/**
 * Implementation for Smithery make_booking tool
 */
async function executeSmitheryBookingTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { restaurant, date, time, party_size, name, email } = parameters;
  
  try {
    // First, find the restaurant by name
    let restaurantId = null;
    
    if (typeof restaurant === 'string') {
      // Search for the restaurant by name
      const response = await fetch(`/api/restaurants/search?query=${encodeURIComponent(restaurant)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to find restaurant: ${response.status}`);
      }
      
      const restaurants = await response.json();
      
      if (restaurants && restaurants.length > 0) {
        restaurantId = restaurants[0].id;
      } else {
        throw new Error(`Restaurant '${restaurant}' not found`);
      }
    } else {
      throw new Error('Restaurant name must be a string');
    }
    
    // Construct the booking request
    const bookingData = {
      restaurantId: restaurantId,
      userId: 1, // Default user ID
      date: typeof date === 'string' ? new Date(date).toISOString() : new Date().toISOString(),
      time: typeof time === 'string' ? time : '19:00',
      partySize: typeof party_size === 'number' ? party_size : 2,
      status: 'pending',
      agentStatus: 'active',
      specialRequests: `Name: ${name || 'Guest'}, Email: ${email || 'guest@example.com'}`,
      useRealScraping: false // Use simulation mode by default
    };
    
    // Make the booking request
    const bookingResponse = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    
    if (!bookingResponse.ok) {
      throw new Error(`Failed to create booking: ${bookingResponse.status}`);
    }
    
    const booking = await bookingResponse.json();
    
    return {
      result: {
        success: true,
        booking: booking,
        message: `Successfully booked table at ${restaurant} for ${bookingData.date} at ${time}`
      }
    };
  } catch (error) {
    console.error('Error executing Smithery booking tool:', error);
    return {
      result: {
        success: false,
        message: error instanceof Error ? error.message : 'Booking failed'
      }
    };
  }
}

/**
 * Executes a tool call and returns the result
 */
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  try {
    // Handle Smithery MCP tools first
    if (toolCall.tool === 'search_restaurants') {
      return await executeSmitherySearchTool(toolCall.parameters);
    } else if (toolCall.tool === 'check_availability') {
      return await executeSmitheryAvailabilityTool(toolCall.parameters);
    } else if (toolCall.tool === 'make_booking') {
      return await executeSmitheryBookingTool(toolCall.parameters);
    } else if (toolCall.tool === 'web_search_tool') {
      return await executeWebSearchTool(toolCall.parameters);
    } else if (toolCall.tool === 'firecrawl_search_tool') {
      return await executeFireCrawlSearchTool(toolCall.parameters);
    }
    
    // Handle legacy tools
    switch (toolCall.tool) {
      case 'booking_tool':
        return await executeBookingTool(toolCall.parameters);
      case 'search_restaurants_tool':
        return await executeSearchTool(toolCall.parameters);
      case 'check_availability_tool':
        return await executeAvailabilityTool(toolCall.parameters);
      default:
        console.warn(`Unknown tool: ${toolCall.tool}, falling back to simulated response`);
        return {
          result: {
            success: true,
            message: `Simulated response for ${toolCall.tool}`,
            parameters: toolCall.parameters
          }
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
 * Implementation of firecrawl_search_tool
 * This tool allows the agent to search the web for restaurant information
 * using the FireCrawl client - a more advanced search tool
 */
async function executeFireCrawlSearchTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { query } = parameters;
  
  // Validate required parameters
  if (!query) {
    return {
      result: {},
      error: 'Missing required parameter "query" for firecrawl_search_tool'
    };
  }
  
  try {
    console.log(`Executing FireCrawl search for: ${query}`);
    
    // First try using the FireCrawl proxy endpoint
    try {
      // Make a direct request to our proxy endpoint
      const response = await fetch('/api/firecrawl/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query as string
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.results && result.results.length > 0) {
          console.log(`FireCrawl search successful with ${result.results.length} results`);
          return {
            result: {
              success: true,
              results: result.results,
              count: result.results.length,
              query: query,
              provider: 'FireCrawl'
            }
          };
        }
      }
      
      console.log('FireCrawl search through proxy endpoint failed, falling back to simulation');
    } catch (proxyError) {
      console.error('Error with FireCrawl search:', proxyError);
    }
    
    // Fallback to simulated response
    console.log('Generating simulated FireCrawl search results');
    const queryStr = query as string;
    const simulatedResults = [
      {
        title: `${queryStr} - Fine Dining in London (FireCrawl)`,
        link: `https://example.com/london-restaurants/${queryStr.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `${queryStr} is one of London's premier dining experiences. Located in an elegant setting with exceptional service. Advance bookings essential.`
      },
      {
        title: `${queryStr} - Michelin Guide London`,
        link: `https://example.com/michelin/${queryStr.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `${queryStr} has received recognition for its innovative approach to fine dining. Chef's tasting menu available with wine pairings.`
      },
      {
        title: `${queryStr} - Advanced Reservations System`,
        link: `https://example.com/booking-system/${queryStr.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `Making a reservation at ${queryStr}. The restaurant typically releases tables 60 days in advance and they are quickly booked. Special occasions can be noted during booking.`
      }
    ];
    
    return {
      result: {
        success: true,
        results: simulatedResults,
        count: simulatedResults.length,
        query: query,
        provider: 'FireCrawl',
        simulation: true
      }
    };
  } catch (error) {
    console.error('Error executing FireCrawl search tool:', error);
    
    // Even if everything fails, still return a graceful simulated response
    return {
      result: {
        success: true,
        results: [
          {
            title: `${query as string} - Restaurant Information (FireCrawl)`,
            link: `https://example.com/fallback`,
            snippet: `Information about ${query as string}. Unable to search for more details at this time.`
          }
        ],
        count: 1,
        query: query,
        provider: 'FireCrawl',
        simulation: true,
        fallback: true
      }
    };
  }
}

/**
 * Implementation of web_search_tool
 * This tool allows the agent to search the web for restaurant information
 * using the Serper MCP client
 */
async function executeWebSearchTool(parameters: Record<string, unknown>): Promise<ToolResult> {
  const { query } = parameters;
  
  // Validate required parameters
  if (!query) {
    return {
      result: {},
      error: 'Missing required parameter "query" for web_search_tool'
    };
  }
  
  try {
    console.log(`Executing web search for: ${query}`);
    
    // First try using the proxy endpoint
    try {
      // Make a direct request to our proxy endpoint
      const response = await fetch('/api/smithery-proxy/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query as string
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.results && result.results.length > 0) {
          console.log(`Web search successful with ${result.results.length} results`);
          return {
            result: {
              success: true,
              results: result.results,
              count: result.results.length,
              query: query
            }
          };
        }
      }
      
      console.log('Search through proxy endpoint failed, falling back to simulation');
    } catch (proxyError) {
      console.error('Error with proxy search:', proxyError);
    }
    
    // Fallback to simulated response
    console.log('Generating simulated search results');
    const queryStr = query as string;
    const simulatedResults = [
      {
        title: `${queryStr} - London Restaurant Guide`,
        link: `https://example.com/restaurants/${queryStr.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `Information about ${queryStr}. Located in London, this restaurant offers exceptional dining experiences. Opening hours and reservation details available.`
      },
      {
        title: `Reviews for ${queryStr} - Top Rated London Dining`,
        link: `https://example.com/reviews/${queryStr.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `See reviews for ${queryStr}. Featuring signature dishes and a sophisticated ambience. Booking recommended as tables fill quickly.`
      }
    ];
    
    return {
      result: {
        success: true,
        results: simulatedResults,
        count: simulatedResults.length,
        query: query,
        simulation: true
      }
    };
  } catch (error) {
    console.error('Error executing web search tool:', error);
    
    // Even if everything fails, still return a graceful simulated response
    return {
      result: {
        success: true,
        results: [
          {
            title: `${query as string} - Restaurant Information`,
            link: `https://example.com/fallback`,
            snippet: `Information about ${query as string}. Unable to search for more details at this time.`
          }
        ],
        count: 1,
        query: query,
        simulation: true,
        fallback: true
      }
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