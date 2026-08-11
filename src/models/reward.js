'use strict';

const { getDb } = require('../db/database');
const { WELCOME_BONUS, REFERRER_REWARD } = require('../config/rewards');

function grantWelcomeBonus(userId) {
  if (!WELCOME_BONUS.enabled) return null;
  return _createReward({
    user_id:     userId,
    reward_type: WELCOME_BONUS.reward_type,
    amount:      WELCOME_BONUS.amount,
    reason:      WELCOME_BONUS.reason,
  });
}

function grantReferrerReward(referrerId) {
  if (!REFERRER_REWARD.enabled) return null;
  return _createReward({
    user_id:     referrerId,
    reward_type: REFERRER_REWARD.reward_type,
    amount:      REFERRER_REWARD.amount,
    reason:      REFERRER_REWARD.reason,
  });
}

function _createReward({ user_id, reward_type, amount, reason }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO rewards (user_id, reward_type, amount, reason)
    VALUES (?, ?, ?, ?)
  `).run(user_id, reward_type, amount, reason);

  return db.prepare('SELECT * FROM rewards WHERE id = ?').get(result.lastInsertRowid);
}

function getRewardsForUser(userId) {
  return getDb()
    .prepare("SELECT * FROM rewards WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId);
}

function getAvailableRewards(userId) {
  return getDb()
    .prepare("SELECT * FROM rewards WHERE user_id = ? AND status = 'available' ORDER BY created_at DESC")
    .all(userId);
}

function claimReward(rewardId, userId) {
  const db = getDb();
  const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND user_id = ?').get(rewardId, userId);
  if (!reward) throw new Error('REWARD_NOT_FOUND');
  if (reward.status !== 'available') throw new Error('REWARD_NOT_AVAILABLE');

  db.prepare("UPDATE rewards SET status = 'claimed', claimed_at = datetime('now') WHERE id = ?").run(rewardId);
  return db.prepare('SELECT * FROM rewards WHERE id = ?').get(rewardId);
}

module.exports = { grantWelcomeBonus, grantReferrerReward, getRewardsForUser, getAvailableRewards, claimReward };
