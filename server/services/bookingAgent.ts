import { storage } from '../storage';

/**
 * BookingAgent service
 * 
 * In a production app, this would be a much more sophisticated system
 * that integrates with various booking platforms and uses different
 * strategies to secure reservations.
 */
class BookingAgent {
  private activeBookings: Map<number, NodeJS.Timeout>;
  
  constructor() {
    this.activeBookings = new Map();
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
    
    console.log(`Starting booking agent for ${bookingId} at ${restaurant.name}`);
    
    // Update booking log
    const updatedLog = [
      ...(booking.agentLog || []),
      {
        timestamp: new Date(),
        action: "Agent started",
        details: `Beginning to monitor ${restaurant.bookingPlatform} for availability at ${restaurant.name}`
      }
    ];
    
    await storage.updateBooking(bookingId, {
      agentStatus: "active",
      agentLog: updatedLog
    });
    
    // In a real system, this would involve sophisticated polling strategies for different platforms
    // For this demo, we'll simulate the process with timeouts that update the booking state
    
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
    
    const actions = [
      `Checking ${platform} for new availability`,
      `Monitoring cancellation list`,
      `Waiting for midnight slot release`,
      `Searching for alternative time slots`,
      `Checking for VIP access options`
    ];
    
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Generate a new log entry
    const updatedLog = [
      ...(booking.agentLog || []),
      {
        timestamp: new Date(),
        action: "Monitoring",
        details: randomAction
      }
    ];
    
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
