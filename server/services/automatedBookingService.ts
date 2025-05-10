/**
 * Automated Booking Service
 * 
 * This service provides automated booking capabilities for various restaurant booking platforms.
 * It uses headless browser automation to navigate booking interfaces and place reservations.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';

// Booking platform types
export type BookingPlatform = 'OpenTable' | 'Resy' | 'SevenRooms' | 'Tock' | 'Unknown';

// Booking request interface
export interface BookingRequest {
  restaurantName: string;
  platformId: string;   // The ID used by the platform (e.g., OpenTable ID)
  platform: BookingPlatform;
  date: Date;
  time: string;
  partySize: number;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  specialRequests?: string;
  bookingUrl?: string;  // Direct booking URL if available
}

// Booking result interface
export interface BookingResult {
  success: boolean;
  reservationId?: string;
  error?: string;
  bookingDetails?: {
    date: string;
    time: string;
    partySize: number;
    restaurant: string;
    confirmationCode?: string;
  };
  screenshots?: string[]; // Base64-encoded screenshots of the booking process
  status: 'confirmed' | 'pending' | 'failed';
  logs: string[];
}

/**
 * Abstract base class for platform-specific bookers
 */
abstract class PlatformBooker {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected logs: string[] = [];
  protected screenshots: string[] = [];
  
  constructor(protected request: BookingRequest) {}
  
  /**
   * Initialize the browser
   */
  protected async initBrowser(): Promise<void> {
    try {
      this.log('Initializing headless browser');
      
      // Launch browser with appropriate settings
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,800'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Improve emulation
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Add request interception if needed
      // await this.page.setRequestInterception(true);
      
      // Set default navigation timeout (30 seconds)
      await this.page.setDefaultNavigationTimeout(30000);
      
      this.log('Browser initialized successfully');
    } catch (error) {
      this.log(`Browser initialization failed: ${error.message}`);
      throw new Error(`Failed to initialize browser: ${error.message}`);
    }
  }
  
  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.log('Browser closed');
      }
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`);
    }
  }
  
  /**
   * Take a screenshot
   */
  protected async takeScreenshot(name: string): Promise<string | null> {
    try {
      if (!this.page) return null;
      
      const screenshot = await this.page.screenshot({ encoding: 'base64' });
      this.screenshots.push(`data:image/png;base64,${screenshot}`);
      this.log(`Screenshot taken: ${name}`);
      return screenshot.toString();
    } catch (error) {
      this.log(`Failed to take screenshot: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Log a message
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`Booking automation: ${logMessage}`);
    this.logs.push(logMessage);
  }
  
  /**
   * Check for CAPTCHA presence
   */
  protected async detectCaptcha(): Promise<boolean> {
    try {
      if (!this.page) return false;
      
      // Common CAPTCHA indicators
      const captchaIndicators = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="captcha"]',
        '.captcha',
        '#captcha',
        '[data-sitekey]',
        'iframe[src*="hcaptcha"]'
      ];
      
      for (const selector of captchaIndicators) {
        const hasCaptcha = await this.page.$(selector) !== null;
        if (hasCaptcha) {
          this.log('CAPTCHA detected on page');
          await this.takeScreenshot('captcha-detected');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.log(`Error detecting CAPTCHA: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Wait for navigation to complete
   */
  protected async safeNavigation(url: string): Promise<boolean> {
    try {
      if (!this.page) return false;
      
      this.log(`Navigating to ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Check for navigation errors
      const pageContent = await this.page.content();
      if (pageContent.includes('Access Denied') || pageContent.includes('403 Forbidden')) {
        this.log('Access denied or forbidden');
        await this.takeScreenshot('access-denied');
        return false;
      }
      
      return true;
    } catch (error) {
      this.log(`Navigation error: ${error.message}`);
      await this.takeScreenshot('navigation-error');
      return false;
    }
  }
  
  /**
   * Execute the booking process
   */
  public abstract execute(): Promise<BookingResult>;
}

/**
 * OpenTable booking implementation
 */
class OpenTableBooker extends PlatformBooker {
  constructor(request: BookingRequest) {
    super(request);
  }
  
