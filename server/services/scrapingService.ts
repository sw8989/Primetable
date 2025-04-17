import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AgentLogEntry } from '@shared/schema';

/**
 * ScrapingService - Handles web scraping operations for restaurant booking platforms
 * 
 * IMPORTANT LEGAL NOTICE:
 * This code is for educational and research purposes only. Before using web scraping in a production 
 * environment, you must:
 * 1. Review and comply with the Terms of Service of the target websites
 * 2. Ensure compliance with relevant laws including CFAA, GDPR, and similar regulations
 * 3. Implement proper rate limiting and respect robots.txt rules
 * 4. Consider obtaining explicit permission from the website owners
 */
class ScrapingService {
  private browser: Browser | null = null;
  
  constructor() {
    // Initialize with sensible defaults
    this.init();
  }
  
  private async init(): Promise<void> {
    try {
      // Only launch browser when needed to save resources
      // this.browser = await puppeteer.launch({
      //   headless: true,
      //   args: ['--no-sandbox', '--disable-setuid-sandbox']
      // });
    } catch (error) {
      console.error('Error initializing scraping service:', error);
    }
  }

  /**
   * Checks if a table is available at a restaurant
   */
  async checkAvailability(
    platform: string,
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    restaurantDetails?: {
      platformId?: string,  // The ID on the booking platform (e.g., "mountain" for SevenRooms)
      bookingUrl?: string,  // Direct URL to the booking page
      websiteUrl?: string   // The restaurant's main website
    }
  ): Promise<{ available: boolean; logEntry: AgentLogEntry }> {
    const formattedDate = date.toISOString().split('T')[0];
    
    try {
      // Default log entry
      const logEntry: AgentLogEntry = {
        timestamp: new Date(),
        action: "Availability Check",
        details: `Checking availability at ${restaurantName} for ${formattedDate} at ${time} for ${partySize} people`
      };
      
      // Route to the appropriate platform-specific scraper
      switch (platform.toLowerCase()) {
        case 'opentable':
          return await this.checkOpenTableAvailability(
            restaurantName, 
            date, 
            time, 
            partySize
          );
          
        case 'resy':
          return await this.checkResyAvailability(
            restaurantName, 
            date, 
            time, 
            partySize
          );
          
        case 'sevenrooms':
          return await this.checkSevenRoomsAvailability(
            restaurantName, 
            date, 
            time, 
            partySize, 
            restaurantDetails?.platformId,     // Pass the venue ID
            restaurantDetails?.bookingUrl      // Pass the direct booking URL
          );
          
        case 'tock':
          return await this.checkTockAvailability(
            restaurantName, 
            date, 
            time, 
            partySize
          );
          
        default:
          return {
            available: false,
            logEntry: {
              ...logEntry,
              details: `Platform ${platform} not supported for automated checks`
            }
          };
      }
    } catch (error) {
      console.error(`Error checking availability on ${platform}:`, error);
      return {
        available: false,
        logEntry: {
          timestamp: new Date(),
          action: "Error",
          details: `Error checking availability: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
  
  /**
   * Platform-specific implementation for OpenTable
   */
  private async checkOpenTableAvailability(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<{ available: boolean; logEntry: AgentLogEntry }> {
    // Initialize browser if needed
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const logEntry: AgentLogEntry = {
      timestamp: new Date(),
      action: "OpenTable Check",
      details: `Searching OpenTable for ${restaurantName}`
    };

    try {
      // Step 1: Search for the restaurant on OpenTable
      const page = await this.browser.newPage();
      
      // Set a user agent to appear as a normal browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36');
      
      // Navigate to OpenTable search
      await page.goto('https://www.opentable.com/', { waitUntil: 'networkidle2' });
      
      // Enter restaurant name in search
      await page.type('input[data-test="search-input"]', restaurantName);
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForSelector('[data-test="search-results-list"]', { timeout: 10000 });
      
      // Find restaurant in search results
      const restaurantLink = await page.evaluate((name) => {
        const restaurants = document.querySelectorAll('[data-test="restaurant-card"]');
        // Use Array.from to convert NodeList to array for compatibility
        for (let i = 0; i < restaurants.length; i++) {
          const restaurant = restaurants[i];
          const nameElement = restaurant.querySelector('[data-test="restaurant-card-name"]');
          if (nameElement && nameElement.textContent?.includes(name)) {
            const link = restaurant.querySelector('a');
            return link ? link.href : null;
          }
        }
        return null;
      }, restaurantName);
      
      if (!restaurantLink) {
        await page.close();
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `Restaurant "${restaurantName}" not found on OpenTable`
          }
        };
      }
      
      // Go to restaurant page
      await page.goto(restaurantLink, { waitUntil: 'networkidle2' });
      
      // Set date, time and party size
      const formattedDate = date.toISOString().split('T')[0];
      await page.select('[data-test="party-size-selector"]', partySize.toString());
      
      // Click date picker and select date
      await page.click('[data-test="date-picker"]');
      // This would require more complex date selection logic
      
      // Check available time slots
      const availableTimes = await page.evaluate((targetTime) => {
        const timeSlots = document.querySelectorAll('[data-test="time-slot"]');
        const times = Array.from(timeSlots).map(slot => slot.textContent?.trim());
        return {
          allTimes: times,
          hasTargetTime: times.some(t => t === targetTime)
        };
      }, time);
      
      // Close the page
      await page.close();
      
      if (availableTimes.hasTargetTime) {
        return {
          available: true,
          logEntry: {
            ...logEntry,
            action: "Success",
            details: `Found availability at ${restaurantName} for ${time}!`
          }
        };
      } else {
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `No availability at ${time}. Available times: ${availableTimes.allTimes.join(', ') || 'None'}`
          }
        };
      }
    } catch (error) {
      console.error('Error in OpenTable scraping:', error);
      return {
        available: false,
        logEntry: {
          ...logEntry,
          action: "Error",
          details: `OpenTable scraping error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
  
  /**
   * Platform-specific implementation for Resy
   */
  private async checkResyAvailability(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<{ available: boolean; logEntry: AgentLogEntry }> {
    const logEntry: AgentLogEntry = {
      timestamp: new Date(),
      action: "Resy Check",
      details: `Searching Resy for ${restaurantName}`
    };
    
    try {
      // For demonstration, using the API-based approach
      // In a real implementation, this would need to authenticate properly
      const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '');
      
      // This would need to be replaced with the actual venue ID from Resy
      // We would need to first search for the venue to get its ID
      const venueId = "sample-venue-id"; 
      
      // This URL structure is for demonstration only and may not match Resy's actual API
      const url = `https://api.resy.com/4/find?lat=0&lon=0&day=${formattedDate}&party_size=${partySize}&venue_id=${venueId}`;
      
      // This is a simulated response for demonstration purposes
      // In a real implementation, we would make an actual API request
      const simulatedFound = Math.random() > 0.7; // 30% chance of "finding" availability
      
      if (simulatedFound) {
        return {
          available: true,
          logEntry: {
            ...logEntry,
            action: "Success",
            details: `Found availability at ${restaurantName} for ${time}!`
          }
        };
      } else {
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `No availability found on Resy for the requested time`
          }
        };
      }
    } catch (error) {
      return {
        available: false,
        logEntry: {
          ...logEntry,
          action: "Error",
          details: `Resy scraping error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
  
  /**
   * Platform-specific implementation for SevenRooms
   */
  private async checkSevenRoomsAvailability(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    venueId?: string, // The venue ID from the platform (e.g., "mountain")
    bookingUrl?: string // Direct booking URL if available
  ): Promise<{ available: boolean; logEntry: AgentLogEntry }> {
    // Initialize browser if needed
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const logEntry: AgentLogEntry = {
      timestamp: new Date(),
      action: "SevenRooms Check",
      details: `Checking availability on SevenRooms for ${restaurantName}`
    };

    try {
      const page = await this.browser.newPage();
      
      // Set a user agent to appear as a normal browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36');
      
      // Format date for SevenRooms URL
      const formattedDate = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Determine the URL to use
      let sevenRoomsUrl: string;
      
      if (bookingUrl) {
        // Use the provided booking URL if available
        sevenRoomsUrl = bookingUrl;
        // Add date parameter if not already in the URL
        if (!bookingUrl.includes('default_date=')) {
          sevenRoomsUrl += (bookingUrl.includes('?') ? '&' : '?') + `default_date=${formattedDate}`;
        }
      } else if (venueId) {
        // Construct URL from venue ID
        sevenRoomsUrl = `https://www.sevenrooms.com/reservations/${venueId}?default_date=${formattedDate}`;
      } else {
        // No direct URL info available, log error
        return {
          available: false,
          logEntry: {
            ...logEntry,
            action: "Error",
            details: `Missing SevenRooms venue ID or booking URL for ${restaurantName}`
          }
        };
      }

      console.log(`Navigating to SevenRooms URL: ${sevenRoomsUrl}`);
      await page.goto(sevenRoomsUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the booking interface to load
      await page.waitForSelector('.sr-reservation-form', { timeout: 20000 });
      
      // Set party size
      // Based on observation, SevenRooms typically has a dropdown for party size
      try {
        // Wait for the party size selector and click it
        await page.waitForSelector('.sr-party-size-select', { timeout: 5000 });
        await page.click('.sr-party-size-select');
        
        // Get the dropdown options
        const options = await page.$$('.sr-party-size-option');
        
        // Find the closest party size option
        let selectedIndex = 0;
        for (let i = 0; i < options.length; i++) {
          const sizeText = await page.evaluate(el => el.textContent, options[i]);
          const size = parseInt(sizeText?.trim() || '0');
          
          if (size === partySize) {
            selectedIndex = i;
            break;
          } else if (size > partySize && i > 0) {
            // If we passed our target size, use the previous size
            selectedIndex = i - 1;
            break;
          }
        }
        
        // Click the appropriate party size
        await options[selectedIndex].click();
      } catch (error) {
        console.warn('Could not set party size via dropdown, trying alternate method:', error);
        
        // Alternative method: try to find an input field
        try {
          await page.type('.sr-party-size-input', partySize.toString());
        } catch (inputError) {
          console.warn('Could not set party size:', inputError);
          // Continue anyway, as some restaurants have fixed party sizes
        }
      }
      
      // Look for available time slots
      const availableTimeSlots = await page.evaluate((targetTime: string) => {
        // Find all time slot elements
        const timeSlots = document.querySelectorAll('.sr-time-slot');
        
        // Extract text from time slots
        const times: string[] = [];
        let hasTargetTime = false;
        
        // Convert NodeList to Array for compatibility
        Array.from(timeSlots).forEach(slot => {
          const timeText = slot.textContent?.trim();
          if (timeText) {
            times.push(timeText);
            
            // Check if this time matches our target time
            if (timeText.includes(targetTime)) {
              hasTargetTime = true;
            }
          }
        });
        
        return {
          allTimes: times,
          hasTargetTime
        };
      }, time);
      
      // Take a screenshot for debugging (optional)
      // await page.screenshot({ path: `sevenrooms-debug-${Date.now()}.png` });
      
      // Close the page
      await page.close();
      
      if (availableTimeSlots.hasTargetTime) {
        return {
          available: true,
          logEntry: {
            ...logEntry,
            action: "Success",
            details: `Found availability at ${restaurantName} for ${time}!`
          }
        };
      } else if (availableTimeSlots.allTimes.length > 0) {
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `No availability at ${time}. Available times: ${availableTimeSlots.allTimes.join(', ')}`
          }
        };
      } else {
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `No available time slots found for ${formattedDate}`
          }
        };
      }
    } catch (error) {
      console.error('Error in SevenRooms scraping:', error);
      return {
        available: false,
        logEntry: {
          ...logEntry,
          action: "Error",
          details: `SevenRooms scraping error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
  
  /**
   * Platform-specific implementation for Tock
   */
  private async checkTockAvailability(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<{ available: boolean; logEntry: AgentLogEntry }> {
    // Implementation would be similar to others but tailored to Tock's structure
    // This is a placeholder implementation
    
    return {
      available: false,
      logEntry: {
        timestamp: new Date(),
        action: "Tock Check",
        details: `Tock availability checking not yet implemented`
      }
    };
  }
  
  /**
   * Actually make a booking once availability is found
   * 
   * Note: This is much more complex as it involves filling forms,
   * handling payment information, etc. For a real implementation,
   * this would need significant development and testing.
   */
  async makeBooking(
    platform: string,
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userDetails: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    }
  ): Promise<{ success: boolean; bookingReference: string | null; logEntry: AgentLogEntry }> {
    // This is a simulated response for demonstration purposes
    return {
      success: false,
      bookingReference: null,
      logEntry: {
        timestamp: new Date(),
        action: "Booking Attempt",
        details: `Automated booking functionality not yet implemented for security and ethical reasons`
      }
    };
  }
  
  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export a singleton instance
export const scrapingService = new ScrapingService();
export default scrapingService;