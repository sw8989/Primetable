/**
 * Automated Booking Service
 * 
 * Responsible for creating and managing automated booking requests.
 * This service uses the platform-specific booking services to actually place the bookings.
 */

import { Restaurant, Booking, bookings } from '@shared/schema';
import { storage } from '../storage';
import { bookingService } from './booking';
import { BookingRequest } from './booking/interfaces';
import { config } from '../config';

interface DirectBookingRequest {
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

interface AutomatedBookingRequest {
  restaurantId: number;
  userId: number;
  date: Date;
  time: string;
  partySize: number;
  priorityBooking?: boolean;
  acceptSimilarTimes?: boolean;
  autoConfirm?: boolean;
  useRealScraping?: boolean;
}

export class AutomatedBookingService {
  private simulationMode: boolean;
  
  constructor() {
    this.simulationMode = process.env.SIMULATION_MODE === 'true' || !config.bookingAgent.enableRealBooking;
    console.log(`AutomatedBookingService initialized, simulation mode: ${this.simulationMode}`);
  }
  
  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: string): boolean {
    // Currently support OpenTable, Resy, SevenRooms, Tock
    const supportedPlatforms = ['OpenTable', 'Resy', 'SevenRooms', 'Tock'];
    return supportedPlatforms.includes(platform);
  }
  
  /**
   * Support for the existing API
   */
  async executeBooking(request: DirectBookingRequest): Promise<any> {
    try {
      console.log(`Starting automated booking for ${request.restaurantName} on ${request.platform}`);
      
      // Find the restaurant by name if possible
      let restaurant: Restaurant | undefined;
      
      if (request.platformId) {
        // Try to find by platformId
        const restaurants = await storage.getRestaurants();
        restaurant = restaurants.find(r => r.platformId === request.platformId);
      }
      
      if (!restaurant) {
        // Create a temporary restaurant object
        restaurant = {
          id: 0,
          name: request.restaurantName,
          description: 'Temporary restaurant record',
          cuisine: 'Unknown',
          location: 'London',
          bookingDifficulty: 'medium',
          bookingInfo: 'Unknown',
          bookingPlatform: request.platform,
          platformId: request.platformId,
          bookingUrl: request.bookingUrl || null,
          imageUrl: null,
          bookingNotes: null,
          websiteUrl: null,
          platformDetails: null,
          bookingSelectors: null,
          releaseStrategy: null,
          lastScrapedAt: null
        };
      }
      
      // Prepare the booking request
      const bookingRequest: BookingRequest = {
        restaurantId: restaurant.id,
        date: request.date,
        time: request.time,
        partySize: request.partySize,
        name: request.userName || 'Guest',
        email: request.userEmail || 'guest@example.com',
        phone: request.userPhone || '555-555-5555',
        specialRequests: request.specialRequests || ''
      };
      
      // Now attempt the actual booking through our platform-specific service
      console.log(`Attempting to book table at ${restaurant.name}`);
      const result = await bookingService.bookTable(restaurant, bookingRequest);
      
      // Return the result
      return {
        success: result.success,
        status: result.status,
        confirmationCode: result.confirmationCode,
        error: result.error,
        logs: result.logs,
        simulation: result.simulation
      };
    } catch (error: any) {
      console.error('Automated booking error:', error);
      return {
        success: false,
        error: `Booking error: ${error.message || error}`
      };
    }
  }
  
  /**
   * Create an automated booking request using our database
   */
  async createBooking(request: AutomatedBookingRequest): Promise<{
    success: boolean;
    booking?: Booking;
    message?: string;
    logs?: string[];
  }> {
    try {
      console.log(`Starting automated booking for restaurant ID ${request.restaurantId}`);
      
      // Get the restaurant
      const restaurant = await storage.getRestaurant(request.restaurantId);
      if (!restaurant) {
        return {
          success: false,
          message: 'Restaurant not found'
        };
      }
      
      // Log that we're starting the process
      console.log(`Starting automated booking for ${restaurant.name} on ${restaurant.bookingPlatform}`);
      
      // Get user information
      const user = await storage.getUser(request.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Prepare the booking request
      const bookingRequest: BookingRequest = {
        restaurantId: request.restaurantId,
        date: request.date,
        time: request.time,
        partySize: request.partySize,
        name: user.fullName || user.username,
        email: user.email,
        phone: '555-555-5555', // In a real app, would come from user data
        specialRequests: ''
      };
      
      // Start with empty agent log
      const agentLog = [
        {
          timestamp: new Date(),
          action: 'booking_initiated',
          details: `Starting booking process for ${restaurant.name}`
        }
      ];
      
      // First, create the booking record in 'pending' state
      const newBooking = await storage.createBooking({
        userId: request.userId,
        restaurantId: request.restaurantId,
        date: request.date,
        time: request.time,
        partySize: request.partySize,
        status: 'pending',
        agentStatus: 'active',
        agentLog,
        priorityBooking: request.priorityBooking || false,
        acceptSimilarTimes: request.acceptSimilarTimes || false,
        autoConfirm: request.autoConfirm || false,
        useRealScraping: request.useRealScraping || false
      });
      
      // Now attempt the actual booking
      console.log(`Attempting to book table at ${restaurant.name}`);
      const result = await bookingService.bookTable(restaurant, bookingRequest);
      
      // Update the booking with the result
      let updatedStatus: string;
      let updatedAgentStatus: string;
      
      if (result.success) {
        updatedStatus = 'pending'; // Still pending until confirmed by restaurant
        updatedAgentStatus = 'success';
        
        // Add success log entry
        agentLog.push({
          timestamp: new Date(),
          action: 'booking_placed',
          details: `Successfully placed booking at ${restaurant.name}` + 
            (result.simulation ? ' (SIMULATION)' : '')
        });
      } else {
        updatedStatus = 'failed';
        updatedAgentStatus = 'failed';
        
        // Add failure log entry
        agentLog.push({
          timestamp: new Date(),
          action: 'booking_failed',
          details: `Failed to place booking: ${result.error}`
        });
      }
      
      // Add all logs from the booking process
      if (result.logs) {
        agentLog.push({
          timestamp: new Date(),
          action: 'booking_logs',
          details: result.logs.join('\n')
        });
      }
      
      // Update the booking record
      const updatedBooking = await storage.updateBooking(newBooking.id, {
        status: updatedStatus,
        agentStatus: updatedAgentStatus,
        platformBookingId: result.confirmationCode,
        agentLog
      });
      
      return {
        success: result.success,
        booking: updatedBooking,
        message: result.success 
          ? 'Booking successful' 
          : `Booking failed: ${result.error}`,
        logs: result.logs
      };
    } catch (error: any) {
      console.error('Automated booking error:', error);
      return {
        success: false,
        message: `Booking error: ${error.message || error}`
      };
    }
  }
}

// Export a singleton instance
export const automatedBookingService = new AutomatedBookingService();