/**
 * Tock Booking Service
 *
 * Handles table bookings via the Tock platform (The Clove Club, etc.)
 * using Puppeteer browser automation.
 *
 * NOTE: Form is filled but the final confirm click is intentionally skipped.
 * TODO: uncomment to actually submit
 */

import { Restaurant } from '@shared/schema';
import { BookingRequest, BookingResult, BookingPlatformService } from './interfaces';
import { PuppeteerBooker } from './puppeteerBase';

export class TockService extends PuppeteerBooker implements BookingPlatformService {
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    const logs: string[] = [];

    const slug =
      restaurant.platformId ??
      restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const bookingUrl =
      restaurant.bookingUrl ||
      `https://www.exploretock.com/${slug}`;

    logs.push(`[Tock] Starting booking for ${restaurant.name}`);
    logs.push(`[Tock] URL: ${bookingUrl}`);

    const browser = await PuppeteerBooker.launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
      logs.push(`[Tock] Navigating to booking page`);
      await page.goto(bookingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Tock shows experiences/menus — click the first available experience
      const experienceSelectors = [
        '[class*="Experience"]',
        '[class*="experience"]',
        'button[class*="experience"]',
        'a[class*="experience"]',
        '[data-testid*="experience"]',
      ];
      const experienceFound = await this.waitForAny(page, experienceSelectors, 8000);
      if (experienceFound) {
        logs.push(`[Tock] Experience cards loaded`);
        await this.tryClick(page, experienceSelectors, logs, 'first experience');
      } else {
        logs.push(`[Tock] No experience cards found, proceeding directly`);
      }

      // Select date if a date picker appears
      const dateStr = new Date(request.date).toISOString().split('T')[0];
      const dateSelectors = [
        'input[type="date"]',
        'input[placeholder*="date"]',
        '[class*="DatePicker"] input',
      ];
      const dateFound = await this.waitForAny(page, dateSelectors, 4000);
      if (dateFound) {
        await this.tryType(page, dateSelectors, dateStr, logs, 'date');
      } else {
        logs.push(`[Tock] No date picker found`);
      }

      // Select party size if present
      const partySizeSelectors = [
        'select[name*="party"]',
        'select[name*="guest"]',
        'select[name*="cover"]',
        'input[name*="party"]',
        'input[placeholder*="guests"]',
      ];
      const partySizeFound = await this.waitForAny(page, partySizeSelectors, 4000);
      if (partySizeFound) {
        await this.tryType(page, partySizeSelectors, String(request.partySize), logs, 'party size');
      } else {
        logs.push(`[Tock] No party size input found`);
      }

      // Wait for and click time slot
      const slotSelectors = [
        'button[class*="time"]',
        '[class*="TimeSlot"]',
        '[class*="timeslot"]',
        '[class*="time-slot"]',
      ];
      const slotFound = await this.waitForAny(page, slotSelectors, 8000);
      if (!slotFound) {
        const shot = await this.screenshot(page);
        logs.push(`[Tock] No time slot buttons found. Screenshot: data:image/png;base64,${shot}`);
        return { success: false, error: 'No time slots found', logs, bookingUrl };
      }

      logs.push(`[Tock] Time slots loaded — selector: ${slotFound}`);

      const slotButtons = await page.$$(slotFound);
      logs.push(`[Tock] Found ${slotButtons.length} time slot(s)`);

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
      logs.push(`[Tock] Clicked time slot index ${bestIndex}`);

      // Check if a payment page appears — Tock often requires payment upfront
      const paymentSelectors = [
        'input[name*="card"]',
        'input[name*="credit"]',
        '[class*="payment"]',
        '[class*="Payment"]',
        'iframe[src*="stripe"]',
        'iframe[src*="braintree"]',
      ];
      const paymentFound = await this.waitForAny(page, paymentSelectors, 4000);
      if (paymentFound) {
        logs.push(`[Tock] Payment page detected — requires upfront payment`);
        return {
          success: false,
          bookingUrl,
          logs,
          error: 'Tock requires upfront payment for this venue',
        };
      }

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
        logs.push(`[Tock] Guest form not found. Screenshot: data:image/png;base64,${shot}`);
        return { success: false, error: 'Guest details form not found', logs, bookingUrl };
      }

      logs.push(`[Tock] Guest form loaded`);

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

      logs.push(`[Tock] Form filled. Stopping before final submit.`);

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
      //   logs.push(`[Tock] Confirmation: ${confirmationCode}`);
      // }

      return {
        success: true,
        status: 'pending',
        bookingUrl,
        logs,
      };
    } catch (error: any) {
      logs.push(`[Tock] Error: ${error.message}`);
      try {
        const shot = await this.screenshot(page);
        logs.push(`[Tock] Screenshot at error: data:image/png;base64,${shot}`);
      } catch {}
      return {
        success: false,
        error: `Tock booking failed: ${error.message}`,
        logs,
        bookingUrl,
      };
    } finally {
      await browser.close();
    }
  }
}
