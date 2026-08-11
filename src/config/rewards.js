'use strict';

/**
 * Evodron Referral Program — Rewards Configuration
 *
 * All reward values and conditions are defined here so that they can be
 * changed without touching business-logic code.
 *
 * IMPORTANT: No financial reward is issued automatically. The reward_type
 * must be explicitly set to a non-financial type. A future operator may
 * add a 'financial' type only after ensuring compliance with applicable
 * laws and platform policies.
 */

const REWARD_TYPES = {
  CREDIT_EVODRON: 'credit_evodron',
  FEATURE_UNLOCK: 'feature_unlock',
  DISCOUNT:       'discount',
  SUBSCRIPTION:   'subscription',
  CUSTOM:         'custom',
};

/**
 * Reward granted to the new user (referee) upon completing registration
 * via a referral link.
 */
const WELCOME_BONUS = {
  enabled:     true,
  reward_type: REWARD_TYPES.CREDIT_EVODRON,
  amount:      10,   // 10 Evodron credits
  reason:      'welcome_bonus',
};

/**
 * Reward granted to the referrer once the referee reaches the activation
 * condition defined in ACTIVATION_CONDITION below.
 */
const REFERRER_REWARD = {
  enabled:     true,
  reward_type: REWARD_TYPES.CREDIT_EVODRON,
  amount:      20,   // 20 Evodron credits
  reason:      'referral_activation',
};

/**
 * Condition that must be met by the referee before the referrer reward
 * is unlocked. Supported values:
 *   'first_use'  — referee must call POST /api/referral/activate-use once
 *                  (triggered by the application after a meaningful action)
 */
const ACTIVATION_CONDITION = 'first_use';

module.exports = {
  REWARD_TYPES,
  WELCOME_BONUS,
  REFERRER_REWARD,
  ACTIVATION_CONDITION,
};
