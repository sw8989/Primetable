// Domain types matching shared/schema.ts on the backend

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine: string;
  location: string;
  imageUrl: string | null;
  bookingDifficulty: 'easy' | 'medium' | 'hard';
  bookingInfo: string;
  bookingPlatform: string;
  bookingNotes: string | null;
  bookingUrl: string | null;
  websiteUrl: string | null;
}

export interface Booking {
  id: number;
  userId: number;
  restaurantId: number;
  /** ISO 8601 string serialised from a DB timestamp */
  date: string;
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  agentStatus: 'active' | 'success' | 'failed';
  platformBookingId: string | null;
  restaurant: Restaurant | null;
  confirmed: boolean | null;
  confirmationCode: string | null;
  agentType: string | null;
  createdAt: string | null;
}

// MCP message types (match MCPXClient.ts on web client)
export interface MCPXMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  name?: string;
  tool_calls?: MCPXToolCall[];
  tool_call_id?: string;
  function_name?: string;
}

export interface MCPXToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MCPXTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// Booking card data surfaced inline in chat
export interface BookingProposal {
  restaurantName: string;
  address: string;
  neighbourhood: string;
  date: string;
  time: string;
  partySize: number;
  restaurantId?: number;
}

// User profile stored locally
export interface UserProfile {
  name: string;
  postcode: string;
  dietary: string[];
  partySize: number;
}
