import { fetchRestaurants, fetchBookings, cancelBooking, sendChatMessage, fetchTools } from '@/lib/api';

const BASE = 'http://localhost:5000';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockClear();
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

describe('fetchRestaurants', () => {
  it('calls GET /api/restaurants and returns parsed array', async () => {
    const mockData = [{ id: 1, name: 'Sketch' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });
    const result = await fetchRestaurants();
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/api/restaurants`);
    expect(result).toEqual(mockData);
  });
});

describe('fetchBookings', () => {
  it('calls GET /api/bookings/user/:userId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await fetchBookings(1);
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/api/bookings/user/1`);
  });
});

describe('cancelBooking', () => {
  it('calls PATCH /api/bookings/:id/cancel', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, status: 'cancelled' }),
    });
    await cancelBooking(42);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/api/bookings/42/cancel`,
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

describe('sendChatMessage', () => {
  it('calls POST /api/chat with messages payload', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { role: 'assistant', content: 'Hi' } }),
    });
    const result = await sendChatMessage(messages, []);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/api/chat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ messages, tools: [] }),
      })
    );
    expect(result).toEqual({ role: 'assistant', content: 'Hi' });
  });
});

describe('fetchTools', () => {
  it('calls GET /api/mcp/tools and returns tools array', async () => {
    const tools = [{ type: 'function', function: { name: 'search_restaurants', description: 'Search', parameters: { type: 'object', properties: {} } } }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools }),
    });
    const result = await fetchTools();
    expect(result).toEqual(tools);
  });
});
