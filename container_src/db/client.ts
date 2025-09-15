import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../drizzle/schema/';
import { Env } from '../type/index';

export function getDbClient(env: Env) {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}
