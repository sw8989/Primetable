import type { MCPXMessage } from './mcp/MCPXClient';

export function getStorageKey(restaurantId?: number): string {
  return restaurantId != null ? `pt_conv_${restaurantId}` : 'pt_conv_global';
}

export function loadConversationId(restaurantId?: number): number | null {
  try {
    const raw = localStorage.getItem(getStorageKey(restaurantId));
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export function saveConversationId(id: number, restaurantId?: number): void {
  try {
    localStorage.setItem(getStorageKey(restaurantId), String(id));
  } catch {
    // ignore storage quota errors
  }
}

export function clearConversationId(restaurantId?: number): void {
  try {
    localStorage.removeItem(getStorageKey(restaurantId));
  } catch {
    // ignore
  }
}

export async function fetchConversationMessages(id: number): Promise<MCPXMessage[] | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.status}`);
  const data = await res.json();
  return data.messages as MCPXMessage[];
}

export async function createConversation(userId: number, restaurantId?: number): Promise<number> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, restaurantId }),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  const data = await res.json();
  return data.id as number;
}
