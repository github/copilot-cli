import { z } from 'zod';
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    referralCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    password: string;
    referralCode?: string | undefined;
}, {
    email: string;
    username: string;
    password: string;
    referralCode?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
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
export declare const StartSessionSchema: z.ZodObject<{
    clientVersion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    clientVersion?: string | undefined;
}, {
    clientVersion?: string | undefined;
}>;
export type StartSessionInput = z.infer<typeof StartSessionSchema>;
export declare const EndSessionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    commandsCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    commandsCount: number;
}, {
    sessionId: string;
    commandsCount: number;
}>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;
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
export type RewardType = 'referral_active' | 'referral_onboarding' | 'milestone' | 'manual';
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
export interface UserStats {
    totalSessions: number;
    totalCommands: number;
    totalCredits: number;
    level: UserLevel;
    joinedAt: string;
}
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
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
