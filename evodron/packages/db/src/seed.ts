/**
 * EVODRON database seeder — populates default reward rules.
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const url = process.env['EVODRON_DB_URL'] ?? 'file:./evodron.db';
const filePath = url.startsWith('file:') ? url.slice(5) : url;
const db = new Database(filePath);
const now = new Date().toISOString();

const defaultRules = [
  {
    id: randomUUID(),
    name: 'referral_active_referrer',
    trigger: 'referral_active',
    credits: 100,
    active: 1,
    description: 'Credits awarded to the referrer when a referee reaches active status',
    updated_at: now,
  },
  {
    id: randomUUID(),
    name: 'referral_onboarding_referee',
    trigger: 'referral_onboarding',
    credits: 50,
    active: 1,
    description: 'Onboarding credits awarded to a new user who joined via referral',
    updated_at: now,
  },
  {
    id: randomUUID(),
    name: 'milestone_10_sessions',
    trigger: 'milestone_10_sessions',
    credits: 25,
    active: 1,
    description: 'Bonus credits for completing 10 sessions',
    updated_at: now,
  },
];

const stmt = db.prepare(`
  INSERT OR IGNORE INTO reward_rules (id, name, trigger, credits, active, description, updated_at)
  VALUES (@id, @name, @trigger, @credits, @active, @description, @updated_at)
`);

const insert = db.transaction(() => {
  for (const rule of defaultRules) stmt.run(rule);
});
insert();

console.log('✅ Default reward rules seeded');
db.close();
