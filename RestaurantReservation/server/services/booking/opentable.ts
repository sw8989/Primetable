/**
 * OpenTable Booking Service
 *
 * Handles table bookings via the OpenTable platform (Scott's, Sketch, Chiltern Firehouse, etc.)
 * using Puppeteer browser automation.
 *
 * NOTE: Form is filled but the final confirm click is intentionally skipped.
 * TODO: uncomment to actually submit
 */

import { Restaurant } from '@shared/schema';
import { BookingRequest, BookingResult, BookingPlatformService } from './interfaces';
import { PuppeteerBooker } from './puppeteerBase';

export class OpenTableService extends PuppeteerBooker implements BookingPlatformService {
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    const logs: string[] = [];
    const dateStr = new Date(request.date).toISOString().split('T')[0];

    const bookingUrl =
      restaurant.bookingUrl ||
      `https://www.opentable.com/r/reserve/${restaurant.platformId}?datetime=${dateStr}T${request.time}&covers=${request.partySize}`;

    logs.push(`[OpenTable] Starting booking for ${restaurant.name}`);
    logs.push(`[OpenTable] URL: ${bookingUrl}`);

    const browser = await PuppeteerBooker.launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
      logs.push(`[OpenTable] Navigating to booking page`);
      await page.goto(bookingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Wait for time slot buttons
      const slotSelectors = [
        '.timeslot-btn',
        '[data-test="time-button"]',
        'button[class*="timeslot"]',
        'button[class*="time-slot"]',
      ];
      const slotFound = await this.waitForAny(page, slotSelectors, 8000);

      if (slotFound) {
        logs.push(`[OpenTable] Time slots loaded — selector: ${slotFound}`);

        const slotButtons = await page.$$(slotFound);
        logs.push(`[OpenTable] Found ${slotButtons.length} time slot(s)`);

        let bestIndex = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < slotButtons.length; i++) {
          const text = await slotButtons[i].evaluate((el) => el.textContent ?? '');
          const match = text.match(/(\d{1,2}):(\d{2})/);
          if (match) {
            const [, h, m] = match;
            const slotMinutes = parseInt(h) * 60 + parseInt(m);
            const [reqH, reqM] = request.time.split(':').map(Number);
            const reqMinutes = reqH * 60 + reqM;
            const diff = Math.abs(slotMinutes - reqMinutes);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestIndex = i;
            }
          }
        }

        await slotButtons[bestIndex].click();
        logs.push(`[OpenTable] Clicked time slot index ${bestIndex}`);
      } else {
        logs.push(`[OpenTable] No separate time slot selection found — URL may include pre-selected time`);
      }

      // Wait for guest details form
      const formSelectors = [
        'input[name="firstName"]',
        'input[autocomplete="given-name"]',
        'input[placeholder*="First"]',
        'input[id*="first"]',
      ];
      const formFound = await this.waitForAny(page, formSelectors, 8000);
      if (!formFound) {
        const shot = await this.screenshot(page);
        logs.push(`[OpenTable] Guest form not found. Screenshot: data:image/png;base64,${shot}`);
        return { success: false, error: 'Guest details form not found', logs, bookingUrl };
      }

      logs.push(`[OpenTable] Guest form loaded`);

      const nameParts = (request.name ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || (nameParts[0] ?? '');

      await this.tryType(
        page,
        ['input[name="firstName"]', 'input[autocomplete="given-name"]', 'input[placeholder*="First"]', 'input[id*="first"]'],
        firstName,
        logs,
        'firstName'
      );
      await this.tryType(
        page,
        ['input[name="lastName"]', 'input[autocomplete="family-name"]', 'input[placeholder*="Last"]', 'input[id*="last"]'],
        lastName,
        logs,
        'lastName'
      );

      if (request.email) {
        await this.tryType(
          page,
          ['input[name="email"]', 'input[type="email"]', 'input[autocomplete="email"]', 'input[placeholder*="mail"]'],
          request.email,
          logs,
          'email'
        );
      }

      if (request.phone) {
        await this.tryType(
          page,
          ['input[name="phoneNumber"]', 'input[name="phone"]', 'input[type="tel"]', 'input[placeholder*="phone"]'],
          request.phone,
          logs,
          'phone'
        );
      }

      if (request.specialRequests) {
        await this.tryType(
          page,
          ['textarea[name="specialRequests"]', 'textarea[name="notes"]', 'textarea[placeholder*="request"]'],
          request.specialRequests,
          logs,
          'special requests'
        );
      }

      logs.push(`[OpenTable] Form filled. Stopping before final submit.`);

      // TODO: uncomment to actually submit
      // await this.tryClick(
      //   page,
      //   ['button[type="submit"]', 'button[class*="confirm"]', 'button[class*="submit"]', '[data-test="submit-button"]'],
      //   logs,
      //   'submit button'
      // );
      // const confirmationSelector = await this.waitForAny(
      //   page,
      //   ['[data-test="confirmation"]', '.confirmation-number', '[class*="confirmation"]'],
      //   8000
      // );
      // let confirmationCode: string | undefined;
      // if (confirmationSelector) {
      //   const el = await page.$(confirmationSelector);
      //   confirmationCode = (await el?.evaluate((e) => e.textContent ?? '')) ?? undefined;
      //   logs.push(`[OpenTable] Confirmation: ${confirmationCode}`);
      // }

      return {
        success: true,
        status: 'pending',
        bookingUrl,
        logs,
      };
    } catch (error: any) {
      logs.push(`[OpenTable] Error: ${error.message}`);
      try {
        const shot = await this.screenshot(page);
        logs.push(`[OpenTable] Screenshot at error: data:image/png;base64,${shot}`);
      } catch {}
      return {
        success: false,
        error: `OpenTable booking failed: ${error.message}`,
        logs,
        bookingUrl,
      };
    } finally {
      await browser.close();
    }
  }
}
