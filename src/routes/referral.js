'use strict';

const express       = require('express');
const UserModel     = require('../models/user');
const ReferralModel = require('../models/referral');
const RewardModel   = require('../models/reward');
const { requireAuth } = require('../middleware/auth');
const { ACTIVATION_CONDITION, REFERRER_REWARD, WELCOME_BONUS, REWARD_TYPES } = require('../config/rewards');

const router = express.Router();

/**
 * GET /api/referral/link
 * Returns the authenticated user's referral link and code.
 */
router.get('/link', requireAuth, (req, res) => {
  const user = UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const link = `${base}/register?ref=${user.referral_code}`;

  return res.json({ referral_code: user.referral_code, referral_link: link });
});

/**
 * GET /api/referral/stats
 * Returns referral statistics for the authenticated user.
 */
router.get('/stats', requireAuth, (req, res) => {
  const stats = ReferralModel.getReferrerStats(req.user.id);
  return res.json(stats);
});

/**
 * GET /api/referral/rewards
 * Returns all rewards for the authenticated user.
 */
router.get('/rewards', requireAuth, (req, res) => {
  const all       = RewardModel.getRewardsForUser(req.user.id);
  const available = RewardModel.getAvailableRewards(req.user.id);
  return res.json({ available, history: all });
});

/**
 * POST /api/referral/claim-reward/:rewardId
 * Claim an available reward.
 */
router.post('/claim-reward/:rewardId', requireAuth, (req, res) => {
  try {
    const reward = RewardModel.claimReward(Number(req.params.rewardId), req.user.id);
    return res.json({ reward });
  } catch (e) {
    if (e.message === 'REWARD_NOT_FOUND')      return res.status(404).json({ error: 'Reward not found' });
    if (e.message === 'REWARD_NOT_AVAILABLE')  return res.status(409).json({ error: 'Reward already claimed or expired' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/referral/activate-use
 * Called by the application when the authenticated user completes their
 * first meaningful action. Triggers the referrer reward if applicable.
 *
 * This endpoint is idempotent: calling it multiple times has no effect
 * once the user is already active.
 */
router.post('/activate-use', requireAuth, (req, res) => {
  const user = UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Already active — nothing to do
  if (user.is_active) {
    return res.json({ already_active: true });
  }

  UserModel.markActive(user.id);

  // Check if this user was referred
  const referral = ReferralModel.findByRefereeId(user.id);
  if (referral && referral.status === 'pending') {
    ReferralModel.activateReferral(referral.id);
    ReferralModel.logEvent(referral.id, 'first_use');

    // Grant referrer reward
    const reward = RewardModel.grantReferrerReward(referral.referrer_id);
    if (reward) {
      ReferralModel.logEvent(referral.id, 'reward_granted', { reward_id: reward.id });
      ReferralModel.markRewarded(referral.id);
    }
  }

  return res.json({ activated: true });
});

/**
 * GET /api/referral/program-info
 * Returns the current program conditions (public, no auth required).
 */
router.get('/program-info', (req, res) => {
  return res.json({
    welcome_bonus: WELCOME_BONUS.enabled
      ? { type: WELCOME_BONUS.reward_type, amount: WELCOME_BONUS.amount }
      : null,
    referrer_reward: REFERRER_REWARD.enabled
      ? { type: REFERRER_REWARD.reward_type, amount: REFERRER_REWARD.amount }
      : null,
    activation_condition: ACTIVATION_CONDITION,
    reward_types: Object.values(REWARD_TYPES),
    conditions: [
      'Un utilisateur ne peut parrainer qu\'un ami qu\'une seule fois.',
      'L\'auto-parrainage est interdit.',
      'La récompense du parrain est créditée uniquement après la première utilisation active du filleul.',
      'Les récompenses ne sont pas de l\'argent réel et sont soumises aux conditions générales Evodron.',
    ],
  });
});

module.exports = router;
