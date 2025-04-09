import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./shared/schema";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Run the migration
async function pushSchema() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  
  // @ts-ignore - neon typing issue
  const sql = neon(process.env.DATABASE_URL!);
  // @ts-ignore - drizzle typing issue
  const db = drizzle(sql);
  
  console.log("Creating database schema...");
  
  try {
    // Create users table
    console.log("Creating users table...");
    await sql(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      instagram_id TEXT UNIQUE,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    
    // Create instagram_profiles table
    console.log("Creating instagram_profiles table...");
    await sql(`
    CREATE TABLE IF NOT EXISTS instagram_profiles (
      id SERIAL PRIMARY KEY,
      instagram_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      name TEXT,
      profile_picture_url TEXT,
      biography TEXT,
      website TEXT,
      is_business BOOLEAN,
      media_count INTEGER,
      followers_count INTEGER,
      following_count INTEGER,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    
    // Create instagram_media table
    console.log("Creating instagram_media table...");
    await sql(`
    CREATE TABLE IF NOT EXISTS instagram_media (
      id SERIAL PRIMARY KEY,
      instagram_id TEXT NOT NULL,
      media_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      media_url TEXT NOT NULL,
      permalink TEXT NOT NULL,
      thumbnail_url TEXT,
      caption TEXT,
      timestamp TEXT NOT NULL,
      like_count INTEGER,
      comments_count INTEGER,
      comments_data JSONB,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    
    console.log("Database schema created successfully");
  } catch (err) {
    console.error("Error creating schema:", err);
    throw err;
  }
}

pushSchema().catch((err) => {
  console.error("Schema push failed:", err);
  process.exit(1);
});