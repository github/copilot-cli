'use strict';

const { getDb } = require('../db/database');

/**
 * Create a referral record linking referrer → referee.
 * Guards:
 *   - referrer_id !== referee_id (no self-referral)
 *   - referee_id UNIQUE constraint in DB prevents duplicate parrain
 */
function createReferral(referrerId, refereeId) {
  if (referrerId === refereeId) {
    throw new Error('SELF_REFERRAL');
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO referrals (referrer_id, referee_id, status)
    VALUES (?, ?, 'pending')
  `);

  const result = stmt.run(referrerId, refereeId);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  return getDb()
    .prepare('SELECT * FROM referrals WHERE id = ?')
    .get(id);
}

function findByRefereeId(refereeId) {
  return getDb()
    .prepare('SELECT * FROM referrals WHERE referee_id = ?')
    .get(refereeId);
}

function getReferrerStats(referrerId) {
  const db = getDb();
  return {
    total_invitations: db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ?').get(referrerId).n,
    total_signups:     db.prepare("SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND status IN ('pending','active','rewarded')").get(referrerId).n,
    total_active:      db.prepare("SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND status IN ('active','rewarded')").get(referrerId).n,
    total_rewarded:    db.prepare("SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND status = 'rewarded'").get(referrerId).n,
  };
}

/**
 * Mark a referral as active (filleul has completed the activation condition).
 * Returns the updated referral row.
 */
function activateReferral(referralId) {
  getDb()
    .prepare("UPDATE referrals SET status = 'active', activated_at = datetime('now') WHERE id = ? AND status = 'pending'")
    .run(referralId);
  return findById(referralId);
}

function markRewarded(referralId) {
  getDb()
    .prepare("UPDATE referrals SET status = 'rewarded' WHERE id = ?")
    .run(referralId);
  return findById(referralId);
}

function logEvent(referralId, eventType, metadata = null) {
  getDb()
    .prepare('INSERT INTO referral_events (referral_id, event_type, metadata) VALUES (?, ?, ?)')
    .run(referralId, eventType, metadata ? JSON.stringify(metadata) : null);
}

module.exports = {
  createReferral,
  findById,
  findByRefereeId,
  getReferrerStats,
  activateReferral,
  markRewarded,
  logEvent,
};
