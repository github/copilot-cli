'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const UserModel = require('../models/user');
const ReferralModel = require('../models/referral');
const RewardModel   = require('../models/reward');
const { signToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { email, username, password, referral_code? }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, referral_code } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check for duplicate email
    if (UserModel.findByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Resolve referrer (silent ignore if code is invalid)
    let referrer = null;
    if (referral_code) {
      referrer = UserModel.findByReferralCode(referral_code);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const newUser = UserModel.createUser({
      email,
      username,
      password_hash,
      referred_by_user_id: referrer ? referrer.id : null,
    });

    // Create referral record and grant welcome bonus
    if (referrer && referrer.id !== newUser.id) {
      try {
        const referral = ReferralModel.createReferral(referrer.id, newUser.id);
        ReferralModel.logEvent(referral.id, 'signup');
        RewardModel.grantWelcomeBonus(newUser.id);
      } catch (e) {
        // SELF_REFERRAL or DB unique violation — silently skip
      }
    }

    const token = signToken({ id: newUser.id, email: newUser.email });
    return res.status(201).json({ token, user: newUser });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email });
    const safeUser = UserModel.findById(user.id);
    return res.json({ token, user: safeUser });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
