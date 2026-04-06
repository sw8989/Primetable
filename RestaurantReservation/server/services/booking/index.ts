/**
 * Booking Service Orchestrator
 * 
 * This service coordinates between different booking platforms and provides
 * a unified interface for booking tables at restaurants.
 */

import { Restaurant } from '@shared/schema';
import { BookingPlatformService, BookingRequest, BookingResult } from './interfaces';
import { config } from '../../config';

class BookingService {
  private platforms: Map<string, BookingPlatformService> = new Map();
  
  // Register a specific booking platform service
  registerPlatform(platformName: string, service: BookingPlatformService) {
    this.platforms.set(platformName.toLowerCase(), service);
  }
  
  // Book a table at a restaurant
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    try {
      // Determine the platform to use
      const platformName = restaurant.bookingPlatform || 'OpenTable';
      
      // Get the platform service
      const platformService = this.platforms.get(platformName.toLowerCase());
      
      // If we have a service for this platform, use it
      if (platformService) {
        return await platformService.bookTable(restaurant, request);
      }
      
      // If we're simulating or using a fallback, return a simulated result
      if (config.simulationMode) {
        console.log(`Simulating booking for ${restaurant.name} on ${platformName}`);
        
        return {
          success: true,
          status: 'pending',
          confirmationCode: `SIM-${Math.floor(Math.random() * 1000000)}`,
          simulation: true,
          logs: [
            `[Simulation] Started booking process for ${restaurant.name}`,
            `[Simulation] Using ${platformName} platform`,
            `[Simulation] Booking successful (simulated)`,
          ]
        };
      }
      
      // No service found and not simulating
      return {
        success: false,
        status: 'failed',
        error: `No booking service available for platform: ${platformName}`,
        logs: [
          `Failed to book table: No service for ${platformName} platform`,
          `Consider adding a booking service for ${platformName}`
        ]
      };
    } catch (error: any) {
      console.error('Error in booking service:', error);
      
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Unknown error occurred during booking',
        logs: error.logs || ['An unexpected error occurred during booking']
      };
    }
  }
  
  // Check if a booking platform is supported
  isPlatformSupported(platformName: string): boolean {
    return this.platforms.has(platformName.toLowerCase());
  }
  
  // Get all supported platforms
  getSupportedPlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }
}

// Create and export the singleton instance
export const bookingService = new BookingService();

// Register platform services
// This will be done dynamically as services are imported

// Auto-initialize with some standard services
export const initializeBookingServices = async () => {
  try {
    const { OpenTableService } = await import('./opentable');
    bookingService.registerPlatform('OpenTable', new OpenTableService());
    
    // Try to load the MCP service if available
    try {
      const { OpenTableMCPService } = await import('./openTableMcp');
      bookingService.registerPlatform('OpenTableMCP', new OpenTableMCPService());
    } catch (error) {
      console.log('OpenTable MCP service not available, skipping');
    }
    
    // Add more platforms as they become available
    console.log(`Booking service initialized with platforms: ${bookingService.getSupportedPlatforms().join(', ')}`);
  } catch (error) {
    console.error('Error initializing booking services:', error);
  }
};

// Initialize services
initializeBookingServices();