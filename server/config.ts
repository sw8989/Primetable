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
    // AI features enabled if OPENAI_API_KEY is set
    aiAssisted: !!process.env.OPENAI_API_KEY
  }
};

export default config;