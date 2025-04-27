// Inspect OpenTable's structure to identify current selector patterns

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import fs from 'fs';

async function inspectOpenTable() {
  try {
    console.log('Inspecting OpenTable structure...');
    
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
    
    // Enable request interception for additional details
    await page.setRequestInterception(true);
    page.on('request', request => {
      // Log important API calls
      const url = request.url();
      if (url.includes('api') || url.includes('graphql')) {
        console.log('API Call:', url);
      }
      request.continue();
    });
    
    // Navigate to OpenTable's main page
    console.log('Navigating to OpenTable...');
    await page.goto('https://www.opentable.com', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    console.log('OpenTable page loaded successfully');
    
    // Gather page information
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check various input selectors
    const inputSelectors = [
      'input[placeholder*="search"]',
      'input[placeholder*="Find"]',
      'input[placeholder*="restaurant"]',
      'input[type="search"]',
      'input.search-input',
      '#search-input',
      '*[data-test*="search"]'
    ];
    
    console.log('Checking input selectors...');
    for (const selector of inputSelectors) {
      const exists = await page.evaluate((sel) => {
        const elements = Array.from(document.querySelectorAll(sel));
        return elements.map(el => {
          return {
            tag: el.tagName,
            type: el.type,
            id: el.id,
            classes: el.className,
            placeholder: el.placeholder,
            attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
          };
        });
      }, selector);
      
      if (exists && exists.length > 0) {
        console.log(`Found selector "${selector}":`, JSON.stringify(exists, null, 2));
      }
    }
    
    // Inspect all input elements
    console.log('Inspecting all input elements...');
    const allInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(input => {
        return {
          type: input.type,
          id: input.id,
          name: input.name,
          placeholder: input.placeholder,
          attributes: Array.from(input.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '),
          dataAttributes: Object.keys(input.dataset).map(key => `data-${key}`)
        };
      });
    });
    
    // Save all inputs to a file for analysis
    fs.writeFileSync('opentable-inputs.json', JSON.stringify(allInputs, null, 2));
    console.log(`Found ${allInputs.length} input elements, saved to opentable-inputs.json`);
    
    // Check page structure
    console.log('Analyzing basic page structure...');
    const pageStructure = await page.evaluate(() => {
      // Helper function to get a simplified representation of an element
      function simplifyElement(el, depth = 0, maxDepth = 3) {
        if (!el || depth > maxDepth) return null;
        
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string' 
          ? `.${el.className.trim().replace(/\s+/g, '.')}` 
          : '';
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const dataAttrs = Object.keys(el.dataset || {}).map(k => `[data-${k}]`).join('');
        
        // Get text content if it's not too long
        let text = '';
        if (el.textContent && el.children.length === 0) {
          text = el.textContent.trim().slice(0, 50);
          if (text.length > 0) text = ` "${text}${text.length > 49 ? '...' : ''}"`;
        }
        
        const selector = `${tag}${id}${classes}${dataAttrs}${text}`;
        
        // For form-related elements, include more details
        if (tag === 'input' || tag === 'select' || tag === 'button') {
          return {
            selector,
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            value: el.value
          };
        }
        
        // For other elements just return the selector
        return selector;
      }
      
      // Get main sections of the page
      const mainSections = Array.from(document.querySelectorAll('body > *')).map(section => {
        return simplifyElement(section);
      });
      
      // Look specifically for what might be a search form
      const possibleSearchForms = Array.from(document.querySelectorAll('form, [role="search"], div[class*="search"], div[class*="Search"]'))
        .map(form => {
          const children = Array.from(form.children).map(child => simplifyElement(child, 1, 2));
          return {
            container: simplifyElement(form),
            children
          };
        });
      
      return {
        title: document.title,
        url: window.location.href,
        mainSections,
        possibleSearchForms
      };
    });
    
    // Save page structure to a file
    fs.writeFileSync('opentable-structure.json', JSON.stringify(pageStructure, null, 2));
    console.log('Page structure saved to opentable-structure.json');
    
    // Take another screenshot with higher resolution
    console.log('Taking detailed screenshot...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'opentable-detailed.png', fullPage: true });
    console.log('Detailed screenshot saved to opentable-detailed.png');
    
    // Close browser
    await browser.close();
    console.log('Browser closed');
    console.log('OpenTable inspection completed!');
  } catch (error) {
    console.error('Error during OpenTable inspection:', error);
  }
}

inspectOpenTable();