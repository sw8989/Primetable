/**
 * OpenTable MCP Service
 *
 * This service handles OpenTable bookings using browser automation via Puppeteer
 * and the Model Context Protocol (MCP) standard.
 */

import { Restaurant } from '@shared/schema';
import { BookingRequest, BookingResult, BookingPlatformService } from './interfaces';
import { config } from '../../config';

// Import puppeteer when available
let puppeteer: any;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.log('Puppeteer not available, will use simulation mode');
}

export class OpenTableMCPService implements BookingPlatformService {
  private simulation: boolean;

  constructor() {
    // Determine if we're in simulation mode
    this.simulation = config.simulationMode || !puppeteer;
    console.log(`OpenTable MCP Service initialized (simulation mode: ${this.simulation})`);
  }

  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    console.log(`Booking table at ${restaurant.name} via OpenTable MCP`);
    const logs: string[] = [];
    logs.push(`Starting booking process for ${restaurant.name} at ${request.time} for ${request.partySize} people`);
    
    // Add details about simulation status
    if (this.simulation) {
      logs.push(`Running in simulation mode - no real bookings will be made`);
      
      // Return simulated success
      return {
        success: true,
        status: 'pending',
        confirmationCode: `SIM-${Math.floor(1000000 + Math.random() * 9000000)}`,
        logs,
        simulation: true
      };
    }
    
    try {
      // Format date for URL
      const dateStr = new Date(request.date).toISOString().split('T')[0];
      
      // Get the booking URL
      const bookingUrl = restaurant.bookingUrl || 
        `https://www.opentable.com/restaurant/profile/${restaurant.platformId}/reserve?dateTime=${dateStr}T${request.time}&covers=${request.partySize}`;
      
      logs.push(`Opening browser to ${bookingUrl}`);
      
      // Launch the browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      
      // Navigate to the booking page
      logs.push(`Navigating to OpenTable booking page`);
      await page.goto(bookingUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for page to load
      await page.waitForSelector('body', { timeout: 10000 });
      
      // Take screenshot for debugging
      const screenshot = await page.screenshot({ encoding: 'base64' });
      logs.push(`Page loaded - screenshot captured`);
      
      // Check if we need to select a time slot
      const timeSlotSelector = '.timeslot-btn';
      const hasTimeSlots = await page.$(timeSlotSelector) !== null;
      
      if (hasTimeSlots) {
        logs.push(`Time slot selection page detected`);
        
        // Find and click the appropriate time slot
        const timeSlotElements = await page.$$(timeSlotSelector);
        
        if (timeSlotElements.length > 0) {
          logs.push(`Found ${timeSlotElements.length} available time slots`);
          
          // Click the first time slot
          await timeSlotElements[0].click();
          logs.push(`Selected first available time slot`);
          
          // Wait for navigation
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        } else {
          logs.push(`No time slots available for the requested date/time`);
          await browser.close();
          
          return {
            success: false,
            status: 'failed',
            error: 'No available times for the requested date',
            logs
          };
        }
      }
      
      // Fill out the form
      logs.push(`Filling out reservation details`);
      
      // Fill name
      if (request.name) {
        await page.type('input[name="firstName"], input#FirstName', request.name.split(' ')[0] || '');
        await page.type('input[name="lastName"], input#LastName', request.name.split(' ')[1] || '');
        logs.push(`Entered name: ${request.name}`);
      }
      
      // Fill email
      if (request.email) {
        await page.type('input[name="email"], input#Email', request.email);
        logs.push(`Entered email: ${request.email}`);
      }
      
      // Fill phone
      if (request.phone) {
        await page.type('input[name="phoneNumber"], input#Phone', request.phone);
        logs.push(`Entered phone: ${request.phone}`);
      }
      
      // Add special requests if provided
      if (request.specialRequests) {
        await page.type('textarea[name="notes"], textarea#SpecialRequests', request.specialRequests);
        logs.push(`Added special requests`);
      }
      
      // Complete the booking form but don't submit in test mode
      logs.push(`Reservation form completed successfully`);
      
      // Close the browser
      await browser.close();
      logs.push(`Browser session closed`);
      
      // Return success but in test mode
      return {
        success: true,
        status: 'pending',
        confirmationCode: `TEST-${Math.floor(1000000 + Math.random() * 9000000)}`,
        logs,
        simulation: true, // Still mark as simulation since we don't actually submit
        bookingUrl
      };
      
    } catch (error: any) {
      console.error('Error in OpenTable MCP booking:', error);
      logs.push(`Error: ${error.message}`);
      
      return {
        success: false,
        status: 'failed',
        error: `OpenTable MCP booking failed: ${error.message}`,
        logs
      };
    }
  }
}