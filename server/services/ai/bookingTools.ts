/**
 * AI Booking Tools
 * 
 * MCP-compatible tools that allow the AI assistant to make restaurant bookings
 */

import { storage } from '../../storage';
import { bookingService } from '../booking';
import { Restaurant } from '@shared/schema';

// Define the MCP Tool schema
export const bookingTools = [
  {
    type: 'function',
    function: {
      name: 'makeReservation',
      description: 'Books a table at a restaurant on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          restaurant: {
            type: 'string',
            description: 'Name of the restaurant to book'
          },
          date: {
            type: 'string',
            description: 'Date for the reservation in YYYY-MM-DD format'
          },
          time: {
            type: 'string',
            description: 'Time for the reservation in HH:MM format (24 hour)'
          },
          partySize: {
            type: 'integer',
            description: 'Number of people in the party'
          },
          specialRequests: {
            type: 'string',
            description: 'Any special requests or notes for the booking'
          },
          userId: {
            type: 'integer',
            description: 'ID of the user making the booking'
          }
        },
        required: ['restaurant', 'date', 'time', 'partySize', 'userId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'findAvailability',
      description: 'Checks availability for a specific restaurant, date, and party size',
      parameters: {
        type: 'object',
        properties: {
          restaurant: {
            type: 'string',
            description: 'Name of the restaurant to check'
          },
          date: {
            type: 'string',
            description: 'Date to check in YYYY-MM-DD format'
          },
          partySize: {
            type: 'integer',
            description: 'Number of people in the party'
          },
          timeRange: {
            type: 'string',
            description: 'Optional time range to check e.g. "18:00-21:00"'
          }
        },
        required: ['restaurant', 'date', 'partySize']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRestaurantInfo',
      description: 'Get detailed information about a restaurant including booking details',
      parameters: {
        type: 'object',
        properties: {
          restaurant: {
            type: 'string',
            description: 'Name of the restaurant'
          }
        },
        required: ['restaurant']
      }
    }
  }
];

/**
 * Handle the makeReservation tool call
 */
