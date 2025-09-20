import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: '../drizzle',
  schema: '../drizzle/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_CONNECTION_STRING!,
  },
});