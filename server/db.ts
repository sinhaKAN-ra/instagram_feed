import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Initialize the DB connection
// @ts-ignore - neon typing issue
const sql = neon('postgresql://neondb_owner:npg_UgFj4RreE5ot@ep-odd-wind-a1qeskxw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
// @ts-ignore - drizzle typing issue
export const db = drizzle(sql);

// For debugging database connections
console.log("Database connection established");