export async function handleMakeReservation(params: any): Promise<any> {
  try {
    console.log(`AI assistant attempting to make reservation at ${params.restaurant}`);
    
    // Find the restaurant
    const restaurant = await findRestaurantByName(params.restaurant);
    
    if (!restaurant) {
      return {
        success: false,
        error: `Restaurant "${params.restaurant}" not found in our database.`
      };
    }
    
    // Parse the date
    let bookingDate: Date;
    try {
      bookingDate = new Date(params.date);
      if (isNaN(bookingDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return {
        success: false,
        error: `Invalid date format: ${params.date}. Please use YYYY-MM-DD.`
      };
    }
    
    // Create the booking request
    const bookingRequest = {
      restaurantId: restaurant.id,
      userId: params.userId,
      date: bookingDate,
      time: params.time,
      partySize: params.partySize,
      specialRequests: params.specialRequests,
      // Add optional parameters
      priorityBooking: params.priorityBooking || false,
      acceptSimilarTimes: params.acceptSimilarTimes || false,
      autoConfirm: params.autoConfirm || false,
      useRealScraping: params.useRealScraping || false
    };
    
    // Get automated booking service
    const { automatedBookingService } = await import('../automatedBookingService');
    
    // Make the booking
    const result = await automatedBookingService.createBooking(bookingRequest);
    
    // Return a user-friendly response
    if (result.success) {
      return {
        success: true,
        message: `Successfully booked a table at ${restaurant.name} on ${params.date} at ${params.time} for ${params.partySize} people.`,
        booking: result.booking,
        status: 'pending'
      };
    } else {
      return {
        success: false,
        error: result.message || 'Failed to make reservation'
      };
    }
  } catch (error: any) {
    console.error('Error in handleMakeReservation:', error);
    return {
      success: false,
      error: `Error making reservation: ${error.message || error}`
    };
  }
}

/**
 * Handle the findAvailability tool call
 */
export async function handleFindAvailability(params: any): Promise<any> {
  try {
    console.log(`AI assistant checking availability at ${params.restaurant}`);
    
    // Find the restaurant
    const restaurant = await findRestaurantByName(params.restaurant);
    
    if (!restaurant) {
      return {
        success: false,
        error: `Restaurant "${params.restaurant}" not found in our database.`
      };
    }
    
    // Parse the date
    let checkDate: Date;
    try {
      checkDate = new Date(params.date);
      if (isNaN(checkDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return {
        success: false,
        error: `Invalid date format: ${params.date}. Please use YYYY-MM-DD.`
      };
    }
    
    // In a real implementation, we would check the actual availability
    // For now, simulate a check based on difficulty
    const difficulty = restaurant.bookingDifficulty || 'medium';
    const day = checkDate.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = day === 0 || day === 5 || day === 6;
    
    // Simulate available times based on difficulty and day
    let availableTimes: string[] = [];
    
    if (difficulty === 'easy') {
      availableTimes = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
    } else if (difficulty === 'medium') {
      availableTimes = isWeekend 
        ? ['17:00', '17:30', '21:00', '21:30'] 
        : ['17:00', '17:30', '18:00', '20:30', '21:00', '21:30'];
    } else if (difficulty === 'hard') {
      availableTimes = isWeekend
        ? ['17:00', '21:30']
        : ['17:00', '17:30', '21:00', '21:30'];
    }
    
    // Filter by time range if provided
    if (params.timeRange) {
      const [startStr, endStr] = params.timeRange.split('-');
      const startMinutes = timeToMinutes(startStr);
      const endMinutes = timeToMinutes(endStr);
      
      if (!isNaN(startMinutes) && !isNaN(endMinutes)) {
        availableTimes = availableTimes.filter(time => {
          const minutes = timeToMinutes(time);
          return minutes >= startMinutes && minutes <= endMinutes;
        });
      }
    }
    
    return {
      success: true,
      restaurant: restaurant.name,
      date: params.date,
      partySize: params.partySize,
      availableTimes,
      message: availableTimes.length > 0
        ? `Found ${availableTimes.length} available time${availableTimes.length === 1 ? '' : 's'} at ${restaurant.name} on ${params.date} for ${params.partySize} people.`
        : `No availability found at ${restaurant.name} on ${params.date} for ${params.partySize} people.`
    };
  } catch (error: any) {
    console.error('Error in handleFindAvailability:', error);
    return {
      success: false,
      error: `Error checking availability: ${error.message || error}`
    };
  }
}

/**
 * Handle the getRestaurantInfo tool call
 */
export async function handleGetRestaurantInfo(params: any): Promise<any> {
  try {
    console.log(`AI assistant getting information for ${params.restaurant}`);
    
    // Find the restaurant
    const restaurant = await findRestaurantByName(params.restaurant);
    
    if (!restaurant) {
      return {
        success: false,
        error: `Restaurant "${params.restaurant}" not found in our database.`
      };
    }
    
    // Return restaurant information
    return {
      success: true,
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      location: restaurant.location,
      description: restaurant.description,
      bookingDifficulty: restaurant.bookingDifficulty,
      bookingInfo: restaurant.bookingInfo,
      bookingPlatform: restaurant.bookingPlatform,
      bookingNotes: restaurant.bookingNotes || 'No additional booking notes',
      message: `${restaurant.name} is a ${restaurant.cuisine} restaurant located in ${restaurant.location}. ${restaurant.description}. Booking difficulty: ${restaurant.bookingDifficulty}. ${restaurant.bookingInfo}`
    };
  } catch (error: any) {
    console.error('Error in handleGetRestaurantInfo:', error);
    return {
      success: false,
      error: `Error getting restaurant information: ${error.message || error}`
    };
  }
}

/**
 * Helper function to find a restaurant by name
 */
async function findRestaurantByName(name: string): Promise<Restaurant | undefined> {
  // Get all restaurants
  const restaurants = await storage.getRestaurants();
  
  // Find the best match
  const normalizedSearchName = name.toLowerCase().trim();
  
  // First try exact match
  let restaurant = restaurants.find(r => 
    r.name.toLowerCase() === normalizedSearchName
  );
  
  // If no exact match, try partial match
  if (!restaurant) {
    restaurant = restaurants.find(r => 
      r.name.toLowerCase().includes(normalizedSearchName) || 
      normalizedSearchName.includes(r.name.toLowerCase())
    );
  }
  
  return restaurant;
}

/**
 * Helper function to convert time string to minutes
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return NaN;
  }
  return hours * 60 + minutes;
}