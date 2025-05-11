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

/**
 * Check if OpenAI service is available
 */
export function isAvailable(): boolean {
  return openai !== null;
}

/**
 * Process a chat message about restaurant bookings
 * 
 * @param message User's message
 * @param context Optional context about a specific restaurant
 * @returns AI response
 */
export async function processChat(
  message: string,
  context?: string
): Promise<string> {
  if (!openai) {
    return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Please ask our team to enable the OpenAI integration for full AI-powered assistance.";
  }
  
  try {
    const systemMessage = context || 
      "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants. " +
      "Provide detailed, personalized advice on booking strategies and restaurant recommendations.";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    });
    
    return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again.";
  } catch (error) {
    console.error("Error processing chat:", error);
    
    // Check for quota/rate limit errors
    const openAIError = error as any;
    if (
      openAIError.status === 429 || 
      (openAIError.error && openAIError.error.code === 'insufficient_quota')
    ) {
      return "I apologize, but our AI service has reached its usage limit for now. The system is working in simulation mode. In a production environment, you would receive AI-powered booking advice for London's exclusive restaurants. Please try the MCP Booking Agent tab for a demonstration of our booking capabilities.";
    }
    
    return "I apologize, but I encountered an error while processing your request. Please try again later.";
  }
}

/**
 * Process a chat message using the Model Context Protocol (MCP)
 * 
 * This implements the MCP protocol for the chat interface, supporting:
 * - Conversation history
 * - Tool calls and tool results
 * - System context
 * 
 * @param messages Array of messages in the conversation
 * @param context System context
 * @param restaurant Optional restaurant data for context
 * @returns MCP-compliant response
 */
export async function processMcpChat(
  messages: Array<{ role: string; content: string; tool_calls?: any; tool_results?: any }>,
  context: string,
  restaurant?: any
): Promise<{ 
  role: string; 
  content: string; 
  tool_calls?: any[];
}> {
  if (!openai) {
    return { 
      role: "assistant", 
      content: "I'm a restaurant booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?"
    };
  }
  
  try {
    // Map the MCP message format to OpenAI format
    const openaiMessages: any[] = messages.map(msg => {
      if (msg.role === 'tool') {
        // Handle tool messages - convert to function messages with proper name
        return {
          role: 'function',
          name: 'tool_response',
          content: msg.content
        };
      } else if (msg.role === 'user') {
        return {
          role: 'user',
          content: msg.content
        };
      } else {
        return {
          role: 'assistant',
          content: msg.content
        };
      }
    });
    
    // Add system message at the beginning
    openaiMessages.unshift({
      role: 'system',
      content: context
    });
    
    // Import booking tools
    const { bookingTools } = await import('../ai/bookingTools');
    
    // Define the available tools based on the MCP protocol
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "search_restaurants_tool",
          description: "Searches for restaurants by cuisine, location, or other criteria",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              },
              cuisine: {
                type: "string",
                description: "Type of cuisine (optional)"
              },
              location: {
                type: "string",
                description: "London location (optional)"
              },
              difficulty: {
                type: "string",
                description: "Booking difficulty level (optional): easy, medium, hard"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "check_availability_tool",
          description: "Checks if tables are available at specified restaurants",
          parameters: {
            type: "object",
            properties: {
              restaurant_id: {
                type: "number",
                description: "The ID of the restaurant to check"
              },
              date: {
                type: "string",
                description: "The date to check in YYYY-MM-DD format"
              },
              time: {
                type: "string",
                description: "The time to check in 24-hour format (HH:MM)"
              },
              party_size: {
                type: "number",
                description: "The number of people in the party"
              }
            },
            required: ["restaurant_id", "date", "time", "party_size"]
          }
        }
      },
      // Add booking tools for restaurant reservation
      ...bookingTools
    ];
    
    // Make the OpenAI API call with tools
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.7
    });
    
    const responseMessage = response.choices[0].message;
    
    // Convert OpenAI format back to MCP format
    const mcpResponse: { 
      role: string; 
      content: string;
      tool_calls?: any[];
    } = {
      role: "assistant",
      content: responseMessage.content || ""
    };
    
    // If the response includes tool calls, convert to MCP format
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      mcpResponse.tool_calls = responseMessage.tool_calls.map(toolCall => {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          return {
            tool: toolCall.function.name,
            parameters: args
          };
        } catch (error) {
          console.error("Error parsing tool call arguments:", error);
          return {
            tool: toolCall.function.name,
            parameters: {}
          };
        }
      });
    }
    
    return mcpResponse;
  } catch (error) {
    console.error("Error processing MCP chat:", error);
    
    // Check for quota/rate limit errors
    const openAIError = error as any;
    if (
      openAIError.status === 429 || 
      (openAIError.error && openAIError.error.code === 'insufficient_quota')
    ) {
      return { 
        role: "assistant", 
        content: "I apologize, but our AI service has reached its usage limit for now. I can still help you with basic restaurant information and booking guidance."
      };
    }
    
    return { 
      role: "assistant", 
      content: "I apologize, but I encountered an error while processing your request. Please try again later."
    };
  }
}

export default {
  isAvailable,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage,
  processChat,
  processMcpChat
};