import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertBookingSchema, 
  insertFavoriteSchema,
  bookingFormSchema 
} from "@shared/schema";
import { bookingAgent } from "./services/bookingAgent";
import { enhancedBookingAgent } from "./services/enhancedBookingAgent";
import aiService from "./services/aiService";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // In a real app we would hash the password here
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.format() });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  app.post("/api/users/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) { // In a real app we would compare hashed passwords
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // In a real app we would set session/JWT here
      // For this demo, we'll just return the user
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Login error" });
    }
  });
  
  // Restaurant routes
  app.get("/api/restaurants", async (_req: Request, res: Response) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Error fetching restaurants" });
    }
  });
  
  app.get("/api/restaurants/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string || "";
      console.log("Searching restaurants with query:", query);
      const restaurants = await storage.searchRestaurants(query);
      res.json(restaurants);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Error searching restaurants" });
    }
  });
  
  app.get("/api/restaurants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Error fetching restaurant" });
    }
  });
  
  app.post("/api/restaurants/filter", async (req: Request, res: Response) => {
    try {
      const { cuisine, location, difficulty } = req.body;
      const restaurants = await storage.filterRestaurants({
        cuisine,
        location,
        difficulty
      });
      
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Error filtering restaurants" });
    }
  });
  
  // Booking routes
  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const bookingData = bookingFormSchema.parse(req.body);
      
      // Format the date if it's a string
      let formattedDate = bookingData.date;
      if (typeof bookingData.date === 'string') {
        formattedDate = new Date(bookingData.date);
      }
      
      // Create the booking
      const booking = await storage.createBooking({
        ...bookingData,
        date: formattedDate as Date,
        status: "pending",
        agentStatus: "active",
        agentLog: [{
          timestamp: new Date(),
          action: "Booking agent started",
          details: `Monitoring for availability at ${bookingData.restaurantId}`
        }]
      });
      
      // Determine which booking agent to use based on request
      const useRealScraping = req.body.useRealScraping === true;
      
      if (useRealScraping) {
        console.log(`Using ENHANCED booking agent with real scraping for booking ${booking.id}`);
        // Use the enhanced booking agent that can do real web scraping
        enhancedBookingAgent.startBookingProcess(booking.id);
      } else {
        console.log(`Using standard booking agent with simulation for booking ${booking.id}`);
        // Use the standard booking agent with simulation
        bookingAgent.startBookingProcess(booking.id);
      }
      
      res.status(201).json({
        ...booking,
        useRealScraping
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.format() });
      }
      res.status(500).json({ message: "Error creating booking" });
    }
  });
  
  app.get("/api/bookings/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const bookings = await storage.getBookingsByUser(userId);
      
      // Get restaurant details for each booking
      const bookingsWithRestaurant = await Promise.all(
        bookings.map(async (booking) => {
          const restaurant = await storage.getRestaurant(booking.restaurantId);
          return {
            ...booking,
            restaurant
          };
        })
      );
      
      res.json(bookingsWithRestaurant);
    } catch (error) {
      res.status(500).json({ message: "Error fetching bookings" });
    }
  });
  
  app.get("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Get restaurant details
      const restaurant = await storage.getRestaurant(booking.restaurantId);
      
      res.json({
        ...booking,
        restaurant
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching booking" });
    }
  });
  
  app.patch("/api/bookings/:id/confirm", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const updatedBooking = await storage.updateBooking(id, {
        status: "confirmed"
      });
      
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error confirming booking" });
    }
  });
  
  app.patch("/api/bookings/:id/cancel", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const updatedBooking = await storage.updateBooking(id, {
        status: "cancelled",
        agentStatus: "failed"
      });
      
      // Stop both booking agents (only one will be running)
      bookingAgent.stopBookingProcess(id);
      enhancedBookingAgent.stopBookingProcess(id);
      
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error cancelling booking" });
    }
  });
  
  // Toggle scraping mode endpoint
  app.patch("/api/bookings/:id/toggle-scraping", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Flag to indicate if we're switching to real scraping
      const useRealScraping = req.body.useRealScraping === true;
      
      // Only allow toggling if the booking is still active
      if (booking.agentStatus !== "active") {
        return res.status(400).json({ 
          message: "Cannot change booking agent as booking is not active",
          booking
        });
      }
      
      // Stop current booking agents
      bookingAgent.stopBookingProcess(id);
      enhancedBookingAgent.stopBookingProcess(id);
      
      // Add log entry about switching
      const updatedLog = booking.agentLog || [];
      updatedLog.push({
        timestamp: new Date(),
        action: "Agent Switch",
        details: useRealScraping 
          ? "Switching to enhanced booking agent with real web scraping" 
          : "Switching to standard booking agent with simulation"
      });
      
      // Update the booking log
      await storage.updateBooking(id, {
        agentLog: updatedLog
      });
      
      // Start the appropriate booking agent
      if (useRealScraping) {
        console.log(`Switching to ENHANCED booking agent with real scraping for booking ${id}`);
        enhancedBookingAgent.startBookingProcess(id);
      } else {
        console.log(`Switching to standard booking agent with simulation for booking ${id}`);
        bookingAgent.startBookingProcess(id);
      }
      
      // Get the updated booking
      const updatedBooking = await storage.getBooking(id);
      
      res.json({
        ...updatedBooking,
        useRealScraping
      });
    } catch (error) {
      res.status(500).json({ message: "Error toggling scraping mode" });
    }
  });
  
  // Favorite routes
  app.post("/api/favorites", async (req: Request, res: Response) => {
    try {
      const favoriteData = insertFavoriteSchema.parse(req.body);
      const favorite = await storage.createFavorite(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.format() });
      }
      res.status(500).json({ message: "Error adding favorite" });
    }
  });
  
  app.get("/api/favorites/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const favorites = await storage.getFavoritesByUser(userId);
      
      // Get restaurant details for each favorite
      const favoritesWithRestaurant = await Promise.all(
        favorites.map(async (favorite) => {
          const restaurant = await storage.getRestaurant(favorite.restaurantId);
          return {
            ...favorite,
            restaurant
          };
        })
      );
      
      res.json(favoritesWithRestaurant);
    } catch (error) {
      res.status(500).json({ message: "Error fetching favorites" });
    }
  });
  
  app.delete("/api/favorites/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeFavorite(id);
      
      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing favorite" });
    }
  });
  
  // AI Chatbot test endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, restaurantId, messages } = req.body;
      
      if (!message && !messages) {
        return res.status(400).json({ message: "Message or message history is required" });
      }
      
      // Default context for general restaurant booking inquiries
      let context = "You are a helpful restaurant booking assistant for London's exclusive restaurants, called 'Prime Table'. Provide specific, actionable advice.";
      let restaurant = null;
      
      // If a restaurant ID is provided, get details to provide a specific context
      if (restaurantId) {
        restaurant = await storage.getRestaurant(parseInt(restaurantId));
        if (restaurant) {
          context = `You are a restaurant booking specialist focusing on ${restaurant.name}, 
          a ${restaurant.cuisine} restaurant in ${restaurant.location}. 
          It has a booking difficulty level of ${restaurant.bookingDifficulty}. 
          ${restaurant.bookingInfo ? `Specific booking information: ${restaurant.bookingInfo}` : ''}
          ${restaurant.bookingNotes ? `Additional notes: ${restaurant.bookingNotes}` : ''}
          ${restaurant.bookingPlatform ? `This restaurant uses ${restaurant.bookingPlatform} for their reservation system.` : ''}
          
          The user is asking about this specific restaurant. Provide tailored advice and strategies for securing a booking, 
          considering the restaurant's specific booking policies and difficulty level.`;
        }
      }
      
      // Check if this is an MCP-style request with message history
      const isMcpRequest = Array.isArray(messages) && messages.length > 0;
      let response;
      
      try {
        const service = aiService.getService();
        
        // Use the appropriate service method based on request type
        if (service) {
          if (isMcpRequest && service.processMcpChat) {
            // Use MCP protocol with message history
            console.log('Using MCP chat protocol with message history');
            const mcpResponse = await service.processMcpChat(messages, context, restaurant);
            return res.json(mcpResponse); 
          } else if (service.processChat) {
            // Fallback to standard chat interface
            console.log('Using OpenAI processChat with message:', message.substring(0, 50) + '...');
            response = await service.processChat(message, context);
          } else {
            console.log('No chat processing available');
            response = "I'm operating in demonstration mode. For this demo, I would provide personalized booking advice for exclusive London restaurants like Chiltern Firehouse, The Clove Club, and others. You can try the MCP Booking Agent tab for a more interactive experience.";
          }
        } else {
          console.log('Falling back to simulation mode - no AI service available');
          response = "I'm operating in demonstration mode. For this demo, I would provide personalized booking advice for exclusive London restaurants. You can try the MCP Booking Agent tab for a more interactive experience.";
        }
      } catch (aiError) {
        console.error("AI service error:", aiError);
        
        // Check for quota/rate limit errors
        const openAIError = aiError as any;
        if (
          openAIError.status === 429 || 
          (openAIError.error && openAIError.error.code === 'insufficient_quota')
        ) {
          response = "I apologize, but our AI service has reached its usage limit for now. The system is working in demonstration mode. Please try the MCP Booking Agent tab for a more interactive booking experience.";
        } else {
          response = "I encountered an issue processing your request. Please try again later.";
        }
      }
      
      // For non-MCP requests, return simple response
      res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Error processing chat request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
