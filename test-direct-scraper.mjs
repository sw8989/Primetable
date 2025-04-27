// A script to directly test the scraping service functionality without importing TS files
// This will just test the basic puppeteer functionality

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

async function testPuppeteerDirectly() {
  try {
    console.log('Testing puppeteer directly...');
    
    // Get the path to Chrome or Chromium on the system
    const chromePath = execSync('which chromium-browser || which chromium || which google-chrome || echo ""')
      .toString().trim();
    
    if (!chromePath) {
      console.log('Could not find Chrome or Chromium, trying to install...');
      execSync('apt-get update && apt-get install -y chromium-browser');
      
      const newChromePath = execSync('which chromium-browser').toString().trim();
      console.log(`Installed Chrome at: ${newChromePath}`);
    } else {
      console.log(`Found browser at: ${chromePath}`);
    }
    
    // Launch a browser instance
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Browser launched successfully');
    
    // Open a new page
    const page = await browser.newPage();
    
    // Set a user agent to appear as a normal browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36');
    
    // Navigate to a restaurant booking page
    console.log('Navigating to OpenTable...');
    await page.goto('https://www.opentable.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    console.log('Page loaded successfully');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'opentable-test.png' });
    console.log('Screenshot saved to opentable-test.png');
    
    // Try to search for a restaurant
    console.log('Searching for a restaurant...');
    await page.type('input[data-test="search-input"]', 'Chiltern Firehouse');
    await page.keyboard.press('Enter');
    
    // Wait for search results
    console.log('Waiting for search results...');
    await page.waitForSelector('[data-test="search-results-list"]', { timeout: 30000 });
    
    console.log('Search results loaded');
    
    // Take another screenshot
    await page.screenshot({ path: 'opentable-search.png' });
    console.log('Screenshot saved to opentable-search.png');
    
    // Close the browser
    await browser.close();
    console.log('Browser closed');
    console.log('Direct puppeteer test completed!');
  } catch (error) {
    console.error('Error during puppeteer test:', error);
  }
}

testPuppeteerDirectly();