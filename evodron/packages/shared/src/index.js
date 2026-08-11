"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndSessionSchema = exports.StartSessionSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
// ─── User ────────────────────────────────────────────────────────────────────
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
    password: zod_1.z.string().min(8).max(128),
    referralCode: zod_1.z.string().length(8).optional(),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// ─── Session ─────────────────────────────────────────────────────────────────
exports.StartSessionSchema = zod_1.z.object({
    clientVersion: zod_1.z.string().optional(),
});
exports.EndSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    commandsCount: zod_1.z.number().int().min(0),
});
//# sourceMappingURL=index.js.map