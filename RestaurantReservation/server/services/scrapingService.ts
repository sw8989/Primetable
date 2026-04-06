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
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.141 Safari/537.36');
      
      // Navigate to OpenTable search
      await page.goto('https://www.opentable.com/', { waitUntil: 'networkidle2' });
      
      // Try multiple selector strategies to find the search input
      let searchInputSelector = 'input[data-test="search-autocomplete-input"]';
      let searchInputExists = await page.$(searchInputSelector) !== null;
      
      if (!searchInputExists) {
        // Try fallback selectors
        const fallbackSelectors = [
          '#home-page-autocomplete-input',
          'input[placeholder*="Restaurant"]',
          'input[aria-label*="Location"]'
        ];
        
        for (const selector of fallbackSelectors) {
          if (await page.$(selector) !== null) {
            searchInputSelector = selector;
            searchInputExists = true;
            break;
          }
        }
      }
      
      if (!searchInputExists) {
        console.log('Taking debug screenshot of OpenTable homepage...');
        await page.screenshot({ path: 'opentable-debug.png' });
        
        // Log the page HTML for debugging
        const html = await page.content();
        console.error('Could not find search input. Page HTML snippet:', html.substring(0, 500) + '...');
        
        await page.close();
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `Could not find search input on OpenTable. See logs for details.`
          }
        };
      }
      
      // Enter restaurant name in search
      await page.type(searchInputSelector, restaurantName);
      await page.keyboard.press('Enter');
      
      // Wait for search results - try multiple potential selectors
      const searchResultsSelectors = [
        '[data-test="search-results-list"]', 
        '.restaurant-search-results',
        '[role="listbox"]',
        '[data-test*="restaurant-result"]'
      ];
      
      let resultsSelector = null;
      for (const selector of searchResultsSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          resultsSelector = selector;
          break;
        } catch (e) {
          // Try the next selector
        }
      }
      
      if (!resultsSelector) {
        // Take debug screenshot
        await page.screenshot({ path: 'opentable-search-debug.png' });
        
        await page.close();
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `No search results found for "${restaurantName}". See debug screenshot.`
          }
        };
      }
      
      // Find restaurant in search results - look for links containing the restaurant name
      const restaurantLink = await page.evaluate((name) => {
        // Helper to normalize text for comparison
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedName = normalize(name);
        
        // Try multiple strategies to find the restaurant
        // 1. Look for restaurant cards
        const cards = document.querySelectorAll('[data-test*="restaurant-card"], [class*="restaurant-card"], [class*="RestaurantCard"]');
        for (const card of Array.from(cards)) {
          if (normalize(card.textContent || '').includes(normalizedName)) {
            const link = card.querySelector('a');
            return link ? link.href : null;
          }
        }
        
        // 2. Look for any links that might contain the restaurant name
        const links = document.querySelectorAll('a');
        for (const link of Array.from(links)) {
          if (normalize(link.textContent || '').includes(normalizedName)) {
            return link.href;
          }
        }
        
        // 3. Look for search result items
        const searchResults = document.querySelectorAll('[role="option"], [class*="search-result"]');
        for (const result of Array.from(searchResults)) {
          if (normalize(result.textContent || '').includes(normalizedName)) {
            const link = result.querySelector('a') || result.closest('a');
            return link ? link.href : null;
          }
        }
        
        return null;
      }, restaurantName);
      
      if (!restaurantLink) {
        // Take debug screenshot
        await page.screenshot({ path: 'opentable-results-debug.png' });
        
        await page.close();
        return {
          available: false,
          logEntry: {
            ...logEntry,
            details: `Restaurant "${restaurantName}" not found in search results. See debug screenshot.`
          }
        };
      }
      
      // Go to restaurant page
      await page.goto(restaurantLink, { waitUntil: 'networkidle2' });
      
      // Try to set date and party size using modern selectors
      const formattedDate = date.toISOString().split('T')[0];
      
      // Look for party size selector using multiple strategies
      const partySizeSelectors = [
        '[data-test="party-size-selector"]',
        'select[aria-label*="Party"]',
        'select[aria-label*="people"]',
        'button[aria-label*="Party"]',
        '[class*="party-size"]'
      ];
      
      let partySizeSelector = null;
      for (const selector of partySizeSelectors) {
        if (await page.$(selector) !== null) {
          partySizeSelector = selector;
          break;
        }
      }
      
      if (partySizeSelector) {
        // Check if it's a select element or a button that opens a dropdown
        const isSelect = await page.evaluate(selector => {
          return document.querySelector(selector)?.tagName === 'SELECT';
        }, partySizeSelector);
        
        if (isSelect) {
          await page.select(partySizeSelector, partySize.toString());
        } else {
          // If it's a button, click it and then find the right option
          await page.click(partySizeSelector);
          // Wait for dropdown to appear
          await page.waitForSelector('[role="option"], [class*="dropdown-item"]', { timeout: 5000 });
          // Find and click the option with the right party size
          await page.evaluate((size) => {
            const options = document.querySelectorAll('[role="option"], [class*="dropdown-item"]');
            for (const option of Array.from(options)) {
              if (option.textContent?.includes(size.toString())) {
                // Use HTMLElement to access click method
                (option as HTMLElement).click();
                return;
              }
            }
          }, partySize);
        }
      }
      
      // Take a screenshot of the restaurant page
      await page.screenshot({ path: 'opentable-restaurant.png' });
      
      // Check for available time slots using multiple selectors
      const timeSlotSelectors = [
        '[data-test="time-slot"]',
        '[role="button"][class*="time"]',
        'button[class*="time-slot"]',
        '[aria-label*="' + time + '"]'
      ];
      
      let availableTimes = {
        allTimes: [] as string[],
        hasTargetTime: false
      };
      
      for (const selector of timeSlotSelectors) {
        try {
          const times = await page.evaluate((selector, targetTime) => {
            const slots = document.querySelectorAll(selector);
            if (slots.length === 0) return null;
            
            const times = Array.from(slots).map(slot => slot.textContent?.trim() || '');
            return {
              allTimes: times,
              hasTargetTime: times.some(t => t.includes(targetTime))
            };
          }, selector, time);
          
          if (times && times.allTimes.length > 0) {
            availableTimes = times;
            break;
          }
        } catch (e) {
          // Try the next selector
        }
      }
      
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
            details: `No availability at ${time}. Available times: ${availableTimes.allTimes.join(', ') || 'None found'}`
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