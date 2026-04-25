import {
  users, User, InsertUser,
  restaurants, Restaurant, InsertRestaurant,
  bookings, Booking, InsertBooking,
  favorites, Favorite, InsertFavorite,
  conversations, Conversation, InsertConversation, ConversationMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, or, sql, inArray, and } from "drizzle-orm";
import { restaurantSeeds } from "./data/restaurantSeeds";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Restaurant operations
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByName(name: string): Promise<Restaurant | undefined>;
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]>;
  getRestaurantsByLocation(location: string): Promise<Restaurant[]>;
  getRestaurantsByDifficulty(difficulty: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  
  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUser(userId: number): Promise<Booking[]>;
  getBookingsWithRestaurantByUser(userId: number): Promise<Array<Booking & { restaurant: Restaurant | null }>>;
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Favorite operations
  getFavorite(id: number): Promise<Favorite | undefined>;
  getFavoritesByUser(userId: number): Promise<Favorite[]>;
  getFavoritesWithRestaurantByUser(userId: number): Promise<Array<Favorite & { restaurant: Restaurant | null }>>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(id: number): Promise<boolean>;

  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: Omit<InsertConversation, never>): Promise<Conversation>;
  appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined>;

  // Search operations
  searchRestaurants(query: string): Promise<Restaurant[]>;
  filterRestaurants(filters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>): Promise<Restaurant[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private bookings: Map<number, Booking>;
  private favorites: Map<number, Favorite>;
  private conversations: Map<number, Conversation>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentBookingId: number;
  private currentFavoriteId: number;
  private currentConversationId: number;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.bookings = new Map();
    this.favorites = new Map();
    this.conversations = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentBookingId = 1;
    this.currentFavoriteId = 1;
    this.currentConversationId = 1;

    // Initialize with sample exclusive London restaurants
    this.initializeRestaurants();
  }

  private initializeRestaurants() {
    restaurantSeeds.forEach((restaurant) => this.createRestaurant(restaurant));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Restaurant methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }
  
  async getRestaurantByName(name: string): Promise<Restaurant | undefined> {
    return Array.from(this.restaurants.values()).find(
      (restaurant) => restaurant.name.toLowerCase() === name.toLowerCase()
    );
  }
  
  async getRestaurants(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values());
  }
  
  async getRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      (restaurant) => restaurant.cuisine.toLowerCase().includes(cuisine.toLowerCase())
    );
  }
  
  async getRestaurantsByLocation(location: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      (restaurant) => restaurant.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  async getRestaurantsByDifficulty(difficulty: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      (restaurant) => restaurant.bookingDifficulty === difficulty
    );
  }
  
  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.currentRestaurantId++;
    const restaurant: Restaurant = { ...insertRestaurant, id };
    this.restaurants.set(id, restaurant);
    return restaurant;
  }
  
  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookingsByUser(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async getBookingsWithRestaurantByUser(userId: number): Promise<Array<Booking & { restaurant: Restaurant | null }>> {
    const userBookings = await this.getBookingsByUser(userId);
    return userBookings.map((booking) => ({
      ...booking,
      restaurant: this.restaurants.get(booking.restaurantId) ?? null,
    }));
  }
  
  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.restaurantId === restaurantId
    );
  }
  
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      confirmed: false, 
      createdAt: new Date() 
    };
    this.bookings.set(id, booking);
    return booking;
  }
  
  async updateBooking(id: number, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const existingBooking = await this.getBooking(id);
    if (!existingBooking) return undefined;
    
    const updatedBooking = { ...existingBooking, ...bookingData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
  
  // Favorite methods
  async getFavorite(id: number): Promise<Favorite | undefined> {
    return this.favorites.get(id);
  }
  
  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId
    );
  }

  async getFavoritesWithRestaurantByUser(userId: number): Promise<Array<Favorite & { restaurant: Restaurant | null }>> {
    const userFavorites = await this.getFavoritesByUser(userId);
    return userFavorites.map((favorite) => ({
      ...favorite,
      restaurant: this.restaurants.get(favorite.restaurantId) ?? null,
    }));
  }
  
  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if already exists
    const existing = Array.from(this.favorites.values()).find(
      (favorite) => favorite.userId === insertFavorite.userId && 
                   favorite.restaurantId === insertFavorite.restaurantId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { ...insertFavorite, id };
    this.favorites.set(id, favorite);
    return favorite;
  }
  
  async removeFavorite(id: number): Promise<boolean> {
    return this.favorites.delete(id);
  }

  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (c) => c.userId === userId
    );
  }

  async createConversation(data: Omit<InsertConversation, never>): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    const conv: Conversation = {
      id,
      userId: data.userId,
      restaurantId: data.restaurantId ?? null,
      messages: data.messages ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conv);
    return conv;
  }

  async appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined> {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    const updated: Conversation = {
      ...conv,
      messages: [...(conv.messages ?? []), message],
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  // Search methods
  async searchRestaurants(query: string): Promise<Restaurant[]> {
    if (!query) return this.getRestaurants();
    
    const lowerQuery = query.toLowerCase();
    return Array.from(this.restaurants.values()).filter(
      (restaurant) => 
        restaurant.name.toLowerCase().includes(lowerQuery) ||
        restaurant.cuisine.toLowerCase().includes(lowerQuery) ||
        restaurant.location.toLowerCase().includes(lowerQuery) ||
        restaurant.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  async filterRestaurants(filters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>): Promise<Restaurant[]> {
    let results = Array.from(this.restaurants.values());
    
    if (filters.cuisine && filters.cuisine.length > 0) {
      results = results.filter(restaurant => 
        filters.cuisine!.some(cuisine => 
          restaurant.cuisine.toLowerCase().includes(cuisine.toLowerCase())
        )
      );
    }
    
    if (filters.location && filters.location.length > 0) {
      results = results.filter(restaurant => 
        filters.location!.some(location => 
          restaurant.location.toLowerCase().includes(location.toLowerCase())
        )
      );
    }
    
    if (filters.difficulty && filters.difficulty.length > 0) {
      results = results.filter(restaurant => 
        filters.difficulty!.includes(restaurant.bookingDifficulty)
      );
    }
    
    return results;
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  // Restaurant methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    try {
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
      return restaurant;
    } catch (error) {
      console.error("Error getting restaurant:", error);
      return undefined;
    }
  }

  async getRestaurantByName(name: string): Promise<Restaurant | undefined> {
    try {
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(sql`LOWER(${restaurants.name}) = LOWER(${name})`);
      return restaurant;
    } catch (error) {
      console.error("Error getting restaurant by name:", error);
      return undefined;
    }
  }

  async getRestaurants(): Promise<Restaurant[]> {
    try {
      return await db.select().from(restaurants);
    } catch (error) {
      console.error("Error getting restaurants:", error);
      return [];
    }
  }

  async getRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
    try {
      return await db
        .select()
        .from(restaurants)
        .where(sql`LOWER(${restaurants.cuisine}) LIKE LOWER(${'%' + cuisine + '%'})`);
    } catch (error) {
      console.error("Error getting restaurants by cuisine:", error);
      return [];
    }
  }

  async getRestaurantsByLocation(location: string): Promise<Restaurant[]> {
    try {
      return await db
        .select()
        .from(restaurants)
        .where(sql`LOWER(${restaurants.location}) LIKE LOWER(${'%' + location + '%'})`);
    } catch (error) {
      console.error("Error getting restaurants by location:", error);
      return [];
    }
  }

  async getRestaurantsByDifficulty(difficulty: string): Promise<Restaurant[]> {
    try {
      return await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.bookingDifficulty, difficulty));
    } catch (error) {
      console.error("Error getting restaurants by difficulty:", error);
      return [];
    }
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    try {
      const [restaurant] = await db.insert(restaurants).values(insertRestaurant).returning();
      return restaurant;
    } catch (error) {
      console.error("Error creating restaurant:", error);
      throw error;
    }
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
      return booking;
    } catch (error) {
      console.error("Error getting booking:", error);
      return undefined;
    }
  }

  async getBookingsByUser(userId: number): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.userId, userId));
    } catch (error) {
      console.error("Error getting bookings by user:", error);
      return [];
    }
  }

  async getBookingsWithRestaurantByUser(userId: number): Promise<Array<Booking & { restaurant: Restaurant | null }>> {
    try {
      const rows = await db
        .select({
          booking: bookings,
          restaurant: restaurants,
        })
        .from(bookings)
        .leftJoin(restaurants, eq(bookings.restaurantId, restaurants.id))
        .where(eq(bookings.userId, userId));

      return rows.map(({ booking, restaurant }) => ({
        ...booking,
        restaurant,
      }));
    } catch (error) {
      console.error("Error getting bookings with restaurant by user:", error);
      return [];
    }
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    try {
      return await db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
    } catch (error) {
      console.error("Error getting bookings by restaurant:", error);
      return [];
    }
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    try {
      const [booking] = await db.insert(bookings).values(insertBooking).returning();
      return booking;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async updateBooking(id: number, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    try {
      const [updatedBooking] = await db
        .update(bookings)
        .set(bookingData)
        .where(eq(bookings.id, id))
        .returning();
      return updatedBooking;
    } catch (error) {
      console.error("Error updating booking:", error);
      return undefined;
    }
  }

  // Favorite methods
  async getFavorite(id: number): Promise<Favorite | undefined> {
    try {
      const [favorite] = await db.select().from(favorites).where(eq(favorites.id, id));
      return favorite;
    } catch (error) {
      console.error("Error getting favorite:", error);
      return undefined;
    }
  }

  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    try {
      return await db.select().from(favorites).where(eq(favorites.userId, userId));
    } catch (error) {
      console.error("Error getting favorites by user:", error);
      return [];
    }
  }

  async getFavoritesWithRestaurantByUser(userId: number): Promise<Array<Favorite & { restaurant: Restaurant | null }>> {
    try {
      const rows = await db
        .select({
          favorite: favorites,
          restaurant: restaurants,
        })
        .from(favorites)
        .leftJoin(restaurants, eq(favorites.restaurantId, restaurants.id))
        .where(eq(favorites.userId, userId));

      return rows.map(({ favorite, restaurant }) => ({
        ...favorite,
        restaurant,
      }));
    } catch (error) {
      console.error("Error getting favorites with restaurant by user:", error);
      return [];
    }
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    try {
      // Check if favorite already exists
      const existingFavorites = await db
        .select()
        .from(favorites)
        .where(
          sql`${favorites.userId} = ${insertFavorite.userId} AND ${favorites.restaurantId} = ${insertFavorite.restaurantId}`
        );
      
      if (existingFavorites.length > 0) {
        return existingFavorites[0];
      }
      
      const [favorite] = await db.insert(favorites).values(insertFavorite).returning();
      return favorite;
    } catch (error) {
      console.error("Error creating favorite:", error);
      throw error;
    }
  }

  async removeFavorite(id: number): Promise<boolean> {
    try {
      const result = await db.delete(favorites).where(eq(favorites.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error removing favorite:", error);
      return false;
    }
  }

  // Search methods
  async searchRestaurants(query: string): Promise<Restaurant[]> {
    try {
      if (!query) {
        return this.getRestaurants();
      }
      
      const lowerQuery = `%${query.toLowerCase()}%`;
      return await db
        .select()
        .from(restaurants)
        .where(
          or(
            sql`LOWER(${restaurants.name}) LIKE ${lowerQuery}`,
            sql`LOWER(${restaurants.cuisine}) LIKE ${lowerQuery}`,
            sql`LOWER(${restaurants.location}) LIKE ${lowerQuery}`,
            sql`LOWER(${restaurants.description}) LIKE ${lowerQuery}`
          )
        );
    } catch (error) {
      console.error("Error searching restaurants:", error);
      return [];
    }
  }

  async filterRestaurants(filters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>): Promise<Restaurant[]> {
    try {
      let conditions = [];

      if (filters.cuisine && filters.cuisine.length > 0) {
        conditions.push(
          or(...filters.cuisine.map(cuisine =>
            sql`LOWER(${restaurants.cuisine}) LIKE LOWER(${'%' + cuisine + '%'})`
          ))
        );
      }

      if (filters.location && filters.location.length > 0) {
        conditions.push(
          or(...filters.location.map(location =>
            sql`LOWER(${restaurants.location}) LIKE LOWER(${'%' + location + '%'})`
          ))
        );
      }

      if (filters.difficulty && filters.difficulty.length > 0) {
        conditions.push(inArray(restaurants.bookingDifficulty, filters.difficulty));
      }

      if (conditions.length === 0) {
        return this.getRestaurants();
      }

      return await db
        .select()
        .from(restaurants)
        .where(and(...conditions));
    } catch (error) {
      console.error("Error filtering restaurants:", error);
      return [];
    }
  }

  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    try {
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
      return conv;
    } catch (error) {
      console.error("Error getting conversation:", error);
      return undefined;
    }
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    try {
      return await db.select().from(conversations).where(eq(conversations.userId, userId));
    } catch (error) {
      console.error("Error getting conversations by user:", error);
      return [];
    }
  }

  async createConversation(data: Omit<InsertConversation, never>): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined> {
    try {
      const conv = await this.getConversation(id);
      if (!conv) return undefined;
      const newMessages = [...(conv.messages ?? []), message];
      const [updated] = await db
        .update(conversations)
        .set({ messages: newMessages, updatedAt: new Date() })
        .where(eq(conversations.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error appending conversation message:", error);
      return undefined;
    }
  }
}

import { initializeDatabase } from "./initDB";

// Initialize the database storage
export const storage = new DatabaseStorage();

// Seed the database with initial data
initializeDatabase().catch(console.error);
