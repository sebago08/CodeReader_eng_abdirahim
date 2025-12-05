import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool: PgPool } = pg;

// Use Supabase database for production scalability
// Falls back to Replit DATABASE_URL if Supabase is not configured
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`Using database: ${databaseUrl.includes('supabase') ? 'Supabase' : 'Replit PostgreSQL'}`);

// Use standard PostgreSQL driver for reliability
const pool = new PgPool({ connectionString: databaseUrl });
const db = drizzlePg(pool, { schema });

export { pool, db };