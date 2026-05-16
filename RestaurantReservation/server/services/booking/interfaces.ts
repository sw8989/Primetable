/**
 * Booking Interfaces
 * 
 * Common interfaces used across different booking service implementations
 */

import { Restaurant } from '@shared/schema';

export interface PlatformCredential {
  email: string;
  encryptedPassword: string;
  // Cached session token — encrypted, refreshed automatically when expired
  encryptedAuthToken?: string;
  authTokenExpiry?: string; // ISO date string
}

export interface BookingCredentials {
  resy?: PlatformCredential;
  opentable?: PlatformCredential;
  sevenrooms?: PlatformCredential;
  tock?: PlatformCredential;
}

// Request for booking a table
export interface BookingRequest {
  restaurantId: number;
  userId: number;
  date: Date;
  time: string;
  partySize: number;
  specialRequests?: string;
  // Extended properties for user details
  name?: string;
  email?: string;
  phone?: string;
  // Stored platform credentials for automated login
  platformCredentials?: BookingCredentials;
  // Decrypted auth token passed in-memory from bookingTools after token refresh
  resyAuthToken?: string;
  // Optional flags for booking behavior
  priorityBooking?: boolean;
  acceptSimilarTimes?: boolean;
  autoConfirm?: boolean;
  useRealScraping?: boolean;
}

// Result of a booking attempt
export interface BookingResult {
  success: boolean;
  status?: 'pending' | 'confirmed' | 'failed';
  error?: string;
  confirmationCode?: string;
  bookingUrl?: string;
  logs?: string[];
  simulation?: boolean;
}

// Interface that all booking platform services must implement
export interface BookingPlatformService {
  bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult>;
}