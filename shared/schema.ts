import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  preferences: jsonb("preferences"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  preferences: true,
});

// Restaurant schema
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cuisine: text("cuisine").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  bookingDifficulty: text("booking_difficulty").notNull(), // easy, medium, hard
  bookingInfo: text("booking_info").notNull(),
  bookingPlatform: text("booking_platform").notNull(), // OpenTable, Resy, SevenRooms, Tock, Direct
  bookingNotes: text("booking_notes"),
  platformId: text("platform_id"), // ID in the booking platform system
});

export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  description: true,
  cuisine: true,
  location: true,
  imageUrl: true,
  bookingDifficulty: true,
  bookingInfo: true,
  bookingPlatform: true,
  bookingNotes: true,
  platformId: true,
});

// Booking schema
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  partySize: integer("party_size").notNull(),
  status: text("status").notNull(), // pending, confirmed, cancelled, completed
  platformBookingId: text("platform_booking_id"),
  agentStatus: text("agent_status").notNull(), // active, success, failed
  agentLog: jsonb("agent_log"),
  confirmed: boolean("confirmed").default(false),
  priorityBooking: boolean("priority_booking").default(false),
  acceptSimilarTimes: boolean("accept_similar_times").default(false),
  autoConfirm: boolean("auto_confirm").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  restaurantId: true,
  date: true,
  time: true,
  partySize: true,
  status: true,
  platformBookingId: true,
  agentStatus: true,
  agentLog: true,
  priorityBooking: true, 
  acceptSimilarTimes: true,
  autoConfirm: true,
});

// Favorites schema
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  restaurantId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

// Extended schemas for validation
export const bookingFormSchema = insertBookingSchema.extend({
  date: z.string().or(z.date()),
  waitlistOption: z.enum(['join', 'alternativeDates', 'similarRestaurants']).optional(),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
