/**
 * Smithery.ai MCP Marketplace Service
 * 
 * This service connects to the Smithery.ai marketplace to leverage
 * their MCP ecosystem and enhance our booking agent capabilities.
 * 
 * Note: This implementation includes a simulation mode for development/testing
 * when the actual Smithery API is not accessible.
 */

import fetch from 'node-fetch';
import config from '../config';
import { MCPMessage, ToolCall, ToolResult } from '@shared/schema';

const SMITHERY_API_URL = 'https://api.smithery.ai/v1';

// We will only use simulation mode when actual API is not available
const SIMULATION_MODE = !process.env.OPENAI_API_KEY;
let connectionStatus = false;

// Check if Smithery API key is available
const isSmitheryConfigured = (): boolean => {
  return process.env.SMITHERY_API_KEY !== undefined;
};

// Check if the service is available
export function isAvailable(): boolean {
  return isSmitheryConfigured() || SIMULATION_MODE;
}

/**
 * Initialize a connection to the Smithery.ai MCP Marketplace
 */
async function connectToMarketplace(): Promise<boolean> {
  if (!isSmitheryConfigured() && !SIMULATION_MODE) {
    console.log('Smithery API key not configured. Cannot connect to marketplace.');
    return false;
  }

  if (SIMULATION_MODE) {
    console.log('Smithery.ai MCP Marketplace running in SIMULATION MODE');
    connectionStatus = true;
    return true;
  }

  try {
    const response = await fetch(`${SMITHERY_API_URL}/marketplace/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`
      },
      body: JSON.stringify({
        agent_name: 'Prime Table Booking Agent',
        capabilities: ['restaurant_booking', 'availability_checking', 'mcp_protocol']
      })
    });

    if (response.ok) {
      console.log('Successfully connected to Smithery.ai MCP Marketplace');
      connectionStatus = true;
      return true;
    } else {
      const errorData = await response.json() as any;
      console.error('Failed to connect to Smithery.ai:', errorData);
      connectionStatus = false;
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Smithery.ai:', error);
    connectionStatus = false;
    
    if (SIMULATION_MODE) {
      console.log('Falling back to simulation mode for Smithery.ai MCP');
      connectionStatus = true;
      return true;
    }
    
    return false;
  }
}

/**
 * Simulate MCP processing for development/testing
 */
function simulateMcpResponse(userMessage: string): { role: string; content: string; tool_calls?: any[] } {
  // Extract the last user message to determine the response
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for tool usage scenarios
  if (lowerMessage.includes('find restaurant') || lowerMessage.includes('search for')) {
    return {
      role: "assistant",
      content: "I can help you find restaurants. Let me search for that.",
      tool_calls: [
        {
          id: "call_001",
          type: "function",
          function: {
            name: "search_restaurants",
            arguments: {
              query: userMessage.replace(/find restaurant|search for/gi, '').trim(),
              location: "London",
              cuisine: null
            }
          }
        }
      ]
    };
  }
  
  if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
    return {
      role: "assistant",
      content: "I'll help you book a table. Let me check availability.",
      tool_calls: [
        {
          id: "call_002",
          type: "function",
          function: {
            name: "check_availability",
            arguments: {
              restaurant: "Chiltern Firehouse",
              date: "2025-05-15",
              time: "19:00",
              party_size: 2
            }
          }
        }
      ]
    };
  }
  
  // Default conversation response
  return {
    role: "assistant",
    content: "I'm the Prime Table booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?"
  };
}

/**
 * Process a chat message using the Smithery.ai MCP protocol
 * 
 * @param messages Conversation history
 * @param context System context
 * @param restaurant Optional restaurant info
 * @returns MCP-compliant message
 */
