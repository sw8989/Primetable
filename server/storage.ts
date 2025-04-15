import {
  users, User, InsertUser,
  restaurants, Restaurant, InsertRestaurant,
  bookings, Booking, InsertBooking,
  favorites, Favorite, InsertFavorite
} from "@shared/schema";

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
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Favorite operations
  getFavorite(id: number): Promise<Favorite | undefined>;
  getFavoritesByUser(userId: number): Promise<Favorite[]>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(id: number): Promise<boolean>;
  
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
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentBookingId: number;
  private currentFavoriteId: number;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.bookings = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentBookingId = 1;
    this.currentFavoriteId = 1;
    
    // Initialize with sample exclusive London restaurants
    this.initializeRestaurants();
  }

  private initializeRestaurants() {
    const sampleRestaurants: InsertRestaurant[] = [
      {
        name: "Chiltern Firehouse",
        description: "Trendy hotel restaurant by acclaimed chef Nuno Mendes. Frequented by celebrities and A-listers.",
        cuisine: "Modern European",
        location: "Marylebone",
        imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "hard",
        bookingInfo: "Opens reservations 90 days in advance at midnight",
        bookingPlatform: "OpenTable",
        bookingNotes: "Some tables reserved for hotel guests",
        platformId: "chiltern123",
      },
      {
        name: "The Clove Club",
        description: "2 Michelin Star restaurant serving innovative British cuisine in a historic dining room.",
        cuisine: "British",
        location: "Shoreditch",
        imageUrl: "https://images.unsplash.com/photo-1559304822-9eb2813c9844?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "hard",
        bookingInfo: "Reservations open 2 months in advance",
        bookingPlatform: "Tock",
        bookingNotes: "Required prepayment for tasting menu",
        platformId: "cloveclub456",
      },
      {
        name: "Dishoom",
        description: "Popular Bombay-style café serving Indian small plates and signature cocktails in retro setting.",
        cuisine: "Indian",
        location: "Covent Garden",
        imageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "medium",
        bookingInfo: "Accepts bookings up to 3 weeks in advance",
        bookingPlatform: "OpenTable",
        bookingNotes: "Walk-ins available for bar seating",
        platformId: "dishoom789",
      },
      {
        name: "Brat",
        description: "Michelin-starred restaurant focusing on Basque-inspired, wood-fired cooking.",
        cuisine: "Spanish",
        location: "Shoreditch",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "hard",
        bookingInfo: "Books up 6 weeks in advance",
        bookingPlatform: "Resy",
        bookingNotes: "Counter seating available for walk-ins",
        platformId: "brat101",
      },
      {
        name: "Core by Clare Smyth",
        description: "3 Michelin Star restaurant offering elegant British cuisine in sophisticated setting.",
        cuisine: "British",
        location: "Notting Hill",
        imageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "hard",
        bookingInfo: "Reservations release 3 months in advance",
        bookingPlatform: "SevenRooms",
        bookingNotes: "Requires credit card deposit",
        platformId: "core202",
      },
      {
        name: "Sketch (The Lecture Room)",
        description: "Lavish, 3 Michelin Star French restaurant in a converted Georgian townhouse with unique decor.",
        cuisine: "French",
        location: "Mayfair",
        imageUrl: "https://images.unsplash.com/photo-1586999768265-24af89630739?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
        bookingDifficulty: "hard",
        bookingInfo: "Books 2 months ahead, releases at 7am",
        bookingPlatform: "OpenTable",
        bookingNotes: "Smart dress code required",
        platformId: "sketch303",
      }
    ];
    
    sampleRestaurants.forEach(restaurant => this.createRestaurant(restaurant));
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

export const storage = new MemStorage();
