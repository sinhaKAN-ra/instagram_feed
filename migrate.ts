import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "./shared/schema";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Run the migration
async function runMigration() {
  // @ts-ignore - neon typing issue
  const sql = neon(process.env.DATABASE_URL!);
  // @ts-ignore - drizzle typing issue
  const db = drizzle(sql);
  
  console.log("Running migration...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migration completed successfully");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});