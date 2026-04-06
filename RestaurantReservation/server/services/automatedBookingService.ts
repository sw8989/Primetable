/**
 * Automated Booking Service
 * 
 * This service handles automated booking requests for restaurants using
 * various booking platforms and methods.
 */

import { storage } from '../storage';
import { bookingService } from './booking';
import { Restaurant } from '@shared/schema';

// Define the booking request interface
interface BookingRequest {
  restaurantName: string;
  platformId: string;
  platform: string;
  date: Date;
  time: string;
  partySize: number;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  specialRequests?: string;
  bookingUrl?: string;
}

// Define supported booking platforms
const SUPPORTED_PLATFORMS = ['OpenTable', 'Resy', 'SevenRooms', 'Tock', 'Other'];

class AutomatedBookingService {
  // Check if the platform is supported
  isPlatformSupported(platform: string): boolean {
    return SUPPORTED_PLATFORMS.includes(platform);
  }
  
  // Execute a booking request
  async executeBooking(request: BookingRequest): Promise<any> {
    try {
      console.log(`Processing booking for ${request.restaurantName} on ${request.platform}`);
      
      // Find the restaurant by name if available
      let restaurant: Restaurant | undefined;
      
      if (request.restaurantName) {
        restaurant = await storage.getRestaurantByName(request.restaurantName);
      }
      
      // If restaurant not found, create a minimal restaurant object
      if (!restaurant) {
        restaurant = {
          id: 0,
          name: request.restaurantName,
          description: '',
          cuisine: '',
          location: '',
          imageUrl: null,
          bookingDifficulty: 'medium',
          bookingInfo: '',
          bookingPlatform: request.platform,
          platformId: request.platformId,
          bookingUrl: request.bookingUrl || null,
          bookingNotes: null,
          websiteUrl: null,
          platformDetails: null,
          bookingSelectors: null,
          releaseStrategy: null,
          lastScrapedAt: null
        };
      }
      
      // Create the booking request for the booking service
      const serviceRequest = {
        restaurantId: restaurant.id,
        userId: 1, // Default user ID
        date: request.date,
        time: request.time,
        partySize: request.partySize,
        specialRequests: request.specialRequests,
        name: request.userName,
        email: request.userEmail,
        phone: request.userPhone
      };
      
      // Call the booking service - must ensure restaurant is defined
      const result = await bookingService.bookTable(restaurant!, serviceRequest);
      
      // Create a standardized result
      const response = {
        success: result.success,
        message: result.success ? 
          `Successfully tested booking at ${request.restaurantName}` : 
          result.error || 'Failed to process booking',
        booking: result.success ? {
          id: Date.now(),
          restaurantName: request.restaurantName,
          date: request.date.toISOString().split('T')[0],
          time: request.time,
          partySize: request.partySize,
          status: result.status || 'pending',
          confirmationCode: result.confirmationCode
        } : undefined,
        logs: result.logs || [],
        simulation: result.simulation || false
      };
      
      return response;
    } catch (error: any) {
      console.error('Error in automated booking service:', error);
      
      return {
        success: false,
        message: `Error: ${error.message || 'Unknown error occurred'}`,
        logs: error.logs || []
      };
    }
  }

  // Create a new booking in the database (for testing purposes)
  async createBooking(request: any): Promise<any> {
    try {
      // Find the restaurant
      const restaurant = await storage.getRestaurant(request.restaurantId);
      
      if (!restaurant) {
        return {
          success: false,
          message: 'Restaurant not found'
        };
      }
      
      // Create a booking record with fields that match schema
      const booking = await storage.createBooking({
        userId: request.userId,
        restaurantId: request.restaurantId,
        date: request.date.toISOString().split('T')[0],
        time: request.time,
        partySize: request.partySize,
        status: 'pending',
        agentStatus: 'active',
        agentType: 'ai',
        confirmationCode: `TEST-${Math.floor(1000000 + Math.random() * 9000000)}`,
        bookingPlatform: restaurant.bookingPlatform || 'Other',
        agentLog: [
          {
            timestamp: new Date(),
            action: 'Booking Created',
            details: `Booking created for ${restaurant.name} at ${request.time} for ${request.partySize} people`
          }
        ]
      });
      
      // Return success
      return {
        success: true,
        message: `Successfully created booking for ${restaurant.name}`,
        booking
      };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      return {
        success: false,
        message: `Error creating booking: ${error.message || 'Unknown error occurred'}`
      };
    }
  }
}

export const automatedBookingService = new AutomatedBookingService();