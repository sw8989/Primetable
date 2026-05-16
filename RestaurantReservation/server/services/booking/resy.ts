import { Restaurant } from '@shared/schema';
import { BookingRequest, BookingResult, BookingPlatformService } from './interfaces';
import {
  resyGetVenueId,
  resyFindSlots,
  resyGetBookingToken,
  resyBook,
  ResySlot,
} from './resyApiClient';

export class ResyService implements BookingPlatformService {
  async bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult> {
    const logs: string[] = [];
    const dateStr = new Date(request.date).toISOString().split('T')[0];
    const slug = restaurant.platformId ?? restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const prefilledUrl = `https://resy.com/cities/lon/venues/${slug}?date=${dateStr}&seats=${request.partySize}`;

    const authToken = request.resyAuthToken;
    if (!authToken) {
      return {
        success: false,
        error: `Connect your Resy account in Settings to book ${restaurant.name} automatically.`,
        bookingUrl: prefilledUrl,
        logs,
      };
    }

    try {
      logs.push(`[Resy] Using auth token`);

      logs.push(`[Resy] Looking up venue: ${slug}`);
      const venueId = await resyGetVenueId(slug, authToken);
      logs.push(`[Resy] Venue ID: ${venueId}`);

      logs.push(`[Resy] Finding slots for ${dateStr}, party of ${request.partySize}`);
      const slots = await resyFindSlots(venueId, dateStr, request.partySize, authToken);

      if (!slots.length) {
        return {
          success: false,
          error: `No availability at ${restaurant.name} on ${dateStr} for ${request.partySize} guests.`,
          bookingUrl: prefilledUrl,
          logs,
        };
      }

      logs.push(`[Resy] Found ${slots.length} slot(s)`);
      const slot = closestSlot(slots, request.time);
      const slotTime = slot.date.start.split(' ')[1]?.slice(0, 5) ?? request.time;
      logs.push(`[Resy] Selected: ${slotTime} (${slot.config.type})`);

      const bookToken = await resyGetBookingToken(slot.config.token, dateStr, request.partySize, authToken);
      logs.push(`[Resy] Got booking token`);

      const { confirmationCode } = await resyBook(bookToken, paymentMethodId, authToken);
      logs.push(`[Resy] Confirmed: ${confirmationCode}`);

      return {
        success: true,
        status: 'confirmed',
        confirmationCode,
        bookingUrl: prefilledUrl,
        logs,
      };
    } catch (error: any) {
      logs.push(`[Resy] Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        bookingUrl: prefilledUrl,
        logs,
      };
    }
  }
}

function closestSlot(slots: ResySlot[], requestedTime: string): ResySlot {
  const [rH, rM] = requestedTime.split(':').map(Number);
  const reqMinutes = rH * 60 + rM;
  let best = slots[0];
  let bestDiff = Infinity;
  for (const slot of slots) {
    const timeStr = slot.date.start.split(' ')[1] ?? '';
    const [h, m] = timeStr.split(':').map(Number);
    const diff = Math.abs(h * 60 + m - reqMinutes);
    if (diff < bestDiff) { bestDiff = diff; best = slot; }
  }
  return best;
}
