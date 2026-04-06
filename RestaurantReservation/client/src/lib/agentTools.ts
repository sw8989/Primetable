import type { Restaurant, Booking } from '@shared/schema';

/**
 * Tools available to the booking agent 
 * These represent the various operations the agent can perform
 */

export interface BookingParameters {
  restaurantId: number;
  userId: number;
  date: Date;
  time: string;
  partySize: number;
  specialRequests?: string;
  useRealScraping: boolean;
}

export interface BookingAvailabilityParameters {
  restaurantId?: number;
  cuisineType?: string;
  location?: string;
  date: Date;
  time?: string;
  partySize: number;
  flexibility?: 'strict' | 'flexible-time' | 'flexible-date' | 'very-flexible';
}

export interface AgentMemory {
  currentStep: string;
  restaurants: Restaurant[];
  selectedRestaurant?: Restaurant | null;
  preferredDate?: Date | null;
  preferredTime?: string | null;
  partySize?: number | null;
  bookingType?: 'one-off' | 'recurring' | null;
  cuisinePreference?: string | null;
  locationPreference?: string | null;
  specialRequests?: string | null;
  weeklyPreferredDays?: string[] | null;
  flexibility?: 'strict' | 'flexible-time' | 'flexible-date' | 'very-flexible' | null;
  lastBookingResult?: {
    success: boolean;
    message: string;
    booking?: Booking | null;
  } | null;
}

/**
 * Determines which booking platform to use and calls the appropriate API
 */
export async function bookingTool(params: BookingParameters): Promise<{
  success: boolean;
  message: string;
  booking?: Booking | null;
}> {
  try {
    // API call to the booking endpoint
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: params.restaurantId,
        userId: params.userId || 1, // Default user ID if not available
        date: params.date.toISOString(),
        time: params.time,
        partySize: params.partySize,
        specialRequests: params.specialRequests || '',
        status: 'pending',
        useScraper: params.useRealScraping,
      }),
    });

    if (!response.ok) {
      throw new Error(`Booking failed with status: ${response.status}`);
    }

    const bookingData = await response.json();
    
    return {
      success: true,
      message: `Successfully created booking at restaurant ID ${params.restaurantId}`,
      booking: bookingData,
    };
  } catch (error) {
    console.error('Booking tool error:', error);
    return {
      success: false,
      message: `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
      booking: null,
    };
  }
}

/**
 * Checks availability across multiple restaurants based on parameters
 */
export async function availabilityTool(params: BookingAvailabilityParameters): Promise<{
  success: boolean;
  message: string;
  availableRestaurants: Restaurant[];
}> {
  try {
    // In a real implementation, this would query booking platforms for real-time availability
    // For now, we'll just filter restaurants based on criteria
    
    // Construct filter object
    const filters: any = {};
    if (params.cuisineType) filters.cuisine = [params.cuisineType];
    if (params.location) filters.location = [params.location];
    
    // API call to filter restaurants
    const response = await fetch('/api/restaurants/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error(`Availability check failed with status: ${response.status}`);
    }

    const availableRestaurants = await response.json();
    
    return {
      success: true,
      message: `Found ${availableRestaurants.length} restaurants matching your criteria`,
      availableRestaurants,
    };
  } catch (error) {
    console.error('Availability tool error:', error);
    return {
      success: false,
      message: `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      availableRestaurants: [],
    };
  }
}

/**
 * Searches for restaurants by name, cuisine, or location
 */
export async function searchRestaurantsTool(query: string): Promise<{
  success: boolean;
  message: string;
  restaurants: Restaurant[];
}> {
  try {
    // API call to search restaurants
    const response = await fetch(`/api/restaurants/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const restaurants = await response.json();
    
    return {
      success: true,
      message: `Found ${restaurants.length} restaurants matching "${query}"`,
      restaurants,
    };
  } catch (error) {
    console.error('Search tool error:', error);
    return {
      success: false,
      message: `Failed to search restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`,
      restaurants: [],
    };
  }
}

/**
 * Gets details for a specific restaurant
 */
export async function getRestaurantDetailsTool(restaurantId: number): Promise<{
  success: boolean;
  message: string;
  restaurant: Restaurant | null;
}> {
  try {
    // API call to get restaurant details
    const response = await fetch(`/api/restaurants/${restaurantId}`);

    if (!response.ok) {
      throw new Error(`Getting restaurant details failed with status: ${response.status}`);
    }

    const restaurant = await response.json();
    
    return {
      success: true,
      message: `Retrieved details for ${restaurant.name}`,
      restaurant,
    };
  } catch (error) {
    console.error('Restaurant details tool error:', error);
    return {
      success: false,
      message: `Failed to get restaurant details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      restaurant: null,
    };
  }
}

/**
 * Recommends restaurants based on user preferences
 */
export function recommendRestaurantsTool(
  allRestaurants: Restaurant[],
  preferences: {
    cuisineType?: string;
    location?: string;
    difficulty?: string;
  }
): Restaurant[] {
  // Filter restaurants based on preferences
  return allRestaurants.filter(restaurant => {
    // If preference is specified, filter by it; otherwise include all
    const cuisineMatch = !preferences.cuisineType || restaurant.cuisine === preferences.cuisineType;
    const locationMatch = !preferences.location || restaurant.location === preferences.location;
    const difficultyMatch = !preferences.difficulty || restaurant.bookingDifficulty === preferences.difficulty;
    
    return cuisineMatch && locationMatch && difficultyMatch;
  });
}

/**
 * Agent workflow steps
 */
export const AGENT_STEPS = {
  GREETING: 'greeting',
  ASK_BOOKING_TYPE: 'ask_booking_type',
  ASK_CUISINE: 'ask_cuisine',
  ASK_LOCATION: 'ask_location',
  ASK_DATE: 'ask_date',
  ASK_TIME: 'ask_time',
  ASK_PARTY_SIZE: 'ask_party_size',
  SHOW_RECOMMENDATIONS: 'show_recommendations',
  ASK_RESTAURANT_SELECTION: 'ask_restaurant_selection',
  ASK_SPECIAL_REQUESTS: 'ask_special_requests',
  CONFIRM_BOOKING: 'confirm_booking',
  PROCESS_BOOKING: 'process_booking',
  BOOKING_RESULT: 'booking_result',
  FINISHED: 'finished',
};