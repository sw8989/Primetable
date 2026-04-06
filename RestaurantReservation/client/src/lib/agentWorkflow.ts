import { 
  AgentMemory, 
  AGENT_STEPS, 
  bookingTool, 
  availabilityTool, 
  searchRestaurantsTool,
  getRestaurantDetailsTool,
  recommendRestaurantsTool
} from './agentTools';
import type { Restaurant } from '@shared/schema';

/**
 * MCP (Master Control Program) for the booking agent workflow
 * Handles state transitions and determines appropriate responses
 */
export class AgentWorkflow {
  private memory: AgentMemory;
  private allRestaurants: Restaurant[];
  
  constructor(restaurants: Restaurant[]) {
    this.allRestaurants = restaurants;
    // Initialize agent memory with default values
    this.memory = {
      currentStep: AGENT_STEPS.GREETING,
      restaurants: restaurants,
      selectedRestaurant: null,
      preferredDate: null,
      preferredTime: null,
      partySize: null,
      bookingType: null,
      cuisinePreference: null,
      locationPreference: null,
      specialRequests: null,
      weeklyPreferredDays: null,
      flexibility: null,
      lastBookingResult: null
    };
  }
  
  /**
   * Process a user message and return the agent response
   */
  async processMessage(message: string): Promise<{
    response: string;
    memoryUpdates?: Partial<AgentMemory>;
    suggestedActions?: string[];
    availableRestaurants?: Restaurant[];
  }> {
    // Normalize the user message
    const normalizedMessage = message.toLowerCase().trim();
    
    // Process the message based on current step
    switch (this.memory.currentStep) {
      case AGENT_STEPS.GREETING:
        return this.handleGreeting(normalizedMessage);
        
      case AGENT_STEPS.ASK_BOOKING_TYPE:
        return this.handleBookingType(normalizedMessage);
        
      case AGENT_STEPS.ASK_CUISINE:
        return this.handleCuisineSelection(normalizedMessage);
        
      case AGENT_STEPS.ASK_LOCATION:
        return this.handleLocationSelection(normalizedMessage);
        
      case AGENT_STEPS.ASK_DATE:
        return this.handleDateSelection(normalizedMessage);
        
      case AGENT_STEPS.ASK_TIME:
        return this.handleTimeSelection(normalizedMessage);
        
      case AGENT_STEPS.ASK_PARTY_SIZE:
        return this.handlePartySizeSelection(normalizedMessage);
        
      case AGENT_STEPS.SHOW_RECOMMENDATIONS:
        return this.showRecommendations();
        
      case AGENT_STEPS.ASK_RESTAURANT_SELECTION:
        return this.handleRestaurantSelection(normalizedMessage);
        
      case AGENT_STEPS.ASK_SPECIAL_REQUESTS:
        return this.handleSpecialRequests(normalizedMessage);
        
      case AGENT_STEPS.CONFIRM_BOOKING:
        return this.handleBookingConfirmation(normalizedMessage);
        
      case AGENT_STEPS.PROCESS_BOOKING:
        return this.processBooking();
        
      case AGENT_STEPS.BOOKING_RESULT:
        return this.handleBookingResult(normalizedMessage);
        
      default:
        return {
          response: "I'm not sure what to do next. Would you like to make a restaurant booking?",
          memoryUpdates: { currentStep: AGENT_STEPS.GREETING }
        };
    }
  }
  
  /**
   * Update the agent's memory
   */
  updateMemory(updates: Partial<AgentMemory>): void {
    this.memory = { ...this.memory, ...updates };
  }
  
  /**
   * Get the current memory state
   */
  getMemory(): AgentMemory {
    return { ...this.memory };
  }
  
  /**
   * Reset the workflow to the beginning
   */
  reset(): void {
    this.memory = {
      currentStep: AGENT_STEPS.GREETING,
      restaurants: this.allRestaurants,
      selectedRestaurant: null,
      preferredDate: null,
      preferredTime: null,
      partySize: null,
      bookingType: null,
      cuisinePreference: null,
      locationPreference: null,
      specialRequests: null,
      weeklyPreferredDays: null,
      flexibility: null,
      lastBookingResult: null
    };
  }
  
