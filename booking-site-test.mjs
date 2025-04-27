// Test accessing a restaurant booking site

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

async function testBookingSite() {
  try {
    console.log('Testing access to a booking site...');
    
    // Get the Chromium executable path
    const chromePath = execSync('which chromium').toString().trim();
    console.log(`Using browser at: ${chromePath}`);
    
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Browser launched successfully');
    
    // Open a new page
    const page = await browser.newPage();
    console.log('New page opened');
    
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
    
    // Check if we can access the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Take a screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'opentable-home.png', fullPage: true });
    console.log('Screenshot saved to opentable-home.png');
    
    // Check for booking-related elements
    console.log('Checking for booking elements...');
    
    // Look for search input
    const hasSearchInput = await page.evaluate(() => {
      return !!document.querySelector('input[data-test="search-input"]');
    });
    
    console.log('Has search input:', hasSearchInput);
    
    // Look for date picker
    const hasDatePicker = await page.evaluate(() => {
      return !!document.querySelector('[data-test="date-picker"]');
    });
    
    console.log('Has date picker:', hasDatePicker);
    
    // Look for party size selector
    const hasPartySizeSelector = await page.evaluate(() => {
      return !!document.querySelector('[data-test="party-size-selector"]');
    });
    
    console.log('Has party size selector:', hasPartySizeSelector);
    
    // Close browser
    await browser.close();
    console.log('Browser closed');
    console.log('Booking site test completed!');
  } catch (error) {
    console.error('Error during booking site test:', error);
  }
}

testBookingSite();