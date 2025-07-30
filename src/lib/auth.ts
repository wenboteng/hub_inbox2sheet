import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  userId: string;
  email: string;
  subscriptionTier: string;
  city?: string;
  country?: string;
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
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
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function requireAuth(handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const user = await authenticateUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

export function requireTier(minTier: string) {
  return (handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) => {
    return requireAuth(async (request: NextRequest, user: AuthenticatedUser) => {
      const tierOrder = { free: 0, registered: 1, premium: 2 };
      const userTierLevel = tierOrder[user.subscriptionTier as keyof typeof tierOrder] || 0;
      const requiredTierLevel = tierOrder[minTier as keyof typeof tierOrder] || 0;

      if (userTierLevel < requiredTierLevel) {
        return NextResponse.json(
          { error: `Subscription tier ${minTier} or higher required` },
          { status: 403 }
        );
      }

      return handler(request, user);
    });
  };
}

export async function checkAiUsageLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
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
  } catch (error) {
    console.error('Error checking AI usage limit:', error);
    return { allowed: false, remaining: 0 };
  }
}

export async function incrementAiUsage(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiRequestsToday: { increment: 1 },
        lastAiRequestDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error incrementing AI usage:', error);
  }
} 