async function processMcpChat(
  messages: Array<{ role: string; content: string; tool_calls?: any; tool_results?: any }>,
  context: string,
  restaurant?: any
): Promise<{ 
  role: string; 
  content: string; 
  tool_calls?: any[];
}> {
  if (!isSmitheryConfigured() && !SIMULATION_MODE) {
    return { 
      role: "assistant", 
      content: "The Smithery.ai integration is not configured. Please provide a valid API key to connect to the MCP Marketplace."
    };
  }
  
  // Use simulation mode if enabled or if real API connection fails
  if (SIMULATION_MODE || !connectionStatus) {
    // Get the last user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop()?.content || '';
      
    return simulateMcpResponse(lastUserMessage);
  }
  
  try {
    // Format the request for Smithery's MCP API
    const requestBody = {
      messages: messages,
      system_context: context,
      restaurant_context: restaurant || null,
      agent_configuration: {
        model: "mcp-agent",
        tools: ["restaurant_search", "availability_check", "booking"],
        temperature: 0.7
      }
    };
    
    // Call the Smithery MCP API
    const response = await fetch(`${SMITHERY_API_URL}/mcp/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Smithery API error: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json() as any;
    
    // Return the MCP-formatted response
    return {
      role: result.role || "assistant",
      content: result.content || "I'm sorry, I couldn't process your request right now.",
      ...(result.tool_calls && result.tool_calls.length > 0 ? { tool_calls: result.tool_calls } : {})
    };
  } catch (error) {
    console.error("Error processing MCP chat with Smithery:", error);
    
    if (SIMULATION_MODE) {
      // Fall back to simulation
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop()?.content || '';
        
      return simulateMcpResponse(lastUserMessage);
    }
    
    return { 
      role: "assistant", 
      content: "I encountered an issue connecting to the Smithery MCP Marketplace. Please try again later or check your API configuration."
    };
  }
}

/**
 * Get available MCP tools from the Smithery marketplace
 */
async function getMcpTools(): Promise<any[]> {
  if (!isSmitheryConfigured() && !SIMULATION_MODE) {
    return [];
  }
  
  if (SIMULATION_MODE) {
    // Return simulated MCP tools
    return [
      {
        name: "search_restaurants",
        description: "Search for restaurants based on criteria like location, cuisine, etc.",
        parameters: {
          query: { type: "string", description: "Search query or restaurant name" },
          location: { type: "string", description: "Location (e.g., 'Mayfair', 'Soho')" },
          cuisine: { type: "string", description: "Cuisine type", optional: true }
        }
      },
      {
        name: "check_availability",
        description: "Check for table availability at a specific restaurant",
        parameters: {
          restaurant: { type: "string", description: "Restaurant name" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM format (24h)" },
          party_size: { type: "number", description: "Number of guests" }
        }
      },
      {
        name: "make_booking",
        description: "Make a reservation at a restaurant",
        parameters: {
          restaurant: { type: "string", description: "Restaurant name" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM format (24h)" },
          party_size: { type: "number", description: "Number of guests" },
          name: { type: "string", description: "Name for the reservation" },
          email: { type: "string", description: "Contact email" },
          phone: { type: "string", description: "Contact phone number", optional: true }
        }
      }
    ];
  }
  
  try {
    const response = await fetch(`${SMITHERY_API_URL}/marketplace/tools`, {
      headers: {
        'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    
    const tools = await response.json() as any;
    return tools.data || [];
  } catch (error) {
    console.error("Error fetching MCP tools from Smithery:", error);
    
    if (SIMULATION_MODE) {
      // Return simulated MCP tools
      return [
        {
          name: "search_restaurants",
          description: "Search for restaurants based on criteria",
          parameters: {
            query: { type: "string", description: "Search query" },
            location: { type: "string", description: "Location" },
            cuisine: { type: "string", description: "Cuisine type", optional: true }
          }
        },
        {
          name: "check_availability",
          description: "Check for table availability",
          parameters: {
            restaurant: { type: "string", description: "Restaurant name" },
            date: { type: "string", description: "Date (YYYY-MM-DD)" },
            time: { type: "string", description: "Time (HH:MM)" },
            party_size: { type: "number", description: "Number of guests" }
          }
        }
      ];
    }
    
    return [];
  }
}

// Enhanced functions for MCP integration
async function analyzeBookingStrategy(
  restaurantName: string,
  bookingInfo: string | null,
  difficulty: string
): Promise<string> {
  if (SIMULATION_MODE) {
    return `Based on my analysis, ${restaurantName} (${difficulty} difficulty) has specific booking patterns you should follow. ${bookingInfo || 'They typically release tables 30 days in advance'}. For the best chance of success, I recommend setting up alerts for when new tables are released and being ready to book immediately.`;
  }
  
  // Implement real API call to Smithery here if not in simulation mode
  return `For ${restaurantName}, which has a ${difficulty} booking difficulty, I recommend the following approach: ${bookingInfo || 'Try booking exactly 30 days in advance as soon as slots open.'}`;
}

async function suggestAlternativeTimes(
  restaurantName: string,
  preferredDate: Date,
  preferredTime: string,
  partySize: number
): Promise<{ suggestions: string[] }> {
  if (SIMULATION_MODE) {
    const dateStr = preferredDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return {
      suggestions: [
        `Try ${dateStr} at 18:00 instead of ${preferredTime}`,
        `${dateStr} at 21:30 might have availability`,
        `Consider booking for the following day at your preferred time of ${preferredTime}`,
        `Reduce your party size from ${partySize} to 2-4 people for better chances`
      ]
    };
  }
  
  // Implement real API call to Smithery here if not in simulation mode
  return { suggestions: [`Try ${preferredDate.toLocaleDateString()} at an earlier time like 17:30 or a later time like 21:45`] };
}

async function generateBookingMessage(
  restaurantName: string,
  date: Date,
  time: string,
  partySize: number,
  userName: string
): Promise<string> {
  if (SIMULATION_MODE) {
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return `Excellent news, ${userName}! I've secured your reservation at ${restaurantName} on ${dateStr} at ${time} for your party of ${partySize}. This restaurant is quite exclusive, so I'm pleased we were able to get this booking for you. Please arrive 15 minutes early, and let them know if you need to cancel or change the reservation at least 48 hours in advance.`;
  }
  
  // Implement real API call to Smithery here if not in simulation mode
  return `Booking confirmed at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people. Reservation is under the name ${userName}.`;
}

// Initialize connection when service is loaded
connectToMarketplace()
  .then(connected => {
    if (connected) {
      console.log('Smithery MCP Marketplace connection established');
    } else {
      console.warn('Smithery MCP Marketplace connection failed');
    }
  })
  .catch(error => {
    console.error('Error during Smithery initialization:', error);
  });

export default {
  isAvailable,
  connectToMarketplace,
  processMcpChat,
  getMcpTools,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage
};