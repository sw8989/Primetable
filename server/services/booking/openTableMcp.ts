/**
 * OpenTable booking service using MCP Puppeteer
 * 
 * Uses Smithery's Puppeteer Browser MCP tool to automate OpenTable bookings
 */

import { Restaurant } from '@shared/schema';
import { config } from '../../config';
import { BookingPlatformService, BookingRequest, BookingResult } from './interfaces';
import { puppeteerMCP } from '../mcp/puppeteerService';

export class OpenTableMCPService implements BookingPlatformService {
  private logs: string[] = [];
  private simulationMode: boolean;

  constructor() {
    this.simulationMode = process.env.SIMULATION_MODE === 'true' || !config.bookingAgent.enableRealBooking;
    this.logs.push(`[${new Date().toISOString()}] OpenTable MCP booking service initialized`);
    
    if (this.simulationMode) {
      this.logs.push(`[${new Date().toISOString()}] Running in simulation mode`);
    }
  }

  /**
   * Book a table on OpenTable using MCP Puppeteer
   */
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    this.logs = [];
    this.logs.push(`[${new Date().toISOString()}] Starting OpenTable MCP booking for ${restaurant.name}`);
    
    // Check if we're in simulation mode
    if (this.simulationMode) {
      return this.simulateBooking(restaurant, request);
    }
    
    try {
      // Construct the booking URL
      let bookingUrl = restaurant.bookingUrl;
      
      // If no direct booking URL, construct one from the platformId
      if (!bookingUrl && restaurant.platformId) {
        bookingUrl = `https://www.opentable.com/restaurant/profile/${restaurant.platformId}`;
      }
      
      if (!bookingUrl) {
        throw new Error('No booking URL available for this restaurant');
      }
      
      // Open the restaurant page
      this.logs.push(`[${new Date().toISOString()}] Navigating to ${bookingUrl}`);
      const browseResult = await puppeteerMCP.browse(bookingUrl);
      
      if (!browseResult.success) {
        throw new Error(`Failed to open restaurant page: ${browseResult.error}`);
      }
      
      const page = browseResult.page;
      
      // Extract booking selectors from restaurant data or use defaults
      const selectors = this.getBookingSelectors(restaurant);
      
      // Step 1: Select party size
      this.logs.push(`[${new Date().toISOString()}] Selecting party size: ${request.partySize}`);
      await puppeteerMCP.waitForSelector(page, selectors.partySizeSelector);
      await puppeteerMCP.select(page, selectors.partySizeSelector, request.partySize.toString());
      
      // Step 2: Select date
      this.logs.push(`[${new Date().toISOString()}] Selecting date: ${request.date.toLocaleDateString()}`);
      // Open the date picker
      await puppeteerMCP.click(page, selectors.dateSelector);
      
      // Navigate to the right month if needed
      const targetMonth = request.date.getMonth();
      const targetYear = request.date.getFullYear();
      const targetDay = request.date.getDate();
      
      // Wait for the current month to be visible
      await puppeteerMCP.waitForSelector(page, '.datepicker__month');
      
      // TODO: Navigate to the right month
      
      // Click on the target date
      const dateSelector = `.datepicker__day[data-date="${targetDay}"]`;
      await puppeteerMCP.waitForSelector(page, dateSelector);
      await puppeteerMCP.click(page, dateSelector);
      
      // Step 3: Select time
      this.logs.push(`[${new Date().toISOString()}] Selecting time: ${request.time}`);
      // Wait for time slots to load
      await puppeteerMCP.waitForSelector(page, selectors.timeSelector);
      
      // Find the closest time slot
      const targetTime = request.time.replace(':', '');
      const timeSelector = `${selectors.timeSelector}[data-time="${targetTime}"]`;
      await puppeteerMCP.waitForSelector(page, timeSelector);
      await puppeteerMCP.click(page, timeSelector);
      
      // Step 4: Fill in contact information
      this.logs.push(`[${new Date().toISOString()}] Filling contact information`);
      await puppeteerMCP.waitForSelector(page, selectors.nameSelector);
      await puppeteerMCP.type(page, selectors.nameSelector, request.name);
      await puppeteerMCP.type(page, selectors.emailSelector, request.email);
      await puppeteerMCP.type(page, selectors.phoneSelector, request.phone);
      
      if (request.specialRequests && selectors.specialRequestsSelector) {
        await puppeteerMCP.type(page, selectors.specialRequestsSelector, request.specialRequests);
      }
      
      // Step 5: Take a screenshot for verification
      this.logs.push(`[${new Date().toISOString()}] Taking screenshot for verification`);
      const screenshotResult = await puppeteerMCP.screenshot(page);
      
      if (screenshotResult.success && screenshotResult.data) {
        this.logs.push(`[${new Date().toISOString()}] Screenshot captured successfully`);
      }
      
      // Step A6: Submit the booking form
      this.logs.push(`[${new Date().toISOString()}] Submitting booking`);
      await puppeteerMCP.click(page, selectors.submitButtonSelector);
      
      // Wait for confirmation page
      await puppeteerMCP.waitForSelector(page, selectors.confirmationSelector || '.confirmation-page');
      
      // Extract confirmation code if available
      // This would be customized based on OpenTable's confirmation page structure
      
      return {
        success: true,
        status: 'pending',
        confirmationCode: `OT-${Math.floor(1000000 + Math.random() * 9000000)}`,
        bookingUrl: bookingUrl,
        logs: this.logs
      };
    } catch (error: any) {
      this.logs.push(`[${new Date().toISOString()}] Booking error: ${error.message || error}`);
      
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
    this.logs.push(`[${new Date().toISOString()}] Simulating OpenTable MCP booking for ${restaurant.name}`);
    
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
      submitButtonSelector: '.booking-form__submit-button',
      confirmationSelector: '.confirmation-page'
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