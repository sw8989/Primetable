/**
 * Booking service interfaces
 * 
 * Defines the common interface that all booking platform services must implement
 */
import { Restaurant } from '@shared/schema';

export interface BookingRequest {
  restaurantId: number;
  date: Date;
  time: string;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

export interface BookingResult {
  success: boolean;
  status: 'pending' | 'confirmed' | 'failed';
  confirmationCode?: string;
  bookingUrl?: string;
  error?: string;
  logs: string[];
  simulation?: boolean;
}

export interface BookingPlatformService {
  /**
   * Book a table at the specified restaurant
   */
  bookTable(restaurant: Restaurant, request: BookingRequest): Promise<BookingResult>;
  
  /**
   * Check availability for a specific date
   */
  checkAvailability?(restaurant: Restaurant, date: Date, partySize: number): Promise<string[]>;
  
  /**
   * Get information about the booking platform structure
   */
  getPlatformInfo?(restaurantId: string): Promise<Record<string, any>>;
}

export interface PlatformDetails {
  // Common details
  platformName: string;
  releasePattern: string;
  advanceDays: number;
  releaseTime?: string;
  
  // OpenTable specific
  restaurantPath?: string;
  
  // Resy specific
  venueId?: string;
  
  // SevenRooms specific
  venueCode?: string;
  
  // Tock specific
  ticketGroupId?: string;
}

export interface BookingSelectors {
  // Date selection
  dateSelector: string;
  dateNextButton?: string;
  dateAvailableClass?: string;
  
  // Time selection
  timeSelector: string;
  timeAvailableClass?: string;
  
  // Party size 
  partySizeSelector: string;
  
  // Form elements
  nameSelector: string;
  emailSelector: string;
  phoneSelector: string;
  specialRequestsSelector?: string;
  submitButtonSelector: string;
  
  // Confirmation
  confirmationSelector?: string;
}