// No need for SDK imports since we're using direct API calls

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
  private initialized: boolean = false;
  private available: boolean = false;
  private apiKey: string = '';
  private serperApiKey: string = '';

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
      
      // Just validate API keys exist and store them
      if (!apiKey || !serperApiKey) {
        console.error('Missing API keys for Serper MCP client');
        this.initialized = true;
        this.available = false;
        return false;
      }
      
      // Store the API keys
      this.apiKey = apiKey;
      this.serperApiKey = serperApiKey;
      
      // We'll assume the client is available since we have the keys
      // In a real implementation, we would test the connection
      console.log('Serper MCP client initialized successfully');
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
    if (!this.available) {
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
      
      // Use the request method directly
      const result = await fetch('/api/smithery-proxy/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smithery-Api-Key': this.apiKey,
          'X-Serper-Api-Key': this.serperApiKey
        },
        body: JSON.stringify(params)
      }).then(res => res.json()) as SerperToolResult;
      
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
    if (!this.available) {
      console.error('Serper MCP client is not available');
      return null;
    }
    
    try {
      // Execute scrape tool
      const params: SerperScrapeParams = {
        url
      };
      
      // Use the request method directly
      const result = await fetch('/api/smithery-proxy/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smithery-Api-Key': this.apiKey,
          'X-Serper-Api-Key': this.serperApiKey
        },
        body: JSON.stringify(params)
      }).then(res => res.json()) as SerperToolResult;
      
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