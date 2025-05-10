import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Custom function to create Smithery URL since the SDK might have changed
function createSmitheryUrl(endpoint: string, options: { config: any, apiKey: string }): string {
  const { config, apiKey } = options;
  const apiKeyParam = `smithery_api_key=${encodeURIComponent(apiKey)}`;
  const configParam = `config=${encodeURIComponent(JSON.stringify(config))}`;
  return `${endpoint}?${apiKeyParam}&${configParam}`;
}

// Serper is a search and scrape tool from Smithery
// Define interfaces for Serper tool
interface SerperToolResult {
  success: boolean;
  results?: any[];
  error?: string;
}

interface SerperSearchParams {
  query: string;
  country?: string;
  limit?: number;
}

interface SerperScrapeParams {
  url: string;
}

/**
 * SerperMcpClient - A client for the Serper MCP server
 * This allows our booking assistant to search the web for restaurant information
 */
export class SerperMcpClient {
  private client: Client | null = null;
  private initialized: boolean = false;
  private available: boolean = false;

  /**
   * Initialize the Serper MCP client
   * @param apiKey Smithery API key
   * @param serperApiKey Serper API key
   */
  async initialize(apiKey: string, serperApiKey: string): Promise<boolean> {
    try {
      // Skip if already initialized
      if (this.initialized) {
        return this.available;
      }
      
      console.log('Initializing Serper MCP client...');
      
      // Create Smithery URL with configuration
      const config = {
        serperApiKey
      };
      
      const serverUrl = createSmitheryUrl(
        "https://server.smithery.ai/@marcopesani/mcp-server-serper", 
        { config, apiKey }
      );
      
      // Create transport and client
      const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
      this.client = new Client({
        name: "Prime Table",
        version: "1.0.0"
      });
      
      // Connect to the MCP server
      await this.client.connect(transport);
      
      // List available tools
      const tools = await this.client.listTools();
      const toolNames = tools && Array.isArray(tools) ? tools.map((t: any) => t.name).join(", ") : "none";
      console.log(`Available Serper tools: ${toolNames}`);
      
      this.initialized = true;
      this.available = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Serper MCP client:', error);
      this.initialized = true;
      this.available = false;
      return false;
    }
  }
  
  /**
   * Check if the Serper MCP client is available
   */
  isAvailable(): boolean {
    return this.available;
  }
  
  /**
   * Search the web for the given query
   * @param query Search query
   * @param country Country code (default: 'gb' for UK)
   * @param limit Number of results to return (default: 10)
   */
  async search(query: string, country: string = 'gb', limit: number = 10): Promise<any[] | null> {
    if (!this.available || !this.client) {
      console.error('Serper MCP client is not available');
      return null;
    }
    
    try {
      // Execute search tool
      const params: SerperSearchParams = {
        query: `${query} restaurant London`,
        country,
        limit
      };
      
      // Use request method instead of executeTool which may not be available
      const result = await this.client.request({
        method: 'tool.execute',
        params: {
          name: 'search',
          parameters: params
        }
      }) as SerperToolResult;
      
      if (!result.success || !result.results) {
        console.error('Search failed:', result.error || 'Unknown error');
        return null;
      }
      
      return result.results;
    } catch (error) {
      console.error('Error executing search:', error);
      return null;
    }
  }
  
  /**
   * Scrape content from a URL
   * @param url URL to scrape
   */
  async scrape(url: string): Promise<string | null> {
    if (!this.available || !this.client) {
      console.error('Serper MCP client is not available');
      return null;
    }
    
    try {
      // Execute scrape tool
      const params: SerperScrapeParams = {
        url
      };
      
      const result = await this.client.executeTool('scrape', params) as SerperToolResult;
      
      if (!result.success || !result.results) {
        console.error('Scrape failed:', result.error || 'Unknown error');
        return null;
      }
      
      return result.results[0].content;
    } catch (error) {
      console.error('Error executing scrape:', error);
      return null;
    }
  }
  
  /**
   * Search for a restaurant's information
   * @param restaurantName Restaurant name
   */
  async searchRestaurant(restaurantName: string): Promise<any | null> {
    const query = `${restaurantName} restaurant London reviews booking`;
    const results = await this.search(query);
    
    if (!results || results.length === 0) {
      return null;
    }
    
    return {
      name: restaurantName,
      searchResults: results.slice(0, 5)
    };
  }
}

// Create a singleton instance
export const serperClient = new SerperMcpClient();

export default serperClient;