import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Subscription tier configurations
const SUBSCRIPTION_TIERS = {
  free: {
    aiRequestsLimit: 5,
    features: ['basic_faq', 'limited_ai_summary', 'public_reports']
  },
  registered: {
    aiRequestsLimit: 25,
    features: ['basic_faq', 'enhanced_ai_summary', 'public_reports', 'saved_questions', 'usage_analytics']
  },
  premium: {
    aiRequestsLimit: 100,
    features: ['basic_faq', 'enhanced_ai_summary', 'public_reports', 'saved_questions', 'usage_analytics', 'uk_market_dashboard', 'custom_reports', 'priority_support']
  }
};

export async function POST(request: NextRequest) {
  try {
    const { userId, newTier, city, country = 'UK' } = await request.json();

    // Validate required fields
    if (!userId || !newTier) {
      return NextResponse.json(
        { error: 'User ID and new tier are required' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!SUBSCRIPTION_TIERS[newTier as keyof typeof SUBSCRIPTION_TIERS]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // For premium tier, validate UK market access
    if (newTier === 'premium' && country !== 'UK') {
      return NextResponse.json(
        { error: 'Premium tier is only available for UK market' },
        { status: 400 }
      );
    }

    // Update user subscription
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: newTier,
        subscriptionStatus: 'active',
        aiRequestsLimit: SUBSCRIPTION_TIERS[newTier as keyof typeof SUBSCRIPTION_TIERS].aiRequestsLimit,
        aiRequestsToday: 0, // Reset daily usage
        city: city || user.city,
        country: country || user.country,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      user: userWithoutPassword,
      features: SUBSCRIPTION_TIERS[newTier as keyof typeof SUBSCRIPTION_TIERS].features,
      message: `Successfully upgraded to ${newTier} tier`
    });
  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
} 