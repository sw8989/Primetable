import { db } from "./db";
import { restaurants } from "@shared/schema";
import { sql } from "drizzle-orm";
import { restaurantSeeds } from "./data/restaurantSeeds";

/**
 * Initialize the database with sample restaurants
 */
export async function initializeDatabase() {
  try {
    console.log("Checking if database needs initialization...");
    
    // Check if restaurants table is empty
    const restaurantCount = await db.select({
      count: sql<number>`count(*)`,
    }).from(restaurants);
    
    if (Number(restaurantCount[0].count) === 0) {
      console.log("Database is empty. Adding sample restaurants...");
      
      for (const restaurant of restaurantSeeds) {
        await db.insert(restaurants).values(restaurant);
      }
      
      console.log("Sample restaurants added successfully!");
    } else {
      console.log("Database already contains data, skipping initialization.");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
