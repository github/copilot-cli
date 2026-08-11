import { z } from 'zod';

// ─── User ────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  referralCode: z.string().length(8).optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  referralCode: string;
  credits: number;
  level: UserLevel;
  createdAt: string;
}

export type UserLevel = 'bronze' | 'silver' | 'gold';

// ─── Session ─────────────────────────────────────────────────────────────────

export const StartSessionSchema = z.object({
  clientVersion: z.string().optional(),
});
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

export const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
  commandsCount: z.number().int().min(0),
});
export type EndSessionInput = z.infer<typeof EndSessionSchema>;

// ─── Referral ────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'active' | 'rewarded' | 'fraud';

export interface ReferralStats {
  code: string;
  link: string;
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  referrals: ReferralEntry[];
}

export interface ReferralEntry {
  id: string;
  refereeUsername: string;
  status: ReferralStatus;
  createdAt: string;
}

// ─── Reward ──────────────────────────────────────────────────────────────────

export type RewardType =
  | 'referral_active'
  | 'referral_onboarding'
  | 'milestone'
  | 'manual';

export interface Reward {
  id: string;
  type: RewardType;
  amount: number;
  source: string;
  createdAt: string;
}

export interface RewardRule {
  id: string;
  name: string;
  trigger: string;
  credits: number;
  active: boolean;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface UserStats {
  totalSessions: number;
  totalCommands: number;
  totalCredits: number;
  level: UserLevel;
  joinedAt: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Auth tokens ─────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
