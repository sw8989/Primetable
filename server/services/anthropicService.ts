import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Initialize the Anthropic client if an API key is available
let anthropicClient: Anthropic | null = null;

if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('Anthropic API initialized successfully.');
} else {
  console.warn('ANTHROPIC_API_KEY not set. Anthropic AI features will be disabled.');
}

/**
 * Check if the Anthropic client is available
 */
const isAvailable = (): boolean => {
  return !!anthropicClient;
};

/**
 * Analyzes a restaurant's booking patterns
 * 
 * @param restaurantName Restaurant name
 * @param bookingInfo Booking information
 * @param difficulty Booking difficulty
 * @returns Strategy for securing a reservation
 */
async function analyzeBookingStrategy(
  restaurantName: string,
  bookingInfo: string | null,
  difficulty: string
): Promise<string> {
  if (!isAvailable()) {
    return "AI service unavailable. Using standard booking strategy.";
  }

  try {
    const prompt = `
      You are an expert restaurant booking agent specializing in hard-to-book London restaurants.
      
      Restaurant: ${restaurantName}
      Booking difficulty level: ${difficulty}
      Additional booking information: ${bookingInfo || 'No additional information available'}
      
      Based on this information, provide a detailed and strategic approach for securing a booking at this restaurant.
      Include specific tips like the best times to check for availability, how many days/weeks in advance to try booking,
      and any specific patterns or strategies that might increase the chances of success.
      Limit your response to 3-4 short paragraphs.
    `;

    const response = await anthropicClient!.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Check if the response is a text content block
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    }
    
    return "AI service returned an unexpected response format.";
  } catch (error) {
    console.error('Error generating booking strategy with Anthropic:', error);
    return `Error generating AI booking strategy. Using standard approach for ${difficulty} difficulty venue.`;
  }
}

/**
 * Analyzes availability patterns and suggests alternative times or dates
 */
async function suggestAlternativeTimes(
  restaurantName: string,
  preferredDate: Date,
  preferredTime: string,
  partySize: number
): Promise<{ suggestions: string[] }> {
  if (!isAvailable()) {
    return { suggestions: [] };
  }

  try {
    const dateString = preferredDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `
      You are an expert restaurant booking agent specializing in London's exclusive restaurants.
      
      Restaurant: ${restaurantName}
      Preferred date: ${dateString}
      Preferred time: ${preferredTime}
      Party size: ${partySize}
      
      The exact time requested is unavailable. Suggest 3-5 alternative time slots on the same date 
      that would be reasonable substitutes. Focus on times within 90 minutes of the requested time.
      
      Format your response as a JSON array of time suggestions in this exact format:
      ["6:30 PM", "7:15 PM", "8:00 PM"]
      Don't include any explanation text, ONLY return the JSON array.
    `;

    const response = await anthropicClient!.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    // Check if the response is a text content block
    if (response.content[0].type === 'text') {
      const content = response.content[0].text.trim();
      // Use multiline flag instead of 's' flag for better compatibility
      const suggestionsMatch = content.match(/\[[\s\S]*\]/);
      
      if (suggestionsMatch) {
        try {
          const suggestions = JSON.parse(suggestionsMatch[0]);
          return { suggestions };
        } catch (e) {
          console.error('Error parsing JSON from Anthropic response:', e);
          return { suggestions: [] };
        }
      }
    }
    
    return { suggestions: [] };
  } catch (error) {
    console.error('Error generating alternative times with Anthropic:', error);
    return { suggestions: [] };
  }
}

/**
 * Generates personalized booking confirmation messages
 */
async function generateBookingMessage(
  restaurantName: string,
  date: Date,
  time: string,
  partySize: number,
  userName: string
): Promise<string> {
  if (!isAvailable()) {
    return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
  }

  try {
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `
      You are a personalized booking confirmation service for a premium restaurant booking platform.
      
      Create a warm, friendly, and personalized booking confirmation message for:
      - Restaurant: ${restaurantName}
      - Date: ${dateString}
      - Time: ${time}
      - Party size: ${partySize}
      - Guest name: ${userName}
      
      Use a friendly, sophisticated tone. Include a congratulatory note if this is a hard-to-book restaurant.
      Keep it concise, about 3-4 sentences.
    `;

    const response = await anthropicClient!.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    // Check if the response is a text content block
    if (response.content[0].type === 'text') {
      return response.content[0].text.trim();
    }
    
    return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
  } catch (error) {
    console.error('Error generating booking message with Anthropic:', error);
    return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
  }
}

const anthropicService = {
  isAvailable,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage
};

export default anthropicService;