import { storage } from '../storage';
import openaiService from './openaiService';
import emailService from './emailService';
import scrapingService from './scrapingService';

/**
 * Enhanced BookingAgent service with real-time availability checking
 * 
 * This service enhances the existing BookingAgent with web scraping capabilities
 * for checking real availability on booking platforms.
 */
class EnhancedBookingAgent {
  private activeBookings: Map<number, NodeJS.Timeout>;
  private emailNotifications: boolean = true;
  private aiAssisted: boolean = true;
  private useRealScraping: boolean = false; // For safety, default to false
  private checkInterval: number = 15 * 60 * 1000; // 15 minutes by default
  
  constructor() {
    this.activeBookings = new Map();
    
    // Feature flags based on available API keys
    this.emailNotifications = !!process.env.SENDGRID_API_KEY;
    this.aiAssisted = !!process.env.OPENAI_API_KEY;
    
    // This would typically be controlled via environment variables or settings
    this.useRealScraping = process.env.ENABLE_REAL_SCRAPING === 'true';
    
    if (!this.emailNotifications) {
      console.warn("Email notifications disabled: SENDGRID_API_KEY not set");
    }
    
    if (!this.aiAssisted) {
      console.warn("AI assistance disabled: OPENAI_API_KEY not set");
    }
    
    if (this.useRealScraping) {
      console.log("REAL AVAILABILITY CHECKING ENABLED - Using web scraping to check booking platforms");
    } else {
      console.log("Using simulated availability checking (web scraping disabled)");
    }
  }
  
  async startBookingProcess(bookingId: number): Promise<void> {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      console.error(`Booking ${bookingId} not found`);
      return;
    }
    
