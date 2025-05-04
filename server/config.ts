/**
 * Configuration file for the application
 * 
 * This file contains all the configuration settings for the application.
 * These can be overridden with environment variables or updated at runtime.
 */

export const config = {
  // Booking agent configuration
  bookingAgent: {
    // Enable real web scraping capabilities
    useRealScraping: true,
    // Show additional debug information
    debug: false,
    // Default check interval in minutes
    defaultCheckInterval: 15,
    // Check interval for hard-to-book restaurants in minutes
    hardCheckInterval: 5,
    // Check interval for medium-difficulty restaurants in minutes
    mediumCheckInterval: 10
  },
  
  // Database configuration (handled separately by DATABASE_URL env var)
  
  // External services configuration
  services: {
    // Email notifications enabled if SENDGRID_API_KEY is set
    emailNotifications: !!process.env.SENDGRID_API_KEY,
    
    // AI services
    ai: {
      // AI features enabled if any AI provider is available
      enabled: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY),
      
      // Provider preferences - prioritize in order: Anthropic, DeepSeek, OpenAI
      preferredProvider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 
                         process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai',
      
      // Provider availability
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY
      }
    }
  }
};

export default config;