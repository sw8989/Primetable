import { getBookingTools } from "../ai/bookingTools";

export async function getMcpToolDefinitions(): Promise<any[]> {
  const standardTools = [
    {
      type: "function",
      function: {
        name: "search_restaurants_tool",
        description: "Searches for restaurants by cuisine, location, or other criteria",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
            cuisine: { type: "string", description: "Type of cuisine (optional)" },
            location: { type: "string", description: "London location (optional)" },
            difficulty: { type: "string", description: "Booking difficulty level (optional): easy, medium, hard" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_availability_tool",
        description: "Checks if tables are available at specified restaurants",
        parameters: {
          type: "object",
          properties: {
            restaurant_id: { type: "number", description: "The ID of the restaurant to check" },
            date: { type: "string", description: "The date to check in YYYY-MM-DD format" },
            time: { type: "string", description: "The time to check in 24-hour format (HH:MM)" },
            party_size: { type: "number", description: "The number of people in the party" },
          },
          required: ["restaurant_id", "date", "time", "party_size"],
        },
      },
    },
  ];

  const bookingTools = getBookingTools();
  return [...standardTools, ...bookingTools];
}
