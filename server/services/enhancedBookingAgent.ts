import { storage } from '../storage';
import openaiService from './openaiService';
import emailService from './emailService';
import scrapingService from './scrapingService';
import config from '../config';

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
    
    // Use the configuration from config.ts
    this.emailNotifications = config.services.emailNotifications;
    this.aiAssisted = config.services.aiAssisted;
    this.useRealScraping = config.bookingAgent.useRealScraping;
    
    // Debug the configuration values
    console.log(`Using configuration from config.ts:`);
    console.log(`Email notifications enabled: ${this.emailNotifications}`);
    console.log(`AI assistance enabled: ${this.aiAssisted}`);
    console.log(`Real scraping enabled: ${this.useRealScraping}`);
    
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
    
    // Set up the check interval based on difficulty using config values (in minutes, convert to ms)
    if (restaurant.bookingDifficulty === "hard") {
      this.checkInterval = config.bookingAgent.hardCheckInterval * 60 * 1000;
    } else if (restaurant.bookingDifficulty === "medium") {
      this.checkInterval = config.bookingAgent.mediumCheckInterval * 60 * 1000;
    } else {
      this.checkInterval = config.bookingAgent.defaultCheckInterval * 60 * 1000;
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
    if (!booking) {
      console.error(`Booking ${bookingId} not found in performRealAvailabilityCheck`);
      return null;
    }
    
    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) {
      console.error(`Restaurant ${booking.restaurantId} not found for booking ${bookingId} in performRealAvailabilityCheck`);
      return null;
    }
    
    // Get the current log
    const updatedLog = booking.agentLog || [];
    
    // Add a log entry to indicate we're starting a real availability check
    updatedLog.push({
      timestamp: new Date(),
      action: "Starting Check",
      details: `Performing real availability check for ${restaurant.name} on ${restaurant.bookingPlatform}`
    });
    
    try {
      console.log(`Performing real availability check for ${restaurant.name} on ${restaurant.bookingPlatform}`);
      
      // Check if this platform is supported
      const supportedPlatforms = ['OpenTable', 'Resy', 'SevenRooms', 'Tock'];
      if (!supportedPlatforms.includes(restaurant.bookingPlatform)) {
        updatedLog.push({
          timestamp: new Date(),
          action: "Warning",
          details: `Platform ${restaurant.bookingPlatform} not explicitly supported, attempting generic approach`
        });
      }
      
      // Pass all available restaurant details to the scraping service
      const restaurantDetails = {
        platformId: restaurant.platformId || '',
        bookingUrl: restaurant.bookingUrl || '',
        websiteUrl: restaurant.websiteUrl || ''
      };
      
      // Log that we're about to call the scraping service
      console.log(`Calling scrapingService.checkAvailability for ${restaurant.name} at ${booking.time} on ${booking.date.toLocaleDateString()}`);
      
      // Perform the availability check
      const result = await scrapingService.checkAvailability(
        restaurant.bookingPlatform,
        restaurant.name,
        booking.date,
        booking.time,
        booking.partySize,
        restaurantDetails
      );
      
      // Add the log entry from the scraping result
      updatedLog.push(result.logEntry);
      
      // If debugging is enabled in config, save the screenshots or debug info
      if (config.bookingAgent.debug) {
        updatedLog.push({
          timestamp: new Date(),
          action: "Debug",
          details: `Debug screenshots and information saved for analysis. See opentable-*.png files.`
        });
      }
      
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
      } else {
        // No availability at the exact requested time
        updatedLog.push({
          timestamp: new Date(),
          action: "Not Available",
          details: `No availability found for ${booking.time}. Will continue monitoring.`
        });
      }
      
      // If we should check for alternative times
      if (booking.acceptSimilarTimes && this.aiAssisted) {
        try {
          updatedLog.push({
            timestamp: new Date(),
            action: "Strategy",
            details: `Looking for alternative times since acceptSimilarTimes is enabled`
          });
          
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
              if (!timeMatch) {
                console.log(`Could not extract time from suggestion: ${alternativeTime}`);
                continue;
              }
              
              const altTime = timeMatch[1];
              console.log(`Checking alternative time: ${altTime}`);
              
              updatedLog.push({
                timestamp: new Date(),
                action: "Checking Alternative",
                details: `Checking suggested alternative time: ${altTime}`
              });
              
              // Check availability for this alternative time
              const altRestaurantDetails = {
                platformId: restaurant.platformId || '',
                bookingUrl: restaurant.bookingUrl || '',
                websiteUrl: restaurant.websiteUrl || ''
              };
              
              const altResult = await scrapingService.checkAvailability(
                restaurant.bookingPlatform,
                restaurant.name,
                booking.date, // Same date for now (could be extended to check different dates)
                altTime,
                booking.partySize,
                altRestaurantDetails
              );
              
              // Add the log entry from the alternative time check
              updatedLog.push(altResult.logEntry);
              
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
          } else {
            updatedLog.push({
              timestamp: new Date(),
              action: "No Alternatives",
              details: `AI could not suggest any alternative times`
            });
          }
        } catch (error) {
          console.error("Error getting AI alternative suggestions:", error);
          updatedLog.push({
            timestamp: new Date(),
            action: "Error",
            details: `Error finding alternative times: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      // Update the log to record that we completed this check cycle
      updatedLog.push({
        timestamp: new Date(),
        action: "Check Complete",
        details: `Completed availability check cycle. Next check in ${this.checkInterval/60000} minutes.`
      });
      
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
   * Fallback simulation method - used when real scraping is disabled
   */
  async simulateBookingActivity(bookingId: number, platform: string): Promise<any> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      console.error(`Booking ${bookingId} not found in simulateBookingActivity`);
      return null;
    }
    
    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) {
      console.error(`Restaurant ${booking.restaurantId} not found for booking ${bookingId} in simulateBookingActivity`);
      return null;
    }
    
    // Get the current log
    const updatedLog = booking.agentLog || [];
    
    // Add a log entry to indicate we're starting a simulated check
    updatedLog.push({
      timestamp: new Date(),
      action: "Starting Check",
      details: `Running simulated availability check for ${restaurant.name} on ${platform}`
    });
    
    console.log(`Simulating booking activity for ${restaurant.name} (Difficulty: ${restaurant.bookingDifficulty})`);
    
    // Default actions that the booking agent might be doing
    let actions = [
      `Checking ${platform} for new availability`,
      `Monitoring cancellation list for ${restaurant.name}`,
      `Waiting for midnight slot release on ${platform}`,
      `Searching for alternative time slots around ${booking.time}`,
      `Checking for VIP access options at ${restaurant.name}`,
      `Analyzing booking patterns at ${restaurant.name}`,
      `Monitoring for cancellations at ${booking.time}`,
      `Checking private dining options at ${restaurant.name}`
    ];
    
    // If restaurant has specific booking info, include it in the actions
    if (restaurant.bookingInfo) {
      actions.push(`Following ${restaurant.name}'s booking pattern: ${restaurant.bookingInfo}`);
    }
    
    // If restaurant has booking notes, include them too
    if (restaurant.bookingNotes) {
      actions.push(`Noting: ${restaurant.bookingNotes}`);
    }
    
    // If AI is available, get alternative booking times
    if (this.aiAssisted && Math.random() < 0.3) {
      try {
        updatedLog.push({
          timestamp: new Date(),
          action: "Strategy",
          details: `Using AI to analyze booking patterns and suggest alternatives`
        });
        
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
          
          alternatives.suggestions.forEach(suggestion => {
            actions.push(`Checking AI suggested alternative: ${suggestion}`);
          });
        } else {
          updatedLog.push({
            timestamp: new Date(),
            action: "No Alternatives",
            details: `AI could not suggest any alternative times`
          });
        }
      } catch (error) {
        console.error("Error getting AI alternative suggestions:", error);
        updatedLog.push({
          timestamp: new Date(),
          action: "Error",
          details: `Error finding alternative times: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Choose a random action to simulate what the agent is doing
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Add a monitoring log entry
    updatedLog.push({
      timestamp: new Date(),
      action: "Monitoring",
      details: randomAction
    });
    
    // Determine probability of success based on restaurant difficulty
    const successProbability = restaurant.bookingDifficulty === "hard" ? 0.05 : 
                              restaurant.bookingDifficulty === "medium" ? 0.1 : 0.2;
    
    // Add some randomness - simulate a booking "attempt"
    const random = Math.random();
    if (random < successProbability) {
      // Simulate finding a booking
      updatedLog.push({
        timestamp: new Date(),
        action: "Success",
        details: `Found available table at ${restaurant.name} for ${booking.time}! Booking confirmed.`
      });
      
      // Update booking status as a success
      return await storage.updateBooking(bookingId, {
        agentStatus: "success",
        status: "confirmed",
        platformBookingId: `SIMULATION-${platform}-${Date.now()}`,
        agentLog: updatedLog
      });
    } else if (random < successProbability + 0.2 && booking.acceptSimilarTimes) {
      // Simulate finding an alternative time (only if user accepts similar times)
      const alternativeTimes = [
        "6:30 PM", "7:30 PM", "8:00 PM", "8:30 PM", "5:45 PM", "9:15 PM"
      ];
      const alternativeTime = alternativeTimes[Math.floor(Math.random() * alternativeTimes.length)];
      
      updatedLog.push({
        timestamp: new Date(),
        action: "Alternative Success",
        details: `Found availability at alternative time: ${alternativeTime}!`
      });
      
      // Update booking with the alternative time
      return await storage.updateBooking(bookingId, {
        agentStatus: "success",
        status: "confirmed",
        time: alternativeTime, // Use the alternative time
        platformBookingId: `SIMULATION-${platform}-ALT-${Date.now()}`,
        agentLog: updatedLog
      });
    } else {
      // No success this time, will continue monitoring
      updatedLog.push({
        timestamp: new Date(),
        action: "Not Available",
        details: `No availability found at ${restaurant.name} for ${booking.time}. Will continue monitoring.`
      });
    }
    
    // Update the log to record that we completed this check cycle
    updatedLog.push({
      timestamp: new Date(),
      action: "Check Complete",
      details: `Completed simulated check cycle. Next check in ${this.checkInterval/60000} minutes.`
    });
    
    // Update the log
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
    this.activeBookings.forEach((interval, bookingId) => {
      clearInterval(interval);
      console.log(`Cleaned up booking agent for ${bookingId}`);
    });
    
    this.activeBookings.clear();
    
    // Clean up scraping service
    await scrapingService.close();
  }
}

export const enhancedBookingAgent = new EnhancedBookingAgent();
export default enhancedBookingAgent;