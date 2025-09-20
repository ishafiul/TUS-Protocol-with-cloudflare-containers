import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export function getDbClient() {
  const sql = neon(process.env.POSTGRES_CONNECTION_STRING!);
  return drizzle(sql, { schema });
}

// Export the database service for easier usage
export { ContainerDatabaseService } from './databaseService';
