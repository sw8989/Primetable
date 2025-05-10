/**
 * Smithery.ai MCP Tools Integration
 * 
 * This module handles fetching and registering MCP tools from the Smithery.ai marketplace.
 */

import { Tool, AVAILABLE_TOOLS } from './agentProtocol';

/**
 * Fetch available MCP tools from the API
 */
export async function fetchSmitheryTools(): Promise<Tool[]> {
  try {
    const response = await fetch('/api/mcp/tools');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Smithery MCP tools: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform Smithery tools to our Tool format
    return transformSmitheryTools(data.tools || []);
  } catch (error) {
    console.error('Error fetching Smithery MCP tools:', error);
    return [];
  }
}

/**
 * Transform raw Smithery tool data to our Tool format
 */
function transformSmitheryTools(smitheryTools: any[]): Tool[] {
  return smitheryTools.map(tool => {
    // Extract required parameters
    const requiredParams = Object.entries(tool.parameters || {})
      .filter(([_, value]: [string, any]) => !value.optional)
      .map(([key]) => key);
    
    return {
      name: tool.name,
      description: tool.description || `Smithery tool: ${tool.name}`,
      parameters: tool.parameters || {},
      required_parameters: requiredParams
    };
  });
}

/**
 * Register Smithery tools with our local tool registry
 */
export async function registerSmitheryTools(): Promise<Tool[]> {
  const smitheryTools = await fetchSmitheryTools();
  
  if (smitheryTools.length === 0) {
    console.log('No Smithery tools available or could not fetch tools');
    return AVAILABLE_TOOLS;
  }
  
  // Filter out any smithery tools that might conflict with our existing tools
  const existingToolNames = new Set(AVAILABLE_TOOLS.map(t => t.name));
  const uniqueSmitheryTools = smitheryTools.filter(t => !existingToolNames.has(t.name));
  
  // Log the available tools
  console.log(`Registered ${uniqueSmitheryTools.length} Smithery MCP tools:`);
  uniqueSmitheryTools.forEach(tool => console.log(` - ${tool.name}: ${tool.description}`));
  
  // Return merged tools
  return [...AVAILABLE_TOOLS, ...uniqueSmitheryTools];
}

/**
 * Initialize Smithery integration
 */
export async function initializeSmitheryMCP(): Promise<boolean> {
  try {
    const tools = await registerSmitheryTools();
    return tools.length > AVAILABLE_TOOLS.length;
  } catch (error) {
    console.error('Error initializing Smithery MCP:', error);
    return false;
  }
}