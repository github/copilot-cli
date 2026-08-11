import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(dbUrl?: string): ReturnType<typeof drizzle<typeof schema>> {
  if (_db) return _db;

  const url = dbUrl ?? process.env['EVODRON_DB_URL'] ?? 'file:./evodron.db';
  // Strip "file:" prefix for better-sqlite3
  const filePath = url.startsWith('file:') ? url.slice(5) : url;

  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  _db = drizzle(sqlite, { schema });
  return _db;
}

export { schema };
export type Db = ReturnType<typeof getDb>;
