/**
 * FireCrawl Client
 * 
 * This client interfaces with the FireCrawl MCP server, which provides 
 * robust web search and scraping capabilities.
 */

interface FireCrawlSearchParams {
  query: string;
  limit?: number;
}

interface FireCrawlScrapeParams {
  url: string;
}

interface FireCrawlResult {
  success: boolean;
  results?: any[];
  error?: string;
}

/**
 * FireCrawlClient - A client for the FireCrawl MCP server
 * This allows our booking assistant to search the web and scrape content
 */
export class FireCrawlClient {
  private initialized: boolean = false;
  private available: boolean = false;
  private apiKey: string = '';
  
  /**
   * Initialize the FireCrawl client
   * @param apiKey FireCrawl API key
   */
  async initialize(apiKey: string): Promise<boolean> {
    try {
      // Skip if already initialized
      if (this.initialized) {
        return this.available;
      }
      
      console.log('Initializing FireCrawl client...');
      
      // Validate API key
      if (!apiKey) {
        console.error('Missing API key for FireCrawl client');
        this.initialized = true;
        this.available = false;
        return false;
      }
      
      // Store the API key
      this.apiKey = apiKey;
      
      // Test connection 
      try {
        const testResponse = await fetch('/api/firecrawl/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FireCrawl-API-Key': this.apiKey
          }
        });
        
        if (testResponse.ok) {
          console.log('FireCrawl client initialized successfully');
          this.initialized = true;
          this.available = true;
          return true;
        } else {
          console.error('Failed to connect to FireCrawl');
          this.initialized = true;
          this.available = false;
          return false;
        }
      } catch (connectionError) {
        console.error('Connection error with FireCrawl:', connectionError);
        this.initialized = true;
        this.available = false;
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize FireCrawl client:', error);
      this.initialized = true;
      this.available = false;
      return false;
    }
  }
  
  /**
   * Check if the FireCrawl client is available
   */
  isAvailable(): boolean {
    return this.available;
  }
  
  /**
   * Search the web using FireCrawl
   * @param query Search query
   * @param limit Number of results to return (default: 5)
   */
  async search(query: string, limit: number = 5): Promise<any[] | null> {
    if (!this.available) {
      console.error('FireCrawl client is not available');
      return null;
    }
    
    try {
      // Execute search
      const params: FireCrawlSearchParams = {
        query: `${query} restaurant London`,
        limit
      };
      
      const response = await fetch('/api/firecrawl/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FireCrawl-API-Key': this.apiKey
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        console.error(`FireCrawl search failed with status: ${response.status}`);
        return null;
      }
      
      const result = await response.json() as FireCrawlResult;
      
      if (!result.success || !result.results) {
        console.error('FireCrawl search failed:', result.error || 'Unknown error');
        return null;
      }
      
      return result.results;
    } catch (error) {
      console.error('Error executing FireCrawl search:', error);
      return null;
    }
  }
  
  /**
   * Scrape content from a URL
   * @param url URL to scrape
   */
  async scrape(url: string): Promise<string | null> {
    if (!this.available) {
      console.error('FireCrawl client is not available');
      return null;
    }
    
    try {
      // Execute scrape
      const params: FireCrawlScrapeParams = {
        url
      };
      
      const response = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FireCrawl-API-Key': this.apiKey
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        console.error(`FireCrawl scrape failed with status: ${response.status}`);
        return null;
      }
      
      const result = await response.json() as FireCrawlResult;
      
      if (!result.success || !result.results) {
        console.error('FireCrawl scrape failed:', result.error || 'Unknown error');
        return null;
      }
      
      return result.results[0].content;
    } catch (error) {
      console.error('Error executing FireCrawl scrape:', error);
      return null;
    }
  }
  
  /**
   * Search for restaurant information
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
      searchResults: results.slice(0, 3)
    };
  }
}

// Create a singleton instance
export const fireCrawlClient = new FireCrawlClient();

export default fireCrawlClient;