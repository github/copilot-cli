'use strict';

const { customAlphabet } = require('nanoid');
const { getDb } = require('../db/database');

// 8-character alphanumeric referral codes (upper-case only for readability)
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function createUser({ email, username, password_hash, referred_by_user_id = null }) {
  const db   = getDb();
  const code = generateCode();

  const stmt = db.prepare(`
    INSERT INTO users (email, username, password_hash, referral_code, referred_by_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    email.toLowerCase().trim(),
    username.trim(),
    password_hash,
    code,
    referred_by_user_id
  );

  return findById(result.lastInsertRowid);
}

function findById(id) {
  return getDb()
    .prepare('SELECT id, email, username, referral_code, referred_by_user_id, is_active, created_at FROM users WHERE id = ?')
    .get(id);
}

function findByEmail(email) {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase().trim());
}

function findByReferralCode(code) {
  return getDb()
    .prepare('SELECT id, email, username, referral_code FROM users WHERE referral_code = ?')
    .get(code);
}

function markActive(userId) {
  return getDb()
    .prepare('UPDATE users SET is_active = 1 WHERE id = ?')
    .run(userId);
}

module.exports = { createUser, findById, findByEmail, findByReferralCode, markActive, generateCode };
