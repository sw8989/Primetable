/**
 * Smithery.ai MCP Tools Integration
 * 
 * This module handles fetching and registering MCP tools from the Smithery.ai marketplace.
 */

import { Tool } from './agentProtocol';

// Cache the tools to avoid repeated API calls
let cachedTools: Tool[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetch available MCP tools from the API
 */
export async function fetchSmitheryTools(): Promise<Tool[]> {
  // Use cache if it's still valid
  const now = Date.now();
  if (cachedTools.length > 0 && now - lastFetchTime < CACHE_TTL) {
    console.log('Using cached Smithery tools');
    return cachedTools;
  }

  try {
    console.log('Fetching Smithery MCP tools from API');
    const response = await fetch('/api/mcp/tools');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Smithery tools: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.tools || !Array.isArray(data.tools)) {
      throw new Error('Invalid response format for Smithery tools');
    }
    
    // Transform the tools to match our internal format
    const tools = transformSmitheryTools(data.tools);
    
    // Update cache
    cachedTools = tools;
    lastFetchTime = now;
    
    return tools;
  } catch (error) {
    console.error('Error fetching Smithery tools:', error);
    // If cache exists, return it even if expired
    if (cachedTools.length > 0) {
      console.warn('Using expired Smithery tools cache due to fetch error');
      return cachedTools;
    }
    // If no cache, return empty array
    return [];
  }
}

/**
 * Transform raw Smithery tool data to our Tool format
 */
function transformSmitheryTools(smitheryTools: any[]): Tool[] {
  return smitheryTools.map(tool => {
    // Extract required parameters
    const requiredParameters = Object.keys(tool.parameters || {})
      .filter(param => {
        const paramInfo = tool.parameters[param];
        return !paramInfo.optional;
      });
    
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {},
      required_parameters: requiredParameters
    };
  });
}

/**
 * Register Smithery tools with our local tool registry
 */
export async function registerSmitheryTools(): Promise<Tool[]> {
  const tools = await fetchSmitheryTools();
  console.log(`Registered ${tools.length} Smithery MCP tools`);
  return tools;
}

/**
 * Initialize Smithery integration
 */
export async function initializeSmitheryMCP(): Promise<boolean> {
  try {
    console.log('Initializing Smithery MCP integration...');
    
    // Pre-fetch tools to warm up the cache
    const tools = await fetchSmitheryTools();
    console.log(`Smithery MCP initialized with ${tools.length} tools`);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Smithery MCP:', error);
    return false;
  }
}