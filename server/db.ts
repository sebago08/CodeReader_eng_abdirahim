import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Prioritize Supabase connection if available, otherwise use Replit's Neon database
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using Supabase (doesn't need websocket config)
const isSupabase = databaseUrl.includes('supabase.com');

if (!isSupabase) {
  // Configure for Neon database (Replit's default)
  neonConfig.webSocketConstructor = ws;
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });