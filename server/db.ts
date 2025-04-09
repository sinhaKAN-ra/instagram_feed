import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Initialize the DB connection
// @ts-ignore - neon typing issue
const sql = neon(process.env.DATABASE_URL!);
// @ts-ignore - drizzle typing issue
export const db = drizzle(sql);

// For debugging database connections
console.log("Database connection established");