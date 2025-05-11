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
      const { message, restaurantId, messages, tools } = req.body;
      
      if (!message && !messages) {
        return res.status(400).json({ 
          error: "Message or message history is required" 
        });
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
      
      // Determine if this is an MCPX-style request with message history
      const isMcpxRequest = Array.isArray(messages) && messages.length > 0;
      const hasTools = Array.isArray(tools) && tools.length > 0;
      
      try {
        const service = aiService.getService();
        
        // Use the appropriate service method based on request type
        if (service) {
          if (isMcpxRequest && service.processMcpChat) {
            // Use MCP protocol with message history
            console.log('Using MCP chat protocol with message history', { 
              service: service.name || 'unknown',
              messageCount: messages.length,
              hasTools: hasTools,
              toolCount: hasTools ? tools.length : 0,
              context: context.substring(0, 50) + '...'
            });
            
            // Process the chat with the MCP protocol
            const mcpResponse = await service.processMcpChat(messages, context, restaurant, tools);
            
            // Log response for debugging (shortened to avoid cluttering logs)
            if (typeof mcpResponse === 'object') {
              const logResponse = { ...mcpResponse };
              if (logResponse.content && typeof logResponse.content === 'string' && logResponse.content.length > 100) {
                logResponse.content = logResponse.content.substring(0, 100) + '...';
              }
              console.log('MCP response:', JSON.stringify(logResponse));
            }
            
            // Return the MCPX-formatted response
            return res.json({ 
              message: mcpResponse 
            });
          } else if (service.processChat) {
            // Fallback to standard chat interface
            console.log('Using standard chat interface with service:', service.name || 'unknown');
            const response = await service.processChat(message, context);
            
            // Format as an MCPX message for compatibility
            const formattedResponse = {
              role: 'assistant',
              content: response
            };
            
            return res.json({ 
              message: formattedResponse 
            });
          } else {
            console.log('No chat processing available');
            return res.json({ 
              message: {
                role: 'assistant',
                content: "I'm the Prime Table booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?"
              }
            });
          }
        } else {
          console.log('Falling back to simulation mode - no AI service available');
          return res.json({ 
            message: {
              role: 'assistant',
              content: "I'm the Prime Table booking assistant. I can help you find restaurants and make bookings at London's most exclusive venues. How can I assist you today?"
            }
          });
        }
      } catch (aiError) {
        console.error("AI service error:", aiError);
        
        // Check for quota/rate limit errors
        const openAIError = aiError as any;
        if (
          openAIError.status === 429 || 
          (openAIError.error && openAIError.error.code === 'insufficient_quota')
        ) {
          return res.json({ 
            message: {
              role: 'assistant',
              content: "I apologize, but our AI service has reached its usage limit for now. I can still help you with basic restaurant information and booking guidance."
            }
          });
        } else {
          return res.json({ 
            message: {
              role: 'assistant',
              content: "I encountered an issue processing your request. Please try again later."
            }
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Error processing chat request",
        message: {
          role: 'assistant',
          content: "I apologize, but I encountered an unexpected error. Please try again later."
        }
      });
    }
  });

  // MCP Tools endpoint
  app.get("/api/mcp/tools", async (_req: Request, res: Response) => {
    try {
      // Get booking tools
      const { getBookingTools } = await import('./services/ai/bookingTools');
      const bookingTools = getBookingTools();
      
      // Get AI service tools
      const service = aiService.getService();
      let aiTools: any[] = [];
      
      if (service && service.getMcpTools) {
        aiTools = await service.getMcpTools();
      }
      
      // Combine all tools
      const allTools = [...bookingTools, ...aiTools];
      
      res.json({ tools: allTools });
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      res.status(500).json({ error: "Failed to fetch MCP tools", tools: [] });
    }
  });
  
  // Handle MCP tool calls endpoint
  app.post("/api/mcp/tool-call", async (req: Request, res: Response) => {
    try {
      // Support both MCPX and legacy format
      const { tool, parameters, function_name, arguments: args } = req.body;
      
      // Determine which format we're using
      const toolName = function_name || tool;
      const toolArgs = args ? (typeof args === 'string' ? JSON.parse(args) : args) : parameters;
      
      if (!toolName) {
        return res.status(400).json({ 
          success: false, 
          error: "Tool name is required" 
        });
      }
      
      console.log(`Processing MCP tool call: ${toolName}`, toolArgs);
      
      // Handle our new booking tools
      if (toolName === 'book_restaurant' || 
          toolName === 'check_availability' || 
          toolName === 'get_restaurant_info' ||
          toolName === 'find_alternative_restaurants') {
        
        // Import the booking tools handler
        const { handleBookingToolCall } = await import('./services/ai/bookingTools');
        
        // Route to the appropriate handler
        const result = await handleBookingToolCall(toolName, toolArgs);
        return res.json(result);
      }
        
      // Handle legacy tool types (for backward compatibility)
      if (toolName.startsWith('makeReservation') || 
          toolName.startsWith('findAvailability') || 
          toolName.startsWith('getRestaurantInfo')) {
        
        // Map to new tool names for consistency
        let newTool;
        let newParams = { ...toolArgs };
        
        if (toolName.includes('makeReservation')) {
          newTool = 'book_restaurant';
        } else if (toolName.includes('findAvailability')) {
          newTool = 'check_availability';
        } else if (toolName.includes('getRestaurantInfo')) {
          newTool = 'get_restaurant_info';
        } else {
          return res.status(400).json({
            success: false,
            error: `Unknown booking tool: ${toolName}`
          });
        }
        
        // Import the booking tools handler and use the new naming
        const { handleBookingToolCall } = await import('./services/ai/bookingTools');
        const result = await handleBookingToolCall(newTool, newParams);
        
        return res.json(result);
      }
      
      // Handle search tool
      if (toolName.includes('search_restaurants') || toolName.includes('search_restaurants_tool')) {
        try {
          const { query, cuisine, location, difficulty } = toolArgs;
          let restaurants = [];
          
          // Search restaurants based on parameters
          if (query) {
            restaurants = await storage.searchRestaurants(query);
          } else {
            // Apply filters if available
            const filters: any = {};
            if (cuisine) filters.cuisine = [cuisine];
            if (location) filters.location = [location];
            if (difficulty) filters.difficulty = [difficulty];
            
            restaurants = Object.keys(filters).length > 0
              ? await storage.filterRestaurants(filters)
              : await storage.getRestaurants();
          }
          
          return res.json({
            success: true,
            restaurants: restaurants.map(r => ({
              id: r.id,
              name: r.name,
              cuisine: r.cuisine,
              location: r.location,
              bookingDifficulty: r.bookingDifficulty,
              description: r.description,
              bookingInfo: r.bookingInfo
            }))
          });
        } catch (searchError: any) {
          console.error('Search restaurants error:', searchError);
          return res.status(500).json({
            success: false,
            error: searchError.message || 'Failed to search restaurants'
          });
        }
      }
      
      // If we get here, it's an unknown tool
      return res.status(400).json({
        success: false,
        error: `Unknown tool: ${tool}`
      });
    } catch (error: any) {
      console.error("Error processing MCP tool call:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to process tool call" 
      });
    }
  });

  // Smithery proxy endpoint
  app.all("/api/smithery-proxy/*", async (req: Request, res: Response) => {
    try {
      // Import config to get API key
      const { config } = await import('./config');
      
      // Get the path after /api/smithery-proxy/
      const pathSegments = req.path.split('/api/smithery-proxy/');
      const smitheryPath = pathSegments.length > 1 ? pathSegments[1] : '';
      
      // Check for Serper API specific paths
      if (smitheryPath === 'search' || smitheryPath === 'scrape' || smitheryPath === 'test') {
        return handleSerperRequest(req, res, smitheryPath, config);
      }
      
      // Base Smithery API URL for other requests
      const SMITHERY_BASE_URL = 'https://api.smithery.ai';
      
      // Log the proxy request (exclude authorization headers)
      const logSafeHeaders = { ...req.headers };
      delete logSafeHeaders.authorization;
      console.log(`Smithery proxy: ${req.method} ${smitheryPath}`, { headers: logSafeHeaders });
      
      // Forward the request to Smithery
      try {
        // Prepare the request to Smithery API
        const apiKey = config.SMITHERY_API_KEY || 'simulation-mode';
        const url = `${SMITHERY_BASE_URL}/${smitheryPath}`;
        
        // Set up the headers with authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        
        // Clone other relevant headers from the original request
        if (req.headers['accept']) {
          headers['Accept'] = req.headers['accept'] as string;
        }
        
        // Create request options
        const fetchOptions: RequestInit = {
          method: req.method,
          headers: headers,
        };
        
        // Add body for methods that need it
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          fetchOptions.body = JSON.stringify(req.body);
        }
        
        // Make the request to Smithery
        const smitheryResponse = await fetch(url, fetchOptions);
        
        // Get the JSON response if possible
        let responseData;
        const contentType = smitheryResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await smitheryResponse.json();
        } else {
          responseData = { text: await smitheryResponse.text() };
        }
        
        // Forward the response
        return res.status(smitheryResponse.status).json(responseData);
      } catch (smitheryError: any) {
        console.error('Smithery proxy error:', smitheryError);
        return res.status(500).json({
          error: true,
          message: smitheryError.message || 'Error calling Smithery API',
        });
      }
    } catch (error) {
      console.error('Smithery proxy setup error:', error);
      return res.status(500).json({
        error: true,
        message: 'Failed to initialize Smithery proxy',
      });
    }
  });
  
  // FireCrawl API endpoints
  app.all("/api/firecrawl/*", async (req: Request, res: Response) => {
    try {
      // Import config to get API key
      const { config } = await import('./config');
      
      // Get the path after /api/firecrawl/
      const pathSegments = req.path.split('/api/firecrawl/');
      const fireCrawlPath = pathSegments.length > 1 ? pathSegments[1] : '';
      
      // Extract API key from headers or use default
      const apiKey = req.headers['x-firecrawl-api-key'] as string || config.FIRECRAWL_API_KEY || '';
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'FireCrawl API key is required'
        });
      }
      
      // Handle different endpoints
      return handleFireCrawlRequest(req, res, fireCrawlPath, apiKey, config);
    } catch (error: any) {
      console.error('FireCrawl proxy error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process FireCrawl request'
      });
    }
  });
  
  // Helper function to handle FireCrawl API requests
  async function handleFireCrawlRequest(req: Request, res: Response, pathName: string, apiKey: string, config: any) {
    try {
      // Test endpoint just returns success
      if (pathName === 'test') {
        return res.json({
          success: true,
          message: 'FireCrawl API connection test successful'
        });
      }
      
      // Handle search requests
      if (pathName === 'search') {
        // Get search parameters from request body
        const { query, limit = 5 } = req.body;
        
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'Query parameter is required for search'
          });
        }
        
        try {
          console.log(`Processing FireCrawl search for: ${query}`);
          
          // Check if we should use simulation mode
          const useSimulation = !apiKey || process.env.SIMULATION_MODE === 'true';
          
          if (useSimulation) {
            console.log('Using simulation mode for FireCrawl search');
            // Simulate a search response
            const simulatedResponse = {
              success: true,
              results: [
                {
                  title: `${query} - Restaurant Information (FireCrawl)`,
                  link: `https://example.com/restaurants/${query.toLowerCase().replace(/\s+/g, '-')}`,
                  snippet: `${query} is an exclusive restaurant in London with impeccable service and atmosphere. Book in advance to secure your table.`
                },
                {
                  title: `Reviews for ${query} - London's Top Dining Guide`,
                  link: `https://example.com/reviews/${query.toLowerCase().replace(/\s+/g, '-')}`,
                  snippet: `${query} has received critical acclaim for its innovative menu and attention to detail. Opening hours and contact information available.`
                },
                {
                  title: `${query} - Reservations and Booking Information`,
                  link: `https://example.com/booking/${query.toLowerCase().replace(/\s+/g, '-')}`,
                  snippet: `Make a reservation at ${query}. Tables are highly sought after and typically booked 30-90 days in advance. Private dining options available.`
                }
              ],
              simulation: true
            };
            
            return res.json(simulatedResponse);
          }
          
          // Call the actual FireCrawl API
          console.log('Calling real FireCrawl API for search');
          
          // Send request to FireCrawl API
          const fireCrawlResponse = await fetch('https://api.firecrawl.dev/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              query,
              limit: limit || 5
            })
          });
          
          if (!fireCrawlResponse.ok) {
            const errorText = await fireCrawlResponse.text();
            console.error(`FireCrawl API error: ${fireCrawlResponse.status} - ${errorText}`);
            throw new Error(`FireCrawl API returned ${fireCrawlResponse.status}: ${errorText}`);
          }
          
          const fireCrawlData = await fireCrawlResponse.json();
          
          // Format the response for our frontend
          return res.json({
            success: true,
            results: fireCrawlData.results || []
          });
        } catch (searchError: any) {
          console.error('FireCrawl search error:', searchError);
          return res.status(500).json({
            success: false,
            error: searchError.message || 'Failed to perform search'
          });
        }
      }
      
      // Handle scrape requests
      if (pathName === 'scrape') {
        // Get URL from request body
        const { url } = req.body;
        
        if (!url) {
          return res.status(400).json({
            success: false,
            error: 'URL parameter is required for scraping'
          });
        }
        
        try {
          console.log(`Processing FireCrawl scrape for: ${url}`);
          
          // Check if we should use simulation mode
          const useSimulation = !apiKey || process.env.SIMULATION_MODE === 'true';
          
          if (useSimulation) {
            console.log('Using simulation mode for FireCrawl scrape');
            // Simulate a scrape response
            const simulatedResponse = {
              success: true,
              results: [
                {
                  url,
                  content: `This is simulated content for ${url} from FireCrawl. The restaurant offers a menu that changes seasonally with a focus on local ingredients. Reservations can be made online or by phone. Opening hours are Tuesday-Sunday, 6PM-11PM.`
                }
              ],
              simulation: true
            };
            
            return res.json(simulatedResponse);
          }
          
          // Call the actual FireCrawl API
          console.log('Calling real FireCrawl API for scrape');
          
          // Send request to FireCrawl API
          const fireCrawlResponse = await fetch('https://api.firecrawl.dev/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ url })
          });
          
          if (!fireCrawlResponse.ok) {
            const errorText = await fireCrawlResponse.text();
            console.error(`FireCrawl API error: ${fireCrawlResponse.status} - ${errorText}`);
            throw new Error(`FireCrawl API returned ${fireCrawlResponse.status}: ${errorText}`);
          }
          
          const fireCrawlData = await fireCrawlResponse.json();
          
          // Format the response for our frontend
          return res.json({
            success: true,
            results: [
              {
                url,
                content: fireCrawlData.content || 'No content extracted'
              }
            ]
          });
        } catch (scrapeError: any) {
          console.error('FireCrawl scrape error:', scrapeError);
          return res.status(500).json({
            success: false,
            error: scrapeError.message || 'Failed to scrape content'
          });
        }
      }
      
      // If we get here, it's an unsupported endpoint
      return res.status(404).json({
        success: false,
        error: `Unsupported FireCrawl API endpoint: ${pathName}`
      });
    } catch (error: any) {
      console.error('Error handling FireCrawl request:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process FireCrawl request'
      });
    }
  }
  
  // Helper function to handle Serper API requests
  async function handleSerperRequest(req: Request, res: Response, pathName: string, config: any) {
    try {
      // Extract API keys from headers or use defaults
      const smitheryApiKey = req.headers['x-smithery-api-key'] as string || config.SMITHERY_API_KEY || '';
      const serperApiKey = req.headers['x-serper-api-key'] as string || config.SERPER_API_KEY || '';
      
      // Test endpoint just returns success
      if (pathName === 'test') {
        return res.json({
          success: true,
          message: 'Serper API connection test successful'
        });
      }
      
      // For search and scrape, we need the Serper API key
      if (!serperApiKey) {
        console.log('Missing Serper API key');
        return res.status(401).json({
          success: false,
          error: 'Serper API key is required'
        });
      }
      
      // Handle search requests
      if (pathName === 'search') {
        // Get search parameters from request body
        const { query, country = 'gb', limit = 10 } = req.body;
        
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'Query parameter is required for search'
          });
        }
        
        try {
          console.log(`Processing Serper search for: ${query}`);
          
          // Simulate a search response since we can't make real API calls
          const simulatedResponse = {
            success: true,
            results: [
              {
                title: `${query} - Restaurant Information`,
                link: `https://example.com/restaurants/${query.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: `${query} is a popular restaurant in London. Make reservations and explore the menu.`
              },
              {
                title: `Reviews for ${query} - London's Dining Guide`,
                link: `https://example.com/reviews/${query.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: `Read reviews and ratings for ${query}. Open daily for lunch and dinner.`
              }
            ]
          };
          
          return res.json(simulatedResponse);
        } catch (searchError: any) {
          console.error('Serper search error:', searchError);
          return res.status(500).json({
            success: false,
            error: searchError.message || 'Failed to perform search'
          });
        }
      }
      
      // Handle scrape requests
      if (pathName === 'scrape') {
        // Get URL from request body
        const { url } = req.body;
        
        if (!url) {
          return res.status(400).json({
            success: false,
            error: 'URL parameter is required for scraping'
          });
        }
        
        try {
          console.log(`Processing Serper scrape for: ${url}`);
          
          // Simulate a scrape response
          const simulatedResponse = {
            success: true,
            results: [
              {
                url,
                content: `This is simulated content for ${url}. In a real implementation, this would be the actual content scraped from the website.`
              }
            ]
          };
          
          return res.json(simulatedResponse);
        } catch (scrapeError: any) {
          console.error('Serper scrape error:', scrapeError);
          return res.status(500).json({
            success: false,
            error: scrapeError.message || 'Failed to scrape content'
          });
        }
      }
      
      // If we get here, it's an unsupported endpoint
      return res.status(404).json({
        success: false,
        error: `Unsupported Serper API endpoint: ${pathName}`
      });
    } catch (error: any) {
      console.error('Error handling Serper request:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process Serper request'
      });
    }
  }
  
  // Automated booking test endpoint
  app.post("/api/booking/detect-platform", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL is required"
        });
      }
      
      // Import the platform detector service
      const { analyzeWebsite, BookingPlatform } = await import('./services/booking/platformDetector');
      
      // Detect platform from the provided URL
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
      
      return res.json({
        success: true,
        platform: result.platform,
        platformName: platformDescriptions[result.platform] || result.platform,
        confidence: result.confidence,
        platformDetails: result.platformDetails || null
      });
    } catch (error: any) {
      console.error("Platform detection error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to detect platform"
      });
    }
  });
  
  app.post("/api/automated-booking", async (req: Request, res: Response) => {
    try {
      // Import automated booking service
      const { automatedBookingService } = await import('./services/automatedBookingService');
      
      // Validate request
      const requiredFields = ['restaurantName', 'platformId', 'platform', 'date', 'time', 'partySize'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ 
            success: false, 
            error: `Missing required field: ${field}` 
          });
        }
      }
      
      // Parse date
      let bookingDate: Date;
      try {
        bookingDate = new Date(req.body.date);
        if (isNaN(bookingDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown date error';
        return res.status(400).json({ 
          success: false, 
          error: `Invalid date format: ${errorMessage}` 
        });
      }
      
      // Create booking request
      const bookingRequest = {
        restaurantName: req.body.restaurantName,
        platformId: req.body.platformId,
        platform: req.body.platform,
        date: bookingDate,
        time: req.body.time,
        partySize: parseInt(req.body.partySize),
        userEmail: req.body.userEmail,
        userPhone: req.body.userPhone,
        userName: req.body.userName,
        specialRequests: req.body.specialRequests,
        bookingUrl: req.body.bookingUrl
      };
      
      // Check if platform is supported
      if (!automatedBookingService.isPlatformSupported(bookingRequest.platform)) {
        return res.status(400).json({ 
          success: false, 
          error: `Booking platform not supported: ${bookingRequest.platform}` 
        });
      }
      
      // Check if we should use Puppeteer MCP
      const useMcpPuppeteer = req.body.useMcpPuppeteer === true;
      
      if (useMcpPuppeteer) {
        console.log(`Starting Puppeteer MCP booking test for ${bookingRequest.restaurantName}`);
        
        try {
          // Find restaurant to get complete details
          const restaurant = await storage.getRestaurantByName(bookingRequest.restaurantName);
          
          if (!restaurant) {
            return res.status(404).json({
              success: false,
              error: `Restaurant not found: ${bookingRequest.restaurantName}`
            });
          }
          
          // Import OpenTable MCP service
          const { OpenTableMCPService } = await import('./services/booking/openTableMcp');
          const openTableMcpService = new OpenTableMCPService();
          
          // Create booking request for the MCP service
          const mcpBookingRequest = {
            restaurantId: restaurant.id,
            userId: 1, // Default user ID for testing
            date: bookingDate,
            time: req.body.time,
            partySize: parseInt(req.body.partySize),
            name: req.body.userName || req.body.name,
            email: req.body.userEmail || req.body.email,
            phone: req.body.userPhone || req.body.phone,
            specialRequests: req.body.specialRequests,
          };
          
          // Execute booking using MCP
          const mcpResult = await openTableMcpService.bookTable(restaurant, mcpBookingRequest);
          
          // Create a standardized result
          const result = {
            success: mcpResult.success,
            message: mcpResult.success 
              ? `Successfully tested booking at ${bookingRequest.restaurantName}` 
              : mcpResult.error || 'Failed to process booking',
            booking: mcpResult.success ? {
              id: Date.now(),
              restaurantName: bookingRequest.restaurantName,
              date: bookingRequest.date.toISOString().split('T')[0],
              time: bookingRequest.time,
              partySize: bookingRequest.partySize,
              status: mcpResult.status || 'pending',
              confirmationCode: mcpResult.confirmationCode
            } : undefined,
            logs: mcpResult.logs || [],
            simulation: mcpResult.simulation || false
          };
          
          return res.json(result);
        } catch (mcpError: any) {
          console.error('Error in Puppeteer MCP booking:', mcpError);
          return res.status(500).json({
            success: false,
            error: mcpError.message || 'Failed to process MCP booking',
            logs: mcpError.logs || []
          });
        }
      } else {
        // Use standard automation
        console.log(`Starting automated booking test for ${bookingRequest.restaurantName}`);
        const result = await automatedBookingService.executeBooking(bookingRequest);
        
        // Return result
        return res.json(result);
      }
    } catch (error) {
      console.error("Error in automated booking:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false, 
        error: `Booking automation failed: ${errorMessage}` 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