    // Get restaurant details
    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) {
      console.error(`Restaurant ${booking.restaurantId} not found for booking ${bookingId}`);
      return;
    }
    
    // Get user for notifications
    const user = await storage.getUser(booking.userId);
    
    console.log(`Starting booking agent for ${bookingId} at ${restaurant.name}`);
    
    // Generate AI-powered booking strategy if OpenAI is available
    let bookingStrategy = "Standard monitoring for availability";
    
    if (this.aiAssisted) {
      try {
        bookingStrategy = await openaiService.analyzeBookingStrategy(
          restaurant.name,
          restaurant.bookingInfo,
          restaurant.bookingDifficulty
        );
      } catch (error) {
        console.error("Error generating AI booking strategy:", error);
      }
    }
    
    // Update booking log with strategy
    const updatedLog = booking.agentLog || [];
    updatedLog.push({
      timestamp: new Date(),
      action: "Agent started",
      details: `Beginning to monitor ${restaurant.bookingPlatform} for availability at ${restaurant.name}`
    });
    updatedLog.push({
      timestamp: new Date(),
      action: "Strategy configured",
      details: bookingStrategy
    });
    
    await storage.updateBooking(bookingId, {
      agentStatus: "active",
      agentLog: updatedLog
    });
    
    // Send notification email if SendGrid is available
    if (this.emailNotifications && user?.email) {
      try {
        await emailService.sendBookingUpdate(
          user.email,
          restaurant,
          booking.date,
          booking.time,
          booking.partySize,
          "Booking agent deployed and actively searching for your table"
        );
      } catch (error) {
        console.error("Error sending booking notification email:", error);
      }
    }
    
    // Set up the check interval based on difficulty
    if (restaurant.bookingDifficulty === "hard") {
      this.checkInterval = 5 * 60 * 1000; // 5 minutes for hard restaurants
    } else if (restaurant.bookingDifficulty === "medium") {
      this.checkInterval = 10 * 60 * 1000; // 10 minutes for medium difficulty
    } else {
      this.checkInterval = 15 * 60 * 1000; // 15 minutes for easy/default
    }
    
    // Start a booking monitoring process
    const interval = setInterval(async () => {
      // Check if booking still exists and is active
      const currentBooking = await storage.getBooking(bookingId);
      if (!currentBooking || currentBooking.agentStatus !== "active") {
        this.stopBookingProcess(bookingId);
        return;
      }
      
      let updatedBooking;
      
      if (this.useRealScraping) {
        // Use real scraping
        updatedBooking = await this.performRealAvailabilityCheck(bookingId);
      } else {
        // Use simulation
        updatedBooking = await this.simulateBookingActivity(bookingId, restaurant.bookingPlatform);
      }
      
      // If booking was successful, send a confirmation email
      if (updatedBooking?.status === "confirmed" && this.emailNotifications && user?.email) {
        try {
          await emailService.sendBookingSecuredNotification(
            user.email,
            restaurant,
            booking.date,
            booking.time,
            booking.partySize,
            updatedBooking.platformBookingId || "Not available"
          );
        } catch (error) {
          console.error("Error sending booking confirmation email:", error);
        }
      }
      
      // If booking was successful or failed, stop the process
      if (updatedBooking?.agentStatus !== "active") {
        this.stopBookingProcess(bookingId);
      }
    }, this.checkInterval); // Production would use much longer intervals
    
    this.activeBookings.set(bookingId, interval);
  }
  
  /**
   * Use actual web scraping to check for availability
   */
  async performRealAvailabilityCheck(bookingId: number): Promise<any> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) return null;
    
    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return null;
    
    // Get the current log
    const updatedLog = booking.agentLog || [];
    
    try {
      console.log(`Performing real availability check for ${restaurant.name} on ${restaurant.bookingPlatform}`);
      
      // Pass all available restaurant details to the scraping service
      const result = await scrapingService.checkAvailability(
        restaurant.bookingPlatform,
        restaurant.name,
        booking.date,
        booking.time,
        booking.partySize,
        {
          platformId: restaurant.platformId,
          bookingUrl: restaurant.bookingUrl,
          websiteUrl: restaurant.websiteUrl
        }
      );
      
      // Add the log entry from the scraping result
      updatedLog.push(result.logEntry);
      
      // If availability was found, create booking
      if (result.available) {
        // In a real implementation, we might call makeBooking here
        // but for safety, we're just updating the status
        
        updatedLog.push({
          timestamp: new Date(),
          action: "Success",
          details: "Availability found! In a production system, this would initiate the booking process."
        });
        
        // Update booking status
        return await storage.updateBooking(bookingId, {
          agentStatus: "success",
          status: "confirmed",
          platformBookingId: `${restaurant.bookingPlatform}-${Date.now()}`,
          agentLog: updatedLog
        });
      }
      
      // If we should check for alternative times
      if (booking.acceptSimilarTimes && this.aiAssisted) {
        try {
          const alternatives = await openaiService.suggestAlternativeTimes(
            restaurant.name,
            booking.date,
            booking.time,
            booking.partySize
          );
          
          if (alternatives.suggestions?.length > 0) {
            updatedLog.push({
              timestamp: new Date(),
              action: "Alternative Times",
              details: `AI suggested alternatives: ${alternatives.suggestions.join(', ')}`
            });
            
            // If we find availability by checking the alternative times
            for (const alternativeTime of alternatives.suggestions) {
              // Extract the time portion from the suggestion (format might be "7:15 PM on Friday")
              const timeMatch = alternativeTime.match(/(\d+:\d+\s*[AP]M)/i);
              if (!timeMatch) continue;
              
              const altTime = timeMatch[1];
              console.log(`Checking alternative time: ${altTime}`);
              
              // Check availability for this alternative time
              const altResult = await scrapingService.checkAvailability(
                restaurant.bookingPlatform,
                restaurant.name,
                booking.date, // Same date for now (could be extended to check different dates)
                altTime,
                booking.partySize,
                {
                  platformId: restaurant.platformId,
                  bookingUrl: restaurant.bookingUrl,
                  websiteUrl: restaurant.websiteUrl
                }
              );
              
              // Add this check to the log
              updatedLog.push({
                timestamp: new Date(),
                action: "Checking Alternative",
                details: `Checking suggested alternative time: ${altTime}`
              });
              
              // If we found availability at this alternative time
              if (altResult.available) {
                updatedLog.push({
                  timestamp: new Date(),
                  action: "Success",
                  details: `Found availability at alternative time: ${altTime}!`
                });
                
                // If user has selected to accept similar times, book it
                if (booking.acceptSimilarTimes) {
                  return await storage.updateBooking(bookingId, {
                    agentStatus: "success",
                    status: "confirmed",
                    time: altTime, // Update to the new time
                    platformBookingId: `${restaurant.bookingPlatform}-${Date.now()}`,
                    agentLog: updatedLog
                  });
                } else {
                  // Just note that we found an alternative but didn't book it
                  updatedLog.push({
                    timestamp: new Date(),
                    action: "Alternative Found",
                    details: `Alternative time available (${altTime}) but not booked as acceptSimilarTimes not enabled`
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error getting AI alternative suggestions:", error);
        }
      }
      
      // Update the log
      return await storage.updateBooking(bookingId, {
        agentLog: updatedLog
      });
    } catch (error) {
      console.error(`Error in real availability check:`, error);
      
      // Log the error
      updatedLog.push({
        timestamp: new Date(),
        action: "Error",
        details: `Error checking availability: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Update the log
      return await storage.updateBooking(bookingId, {
        agentLog: updatedLog
      });
    }
  }
  
  /**
   * Fallback simulation method
   */
  async simulateBookingActivity(bookingId: number, platform: string): Promise<any> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) return null;
    
    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return null;
    
    // Default actions
    let actions = [
      `Checking ${platform} for new availability`,
      `Monitoring cancellation list`,
      `Waiting for midnight slot release`,
      `Searching for alternative time slots`,
      `Checking for VIP access options`
    ];
    
    // If AI is available, get alternative booking times
    if (this.aiAssisted && Math.random() < 0.3) {
      try {
        const alternatives = await openaiService.suggestAlternativeTimes(
          restaurant.name,
          booking.date,
          booking.time,
          booking.partySize
        );
        
        if (alternatives.suggestions?.length > 0) {
          alternatives.suggestions.forEach(suggestion => {
            actions.push(`AI suggested alternative: ${suggestion}`);
          });
        }
      } catch (error) {
        console.error("Error getting AI alternative suggestions:", error);
      }
    }
    
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Generate a new log entry
    const updatedLog = booking.agentLog || [];
    updatedLog.push({
      timestamp: new Date(),
      action: "Monitoring",
      details: randomAction
    });
    
    // Small chance of finding a booking (for demo purposes)
    const successProbability = restaurant.bookingDifficulty === "hard" ? 0.05 : 
                              restaurant.bookingDifficulty === "medium" ? 0.1 : 0.2;
    
    const random = Math.random();
    if (random < successProbability) {
      // Simulate finding a booking
      updatedLog.push({
        timestamp: new Date(),
        action: "Success",
        details: "Found available table, booking confirmed!"
      });
      
      // Update booking status
      return await storage.updateBooking(bookingId, {
        agentStatus: "success",
        status: "confirmed",
        platformBookingId: `${platform}-${Date.now()}`,
        agentLog: updatedLog
      });
    }
    
    // Just update the log
    return await storage.updateBooking(bookingId, {
      agentLog: updatedLog
    });
  }
  
  stopBookingProcess(bookingId: number): void {
    const interval = this.activeBookings.get(bookingId);
    if (interval) {
      clearInterval(interval);
      this.activeBookings.delete(bookingId);
      console.log(`Stopped booking agent for ${bookingId}`);
    }
  }
  
  /**
   * Clean up resources when shutting down
   */
  async cleanup(): Promise<void> {
    // Clear all intervals
    for (const [bookingId, interval] of this.activeBookings.entries()) {
      clearInterval(interval);
      console.log(`Cleaned up booking agent for ${bookingId}`);
    }
    
    this.activeBookings.clear();
    
    // Clean up scraping service
    await scrapingService.close();
  }
}

export const enhancedBookingAgent = new EnhancedBookingAgent();
export default enhancedBookingAgent;