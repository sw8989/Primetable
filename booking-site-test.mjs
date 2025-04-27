// Test script for the OpenTable restaurant booking scraper
// This script tests the scraping functionality without requiring a full application restart

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import fs from 'fs';

async function testOpenTableScraping() {
  try {
    console.log('=== Testing OpenTable Restaurant Booking Scraper ===');
    console.log('This test will simulate the process of checking for availability on OpenTable');
    
    // Get the Chromium executable path
    const chromePath = execSync('which chromium').toString().trim();
    console.log(`Using browser at: ${chromePath}`);
    
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true, // Use true for production, false for debugging
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Browser launched successfully');
    
    // Test restaurant data
    const testRestaurant = {
      name: "Chiltern Firehouse",
      city: "London",
      date: new Date(), // Today
      partySize: 2,
      time: "19:00" // 7 PM
    };
    
    console.log(`Testing search for: ${testRestaurant.name}`);
    
    // Open a new page
    const page = await browser.newPage();
    
    // Set a more realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.141 Safari/537.36');
    
    // Set viewport to look like a desktop browser
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to OpenTable's main page
    console.log('Navigating to OpenTable...');
    await page.goto('https://www.opentable.com', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    console.log('OpenTable page loaded successfully');
    
    // Try to find the search input
    const searchInputSelectors = [
      'input[data-test="search-autocomplete-input"]',
      '#home-page-autocomplete-input',
      'input[placeholder*="Restaurant"]',
      'input[aria-label*="Location"]'
    ];
    
    let searchInputSelector = null;
    for (const selector of searchInputSelectors) {
      if (await page.$(selector) !== null) {
        searchInputSelector = selector;
        break;
      }
    }
    
    if (!searchInputSelector) {
      console.error('Could not find search input on OpenTable');
      await page.screenshot({ path: 'error-opentable-home.png' });
      const html = await page.content();
      fs.writeFileSync('error-opentable-html.txt', html);
      await browser.close();
      return;
    }
    
    console.log(`Found search input with selector: ${searchInputSelector}`);
    
    // Enter restaurant name in search
    console.log(`Searching for restaurant: ${testRestaurant.name}`);
    await page.type(searchInputSelector, `${testRestaurant.name} ${testRestaurant.city}`);
    await page.keyboard.press('Enter');
    
    // Take a screenshot of the search results
    // Use setTimeout with a promise instead of waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for results to load
    await page.screenshot({ path: 'opentable-search-results.png' });
    console.log('Search results screenshot saved to opentable-search-results.png');
    
    // Wait for search results with various selectors
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
        console.log(`Found search results with selector: ${selector}`);
        break;
      } catch (e) {
        // Try the next selector
      }
    }
    
    if (!resultsSelector) {
      console.log('No search results container found. Continuing anyway to look for restaurant links...');
    }
    
    // Find restaurant in search results with debug info
    console.log('Looking for the restaurant in search results...');
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => {
        return {
          href: a.href,
          text: a.textContent?.trim() || '',
          isCard: a.closest('[data-test*="restaurant-card"], [class*="restaurant-card"], [class*="RestaurantCard"]') !== null
        };
      }).filter(link => link.text && link.href.includes('opentable.com'));
    });
    
    console.log(`Found ${links.length} links on the page`);
    
    // Filter down to likely restaurant links
    const possibleRestaurantLinks = links.filter(link => 
      link.isCard || 
      link.href.includes('/restaurant/') || 
      link.text.toLowerCase().includes(testRestaurant.name.toLowerCase())
    );
    
    console.log(`Filtered to ${possibleRestaurantLinks.length} possible restaurant links`);
    if (possibleRestaurantLinks.length > 0) {
      console.log('Top 5 most likely restaurant matches:');
      possibleRestaurantLinks.slice(0, 5).forEach((link, i) => {
        console.log(`${i+1}. ${link.text} (${link.href})`);
      });
    }
    
    // Try clicking the first possible match
    if (possibleRestaurantLinks.length > 0) {
      const restaurantLink = possibleRestaurantLinks[0].href;
      console.log(`Navigating to restaurant page: ${restaurantLink}`);
      
      // Go to restaurant page
      await page.goto(restaurantLink, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: 'opentable-restaurant-page.png' });
      console.log('Restaurant page screenshot saved to opentable-restaurant-page.png');
      
      // Try to find party size selector
      const partySizeSelectors = [
        '[data-test="party-size-selector"]',
        'select[aria-label*="Party"]',
        'select[aria-label*="people"]',
        'button[aria-label*="Party"]',
        '[class*="party-size"]'
      ];
      
      for (const selector of partySizeSelectors) {
        const exists = await page.$(selector) !== null;
        console.log(`Party size selector ${selector}: ${exists ? 'FOUND' : 'not found'}`);
      }
      
      // Look for time slot elements
      const timeSlotSelectors = [
        '[data-test="time-slot"]',
        '[role="button"][class*="time"]',
        'button[class*="time-slot"]',
        '[aria-label*="time"]',
        '[class*="time-slot"]'
      ];
      
      for (const selector of timeSlotSelectors) {
        const slots = await page.$$(selector);
        console.log(`Time slot selector ${selector}: ${slots.length} slots found`);
        
        if (slots.length > 0) {
          const times = await page.evaluate(selector => {
            return Array.from(document.querySelectorAll(selector))
              .map(el => el.textContent?.trim())
              .filter(text => text);
          }, selector);
          
          console.log(`Available times found: ${times.join(', ')}`);
        }
      }
    } else {
      console.log('No restaurant links found in search results');
    }
    
    // Close browser
    await browser.close();
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Error during OpenTable test:', error);
  }
}

testOpenTableScraping();