  /**
   * Execute the OpenTable booking process
   */
  public async execute(): Promise<BookingResult> {
    try {
      await this.initBrowser();
      
      if (!this.page) {
        return {
          success: false,
          error: 'Failed to initialize page',
          status: 'failed',
          logs: this.logs
        };
      }
      
      // Start the booking process
      this.log(`Starting OpenTable booking for ${this.request.restaurantName}`);
      
      // Determine the URL to use
      let bookingUrl = this.request.bookingUrl;
      if (!bookingUrl) {
        // Construct URL from platformId
        bookingUrl = `https://www.opentable.com/restaurant/profile/${this.request.platformId}/reserve`;
      }
      
      // Navigate to the booking page
      const navigationSuccess = await this.safeNavigation(bookingUrl);
      if (!navigationSuccess) {
        return {
          success: false,
          error: 'Failed to navigate to booking page',
          status: 'failed',
          screenshots: this.screenshots,
          logs: this.logs
        };
      }
      
      await this.takeScreenshot('initial-page');
      
      // Check for CAPTCHA
      const hasCaptcha = await this.detectCaptcha();
      if (hasCaptcha) {
        return {
          success: false,
          error: 'CAPTCHA detected, automated booking not possible',
          status: 'failed',
          screenshots: this.screenshots,
          logs: this.logs
        };
      }
      
      // Set date
      this.log('Setting reservation date');
      const dateString = this.request.date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      try {
        // Click on date picker to open it
        await this.page.click('.ot-dtp-picker-selector-link.ot-dtp-picker-selector-link-date');
        await this.page.waitForSelector('.datepicker-dropdown', { timeout: 5000 });
        
        // Navigate to the correct month (might need multiple clicks on next month button)
        const targetMonth = this.request.date.getMonth();
        const targetYear = this.request.date.getFullYear();
        
        let currentMonthText = await this.page.$eval('.datepicker-switch', el => el.textContent);
        let [currentMonthName, currentYear] = currentMonthText.trim().split(' ');
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        let currentMonth = months.indexOf(currentMonthName);
        
        // Navigate forward in calendar until we reach target month/year
        while (currentMonth !== targetMonth || parseInt(currentYear) !== targetYear) {
          await this.page.click('.next');
          await this.page.waitForTimeout(500);
          
          currentMonthText = await this.page.$eval('.datepicker-switch', el => el.textContent);
          [currentMonthName, currentYear] = currentMonthText.trim().split(' ');
          currentMonth = months.indexOf(currentMonthName);
          
          // Safety check to prevent infinite loops
          if (parseInt(currentYear) > targetYear + 1) {
            throw new Error('Cannot navigate to requested date - too far in the future');
          }
        }
        
        // Select the specific day
        const targetDay = this.request.date.getDate();
        const daySelector = `.day:not(.old):not(.new):not(.disabled):contains("${targetDay}")`;
        await this.page.$$eval('.day', (days, targetDay) => {
          for (const day of days) {
            if (day.textContent?.trim() === String(targetDay) && 
                !day.classList.contains('old') && 
                !day.classList.contains('new') && 
                !day.classList.contains('disabled')) {
              day.click();
              return;
            }
          }
        }, targetDay);
        
        await this.takeScreenshot('date-selected');
      } catch (dateError) {
        this.log(`Error selecting date: ${dateError.message}`);
        // Fall back to direct input if available
        try {
          const dateInput = await this.page.$('input[data-qa="date-picker-input"]');
          if (dateInput) {
            await dateInput.click();
            await dateInput.focus();
            await this.page.keyboard.press('Control+A');
            await this.page.keyboard.press('Delete');
            await this.page.keyboard.type(dateString);
            await this.page.keyboard.press('Enter');
          }
        } catch (fallbackError) {
          return {
            success: false,
            error: `Failed to set reservation date: ${dateError.message}`,
            status: 'failed',
            screenshots: this.screenshots,
            logs: this.logs
          };
        }
      }
      
      // Set party size
      this.log(`Setting party size to ${this.request.partySize}`);
      try {
        await this.page.click('.ot-dtp-picker-selector-link.ot-dtp-picker-selector-link-people');
        await this.page.waitForSelector('.ot-dtp-picker-selector-dropdown-panel');
        
        // Find and click the correct party size
        const partySizeSelector = `div[data-val="${this.request.partySize}"]`;
        await this.page.waitForSelector(partySizeSelector);
        await this.page.click(partySizeSelector);
        
        await this.takeScreenshot('party-size-selected');
      } catch (partySizeError) {
        return {
          success: false,
          error: `Failed to set party size: ${partySizeError.message}`,
          status: 'failed',
          screenshots: this.screenshots,
          logs: this.logs
        };
      }
      
      // Find available times
      this.log('Finding available times');
      try {
        // Click "Find a Table" button
        await this.page.click('button.ot-dtp-picker-button');
        
        // Wait for time slots to appear
        await this.page.waitForSelector('.timeslot-option', { timeout: 10000 });
        
        // Take screenshot of available times
        await this.takeScreenshot('available-times');
        
        // Find the closest time slot to requested time
        const requestedTime = this.request.time;
        const timeSlots = await this.page.$$eval('.timeslot-option', (elements, requestedTime) => {
          const slots = elements.map(el => ({
            time: el.textContent?.trim(),
            element: el
          }));
          
          // Find exact match or closest time
          const exactMatch = slots.find(slot => slot.time === requestedTime);
          if (exactMatch) return exactMatch.time;
          
          // If no exact match, return first available
          return slots.length > 0 ? slots[0].time : null;
        }, requestedTime);
        
        if (!timeSlots) {
          return {
            success: false,
            error: 'No available time slots found',
            status: 'failed',
            screenshots: this.screenshots,
            logs: this.logs
          };
        }
        
        // Click on the selected time slot
        this.log(`Selecting time slot: ${timeSlots}`);
        await this.page.click(`.timeslot-option[data-value="${timeSlots}"]`);
        
        // Wait for reservation details page
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        await this.takeScreenshot('reservation-details-page');
        
        // Fill in contact information
        if (this.request.userName) {
          await this.page.type('input[name="firstName"]', this.request.userName.split(' ')[0]);
          await this.page.type('input[name="lastName"]', this.request.userName.split(' ').slice(1).join(' '));
        }
        
        if (this.request.userEmail) {
          await this.page.type('input[name="email"]', this.request.userEmail);
        }
        
        if (this.request.userPhone) {
          await this.page.type('input[name="phoneNumber"]', this.request.userPhone);
        }
        
        if (this.request.specialRequests) {
          await this.page.type('textarea[name="notes"]', this.request.specialRequests);
        }
        
        await this.takeScreenshot('form-filled');
        
        // Simulate clicking the complete reservation button
        // In a real implementation, we'd actually click it
        // await this.page.click('button[type="submit"]');
        
        // For this proof of concept, we'll stop here
        this.log('Reservation form completed, ready for submission');
        
        // Complete
        await this.cleanup();
        
        // Return successful result
        return {
          success: true,
          status: 'pending', // We didn't actually submit
          bookingDetails: {
            date: this.request.date.toLocaleDateString(),
            time: timeSlots,
            partySize: this.request.partySize,
            restaurant: this.request.restaurantName
          },
          screenshots: this.screenshots,
          logs: this.logs
        };
      } catch (error) {
        this.log(`Error during booking process: ${error.message}`);
        return {
          success: false,
          error: `Booking process failed: ${error.message}`,
          status: 'failed',
          screenshots: this.screenshots,
          logs: this.logs
        };
      } finally {
        await this.cleanup();
      }
    } catch (error) {
      this.log(`Fatal error in booking process: ${error.message}`);
      await this.cleanup();
      return {
        success: false,
        error: `Fatal error: ${error.message}`,
        status: 'failed',
        screenshots: this.screenshots,
        logs: this.logs
      };
    }
  }
}

