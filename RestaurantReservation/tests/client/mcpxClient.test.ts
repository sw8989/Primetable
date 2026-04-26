import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPXClient } from '../../client/src/lib/mcp/MCPXClient';

const RESTAURANTS = [{ id: 1, name: 'Brat', cuisine: 'British', location: 'Shoreditch', description: 'd', imageUrl: null, bookingDifficulty: 'hard', bookingInfo: 'i', bookingPlatform: 'Resy', bookingNotes: null, platformId: null, bookingUrl: null, websiteUrl: null, platformDetails: null, bookingSelectors: null, releaseStrategy: null, lastScrapedAt: null }] as any[];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  // Default: tools endpoint returns empty, chat returns assistant message
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/mcp/tools') {
      return Promise.resolve({ ok: true, json: async () => ({ tools: [] }) });
    }
    if (url === '/api/chat') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: { role: 'assistant', content: 'ok' }, conversationId: 55 }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
});

describe('MCPXClient.setContext / getConversationId', () => {
  it('stores context and exposes conversationId', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    client.setContext({ conversationId: 7, restaurantId: 1, userId: 1 });
    expect(client.getConversationId()).toBe(7);
  });

  it('getConversationId returns undefined before setContext', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    expect(client.getConversationId()).toBeUndefined();
  });
});

describe('MCPXClient.loadHistory', () => {
  it('replaces internal messages with provided history', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    const history = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ];
    client.loadHistory(history);
    const msgs = client.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe('hi');
  });
});

describe('MCPXClient.generateResponse payload', () => {
  it('includes conversationId and restaurantId in POST /api/chat body', async () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    client.setContext({ conversationId: 3, restaurantId: 1, userId: 1 });
    await client.processMessage('test');

    const chatCall = fetchMock.mock.calls.find(([url]: [string]) => url === '/api/chat');
    expect(chatCall).toBeDefined();
    const body = JSON.parse(chatCall[1].body);
    expect(body.conversationId).toBe(3);
    expect(body.restaurantId).toBe(1);
    expect(body.userId).toBe(1);
  });

  it('updates internal conversationId from response', async () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    await client.processMessage('test');
    expect(client.getConversationId()).toBe(55); // server returned 55
  });
});
