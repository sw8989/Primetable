// A script to directly test the scraping service functionality without importing TS files
// This will just test the basic puppeteer functionality

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

async function testPuppeteerDirectly() {
  try {
    console.log('Testing puppeteer directly...');
    
    // Get paths to commonly used chromium locations in Replit
    const chromePaths = [
      '/nix/store/chromium/bin/chromium',  // Common Nix store path
      '/usr/bin/chromium-browser',         // Common Linux path
      '/usr/bin/chromium',                 // Another common Linux path
      '/home/runner/.cache/puppeteer/chrome/linux-*/chrome', // Puppeteer download location
    ];
    
    // Find the first path that exists
    let chromePath = '';
    for (const path of chromePaths) {
      try {
        // If path has a wildcard, use glob to expand it
        if (path.includes('*')) {
          const possiblePaths = execSync(`ls ${path} 2>/dev/null || echo ""`).toString().trim().split('\n');
          if (possiblePaths[0] && possiblePaths[0].length > 0) {
            chromePath = possiblePaths[0];
            break;
          }
        } else {
          // Otherwise just check if the file exists
          execSync(`test -f ${path}`);
          chromePath = path;
          break;
        }
      } catch (e) {
        // Path doesn't exist, try next one
      }
    }
    
    if (!chromePath) {
      console.log('Could not find Chrome or Chromium executable. Check if it is installed.');
      // Try to check what executables might be available
      const bins = execSync('ls /nix/store/*chromium*/bin/* | grep -i chrom').toString().trim();
      console.log('Found potential browser bins:', bins);
      
      // Try to find with which
      const whichResult = execSync('which chromium || which chromium-browser || echo ""').toString().trim();
      console.log('Which result:', whichResult);
      
      // Use what we found
      chromePath = whichResult || bins.split('\n')[0] || '/nix/store/chromium/bin/chromium';
    }
    
    console.log(`Using browser at: ${chromePath}`);
    
    // Launch a browser instance
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
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