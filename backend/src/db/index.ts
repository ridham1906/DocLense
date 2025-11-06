import { drizzle } from 'drizzle-orm/postgres-js';
import {config} from 'dotenv'; config();
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgresql://ridham:pass123@localhost:5432/ragdb';

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export async function initDatabase() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}

export async function closeConnection() {
  await client.end();
}
