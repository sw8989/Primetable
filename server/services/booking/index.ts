/**
 * Booking Service Orchestrator
 * 
 * Central service that manages booking requests and delegates to the appropriate
 * platform-specific implementation based on the restaurant's booking platform.
 */

import { Restaurant } from '@shared/schema';
import { BookingPlatformService, BookingRequest, BookingResult } from './interfaces';
import { OpenTableBookingService } from './opentable';
import { config } from '../../config';

// Map of platform names to their service implementations
const bookingServices: Record<string, BookingPlatformService> = {
  'OpenTable': new OpenTableBookingService(),
  // Add other platforms as they are implemented
  // 'Resy': new ResyBookingService(),
  // 'SevenRooms': new SevenRoomsBookingService(),
  // 'Tock': new TockBookingService(),
};

export class BookingServiceOrchestrator {
  private simulationMode: boolean;
  private defaultService: BookingPlatformService;
  
  constructor() {
    this.simulationMode = process.env.SIMULATION_MODE === 'true' || !config.bookingAgent.enableRealBooking;
    this.defaultService = new OpenTableBookingService(); // Default to OpenTable for now
    
    console.log(`BookingServiceOrchestrator initialized, simulation mode: ${this.simulationMode}`);
  }
  
  /**
   * Book a table, using the appropriate service based on the restaurant's platform
   */
  async bookTable(restaurant: Restaurant, bookingRequest: BookingRequest): Promise<BookingResult> {
    if (!restaurant) {
      return {
        success: false,
        status: 'failed',
        error: 'Restaurant not found',
        logs: [`[${new Date().toISOString()}] Restaurant not found`]
      };
    }
    
    console.log(`Processing booking request for ${restaurant.name} on platform ${restaurant.bookingPlatform}`);
    
    // Get the appropriate booking service
    const bookingService = this.getBookingService(restaurant.bookingPlatform);
    if (!bookingService) {
      return {
        success: false,
        status: 'failed',
        error: `Booking platform '${restaurant.bookingPlatform}' not supported`,
        logs: [`[${new Date().toISOString()}] Booking platform '${restaurant.bookingPlatform}' not supported`]
      };
    }
    
    try {
      // Delegate to the platform-specific implementation
      return await bookingService.bookTable(restaurant, bookingRequest);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: `Booking error: ${error.message || error}`,
        logs: [`[${new Date().toISOString()}] Booking error: ${error.message || error}`]
      };
    }
  }
  
  /**
   * Get the appropriate booking service for the given platform
   */
  private getBookingService(platformName: string): BookingPlatformService | null {
    // Handle case differences
    const normalizedPlatform = platformName?.trim().toLowerCase();
    
    // Look for an exact match
    for (const [platform, service] of Object.entries(bookingServices)) {
      if (platform.toLowerCase() === normalizedPlatform) {
        return service;
      }
    }
    
    // If not found, but we have a default, use it
    if (this.defaultService) {
      console.log(`No service found for platform '${platformName}', using default service`);
      return this.defaultService;
    }
    
    return null;
  }
  
  /**
   * Update platform-specific details for a restaurant
   */
  async updatePlatformDetails(restaurant: Restaurant): Promise<boolean> {
    // This method would be implemented to update platform-specific details
    // by scraping the restaurant's booking page
    return true;
  }
}

// Export a singleton instance
export const bookingService = new BookingServiceOrchestrator();