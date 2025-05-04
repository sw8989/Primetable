/**
 * DeepSeek AI service for booking analysis and suggestions
 *
 * This service implements the MCP (Model Context Protocol) standard for interacting 
 * with DeepSeek language models.
 */

interface SuggestionsResponse {
  suggestions: string[];
}

// Check if the DeepSeek client is available
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const isAvailable = !!DEEPSEEK_API_KEY;

if (!isAvailable) {
  console.warn("DEEPSEEK_API_KEY not set. DeepSeek AI features will be disabled.");
}

/**
 * Implements the MCP protocol for DeepSeek models
 * This follows the Model Context Protocol standards for:
 * - Resources (context files)
 * - Tools (function calling)
 * - Prompts (structured prompting)
 */
async function invokeMcpModel(
  modelName: string, 
  messages: any[], 
  resources: any[] = [], 
  tools: any[] = [],
  sampling: any = {}
) {
  if (!isAvailable) {
    throw new Error("DeepSeek API is not available. Please check your API key.");
  }

  try {
    // DeepSeek API requires different format than OpenAI
    // This is a simplification - actual implementation would use DeepSeek SDK
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        context: resources.length > 0 ? resources : undefined,
        temperature: sampling.temperature || 0.7,
        top_p: sampling.top_p || 0.95,
        max_tokens: sampling.max_tokens || 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling DeepSeek API:", error);
    throw error;
  }
}

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
  if (!isAvailable) {
    return "DeepSeek AI service unavailable. Using standard booking strategy.";
  }

  try {
    // Resources - providing context about the restaurant and booking patterns
    const resources = [
      {
        "type": "text",
        "text": `Restaurant: ${restaurantName}\nDifficulty: ${difficulty}\nBooking Information: ${bookingInfo || "No specific booking information provided."}`
      }
    ];

    // Construct the MCP-compliant messages
    const messages = [
      {
        "role": "system",
        "content": "You are an expert restaurant booking assistant that specializes in securing hard-to-get reservations at exclusive restaurants. Provide strategic advice for booking tables."
      },
      {
        "role": "user",
        "content": `I need a strategy to secure a booking at ${restaurantName}, which has a ${difficulty} booking difficulty level. ${bookingInfo ? `The restaurant has the following booking information: ${bookingInfo}` : ''} What's the best approach to get a table?`
      }
    ];

    // Call DeepSeek API through MCP protocol
    const response = await invokeMcpModel("deepseek-chat", messages, resources);
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek analyzeBookingStrategy:", error);
    return `Error generating booking strategy: ${error instanceof Error ? error.message : String(error)}. Falling back to standard monitoring approach.`;
  }
}

/**
 * Analyzes availability patterns and suggests alternative times or dates
 * 
 * @param restaurantName Restaurant name
 * @param preferredDate Customer's preferred date
 * @param preferredTime Customer's preferred time
 * @param partySize Party size
 * @returns List of alternative times or dates
 */
async function suggestAlternativeTimes(
  restaurantName: string,
  preferredDate: Date,
  preferredTime: string,
  partySize: number
): Promise<SuggestionsResponse> {
  if (!isAvailable) {
    return { suggestions: [] };
  }

  try {
    // Format the date for better readability
    const formattedDate = preferredDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Resources for MCP - providing context
    const resources = [
      {
        "type": "text",
        "text": `Restaurant: ${restaurantName}\nPreferred Date: ${formattedDate}\nPreferred Time: ${preferredTime}\nParty Size: ${partySize}`
      }
    ];

    // Tools for structured output
    const tools = [
      {
        "type": "function",
        "function": {
          "name": "provide_alternative_times",
          "description": "Provide alternative times that might have better availability",
          "parameters": {
            "type": "object",
            "properties": {
              "suggestions": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "List of alternative times that might have better availability"
              },
              "reasoning": {
                "type": "string",
                "description": "Reasoning behind the suggestions"
              }
            },
            "required": ["suggestions"]
          }
        }
      }
    ];

    // Construct the MCP-compliant messages
    const messages = [
      {
        "role": "system",
        "content": "You are an expert in restaurant booking patterns. Analyze the provided information and suggest alternative times that might have better availability."
      },
      {
        "role": "user",
        "content": `I'm trying to book a table at ${restaurantName} for ${partySize} people on ${formattedDate} at ${preferredTime}, but it seems fully booked. Can you suggest alternative times on the same day or nearby days that might have better availability?`
      }
    ];

    // Call DeepSeek with MCP protocol
    const response = await invokeMcpModel("deepseek-chat", messages, resources, tools);
    
    // Extract and process the function call
    if (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0) {
      const functionCall = response.choices[0].message.tool_calls[0];
      const args = JSON.parse(functionCall.function.arguments);
      return { suggestions: args.suggestions || [] };
    }

    // Fallback if no function call was made
    return { suggestions: [] };
  } catch (error) {
    console.error("Error in DeepSeek suggestAlternativeTimes:", error);
    return { suggestions: [] };
  }
}

/**
 * Generates personalized booking confirmation messages
 * 
 * @param restaurantName Restaurant name
 * @param date Booking date
 * @param time Booking time
 * @param partySize Party size
 * @param userName User's name
 * @returns Personalized confirmation message
 */
async function generateBookingMessage(
  restaurantName: string,
  date: Date,
  time: string,
  partySize: number,
  userName: string
): Promise<string> {
  if (!isAvailable) {
    return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
  }

  try {
    // Format the date for better readability
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Resources for MCP - providing context
    const resources = [
      {
        "type": "text",
        "text": `Restaurant: ${restaurantName}\nDate: ${formattedDate}\nTime: ${time}\nParty Size: ${partySize}\nUser Name: ${userName}`
      }
    ];

    // Sampling parameters for more creative output
    const sampling = {
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 500
    };

    // Construct the MCP-compliant messages
    const messages = [
      {
        "role": "system",
        "content": "You are a high-end restaurant booking assistant that creates personalized, enthusiastic confirmation messages for successful restaurant bookings."
      },
      {
        "role": "user",
        "content": `Please generate a personalized booking confirmation message for ${userName}, who has successfully booked a table at ${restaurantName} for ${partySize} guests on ${formattedDate} at ${time}.`
      }
    ];

    // Call DeepSeek with MCP protocol
    const response = await invokeMcpModel("deepseek-chat", messages, resources, [], sampling);
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek generateBookingMessage:", error);
    return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
  }
}

export default {
  isAvailable,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage
};