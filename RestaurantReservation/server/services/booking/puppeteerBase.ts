/**
 * Puppeteer Base Class
 *
 * Shared base class for all Puppeteer-based booking services.
 * Provides common helpers for browser launch, screenshots, clicking, typing, and waiting.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export class PuppeteerBooker {
  // Launch a browser with anti-detection settings
  static async launchBrowser(): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    // Set user agent on every new page via CDP after launch
    return browser;
  }

  // Capture a base64 screenshot of the current page state
  protected async screenshot(page: Page): Promise<string> {
    const buf = await page.screenshot({ encoding: 'base64', fullPage: false });
    return buf as string;
  }

  // Try each selector in order; click the first one that exists. Returns true on success.
  protected async tryClick(
    page: Page,
    selectors: string[],
    logs: string[],
    label: string
  ): Promise<boolean> {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          logs.push(`Clicked ${label} using selector: ${sel}`);
          return true;
        }
      } catch {
        // Try next selector
      }
    }
    logs.push(`Could not find ${label} — tried: ${selectors.join(', ')}`);
    return false;
  }

  // Try each selector in order; type text into the first one that exists. Returns true on success.
  protected async tryType(
    page: Page,
    selectors: string[],
    text: string,
    logs: string[],
    label: string
  ): Promise<boolean> {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ clickCount: 3 }); // Select all existing text
          await el.type(text);
          logs.push(`Typed ${label} using selector: ${sel}`);
          return true;
        }
      } catch {
        // Try next selector
      }
    }
    logs.push(`Could not find ${label} field — tried: ${selectors.join(', ')}`);
    return false;
  }

  // Wait for any of the provided selectors to appear. Returns the first matching selector, or null on timeout.
  protected async waitForAny(
    page: Page,
    selectors: string[],
    timeout = 8000
  ): Promise<string | null> {
    const racePromises = selectors.map((sel) =>
      page
        .waitForSelector(sel, { timeout })
        .then(() => sel)
        .catch(() => null)
    );
    const results = await Promise.all(racePromises);
    return results.find((r) => r !== null) ?? null;
  }
}
