import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage (not available in node environment)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

import {
  getStorageKey,
  loadConversationId,
  saveConversationId,
  clearConversationId,
  fetchConversationMessages,
  createConversation,
} from '../../client/src/lib/conversationStorage';

beforeEach(() => localStorageMock.clear());

describe('getStorageKey', () => {
  it('returns keyed string when restaurantId given', () => {
    expect(getStorageKey(42)).toBe('pt_conv_42');
  });
  it('returns global key when restaurantId omitted', () => {
    expect(getStorageKey()).toBe('pt_conv_global');
    expect(getStorageKey(undefined)).toBe('pt_conv_global');
  });
});

describe('loadConversationId / saveConversationId / clearConversationId', () => {
  it('returns null when nothing stored', () => {
    expect(loadConversationId(1)).toBeNull();
  });
  it('round-trips an id', () => {
    saveConversationId(99, 1);
    expect(loadConversationId(1)).toBe(99);
  });
  it('clears the stored id', () => {
    saveConversationId(99, 1);
    clearConversationId(1);
    expect(loadConversationId(1)).toBeNull();
  });
  it('uses separate keys per restaurantId', () => {
    saveConversationId(10, 1);
    saveConversationId(20, 2);
    expect(loadConversationId(1)).toBe(10);
    expect(loadConversationId(2)).toBe(20);
  });
  it('uses global key when no restaurantId', () => {
    saveConversationId(5);
    expect(loadConversationId()).toBe(5);
    expect(loadConversationId(1)).toBeNull();
  });
});

describe('fetchConversationMessages', () => {
  it('returns messages array on success', async () => {
    const msgs = [{ role: 'user', content: 'hello' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 7, messages: msgs }),
    }));
    const result = await fetchConversationMessages(7);
    expect(result).toEqual(msgs);
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    const result = await fetchConversationMessages(99);
    expect(result).toBeNull();
  });

  it('throws on other non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));
    await expect(fetchConversationMessages(1)).rejects.toThrow('500');
  });
});

describe('createConversation', () => {
  it('posts to /api/conversations and returns id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const id = await createConversation(1, 3);
    expect(id).toBe(42);
    expect(fetchMock).toHaveBeenCalledWith('/api/conversations', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 1, restaurantId: 3 }),
    }));
  });

  it('throws on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(createConversation(1)).rejects.toThrow('400');
  });
});