/**
 * Factory class to create platform-specific bookers
 */
export class BookingFactory {
  static createBooker(request: BookingRequest): PlatformBooker {
    switch (request.platform) {
      case 'OpenTable':
        return new OpenTableBooker(request);
      // Add cases for other platforms
      default:
        throw new Error(`Unsupported booking platform: ${request.platform}`);
    }
  }
}

/**
 * Main service class for automated bookings
 */
export class AutomatedBookingService {
  /**
   * Execute a booking request
   */
  async executeBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      console.log(`Starting automated booking for ${request.restaurantName} on ${request.platform}`);
      
      // Create platform-specific booker
      const booker = BookingFactory.createBooker(request);
      
      // Execute booking
      const result = await booker.execute();
      
      return result;
    } catch (error) {
      console.error('Automated booking failed:', error);
      return {
        success: false,
        error: `Booking failed: ${error.message}`,
        status: 'failed',
        logs: [`Fatal error: ${error.message}`]
      };
    }
  }
  
  /**
   * Check if automated booking is supported for a platform
   */
  isPlatformSupported(platform: BookingPlatform): boolean {
    return platform === 'OpenTable'; // Only OpenTable supported for now
  }
}

// Create a singleton instance
export const automatedBookingService = new AutomatedBookingService();

export default automatedBookingService;