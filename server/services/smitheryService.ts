/**
 * Smithery.ai MCP Marketplace Service
 * 
 * This service connects to the Smithery.ai marketplace to leverage
 * their MCP ecosystem and enhance our booking agent capabilities.
 */

import fetch from 'node-fetch';
import config from '../config';
import { MCPMessage, ToolCall, ToolResult } from '@shared/schema';

const SMITHERY_API_URL = 'https://api.smithery.ai/v1';

// Check if Smithery API key is available
const isSmitheryConfigured = (): boolean => {
  return process.env.SMITHERY_API_KEY !== undefined;
};

// Check if the service is available
export function isAvailable(): boolean {
  return isSmitheryConfigured();
}

/**
 * Initialize a connection to the Smithery.ai MCP Marketplace
 */
async function connectToMarketplace(): Promise<boolean> {
  if (!isSmitheryConfigured()) {
    console.log('Smithery API key not configured. Cannot connect to marketplace.');
    return false;
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
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to connect to Smithery.ai:', error);
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Smithery.ai:', error);
    return false;
  }
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
  if (!isSmitheryConfigured()) {
    return { 
      role: "assistant", 
      content: "The Smithery.ai integration is not configured. Please provide a valid API key to connect to the MCP Marketplace."
    };
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
      const errorData = await response.json();
      throw new Error(`Smithery API error: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Return the MCP-formatted response
    return {
      role: result.role || "assistant",
      content: result.content || "I'm sorry, I couldn't process your request right now.",
      ...(result.tool_calls && result.tool_calls.length > 0 ? { tool_calls: result.tool_calls } : {})
    };
  } catch (error) {
    console.error("Error processing MCP chat with Smithery:", error);
    
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
  if (!isSmitheryConfigured()) {
    return [];
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
    
    const tools = await response.json();
    return tools.data || [];
  } catch (error) {
    console.error("Error fetching MCP tools from Smithery:", error);
    return [];
  }
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
  getMcpTools
};