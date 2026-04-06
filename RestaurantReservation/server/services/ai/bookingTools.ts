/**
 * AI Booking Tools
 * 
 * This module provides tool definitions for AI services to perform
 * intelligent booking operations using MCP (Model Context Protocol).
 */

import { storage } from '../../storage';
import { config } from '../../config';
import { bookingService } from '../booking';

// Define the JSON schema for booking a restaurant
export const BookRestaurantToolSchema = {
  type: "function",
  function: {
    name: "book_restaurant",
    description: "Book a table at a specific restaurant for a given date and time",
    parameters: {
      type: "object",
      properties: {
        restaurant: {
          type: "string",
          description: "The name of the restaurant to book"
        },
        date: {
          type: "string",
          description: "The date for the booking in YYYY-MM-DD format"
        },
        time: {
          type: "string",
          description: "The time for the booking in HH:MM format (24-hour)"
        },
        partySize: {
          type: "integer",
          description: "Number of people in the party"
        },
        specialRequests: {
          type: "string",
          description: "Any special requests for the booking (optional)"
        },
        userId: {
          type: "integer",
          description: "User ID for whom to make the booking"
        }
      },
      required: ["restaurant", "date", "time", "partySize", "userId"]
    }
  }
};

// Define the JSON schema for checking availability at a restaurant
export const CheckAvailabilityToolSchema = {
  type: "function",
  function: {
    name: "check_availability",
    description: "Check if a restaurant has availability for a given date and time range",
    parameters: {
      type: "object",
      properties: {
        restaurant: {
          type: "string",
          description: "The name of the restaurant to check"
        },
        date: {
          type: "string",
          description: "The date to check in YYYY-MM-DD format"
        },
        partySize: {
          type: "integer",
          description: "Number of people in the party"
        },
        timeRange: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Start time in HH:MM format (24-hour)"
            },
            end: {
              type: "string",
              description: "End time in HH:MM format (24-hour)"
            }
          },
          required: ["start", "end"]
        }
      },
      required: ["restaurant", "date", "partySize"]
    }
  }
};

// Define the JSON schema for getting a restaurant's booking info
export const GetRestaurantInfoToolSchema = {
  type: "function",
  function: {
    name: "get_restaurant_info",
    description: "Get detailed booking information about a specific restaurant",
    parameters: {
      type: "object",
      properties: {
        restaurant: {
          type: "string",
          description: "The name of the restaurant to look up"
        }
      },
      required: ["restaurant"]
    }
  }
};

// Define the JSON schema for finding alternative restaurants
export const FindAlternativeRestaurantsToolSchema = {
  type: "function",
  function: {
    name: "find_alternative_restaurants",
    description: "Find alternative restaurants similar to the specified one",
    parameters: {
      type: "object",
      properties: {
        restaurant: {
          type: "string",
          description: "The name of the restaurant to find alternatives for"
        },
        cuisine: {
          type: "string",
          description: "Filter by cuisine type (optional)"
        },
        location: {
          type: "string",
          description: "Filter by location/area (optional)"
        },
        difficulty: {
          type: "string",
          description: "Filter by booking difficulty (easy, medium, hard) (optional)"
        }
      },
      required: ["restaurant"]
    }
  }
};

// Define the JSON schema for detecting a restaurant's booking platform
export const DetectBookingPlatformToolSchema = {
  type: "function",
  function: {
    name: "detect_booking_platform",
    description: "Detect which booking platform a restaurant uses from its website URL",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The restaurant's website URL to analyze"
        }
      },
      required: ["url"]
    }
  }
};

