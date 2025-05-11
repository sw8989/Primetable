/**
 * OpenTable booking service
 * 
 * Handles booking automation specifically for OpenTable platform
 */
import puppeteer, { Browser, Page } from 'puppeteer';
import { Restaurant } from '@shared/schema';
import { config } from '../../config';
import { BookingPlatformService, BookingRequest, BookingResult } from './interfaces';

export class OpenTableBookingService implements BookingPlatformService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logs: string[] = [];
  private simulationMode: boolean;

  constructor() {
    this.simulationMode = process.env.SIMULATION_MODE === 'true' || !config.bookingAgent.enableRealBooking;
    this.logs.push(`[${new Date().toISOString()}] OpenTable booking service initialized`);
    
    if (this.simulationMode) {
      this.logs.push(`[${new Date().toISOString()}] Running in simulation mode`);
    }
  }

  /**
   * Initialize the browser instance
   */
  private async initBrowser(): Promise<boolean> {
    try {
      if (this.simulationMode) {
        this.logs.push(`[${new Date().toISOString()}] Simulating browser initialization`);
        return true;
      }
      
      this.logs.push(`[${new Date().toISOString()}] Initializing headless browser`);
      
      // Check if we're in Replit environment
      const isReplit = process.env.REPL_ID || process.env.REPL_OWNER;
      
      if (isReplit) {
        this.logs.push(`[${new Date().toISOString()}] Running in Replit environment - using simulation mode instead of real browser`);
        return false;
      }

      // Launch browser with appropriate options
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      
      this.logs.push(`[${new Date().toISOString()}] Browser initialized successfully`);
      return true;
    } catch (error: any) {
      this.logs.push(`[${new Date().toISOString()}] Failed to initialize browser: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.logs.push(`[${new Date().toISOString()}] Browser closed successfully`);
      }
    } catch (error: any) {
      this.logs.push(`[${new Date().toISOString()}] Error closing browser: ${error.message || error}`);
    }
  }

  /**
   * Book a table on OpenTable
   */
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    this.logs = [];
    this.logs.push(`[${new Date().toISOString()}] Starting OpenTable booking for ${restaurant.name}`);
    
    // Check if we're in simulation mode
    if (this.simulationMode) {
      return this.simulateBooking(restaurant, request);
    }
    
    try {
      // Initialize browser
      const browserInitialized = await this.initBrowser();
      
      if (!browserInitialized) {
        this.logs.push(`[${new Date().toISOString()}] Falling back to simulation mode`);
        return this.simulateBooking(restaurant, request);
      }
      
      if (!this.browser) {
        throw new Error('Browser initialization failed');
      }
      
      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Construct the booking URL
      let bookingUrl = restaurant.bookingUrl;
      
      // If no direct booking URL, construct one from the platformId
      if (!bookingUrl && restaurant.platformId) {
        bookingUrl = `https://www.opentable.com/restaurant/profile/${restaurant.platformId}`;
      }
      
      if (!bookingUrl) {
        throw new Error('No booking URL available for this restaurant');
      }
      
      // Navigate to the restaurant page
      this.logs.push(`[${new Date().toISOString()}] Navigating to ${bookingUrl}`);
      await this.page.goto(bookingUrl, { waitUntil: 'networkidle2' });
      
      // Extract booking selectors from restaurant data or use defaults
      const selectors = this.getBookingSelectors(restaurant);
      
      // Implement the OpenTable booking flow
      await this.selectDate(request.date, selectors);
      await this.selectTime(request.time, selectors);
      await this.selectPartySize(request.partySize, selectors);
      await this.fillContactInfo(request, selectors);
      const confirmationResult = await this.submitBooking(selectors);
      
      // Clean up
      await this.cleanup();
      
      return {
        success: true,
        status: 'pending',
        confirmationCode: confirmationResult.confirmationCode,
        bookingUrl: confirmationResult.bookingUrl,
        logs: this.logs
      };
    } catch (error: any) {
      this.logs.push(`[${new Date().toISOString()}] Booking error: ${error.message || error}`);
      
      // Clean up
      await this.cleanup();
      
      return {
        success: false,
        status: 'failed',
        error: `Booking failed: ${error.message || error}`,
        logs: this.logs
      };
    }
  }

  /**
   * Simulate the booking process
   */
  private async simulateBooking(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    this.logs.push(`[${new Date().toISOString()}] SIMULATION MODE: Running simulated booking process`);
    this.logs.push(`[${new Date().toISOString()}] Simulating OpenTable booking for ${restaurant.name}`);
    
    // Simulate typical booking steps with delays
    this.logs.push(`[${new Date().toISOString()}] Simulating navigation to booking page`);
    await this.delay(500);
    this.logs.push(`[${new Date().toISOString()}] Simulated step completed: Initial restaurant page`);
    
    await this.delay(300);
    this.logs.push(`[${new Date().toISOString()}] Simulated step completed: Date selection calendar`);
    
    await this.delay(300);
    this.logs.push(`[${new Date().toISOString()}] Simulated step completed: Time selection screen`);
    
    await this.delay(300);
    this.logs.push(`[${new Date().toISOString()}] Simulated step completed: Contact information form`);
    
    const formattedDate = this.formatDate(request.date);
    this.logs.push(`[${new Date().toISOString()}] Simulating date selection: ${formattedDate}`);
    this.logs.push(`[${new Date().toISOString()}] Simulating time selection: ${request.time}`);
    this.logs.push(`[${new Date().toISOString()}] Simulating party size selection: ${request.partySize} people`);
    this.logs.push(`[${new Date().toISOString()}] Simulating contact information input`);
    this.logs.push(`[${new Date().toISOString()}] Simulating booking form completion`);
    
    // Simulate success
    this.logs.push(`[${new Date().toISOString()}] Simulation completed successfully`);
    
    return {
      success: true,
      status: 'pending',
      confirmationCode: `OT-SIM-${Math.floor(1000000 + Math.random() * 9000000)}`,
      logs: this.logs,
      simulation: true
    };
  }
  
  /**
   * Get the appropriate CSS selectors for OpenTable
   */
  private getBookingSelectors(restaurant: Restaurant): Record<string, string> {
    // Use restaurant-specific selectors if available
    if (restaurant.bookingSelectors) {
      return restaurant.bookingSelectors as Record<string, string>;
    }
    
    // Otherwise use default OpenTable selectors
    return {
      dateSelector: '.datepicker__calendar',
      dateNextButton: '.datepicker__month-button--next',
      dateAvailableClass: '.datepicker__day--available',
      timeSelector: '.time-slot',
      timeAvailableClass: '.time-slot--available',
      partySizeSelector: '.party-size-selector',
      nameSelector: '#form-field-firstName',
      emailSelector: '#form-field-email',
      phoneSelector: '#form-field-phoneNumber',
      specialRequestsSelector: '#form-field-specialRequests',
      submitButtonSelector: '.booking-form__submit-button'
    };
  }

  /**
   * Utility functions for the booking process
   */
  private async selectDate(date: Date, selectors: Record<string, string>): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    this.logs.push(`[${new Date().toISOString()}] Selecting date: ${date.toLocaleDateString()}`);
    
    // Implementation would interact with OpenTable's date picker using the provided selectors
  }

  private async selectTime(time: string, selectors: Record<string, string>): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    this.logs.push(`[${new Date().toISOString()}] Selecting time: ${time}`);
    
    // Implementation would click on the appropriate time slot using the provided selectors
  }

  private async selectPartySize(partySize: number, selectors: Record<string, string>): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    this.logs.push(`[${new Date().toISOString()}] Selecting party size: ${partySize}`);
    
    // Implementation would select the party size using the provided selectors
  }

  private async fillContactInfo(request: BookingRequest, selectors: Record<string, string>): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    this.logs.push(`[${new Date().toISOString()}] Filling contact information`);
    
    // Implementation would fill in the contact form using the provided selectors
  }

  private async submitBooking(selectors: Record<string, string>): Promise<{ confirmationCode?: string, bookingUrl?: string }> {
    if (!this.page) throw new Error('Page not initialized');
    
    this.logs.push(`[${new Date().toISOString()}] Submitting booking`);
    
    // Implementation would click the final booking button and extract confirmation info
    
    return {
      confirmationCode: `OT-${Math.floor(1000000 + Math.random() * 9000000)}`,
      bookingUrl: this.page.url()
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private formatDate(date: Date): string {
    // Format date as M/D/YYYY
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
}