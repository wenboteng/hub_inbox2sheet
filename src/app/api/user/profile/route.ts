import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, checkAiUsageLimit } from '../../../../lib/auth';

const prisma = new PrismaClient();

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Get user data with usage statistics
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        city: true,
        country: true,
        aiRequestsToday: true,
        aiRequestsLimit: true,
        lastAiRequestDate: true,
        preferredPlatforms: true,
        interests: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get usage statistics
    const usageStats = await prisma.userInteraction.groupBy({
      by: ['action'],
      where: { userId: user.userId },
      _count: {
        action: true
      }
    });

    // Get saved questions count
    const savedQuestionsCount = await prisma.savedQuestion.count({
      where: { userId: user.userId }
    });

    // Check AI usage limits
    const aiUsage = await checkAiUsageLimit(user.userId);

    const response = {
      user: {
        ...userData,
        aiUsage
      },
      stats: {
        totalInteractions: usageStats.reduce((sum, stat) => sum + stat._count.action, 0),
        questionsViewed: usageStats.find(s => s.action === 'view')?._count.action || 0,
        aiRequestsUsed: usageStats.find(s => s.action.includes('ai'))?._count.action || 0,
        savedQuestions: savedQuestionsCount
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}); 