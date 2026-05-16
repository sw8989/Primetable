/**
 * Resy unofficial REST API client.
 * Endpoints reverse-engineered from the Resy mobile/web app.
 */

import { decrypt } from '../../encryption';

const BASE = 'https://api.resy.com';
const API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

export interface ResySlot {
  date: { start: string; end: string }; // e.g. "2026-05-15 19:30:00"
  config: { token: string; type: string; id: string };
}

export interface ResyAuthResult {
  token: string;
  paymentMethodId?: number;
}

function baseHeaders(authToken?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `ResyAPI api_key="${API_KEY}"`,
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    Origin: 'https://resy.com',
    Referer: 'https://resy.com/',
  };
  if (authToken) {
    h['X-Resy-Auth-Token'] = authToken;
    h['X-Resy-Universal-Auth'] = authToken;
  }
  return h;
}

// POST /3/auth/password — exchange email+password for a session token
export async function resyLogin(email: string, encryptedPassword: string): Promise<ResyAuthResult> {
  const password = decrypt(encryptedPassword);
  const res = await fetch(`${BASE}/3/auth/password`, {
    method: 'POST',
    headers: { ...baseHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resy login failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { token: data.token, paymentMethodId: data.payment_method_id };
}

// GET /3/venue?url_slug=<slug>&location=lon — resolve slug to numeric venue ID
export async function resyGetVenueId(slug: string, authToken: string): Promise<number> {
  const params = new URLSearchParams({ url_slug: slug, location: 'lon' });
  const res = await fetch(`${BASE}/3/venue?${params}`, {
    headers: baseHeaders(authToken),
  });
  if (!res.ok) throw new Error(`Resy venue lookup failed (${res.status}) for slug "${slug}"`);
  const data = await res.json();
  if (!data.id) throw new Error(`Resy venue not found for slug "${slug}"`);
  return data.id;
}

// GET /4/find — list available slots for a venue/date/party
export async function resyFindSlots(
  venueId: number,
  date: string,
  partySize: number,
  authToken: string,
): Promise<ResySlot[]> {
  const params = new URLSearchParams({
    lat: '0', long: '0',
    day: date,
    party_size: String(partySize),
    venue_id: String(venueId),
  });
  const res = await fetch(`${BASE}/4/find?${params}`, {
    headers: baseHeaders(authToken),
  });
  if (!res.ok) throw new Error(`Resy find slots failed (${res.status})`);
  const data = await res.json();
  const venues: any[] = data?.results?.venues ?? [];
  return venues[0]?.slots ?? [];
}

// POST /3/details — exchange a slot config token for a short-lived book token
export async function resyGetBookingToken(
  configToken: string,
  date: string,
  partySize: number,
  authToken: string,
): Promise<string> {
  const res = await fetch(`${BASE}/3/details`, {
    method: 'POST',
    headers: { ...baseHeaders(authToken), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      commit: '1',
      config_id: configToken,
      day: date,
      party_size: String(partySize),
    }).toString(),
  });
  if (!res.ok) throw new Error(`Resy details failed (${res.status})`);
  const data = await res.json();
  const value = data?.book_token?.value;
  if (!value) throw new Error('Resy details: no book_token in response');
  return value;
}

// POST /3/book — confirm the reservation
export async function resyBook(
  bookToken: string,
  paymentMethodId: number | undefined,
  authToken: string,
): Promise<{ confirmationCode: string }> {
  const structPayment = paymentMethodId
    ? JSON.stringify({ id: paymentMethodId, type: 'Visa' })
    : '{}';
  const res = await fetch(`${BASE}/3/book`, {
    method: 'POST',
    headers: { ...baseHeaders(authToken), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      book_token: bookToken,
      struct_payment_method: structPayment,
      source_id: 'resy.com-venue-details',
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resy book failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { confirmationCode: data.resy_token ?? data.reservation_id ?? 'confirmed' };
}
