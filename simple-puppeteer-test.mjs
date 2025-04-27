// A simplified version to test basic Puppeteer functionality

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

async function simplePuppeteerTest() {
  try {
    console.log('Starting simple Puppeteer test...');
    
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
    
    // Set a user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36');
    
    // Navigate to a simple page
    console.log('Navigating to simple page...');
    await page.goto('https://www.example.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Page loaded successfully');
    
    // Get the page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get some text from the page
    const bodyText = await page.evaluate(() => {
      return document.body.textContent;
    });
    
    console.log('Page content snippet:', bodyText.substring(0, 100) + '...');
    
    // Take a screenshot
    await page.screenshot({ path: 'example-page.png' });
    console.log('Screenshot saved to example-page.png');
    
    // Close browser
    await browser.close();
    console.log('Browser closed');
    console.log('Simple Puppeteer test completed successfully!');
  } catch (error) {
    console.error('Error during simple Puppeteer test:', error);
  }
}

simplePuppeteerTest();