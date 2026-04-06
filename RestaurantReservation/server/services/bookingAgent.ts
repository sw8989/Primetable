import { storage } from '../storage';
import openaiService from './openaiService';
import emailService from './emailService';

/**
 * BookingAgent service
 * 
 * Enhanced with AI capabilities and email notifications for a more
 * sophisticated booking experience.
 */
class BookingAgent {
  private activeBookings: Map<number, NodeJS.Timeout>;
  private emailNotifications: boolean = true;
  private aiAssisted: boolean = true;
  
  constructor() {
    this.activeBookings = new Map();
    
    // Feature flags based on available API keys
    this.emailNotifications = !!process.env.SENDGRID_API_KEY;
    this.aiAssisted = !!process.env.OPENAI_API_KEY;
    
    if (!this.emailNotifications) {
      console.warn("Email notifications disabled: SENDGRID_API_KEY not set");
    }
    
    if (!this.aiAssisted) {
      console.warn("AI assistance disabled: OPENAI_API_KEY not set");
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
    
    // Start a simulated booking monitoring process
    const interval = setInterval(async () => {
      // Check if booking still exists and is active
      const currentBooking = await storage.getBooking(bookingId);
      if (!currentBooking || currentBooking.agentStatus !== "active") {
        this.stopBookingProcess(bookingId);
        return;
      }
      
      // Add a log entry to simulate agent activity
      const updatedBooking = await this.simulateBookingActivity(bookingId, restaurant.bookingPlatform);
      
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
    }, 10000); // Check every 10 seconds in this simulation
    
    this.activeBookings.set(bookingId, interval);
  }
  
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
    const random = Math.random();
    if (random < 0.1) {
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
  
  async checkForUpcomingBookings(): Promise<void> {
    // This would be called by a scheduled job in production
    // to send reminders for upcoming bookings
    
    if (!this.emailNotifications) return;
    
    // Note: This implementation is a simplified version
    // In a real app, there would be a proper method to get bookings by date range
    console.log("Checking for upcoming bookings (feature available in a production environment)");
    
    // For demonstration purposes, this feature is stubbed
    // Implementation would iterate through bookings and send reminders
  }
  
  stopBookingProcess(bookingId: number): void {
    const interval = this.activeBookings.get(bookingId);
    if (interval) {
      clearInterval(interval);
      this.activeBookings.delete(bookingId);
      console.log(`Stopped booking agent for ${bookingId}`);
    }
  }
}

export const bookingAgent = new BookingAgent();
