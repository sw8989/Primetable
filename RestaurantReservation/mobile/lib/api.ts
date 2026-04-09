import type { Booking, MCPXMessage, MCPXTool, Restaurant } from './types';

const base = (): string =>
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = options
    ? await fetch(`${base()}${path}`, options)
    : await fetch(`${base()}${path}`);
  if (!res.ok) throw new Error(`API ${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchRestaurants(): Promise<Restaurant[]> {
  return request<Restaurant[]>('/api/restaurants');
}

export function fetchBookings(userId: number): Promise<Booking[]> {
  return request<Booking[]>(`/api/bookings/user/${userId}`);
}

export function cancelBooking(id: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
}

export function confirmBooking(id: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/confirm`, { method: 'PATCH' });
}

export async function sendChatMessage(
  messages: MCPXMessage[],
  tools: MCPXTool[]
): Promise<MCPXMessage> {
  const res = await request<{ message: MCPXMessage }>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, tools }),
  });
  return res.message;
}

export async function fetchTools(): Promise<MCPXTool[]> {
  const res = await request<{ tools: MCPXTool[] }>('/api/mcp/tools');
  return res.tools;
}

export async function executeToolCall(
  tool: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  return request<unknown>('/api/mcp/tool-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, parameters }),
  });
}
