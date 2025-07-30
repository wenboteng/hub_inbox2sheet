import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../lib/auth';

const prisma = new PrismaClient();

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || '';
    const category = searchParams.get('category') || '';

    // Only premium users can access market insights
    if (user.subscriptionTier !== 'premium') {
      return NextResponse.json(
        { error: 'Premium subscription required for market insights' },
        { status: 403 }
      );
    }

    // Build query for GetYourGuide activities
    const whereClause: any = {
      country: 'UK'
    };

    if (city) {
      whereClause.city = { contains: city, mode: 'insensitive' };
    }

    if (category) {
      whereClause.tags = { has: category };
    }

    // Get market data from GetYourGuide activities
    const activities = await prisma.importedGYGActivity.findMany({
      where: whereClause,
      select: {
        priceNumeric: true,
        ratingNumeric: true,
        reviewCountNumeric: true,
        providerName: true,
        activityName: true,
        city: true,
        tags: true
      }
    });

    if (activities.length === 0) {
      return NextResponse.json({
        insights: {
          totalCompetitors: 0,
          averagePrice: 0,
          averageRating: 0,
          marketSaturation: 'low',
          pricingOpportunity: 'competitive',
          topProviders: [],
          priceRange: { min: 0, max: 0 },
          ratingRange: { min: 0, max: 0 }
        }
      });
    }

    // Calculate market insights
    const validPrices = activities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const validRatings = activities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);

    const averagePrice = validPrices.length > 0 
      ? validPrices.reduce((sum, a) => sum + (a.priceNumeric || 0), 0) / validPrices.length 
      : 0;

    const averageRating = validRatings.length > 0 
      ? validRatings.reduce((sum, a) => sum + (a.ratingNumeric || 0), 0) / validRatings.length 
      : 0;

    // Determine market saturation
    let marketSaturation: 'low' | 'medium' | 'high' = 'low';
    if (activities.length > 100) marketSaturation = 'high';
    else if (activities.length > 50) marketSaturation = 'medium';

    // Determine pricing opportunity
    let pricingOpportunity: 'undervalued' | 'competitive' | 'premium' = 'competitive';
    if (averagePrice < 50) pricingOpportunity = 'undervalued';
    else if (averagePrice > 150) pricingOpportunity = 'premium';

    // Get top providers
    const providerStats = activities.reduce((acc, activity) => {
      const provider = activity.providerName;
      if (!acc[provider]) {
        acc[provider] = {
          name: provider,
          activityCount: 0,
          averageRating: 0,
          averagePrice: 0,
          totalReviews: 0
        };
      }
      
      acc[provider].activityCount++;
      if (activity.ratingNumeric) {
        acc[provider].averageRating += activity.ratingNumeric;
      }
      if (activity.priceNumeric) {
        acc[provider].averagePrice += activity.priceNumeric;
      }
      if (activity.reviewCountNumeric) {
        acc[provider].totalReviews += activity.reviewCountNumeric;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for providers
    Object.values(providerStats).forEach((provider: any) => {
      if (provider.activityCount > 0) {
        provider.averageRating = provider.averageRating / provider.activityCount;
        provider.averagePrice = provider.averagePrice / provider.activityCount;
      }
    });

    const topProviders = Object.values(providerStats)
      .sort((a: any, b: any) => b.activityCount - a.activityCount)
      .slice(0, 5);

    // Calculate price and rating ranges
    const prices = validPrices.map(a => a.priceNumeric || 0);
    const ratings = validRatings.map(a => a.ratingNumeric || 0);

    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };

    const ratingRange = {
      min: Math.min(...ratings),
      max: Math.max(...ratings)
    };

    const insights = {
      totalCompetitors: activities.length,
      averagePrice: Math.round(averagePrice * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      marketSaturation,
      pricingOpportunity,
      topProviders,
      priceRange,
      ratingRange,
      city: city || 'UK',
      category: category || 'All'
    };

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error fetching market insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market insights' },
      { status: 500 }
    );
  }
}); 