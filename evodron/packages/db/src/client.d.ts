import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
export declare function getDb(dbUrl?: string): ReturnType<typeof drizzle<typeof schema>>;
export { schema };
export type Db = ReturnType<typeof getDb>;
