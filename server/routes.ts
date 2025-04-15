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
  
  app.get("/api/restaurants/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || "";
      const restaurants = await storage.searchRestaurants(query);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Error searching restaurants" });
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
      
      // Start the booking agent process in the background
      bookingAgent.startBookingProcess(booking.id);
      
      res.status(201).json(booking);
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
        confirmed: true,
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
      
      // Also stop the booking agent
      bookingAgent.stopBookingProcess(id);
      
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error cancelling booking" });
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

  const httpServer = createServer(app);
  return httpServer;
}
