import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

const { Pool: PgPool } = pg;

// Always use Replit's Neon database (DATABASE_URL) where all the data exists
// SUPABASE_DATABASE_URL is for production deployment only
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard PostgreSQL driver for reliability
const pool = new PgPool({ connectionString: databaseUrl });
const db = drizzlePg(pool, { schema });

export { pool, db };