// Tool implementations
export const bookingTools = {
  // Detect booking platform from URL
  async detect_booking_platform(args: any) {
    try {
      console.log(`Detecting booking platform for URL: ${args.url}`);
      
      if (!args.url) {
        return {
          success: false,
          error: "URL is required to detect booking platform"
        };
      }
      
      // Import the platform detector service
      const { analyzeWebsite, BookingPlatform } = await import('../booking/platformDetector');
      
      // Clean up the URL if needed
      let url = args.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Analyze the website to detect platform
      const result = await analyzeWebsite(url);
      
      // Map the platform to a more descriptive name
      const platformDescriptions: Record<string, string> = {
        [BookingPlatform.OPENTABLE]: "OpenTable",
        [BookingPlatform.RESY]: "Resy",
        [BookingPlatform.TOCK]: "Tock",
        [BookingPlatform.SEVENROOMS]: "SevenRooms",
        [BookingPlatform.DIRECT]: "Direct Booking System",
        [BookingPlatform.UNKNOWN]: "Unknown Platform"
      };
      
      // Prepare response based on detection confidence
      if (result.confidence > 0.5) {
        return {
          success: true,
          url: url,
          platform: result.platform,
          platformName: platformDescriptions[result.platform] || result.platform,
          confidence: result.confidence,
          platformDetails: result.platformDetails || null,
          message: `Detected ${platformDescriptions[result.platform] || result.platform} with ${Math.round(result.confidence * 100)}% confidence.`
        };
      } else if (result.confidence > 0) {
        return {
          success: true,
          url: url,
          platform: result.platform,
          platformName: platformDescriptions[result.platform] || result.platform,
          confidence: result.confidence,
          platformDetails: result.platformDetails || null,
          message: `Low confidence detection of ${platformDescriptions[result.platform] || result.platform} (${Math.round(result.confidence * 100)}%). This is a best guess and may not be accurate.`
        };
      } else {
        return {
          success: false,
          url: url,
          platform: BookingPlatform.UNKNOWN,
          platformName: "Unknown",
          confidence: 0,
          message: "Could not detect a booking platform for this website."
        };
      }
    } catch (error: any) {
      console.error('Error in detect_booking_platform tool:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while detecting booking platform'
      };
    }
  },
  // Book a restaurant 
  async book_restaurant(args: any) {
    try {
      console.log(`AI assistant is trying to book a restaurant: ${args.restaurant}`);
      
      // Find the restaurant
      const restaurant = await storage.getRestaurantByName(args.restaurant);
      
      if (!restaurant) {
        return {
          success: false,
          error: `Restaurant not found: ${args.restaurant}`
        };
      }
      
      // Parse the date
      let bookingDate: Date;
      try {
        bookingDate = new Date(args.date);
        if (isNaN(bookingDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        return {
          success: false,
          error: `Invalid date format: ${args.date}. Please use YYYY-MM-DD format.`
        };
      }
      
      // Create a booking request
      const bookingRequest = {
        restaurantId: restaurant.id,
        userId: args.userId,
        date: bookingDate,
        time: args.time,
        partySize: args.partySize,
        specialRequests: args.specialRequests,
        useRealScraping: config.bookingAgent.useRealScraping,
        acceptSimilarTimes: true // Allow similar times if exact time not available
      };
      
      // Attempt to create the booking
      console.log(`Creating booking for ${restaurant.name} at ${args.time} for ${args.partySize} people`);
      
      // Use the booking service to create the booking
      const result = await bookingService.bookTable(restaurant, bookingRequest);
      
      // Return the result
      if (result.success) {
        return {
          success: true,
          confirmationCode: result.confirmationCode || 'pending',
          message: `Successfully booked a table at ${restaurant.name} for ${args.date} at ${args.time} for ${args.partySize} people.`,
          simulation: result.simulation
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to book restaurant',
          logs: result.logs || []
        };
      }
    } catch (error: any) {
      console.error('Error in book_restaurant tool:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  },
  
  // Check restaurant availability
  async check_availability(args: any) {
    try {
      console.log(`Checking availability at ${args.restaurant} on ${args.date}`);
      
      // Find the restaurant
      const restaurant = await storage.getRestaurantByName(args.restaurant);
      
      if (!restaurant) {
        return {
          success: false,
          error: `Restaurant not found: ${args.restaurant}`
        };
      }
      
      // In a real implementation, this would use web scraping or API calls
      // to check actual availability. For now, return simulated results.
      const availableTimes = ['18:00', '18:30', '21:00', '21:30'];
      
      // For simulation, if it's a "hard" restaurant, show fewer slots
      if (restaurant.bookingDifficulty === 'hard') {
        return {
          success: true,
          restaurant: restaurant.name,
          date: args.date,
          availableTimes: availableTimes.slice(2), // Only late times available
          message: "Limited availability found. This restaurant is very popular and only has late evening slots available."
        };
      }
      
      return {
        success: true,
        restaurant: restaurant.name,
        date: args.date,
        availableTimes: availableTimes,
        message: "Several time slots are available for your requested date."
      };
    } catch (error: any) {
      console.error('Error in check_availability tool:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  },
  
  // Get restaurant information
  async get_restaurant_info(args: any) {
    try {
      // Find the restaurant
      const restaurant = await storage.getRestaurantByName(args.restaurant);
      
      if (!restaurant) {
        return {
          success: false,
          error: `Restaurant not found: ${args.restaurant}`
        };
      }
      
      // Return restaurant details
      return {
        success: true,
        restaurant: {
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          location: restaurant.location,
          bookingDifficulty: restaurant.bookingDifficulty,
          bookingInfo: restaurant.bookingInfo,
          bookingPlatform: restaurant.bookingPlatform,
          description: restaurant.description
        }
      };
    } catch (error: any) {
      console.error('Error in get_restaurant_info tool:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  },
  
  // Find alternative restaurants
  async find_alternative_restaurants(args: any) {
    try {
      // Find the reference restaurant
      const referenceRestaurant = await storage.getRestaurantByName(args.restaurant);
      
      if (!referenceRestaurant) {
        return {
          success: false,
          error: `Restaurant not found: ${args.restaurant}`
        };
      }
      
      // Start with cuisine-based filtering
      let restaurants;
      if (args.cuisine) {
        restaurants = await storage.getRestaurantsByCuisine(args.cuisine);
      } else if (referenceRestaurant.cuisine) {
        restaurants = await storage.getRestaurantsByCuisine(referenceRestaurant.cuisine);
      } else {
        restaurants = await storage.getRestaurants();
      }
      
      // Apply additional filters if provided
      if (args.location) {
        restaurants = restaurants.filter(r => 
          r.location.toLowerCase().includes(args.location.toLowerCase())
        );
      }
      
      if (args.difficulty) {
        restaurants = restaurants.filter(r => 
          r.bookingDifficulty === args.difficulty
        );
      }
      
      // Remove the reference restaurant from results
      restaurants = restaurants.filter(r => r.id !== referenceRestaurant.id);
      
      // Limit to 5 alternatives
      const alternatives = restaurants.slice(0, 5).map(r => ({
        name: r.name,
        cuisine: r.cuisine,
        location: r.location,
        bookingDifficulty: r.bookingDifficulty,
        bookingPlatform: r.bookingPlatform
      }));
      
      return {
        success: true,
        alternativeCount: alternatives.length,
        alternatives,
        message: alternatives.length > 0 
          ? `Found ${alternatives.length} alternative restaurants similar to ${args.restaurant}` 
          : `No alternatives found for ${args.restaurant} with the specified criteria`
      };
    } catch (error: any) {
      console.error('Error in find_alternative_restaurants tool:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
};

// Get all booking tools
export function getBookingTools() {
  return [
    BookRestaurantToolSchema,
    CheckAvailabilityToolSchema,
    GetRestaurantInfoToolSchema,
    FindAlternativeRestaurantsToolSchema,
    DetectBookingPlatformToolSchema
  ];
}

// Dispatch tool calls to the appropriate handler
export async function handleBookingToolCall(tool: string, args: any) {
  const handler = bookingTools[tool as keyof typeof bookingTools];
  if (handler) {
    return await handler(args);
  }
  return {
    success: false,
    error: `Unknown tool: ${tool}`
  };
}