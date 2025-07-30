"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
exports.requireAuth = requireAuth;
exports.requireTier = requireTier;
exports.checkAiUsageLimit = checkAiUsageLimit;
exports.incrementAiUsage = incrementAiUsage;
const server_1 = require("next/server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function authenticateUser(request) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user || user.subscriptionStatus !== 'active') {
            return null;
        }
        return {
            userId: user.id,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            city: user.city || undefined,
            country: user.country || undefined,
        };
    }
    catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}
function requireAuth(handler) {
    return async (request) => {
        const user = await authenticateUser(request);
        if (!user) {
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return handler(request, user);
    };
}
function requireTier(minTier) {
    return (handler) => {
        return requireAuth(async (request, user) => {
            const tierOrder = { free: 0, registered: 1, premium: 2 };
            const userTierLevel = tierOrder[user.subscriptionTier] || 0;
            const requiredTierLevel = tierOrder[minTier] || 0;
            if (userTierLevel < requiredTierLevel) {
                return server_1.NextResponse.json({ error: `Subscription tier ${minTier} or higher required` }, { status: 403 });
            }
            return handler(request, user);
        });
    };
}
async function checkAiUsageLimit(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return { allowed: false, remaining: 0 };
        }
        // Reset daily usage if it's a new day
        const today = new Date().toDateString();
        const lastRequestDate = user.lastAiRequestDate?.toDateString();
        if (lastRequestDate !== today) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    aiRequestsToday: 0,
                    lastAiRequestDate: new Date()
                }
            });
            return { allowed: true, remaining: user.aiRequestsLimit };
        }
        const remaining = user.aiRequestsLimit - user.aiRequestsToday;
        return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
    }
    catch (error) {
        console.error('Error checking AI usage limit:', error);
        return { allowed: false, remaining: 0 };
    }
}
async function incrementAiUsage(userId) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                aiRequestsToday: { increment: 1 },
                lastAiRequestDate: new Date()
            }
        });
    }
    catch (error) {
        console.error('Error incrementing AI usage:', error);
    }
}
//# sourceMappingURL=auth.js.map