/**
 * Puppeteer Browser MCP Service
 * 
 * Connects to Smithery's Puppeteer Browser MCP tool for web automation
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "../../config";

// Types for Puppeteer MCP tools
interface PuppeteerPage {
  id: string;
}

interface BrowseParams {
  url: string;
}

interface ClickParams {
  page: PuppeteerPage;
  selector: string;
}

interface TypeParams {
  page: PuppeteerPage;
  selector: string;
  text: string;
}

interface SelectParams {
  page: PuppeteerPage;
  selector: string;
  value: string;
}

interface WaitForSelectorParams {
  page: PuppeteerPage;
  selector: string;
  timeout?: number;
}

interface ScreenshotParams {
  page: PuppeteerPage;
  fullPage?: boolean;
}

class PuppeteerMCPService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private simulationMode: boolean;
  private tools: any[] = [];

  constructor() {
    this.simulationMode = process.env.SIMULATION_MODE === 'true';
    console.log(`PuppeteerMCPService initialized, simulation mode: ${this.simulationMode}`);
  }

  /**
   * Connect to the Smithery Puppeteer MCP server
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt to complete
      let retries = 0;
      while (this.isConnecting && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      return this.isConnected;
    }

    this.isConnecting = true;

    try {
      if (this.simulationMode) {
        console.log("Skipping real Puppeteer MCP connection in simulation mode");
        this.isConnected = true;
        this.isConnecting = false;
        return true;
      }

      console.log("Connecting to Puppeteer MCP server...");
      
      const transport = new StdioClientTransport({
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
      });
      
      this.client = new Client({
        name: "Prime Table Booking Assistant",
        version: "1.0.0"
      });
      
      await this.client.connect(transport);
      this.tools = await this.client.listTools();
      
      console.log(`Connected to Puppeteer MCP server. Available tools: ${this.tools.map(t => t.name).join(", ")}`);
      
      this.isConnected = true;
      this.isConnecting = false;
      return true;
    } catch (error) {
      console.error("Failed to connect to Puppeteer MCP server:", error);
      this.isConnected = false;
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Open a URL in the browser
   */
  async browse(url: string): Promise<{ page: PuppeteerPage, success: boolean, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Opening URL: ${url}`);
        return {
          page: { id: `sim-page-${Date.now()}` },
          success: true
        };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      const result = await this.client!.callTool("browse", { url });
      return {
        page: result.page,
        success: true
      };
    } catch (error: any) {
      console.error("Browse error:", error);
      return {
        page: { id: "" },
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Click an element on the page
   */
  async click(page: PuppeteerPage, selector: string): Promise<{ success: boolean, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Clicking selector: ${selector}`);
        return { success: true };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      await this.client!.callTool("click", { page, selector });
      return { success: true };
    } catch (error: any) {
      console.error("Click error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Type text into an input field
   */
  async type(page: PuppeteerPage, selector: string, text: string): Promise<{ success: boolean, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Typing text "${text}" into selector: ${selector}`);
        return { success: true };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      await this.client!.callTool("type", { page, selector, text });
      return { success: true };
    } catch (error: any) {
      console.error("Type error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Select an option from a dropdown
   */
  async select(page: PuppeteerPage, selector: string, value: string): Promise<{ success: boolean, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Selecting value "${value}" from selector: ${selector}`);
        return { success: true };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      await this.client!.callTool("select", { page, selector, value });
      return { success: true };
    } catch (error: any) {
      console.error("Select error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForSelector(page: PuppeteerPage, selector: string, timeout = 30000): Promise<{ success: boolean, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Waiting for selector: ${selector}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate a delay
        return { success: true };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      await this.client!.callTool("waitForSelector", { page, selector, timeout });
      return { success: true };
    } catch (error: any) {
      console.error("waitForSelector error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Take a screenshot of the page
   */
  async screenshot(page: PuppeteerPage, fullPage = true): Promise<{ success: boolean, data?: string, error?: string }> {
    try {
      if (this.simulationMode) {
        console.log(`[SIMULATION] Taking screenshot`);
        return { 
          success: true,
          data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" // Tiny 1x1 pixel transparent PNG
        };
      }

      if (!await this.connect()) {
        throw new Error("Not connected to Puppeteer MCP server");
      }

      const result = await this.client!.callTool("screenshot", { page, fullPage });
      return { 
        success: true,
        data: result.data
      };
    } catch (error: any) {
      console.error("Screenshot error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close the Puppeteer MCP client
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        // Close all pages
        await this.client.callTool("closeAll", {});
        // Disconnect
        await this.client.disconnect();
        this.isConnected = false;
        console.log("Disconnected from Puppeteer MCP server");
      } catch (error) {
        console.error("Error closing Puppeteer MCP client:", error);
      }
    }
  }
}

// Export a singleton instance
export const puppeteerMCP = new PuppeteerMCPService();