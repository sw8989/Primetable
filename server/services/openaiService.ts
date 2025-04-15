import OpenAI from "openai";

// Check if the API key is available in the environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY environment variable is not set. AI features will be disabled.");
}

// Create a new OpenAI client with the API key if available
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
}

/**
 * Analyzes a restaurant's booking patterns
 * 
 * @param restaurantName Restaurant name
 * @param bookingInfo Booking information
 * @param difficulty Booking difficulty
 * @returns Strategy for securing a reservation
 */
export async function analyzeBookingStrategy(
  restaurantName: string,
  bookingInfo: string,
  difficulty: string
): Promise<string> {
  // If OpenAI client is not available, return a fallback strategy
  if (!openai) {
    return `For booking ${restaurantName} (${difficulty} difficulty), monitor the booking platform regularly, especially early morning and late at night when cancellations often occur.`;
  }
  
  try {
    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in securing reservations at exclusive restaurants. Provide detailed, actionable booking strategies."
        },
        {
          role: "user",
          content: `Analyze the best strategy for booking a table at ${restaurantName}. 
                   Booking information: ${bookingInfo}
                   Difficulty level: ${difficulty}
                   
                   Provide a specific strategy with timing recommendations and approach.`
        }
      ],
      max_tokens: 250,
    });

    return response.choices[0].message.content || "Could not generate a booking strategy at this time.";
  } catch (error) {
    console.error("Error analyzing booking strategy:", error);
    return "Could not generate a booking strategy due to a service error. Please try again later.";
  }
}

/**
 * Analyzes availability patterns and suggests alternative times or dates
 */
export async function suggestAlternativeTimes(
  restaurantName: string,
  preferredDate: Date,
  preferredTime: string,
  partySize: number
): Promise<{suggestions: string[], reasoning: string}> {
  // If OpenAI client is not available, return some standard alternatives
  if (!openai) {
    const day = preferredDate.getDay();
    const isWeekend = day === 0 || day === 6;
    
    return {
      suggestions: [
        isWeekend ? "Try a weekday instead - Tuesdays or Wednesdays are typically less busy" : "Earlier in the week, like Monday or Tuesday",
        "Earlier dining time, like 5:30 PM or 6:00 PM",
        "Later dining time, after 9:00 PM"
      ],
      reasoning: "Based on standard restaurant patterns, these times typically have better availability."
    };
  }
  
  try {
    const dateStr = preferredDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in restaurant booking patterns and availability."
        },
        {
          role: "user",
          content: `For a booking at ${restaurantName} on ${dateStr} at ${preferredTime} for ${partySize} people,
                   suggest 3 alternative times or dates that might have better availability.
                   Consider typical restaurant booking patterns, weekend vs weekday differences,
                   and optimal times for securing reservations at popular restaurants.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      suggestions: result.suggestions || [],
      reasoning: result.reasoning || ""
    };
  } catch (error) {
    console.error("Error suggesting alternative times:", error);
    return {
      suggestions: [],
      reasoning: "Could not generate alternative suggestions due to a service error."
    };
  }
}

/**
 * Generates personalized booking confirmation messages
 */
export async function generateBookingMessage(
  restaurantName: string,
  cuisine: string,
  date: Date,
  time: string,
  partySize: number,
  isConfirmation: boolean = true
): Promise<string> {
  // If OpenAI client is not available, return standard message
  if (!openai) {
    return isConfirmation
      ? `Dear guest, your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people has been confirmed. We look forward to serving you! - The Prime Table Team`
      : `Dear guest, we have an update regarding your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time}. Please review your reservation details. - The Prime Table Team`;
  }
  
  try {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const messageType = isConfirmation ? "confirmation" : "update";

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional restaurant booking assistant. Create a personalized, enthusiastic ${messageType} message.`
        },
        {
          role: "user",
          content: `Create a personalized booking ${messageType} message for a reservation at ${restaurantName} (${cuisine} cuisine).
                   Reservation details: ${dateStr} at ${time} for ${partySize} people.
                   Keep it concise, professional, but with personality. Include a greeting and sign-off.`
        }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content || "Your booking has been processed successfully.";
  } catch (error) {
    console.error("Error generating booking message:", error);
    return isConfirmation
      ? `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been confirmed.`
      : `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been updated.`;
  }
}

export default {
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage
};