import { defineConfig } from 'drizzle-kit';
import {config} from 'dotenv'; config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://ridham:pass123@localhost:5432/ragdb',
  },
});