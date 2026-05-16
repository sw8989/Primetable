/**
 * SevenRooms Booking Service
 *
 * Handles table bookings via the SevenRooms platform (Gymkhana, Core by Clare Smyth, Zuma, etc.)
 * using Puppeteer browser automation.
 *
 * NOTE: Form is filled but the final confirm click is intentionally skipped.
 * TODO: uncomment to actually submit
 */

import { Restaurant } from '@shared/schema';
import { BookingRequest, BookingResult, BookingPlatformService } from './interfaces';
import { PuppeteerBooker } from './puppeteerBase';

export class SevenRoomsService extends PuppeteerBooker implements BookingPlatformService {
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    const logs: string[] = [];

    const slug =
      restaurant.platformId ??
      restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const bookingUrl =
      restaurant.bookingUrl ||
      `https://www.sevenrooms.com/reservations/${slug}`;

    logs.push(`[SevenRooms] Starting booking for ${restaurant.name}`);
    logs.push(`[SevenRooms] URL: ${bookingUrl}`);

    const browser = await PuppeteerBooker.launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
      logs.push(`[SevenRooms] Navigating to booking page`);
      await page.goto(bookingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Try to fill date picker if present
      const dateStr = new Date(request.date).toISOString().split('T')[0];
      const datePickerSelectors = ['input[placeholder*="date"]', '[class*="DatePicker"]'];
      const datePickerFound = await this.waitForAny(page, datePickerSelectors, 4000);
      if (datePickerFound) {
        await this.tryType(page, datePickerSelectors, dateStr, logs, 'date picker');
      } else {
        logs.push(`[SevenRooms] No date picker found, assuming date is pre-set`);
      }

      // Wait for the widget to load and show time slots
      const slotSelectors = [
        '[class*="Timeslot"]',
        '[class*="time-slot"]',
        'button[class*="time"]',
      ];
      const slotFound = await this.waitForAny(page, slotSelectors, 8000);
      if (!slotFound) {
        const shot = await this.screenshot(page);
        logs.push(`[SevenRooms] No time slot buttons found. Screenshot: data:image/png;base64,${shot}`);
        return { success: false, error: 'No time slots found', logs, bookingUrl };
      }

      logs.push(`[SevenRooms] Time slots loaded — selector: ${slotFound}`);

      // Find the slot closest to request.time and click it
      const slotButtons = await page.$$(slotFound);
      logs.push(`[SevenRooms] Found ${slotButtons.length} time slot(s)`);

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
      logs.push(`[SevenRooms] Clicked time slot index ${bestIndex}`);

      // Wait for guest details form
      const formSelectors = [
        'input[name="firstName"]',
        'input[placeholder*="First"]',
        'input[id*="first"]',
        'input[name="first_name"]',
      ];
      const formFound = await this.waitForAny(page, formSelectors, 8000);
      if (!formFound) {
        const shot = await this.screenshot(page);
        logs.push(`[SevenRooms] Guest form not found. Screenshot: data:image/png;base64,${shot}`);
        return { success: false, error: 'Guest details form not found', logs, bookingUrl };
      }

      logs.push(`[SevenRooms] Guest form loaded`);

      // Fill in name fields
      const nameParts = (request.name ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || (nameParts[0] ?? '');

      await this.tryType(
        page,
        ['input[name="firstName"]', 'input[name="first_name"]', 'input[placeholder*="First"]', 'input[id*="first"]'],
        firstName,
        logs,
        'firstName'
      );
      await this.tryType(
        page,
        ['input[name="lastName"]', 'input[name="last_name"]', 'input[placeholder*="Last"]', 'input[id*="last"]'],
        lastName,
        logs,
        'lastName'
      );

      if (request.email) {
        await this.tryType(
          page,
          ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="mail"]'],
          request.email,
          logs,
          'email'
        );
      }

      if (request.phone) {
        await this.tryType(
          page,
          ['input[name="phone"]', 'input[type="tel"]', 'input[placeholder*="phone"]', 'input[placeholder*="Phone"]'],
          request.phone,
          logs,
          'phone'
        );
      }

      logs.push(`[SevenRooms] Form filled. Stopping before final submit.`);

      // TODO: uncomment to actually submit
      // await this.tryClick(
      //   page,
      //   ['button[type="submit"]', 'button[class*="confirm"]', 'button[class*="submit"]'],
      //   logs,
      //   'submit button'
      // );
      // const confirmationSelector = await this.waitForAny(
      //   page,
      //   ['[class*="confirmation"]', '[class*="Confirmation"]', '.confirmation-number'],
      //   8000
      // );
      // let confirmationCode: string | undefined;
      // if (confirmationSelector) {
      //   const el = await page.$(confirmationSelector);
      //   confirmationCode = (await el?.evaluate((e) => e.textContent ?? '')) ?? undefined;
      //   logs.push(`[SevenRooms] Confirmation: ${confirmationCode}`);
      // }

      return {
        success: true,
        status: 'pending',
        bookingUrl,
        logs,
      };
    } catch (error: any) {
      logs.push(`[SevenRooms] Error: ${error.message}`);
      try {
        const shot = await this.screenshot(page);
        logs.push(`[SevenRooms] Screenshot at error: data:image/png;base64,${shot}`);
      } catch {}
      return {
        success: false,
        error: `SevenRooms booking failed: ${error.message}`,
        logs,
        bookingUrl,
      };
    } finally {
      await browser.close();
    }
  }
}
