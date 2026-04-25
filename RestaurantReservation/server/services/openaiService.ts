import OpenAI from "openai";
import { getBookingTools } from "./ai/bookingTools";

const LOG_PREVIEW_CHARS = 160;

export function summarizeTextForLog(value: string, maxChars = LOG_PREVIEW_CHARS): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}... [truncated ${value.length - maxChars} chars]`;
}

export function summarizeMcpMessagesForLog(
  messages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    tool_call_id?: string;
    function_name?: string;
    name?: string;
  }>,
): Array<Record<string, unknown>> {
  return messages.map((message) => ({
    role: message.role,
    tool_call_id: message.tool_call_id,
    name: message.function_name || message.name,
    tool_calls_count: Array.isArray(message.tool_calls) ? message.tool_calls.length : 0,
    content_preview:
      typeof message.content === "string"
        ? summarizeTextForLog(message.content)
        : undefined,
  }));
}

// Check if the API key is available in the environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "WARNING: OPENAI_API_KEY environment variable is not set. AI features will be disabled.",
  );
}

// Create a new OpenAI client with the API key if available
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
  bookingInfo: string | null,
  difficulty: string,
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
          content:
            "You are an expert in securing reservations at exclusive restaurants. Provide detailed, actionable booking strategies.",
        },
        {
          role: "user",
          content: `Analyze the best strategy for booking a table at ${restaurantName}.
                   Booking information: ${bookingInfo || 'No additional information available'}
                   Difficulty level: ${difficulty}
                   
                   Provide a specific strategy with timing recommendations and approach.`,
        },
      ],
      max_tokens: 250,
    });

    return (
      response.choices[0].message.content ||
      "Could not generate a booking strategy at this time."
    );
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
  partySize: number,
): Promise<{ suggestions: string[]; reasoning: string }> {
  // If OpenAI client is not available, return some standard alternatives
  if (!openai) {
    const day = preferredDate.getDay();
    const isWeekend = day === 0 || day === 6;

    return {
      suggestions: [
        isWeekend
          ? "Try a weekday instead - Tuesdays or Wednesdays are typically less busy"
          : "Earlier in the week, like Monday or Tuesday",
        "Earlier dining time, like 5:30 PM or 6:00 PM",
        "Later dining time, after 9:00 PM",
      ],
      reasoning:
        "Based on standard restaurant patterns, these times typically have better availability.",
    };
  }

  try {
    const dateStr = preferredDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in restaurant booking patterns and availability.",
        },
        {
          role: "user",
          content: `For a booking at ${restaurantName} on ${dateStr} at ${preferredTime} for ${partySize} people,
                   suggest 3 alternative times or dates that might have better availability.
                   Consider typical restaurant booking patterns, weekend vs weekday differences,
                   and optimal times for securing reservations at popular restaurants.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      suggestions: result.suggestions || [],
      reasoning: result.reasoning || "",
    };
  } catch (error) {
    console.error("Error suggesting alternative times:", error);
    return {
      suggestions: [],
      reasoning:
        "Could not generate alternative suggestions due to a service error.",
    };
  }
}

/**
 * Generates personalized booking confirmation messages
 */
