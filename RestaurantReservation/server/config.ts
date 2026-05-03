/**
 * Configuration file for the application
 *
 * This file contains all the configuration settings for the application.
 * These can be overridden with environment variables or updated at runtime.
 */

export const config = {
  // Global simulation mode - set to true to prevent real API calls
  simulationMode: process.env.SIMULATION_MODE === "true",

  // Booking agent configuration
  bookingAgent: {
    // Enable real web scraping capabilities
    useRealScraping: true,
    // Enable real booking capabilities (not simulation)
    enableRealBooking: false, // Default to false for safety
    // Show additional debug information
    debug: false,
    // Default check interval in minutes
    defaultCheckInterval: 15,
    // Check interval for hard-to-book restaurants in minutes
    hardCheckInterval: 5,
    // Check interval for medium-difficulty restaurants in minutes
    mediumCheckInterval: 10,
  },

  // Database configuration (handled separately by DATABASE_URL env var)

  // API Keys (stored here for convenient access, but prefer env variables)
  SERPER_API_KEY: process.env.SERPER_API_KEY || "", // Added for Serper web search integration
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || "", // Added for FireCrawl web search integration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  KIMI_API_KEY: process.env.KIMI_API_KEY || "",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
  INTEGRATION_PROXY_TOKEN: process.env.INTEGRATION_PROXY_TOKEN || "",

  // External services configuration
  services: {
    // Email notifications enabled if SENDGRID_API_KEY is set
    emailNotifications: !!process.env.SENDGRID_API_KEY,

    // AI services
    ai: {
      enabled: !!(
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.KIMI_API_KEY ||
        process.env.DEEPSEEK_API_KEY
      ),
      preferredProvider: process.env.PREFERRED_PROVIDER ?? "",
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        kimi: !!process.env.KIMI_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
      },
    },
  },
};

export default config;
