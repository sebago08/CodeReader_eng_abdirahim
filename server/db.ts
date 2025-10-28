import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

const { Pool: PgPool } = pg;

// Prioritize Supabase connection if available, otherwise use Replit's Neon database
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using Supabase (use standard PostgreSQL) or Neon (use serverless driver)
const isSupabase = databaseUrl.includes('supabase.com');

let pool: any;
let db: any;

if (isSupabase) {
  // Use standard PostgreSQL driver for Supabase
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzlePg(pool, { schema, logger: true });
} else {
  // Use Neon serverless driver for Replit's database
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon(pool, { schema, logger: true });
}

// Debug: Log project schema columns
console.log('[DB] Projects table columns:', Object.keys(schema.projects));

export { pool, db };