  // Handler methods for each step
  
  private async handleGreeting(message: string) {
    // Check if the message contains keywords related to booking
    const bookingKeywords = ['book', 'reservation', 'reserve', 'table', 'tonight', 'dinner', 'lunch'];
    const containsBookingIntent = bookingKeywords.some(keyword => message.includes(keyword));
    
    if (containsBookingIntent) {
      return {
        response: "Great! I'd be happy to help you book a table. Are you looking for a one-time reservation or a recurring booking?",
        memoryUpdates: { currentStep: AGENT_STEPS.ASK_BOOKING_TYPE },
        suggestedActions: ["One-time", "Recurring"]
      };
    }
    
    // Handle search intent
    if (message.includes('find') || message.includes('search') || message.includes('looking')) {
      // Extract potential restaurant name or cuisine
      let searchResults: Restaurant[] = [];
      try {
        const result = await searchRestaurantsTool(message.replace(/find|search|looking for/g, '').trim());
        if (result.success) {
          searchResults = result.restaurants;
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      
      return {
        response: "I can help you find a restaurant. What type of cuisine are you interested in?",
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_CUISINE,
          restaurants: searchResults.length > 0 ? searchResults : this.memory.restaurants
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
    
    // Default response
    return {
      response: "Hello! I'm your booking assistant for London's most exclusive restaurants. Would you like me to help you make a reservation, or would you prefer to browse restaurants first?",
      memoryUpdates: { currentStep: AGENT_STEPS.ASK_BOOKING_TYPE },
      suggestedActions: ["Make a reservation", "Browse restaurants"]
    };
  }
  
  private async handleBookingType(message: string) {
    if (message.includes('one') || message.includes('single') || message.includes('once')) {
      return {
        response: "Perfect! Let's find you a one-time reservation. What type of cuisine are you interested in?",
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_CUISINE,
          bookingType: 'one-off'
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
    
    if (message.includes('recurring') || message.includes('weekly') || message.includes('regular')) {
      return {
        response: "I can help set up a recurring booking. What type of cuisine are you interested in?",
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_CUISINE,
          bookingType: 'recurring'
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
    
    // Handle browse intent
    if (message.includes('browse') || message.includes('look') || message.includes('see')) {
      return {
        response: "Let's browse some restaurants. What type of cuisine are you interested in?",
        memoryUpdates: { currentStep: AGENT_STEPS.ASK_CUISINE },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
    
    // Default to one-off booking if unclear
    return {
      response: "I'll help you with a reservation. What type of cuisine are you interested in?",
      memoryUpdates: { 
        currentStep: AGENT_STEPS.ASK_CUISINE,
        bookingType: 'one-off'
      },
      suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
    };
  }
  
  private async handleCuisineSelection(message: string) {
    // Check if message contains any of the available cuisines
    const cuisines = Array.from(new Set(this.allRestaurants.map(r => r.cuisine.toLowerCase())));
    const matchedCuisine = cuisines.find(cuisine => message.includes(cuisine));
    
    if (matchedCuisine || message.includes('any') || message.includes('don\'t care')) {
      // If cuisine preference found, save it and move to location
      const cuisinePreference = matchedCuisine || null;
      
      return {
        response: `${cuisinePreference ? `Great choice! ${cuisinePreference} cuisine is excellent.` : "I'll find you options across all cuisines."} What area of London would you prefer?`,
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_LOCATION,
          cuisinePreference: cuisinePreference
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.location))).slice(0, 5)
      };
    }
    
    // If no cuisine is matched, ask again with suggestions
    return {
      response: "I'm not familiar with that cuisine type. Here are some options I know about. Which would you prefer?",
      suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
    };
  }
  
  private async handleLocationSelection(message: string) {
    // Check if message contains any of the available locations
    const locations = Array.from(new Set(this.allRestaurants.map(r => r.location.toLowerCase())));
    const matchedLocation = locations.find(location => message.includes(location));
    
    if (matchedLocation || message.includes('any') || message.includes('don\'t care')) {
      // If location preference found, save it and move to date
      const locationPreference = matchedLocation || null;
      
      return {
        response: `${locationPreference ? `${locationPreference} is a great area!` : "I'll search across all London locations."} When would you like to dine? (e.g., "today", "tomorrow", or a specific date)`,
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_DATE,
          locationPreference: locationPreference
        }
      };
    }
    
    // If no location is matched, ask again with suggestions
    return {
      response: "I'm not familiar with that area. Here are some locations where we have restaurants. Which would you prefer?",
      suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.location))).slice(0, 5)
    };
  }
  
  private async handleDateSelection(message: string) {
    // Parse date from message
    const today = new Date();
    let preferredDate: Date | null = null;
    
    if (message.includes('today')) {
      preferredDate = today;
    } else if (message.includes('tomorrow')) {
      preferredDate = new Date(today);
      preferredDate.setDate(today.getDate() + 1);
    } else if (message.includes('next week')) {
      preferredDate = new Date(today);
      preferredDate.setDate(today.getDate() + 7);
    } else {
      // Try to parse a date (simple approach for now)
      const dateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}|\d{2}))?/;
      const match = message.match(dateRegex);
      
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
        const yearStr = match[3];
        const year = yearStr 
          ? (yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10))
          : today.getFullYear();
        
        preferredDate = new Date(year, month, day);
        
        // If the date has passed, assume next year
        if (preferredDate < today) {
          if (month < today.getMonth()) {
            preferredDate.setFullYear(year + 1);
          }
        }
      }
    }
    
    if (preferredDate) {
      const formattedDate = preferredDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      return {
        response: `Great! You'd like to dine on ${formattedDate}. What time would you prefer?`,
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_TIME,
          preferredDate: preferredDate
        },
        suggestedActions: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00']
      };
    }
    
    // If date couldn't be parsed
    return {
      response: "I couldn't understand that date. Could you please specify a date like 'today', 'tomorrow', or a specific day (e.g., 25/4/2025)?",
    };
  }
  
  private async handleTimeSelection(message: string) {
    // Parse time from message
    const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i;
    const match = message.match(timeRegex);
    
    let preferredTime: string | null = null;
    
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3] ? match[3].toLowerCase() : null;
      
      // Handle AM/PM
      if (ampm === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      // Format time as HH:MM
      preferredTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else if (message.includes('lunch')) {
      preferredTime = '13:00';
    } else if (message.includes('dinner')) {
      preferredTime = '19:30';
    } else if (message.includes('evening')) {
      preferredTime = '20:00';
    }
    
    if (preferredTime) {
      return {
        response: `You'd like to dine at ${preferredTime}. How many people will be in your party?`,
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_PARTY_SIZE,
          preferredTime: preferredTime
        },
        suggestedActions: ['1', '2', '4', '6', '8']
      };
    }
    
    // If time couldn't be parsed
    return {
      response: "I couldn't understand that time. Could you please specify a time like '7pm', '19:30', or 'dinner time'?",
      suggestedActions: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00']
    };
  }
  
  private async handlePartySizeSelection(message: string) {
    // Parse party size from message
    const partyRegex = /\b(\d+)\b/;
    const match = message.match(partyRegex);
    
    if (match) {
      const partySize = parseInt(match[1], 10);
      
      if (partySize > 0 && partySize <= 20) {
        return await this.showRecommendations(partySize);
      } else {
        return {
          response: "I'm sorry, but we can only handle bookings for parties between 1 and 20 people. How many people will be dining?",
          suggestedActions: ['1', '2', '4', '6', '8']
        };
      }
    }
    
    // If party size couldn't be parsed
    return {
      response: "I couldn't understand the party size. Could you please specify a number, like '2' or '4'?",
      suggestedActions: ['1', '2', '4', '6', '8']
    };
  }
  
  private async showRecommendations(partySize?: number) {
    // Save party size if provided
    const memoryUpdates: Partial<AgentMemory> = {
      currentStep: AGENT_STEPS.ASK_RESTAURANT_SELECTION
    };
    
    if (partySize !== undefined) {
      memoryUpdates.partySize = partySize;
    }
    
    // Filter restaurants based on user preferences
    const filteredRestaurants = recommendRestaurantsTool(
      this.memory.restaurants,
      {
        cuisineType: this.memory.cuisinePreference || undefined,
        location: this.memory.locationPreference || undefined
      }
    );
    
    // Update memory with filtered list
    memoryUpdates.restaurants = filteredRestaurants;
    
    if (filteredRestaurants.length === 0) {
      return {
        response: "I couldn't find any restaurants matching your preferences. Would you like to try different cuisine or location options?",
        memoryUpdates: { currentStep: AGENT_STEPS.ASK_CUISINE },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
    
    // Create response with top recommendations
    const topRecommendations = filteredRestaurants.slice(0, 3);
    let responseText = `Based on your preferences, here are some excellent options:\n\n`;
    
    topRecommendations.forEach((restaurant, index) => {
      responseText += `${index + 1}. ${restaurant.name} - ${restaurant.cuisine} cuisine in ${restaurant.location}\n`;
    });
    
    responseText += `\nWhich restaurant would you like to book? You can say the name or number, or say "more options" to see more restaurants.`;
    
    return {
      response: responseText,
      memoryUpdates,
      availableRestaurants: filteredRestaurants
    };
  }
  
  private async handleRestaurantSelection(message: string) {
    const restaurants = this.memory.restaurants;
    let selectedRestaurant: Restaurant | null = null;
    
    // Check if the message contains a number (1-3 typically from our recommendations)
    const numberMatch = message.match(/\b([1-9])\b/);
    
    if (numberMatch) {
      const index = parseInt(numberMatch[1], 10) - 1;
      if (index >= 0 && index < restaurants.length) {
        selectedRestaurant = restaurants[index];
      }
    } else if (message.includes('more options')) {
      // Show more restaurants
      let responseText = `Here are more restaurant options:\n\n`;
      
      const moreRecommendations = restaurants.slice(3, 8);
      moreRecommendations.forEach((restaurant, index) => {
        responseText += `${index + 4}. ${restaurant.name} - ${restaurant.cuisine} cuisine in ${restaurant.location}\n`;
      });
      
      responseText += `\nWhich restaurant would you like to book?`;
      
      return {
        response: responseText,
        availableRestaurants: restaurants
      };
    } else {
      // Try to match restaurant by name
      for (const restaurant of restaurants) {
        if (message.toLowerCase().includes(restaurant.name.toLowerCase())) {
          selectedRestaurant = restaurant;
          break;
        }
      }
    }
    
    if (selectedRestaurant) {
      return {
        response: `Excellent choice! ${selectedRestaurant.name} is a fantastic restaurant. Do you have any special requests for your booking (e.g., dietary requirements, special occasion, seating preferences)?`,
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_SPECIAL_REQUESTS,
          selectedRestaurant
        }
      };
    }
    
    // If no restaurant was selected
    return {
      response: "I couldn't identify which restaurant you want. Could you please specify the name or number from the list?",
      availableRestaurants: restaurants
    };
  }
  
  private async handleSpecialRequests(message: string) {
    // Any message here is considered special requests
    const specialRequests = message.trim() === '' || 
                           message.toLowerCase().includes('no') || 
                           message.toLowerCase().includes('none') 
      ? null 
      : message;
    
    // Format the booking confirmation
    const restaurant = this.memory.selectedRestaurant;
    const date = this.memory.preferredDate;
    const time = this.memory.preferredTime;
    const partySize = this.memory.partySize;
    
    if (!restaurant || !date || !time || !partySize) {
      // This shouldn't happen if the workflow is followed, but just in case
      return {
        response: "I'm missing some important details for your booking. Let's restart the process.",
        memoryUpdates: { currentStep: AGENT_STEPS.GREETING }
      };
    }
    
    const formattedDate = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    let confirmationText = `Great! Let me confirm your booking details:\n\n`;
    confirmationText += `Restaurant: ${restaurant.name}\n`;
    confirmationText += `Date: ${formattedDate}\n`;
    confirmationText += `Time: ${time}\n`;
    confirmationText += `Party size: ${partySize} people\n`;
    
    if (specialRequests) {
      confirmationText += `Special requests: ${specialRequests}\n`;
    }
    
    confirmationText += `\nThe booking will be attempted using our ${restaurant.bookingPlatform} integration.\n`;
    confirmationText += `\nWould you like me to confirm this booking?`;
    
    return {
      response: confirmationText,
      memoryUpdates: { 
        currentStep: AGENT_STEPS.CONFIRM_BOOKING,
        specialRequests
      },
      suggestedActions: ['Confirm Booking', 'Make Changes']
    };
  }
  
  private async handleBookingConfirmation(message: string) {
    if (message.includes('yes') || 
        message.includes('confirm') || 
        message.includes('book') || 
        message.includes('go ahead')) {
      return {
        response: "Great! I'm processing your booking request now. This may take a moment...",
        memoryUpdates: { currentStep: AGENT_STEPS.PROCESS_BOOKING }
      };
    } else {
      // If user wants to make changes, restart from cuisine selection
      return {
        response: "No problem. Let's make some changes. What type of cuisine are you interested in?",
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_CUISINE,
          // Retain booking type but reset other preferences
          cuisinePreference: null,
          locationPreference: null,
          preferredDate: null,
          preferredTime: null,
          partySize: null,
          selectedRestaurant: null,
          specialRequests: null
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    }
  }
  
  private async processBooking() {
    const restaurant = this.memory.selectedRestaurant;
    const date = this.memory.preferredDate;
    const time = this.memory.preferredTime;
    const partySize = this.memory.partySize;
    const specialRequests = this.memory.specialRequests;
    
    if (!restaurant || !date || !time || !partySize) {
      return {
        response: "I'm missing some important details for your booking. Let's restart the process.",
        memoryUpdates: { currentStep: AGENT_STEPS.GREETING }
      };
    }
    
    // Call the booking tool with user parameters
    const bookingResult = await bookingTool({
      restaurantId: restaurant.id,
      userId: 1, // Default user for now
      date,
      time,
      partySize,
      specialRequests: specialRequests || undefined,
      useRealScraping: false // Default to simulation for safety
    });
    
    return {
      response: bookingResult.success 
        ? `Success! Your table at ${restaurant.name} has been booked. I've started monitoring for better table times and will let you know if anything more optimal becomes available.`
        : `I wasn't able to secure a table right now: ${bookingResult.message}. I'll keep trying on your behalf and notify you if a table becomes available.`,
      memoryUpdates: { 
        currentStep: AGENT_STEPS.BOOKING_RESULT,
        lastBookingResult: bookingResult
      },
      suggestedActions: ['Make Another Booking', 'View My Bookings']
    };
  }
  
  private async handleBookingResult(message: string) {
    // Handle what happens after booking result is shown
    if (message.includes('another') || message.includes('new booking')) {
      return {
        response: "I'd be happy to help you with another booking. What type of cuisine are you interested in?",
        memoryUpdates: { 
          currentStep: AGENT_STEPS.ASK_CUISINE,
          cuisinePreference: null,
          locationPreference: null,
          preferredDate: null,
          preferredTime: null,
          partySize: null,
          selectedRestaurant: null,
          specialRequests: null,
          lastBookingResult: null
        },
        suggestedActions: Array.from(new Set(this.allRestaurants.map(r => r.cuisine))).slice(0, 5)
      };
    } else if (message.includes('view') || message.includes('my bookings')) {
      return {
        response: "To view your bookings, please check the 'My Bookings' section in the navigation menu.",
        memoryUpdates: { currentStep: AGENT_STEPS.FINISHED }
      };
    } else {
      return {
        response: "Is there anything else I can help you with today?",
        memoryUpdates: { currentStep: AGENT_STEPS.FINISHED },
        suggestedActions: ['Make Another Booking', 'View My Bookings', 'No Thanks']
      };
    }
  }
}