export async function generateBookingMessage(
  restaurantName: string,
  date: Date,
  time: string,
  partySize: number,
  userName: string,
): Promise<string> {
  // If OpenAI client is not available, return standard message
  if (!openai) {
    return `Dear ${userName}, your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people has been confirmed. We look forward to serving you! - The Prime Table Team`;
  }

  try {
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional restaurant booking assistant. Create a personalized, enthusiastic booking confirmation message.`,
        },
        {
          role: "user",
          content: `Create a personalized booking confirmation message for ${userName}'s reservation at ${restaurantName}.
                   Reservation details: ${dateStr} at ${time} for ${partySize} people.
                   Keep it concise, professional, but with personality. Include a greeting and sign-off.`,
        },
      ],
      max_tokens: 200,
    });

    return (
      response.choices[0].message.content ||
      "Your booking has been processed successfully."
    );
  } catch (error) {
    console.error("Error generating booking message:", error);
    return `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
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
  context?: string,
): Promise<string> {
  if (!openai) {
    return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode. Please ask our team to enable the OpenAI integration for full AI-powered assistance.";
  }

  try {
    const systemMessage =
      context ||
      "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants. " +
        "Provide detailed, personalized advice on booking strategies and restaurant recommendations.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content ||
      "I'm sorry, I couldn't process your request right now. Please try again."
    );
  } catch (error) {
    console.error("Error processing chat:", error);

    // Check for quota/rate limit errors
    const openAIError = error as any;
    if (
      openAIError.status === 429 ||
      (openAIError.error && openAIError.error.code === "insufficient_quota")
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
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: any;
    tool_results?: any;
    tool_call_id?: string; // This field is essential for tool messages
    function_name?: string; // This field helps with OpenAI API requirements
  }>,
  context: string,
  restaurant?: any,
  userId?: number,
): Promise<{
  role: string;
  content: string;
  tool_calls?: any[];
}> {
  if (!openai) {
    return {
      role: "assistant",
      content:
        "I'm a restaurant booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?",
    };
  }

  try {
    // Map the MCP message format to OpenAI format - extremely simplified
    // We're starting fresh with just essential messages to avoid validation errors
    const openaiMessages: any[] = [];

    // Always add system message first
    openaiMessages.push({
      role: "system",
      content: context,
    });

    // We'll only include user and simple assistant messages - no tools at all
    // This will make the API conversation work but without tool interactions
    for (const msg of messages) {
      if (msg.role === "user") {
        // User messages are straightforward
        openaiMessages.push({
          role: "user",
          content: msg.content,
        });
      } else if (msg.role === "assistant" && !msg.tool_calls) {
        // Only include simple assistant responses without tool calls
        openaiMessages.push({
          role: "assistant",
          content: msg.content || "",
        });
      } else if (
        msg.role === "assistant" &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        // Handle assistant messages with tool calls
        const toolCallsMessage: any = {
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.tool_calls.map((toolCall: any, index: number) => {
            // Ensure each tool call has the required format for OpenAI
            return {
              id: toolCall.id || `call_${Date.now()}_${index}`,
              type: "function",
              function: {
                name: toolCall.function?.name || "unknown",
                arguments: toolCall.function?.arguments || "{}",
              },
            };
          }),
        };
        openaiMessages.push(toolCallsMessage);
      }
      // Handle tool response messages correctly
      else if (msg.role === "tool") {
        // Tool messages require special handling
        // They must include 'name' instead of function_name for OpenAI API compatibility
        const toolMessage: any = {
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content,
          name: msg.function_name, // This is what was missing - OpenAI requires 'name', not 'function_name'
        };

        // Log for debugging
        console.log("Adding formatted tool message:", {
          tool_call_id: toolMessage.tool_call_id,
          name: toolMessage.name,
          content_preview:
            typeof toolMessage.content === "string"
              ? summarizeTextForLog(toolMessage.content, 80)
              : "non-string content",
        });

        openaiMessages.push(toolMessage);
      }
    }

    // Log all messages for debugging purposes, including tool messages
    // which are crucial for diagnosing our "missing_required_parameter" error
    console.log(
      "OpenAI messages prepared for API call:",
      summarizeMcpMessagesForLog(openaiMessages),
    );

    // Import booking tools
    const { bookingTools } = await import("./ai/bookingTools");

    // Define the available tools based on the MCP protocol
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "search_restaurants_tool",
          description:
            "Searches for restaurants by cuisine, location, or other criteria",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query",
              },
              cuisine: {
                type: "string",
                description: "Type of cuisine (optional)",
              },
              location: {
                type: "string",
                description: "London location (optional)",
              },
              difficulty: {
                type: "string",
                description:
                  "Booking difficulty level (optional): easy, medium, hard",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "check_availability_tool",
          description:
            "Checks if tables are available at specified restaurants",
          parameters: {
            type: "object",
            properties: {
              restaurant_id: {
                type: "number",
                description: "The ID of the restaurant to check",
              },
              date: {
                type: "string",
                description: "The date to check in YYYY-MM-DD format",
              },
              time: {
                type: "string",
                description: "The time to check in 24-hour format (HH:MM)",
              },
              party_size: {
                type: "number",
                description: "The number of people in the party",
              },
            },
            required: ["restaurant_id", "date", "time", "party_size"],
          },
        },
      },
      // Add booking tools for restaurant reservation
      ...(await getBookingTools()),
    ];

    // Make the OpenAI API call with tools
    // Ensure tools match OpenAI's expected format by using a type assertion
    // This is safe since we know our tools follow the required structure
    const openaiTools = tools.map((tool) => {
      if (typeof tool.type === "string") {
        // Force correct type for OpenAI tools
        return {
          type: "function",
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          },
        };
      }
      return tool;
    }) as any;

    // Type assertion for OpenAI's strict typing requirements
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      tools: openaiTools as any, // Use type assertion to avoid strict typing issues
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.7,
    });

    const responseMessage = response.choices[0].message;

    // Debug log the OpenAI response structure
    console.log("OpenAI response format:", {
      has_content: !!responseMessage.content,
      has_tool_calls: !!responseMessage.tool_calls,
      tool_calls_count: responseMessage.tool_calls?.length || 0,
      first_tool_call:
        responseMessage.tool_calls && responseMessage.tool_calls.length > 0
          ? {
              id: responseMessage.tool_calls[0].id,
              type: responseMessage.tool_calls[0].type,
              function_name: responseMessage.tool_calls[0].function?.name,
            }
          : null,
    });

    // Convert OpenAI format back to MCP format
    const mcpResponse: {
      role: string;
      content: string;
      tool_calls?: any[];
    } = {
      role: "assistant",
      content: responseMessage.content || "",
    };

    // If the response includes tool calls, keep the original MCPX format
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Preserve the original MCPX tool_calls format but also add legacy format for backward compatibility
      mcpResponse.tool_calls = responseMessage.tool_calls;

      // Also add legacy format properties for backward compatibility
      const firstTool = responseMessage.tool_calls[0];
      if (firstTool && firstTool.function) {
        try {
          const args = JSON.parse(firstTool.function.arguments);
          const toolName = firstTool.function.name;

          // Handle booking tool calls
          if (
            toolName === "makeReservation" ||
            toolName === "findAvailability" ||
            toolName === "getRestaurantInfo"
          ) {
            // Make sure userId is included for booking operations
            if (toolName === "makeReservation" && !args.userId && userId) {
              args.userId = userId;
            }
          }

          // Add legacy format properties (using any type to avoid TypeScript errors)
          (mcpResponse as any).tool = toolName;
          (mcpResponse as any).parameters = args;
        } catch (error) {
          console.error("Error parsing tool call arguments:", error);
          (mcpResponse as any).tool = firstTool.function.name;
          (mcpResponse as any).parameters = {};
        }
      }
    }

    return mcpResponse;
  } catch (error) {
    console.error("Error processing MCP chat:", error);

    // Check for quota/rate limit errors
    const openAIError = error as any;
    if (
      openAIError.status === 429 ||
      (openAIError.error && openAIError.error.code === "insufficient_quota")
    ) {
      return {
        role: "assistant",
        content:
          "I apologize, but our AI service has reached its usage limit for now. I can still help you with basic restaurant information and booking guidance.",
      };
    }

    // Extract detailed error information for debugging
    let errorDetail = "";
    if (openAIError.status) {
      errorDetail += `Status: ${openAIError.status}. `;
    }
    if (openAIError.code) {
      errorDetail += `Code: ${openAIError.code}. `;
    }
    if (openAIError.param) {
      errorDetail += `Parameter: ${openAIError.param}. `;
    }
    if (openAIError.error && openAIError.error.message) {
      errorDetail += `Message: ${openAIError.error.message}`;
    } else if (openAIError.message) {
      errorDetail += `Message: ${openAIError.message}`;
    }

    // In development mode, expose error details in the response
    if (process.env.NODE_ENV === "development") {
      return {
        role: "assistant",
        content: `Error in MCPX processing: ${errorDetail}`,
      };
    }

    return {
      role: "assistant",
      content:
        "I apologize, but I encountered an error while processing your request. Please try again later.",
    };
  }
}

/**
 * Get available MCP tools for the AI assistant
 */
export async function getMcpTools(): Promise<any[]> {
  try {
    // We already imported getBookingTools at the top of the file

    // Define the standard tools
    const standardTools = [
      {
        type: "function",
        function: {
          name: "search_restaurants_tool",
          description:
            "Searches for restaurants by cuisine, location, or other criteria",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query",
              },
              cuisine: {
                type: "string",
                description: "Type of cuisine (optional)",
              },
              location: {
                type: "string",
                description: "London location (optional)",
              },
              difficulty: {
                type: "string",
                description:
                  "Booking difficulty level (optional): easy, medium, hard",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    // Get booking tools (this returns an array of tool schemas)
    const bookingTools = getBookingTools();

    // Combine with booking tools
    return [...standardTools, ...bookingTools];
  } catch (error) {
    console.error("Error getting MCP tools:", error);
    return [];
  }
}

export default {
  isAvailable,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage,
  processChat,
  processMcpChat,
  getMcpTools,
};
