import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const platform = searchParams.get('platform') || ''; // 'gyg', 'viator', or empty for all
    const region = searchParams.get('region') || ''; // 'UK', 'Europe', or empty for all
    const search = searchParams.get('search') || ''; // Search term for provider name

    // Build query for cleaned activities
    const whereClause: any = {};

    if (search) {
      whereClause.providerName = {
        contains: search,
        mode: 'insensitive'
      };
    } else if (city) {
      whereClause.OR = [
        { city: { contains: city, mode: 'insensitive' } },
        { location: { contains: city, mode: 'insensitive' } }
      ];
    }

    if (platform) {
      whereClause.platform = platform;
    }

    if (region) {
      whereClause.region = region;
    }

    // Get activities from cleaned table
    const activities = await prisma.cleanedActivity.findMany({
      where: whereClause,
      select: {
        id: true,
        originalId: true,
        activityName: true,
        providerName: true,
        location: true,
        city: true,
        country: true,
        region: true,
        priceText: true,
        priceNumeric: true,
        priceCurrency: true,
        ratingText: true,
        ratingNumeric: true,
        reviewCountText: true,
        reviewCountNumeric: true,
        duration: true,
        durationHours: true,
        durationDays: true,
        description: true,
        category: true,
        activityType: true,
        venue: true,
        qualityScore: true,
        platform: true,
        originalSource: true,
        url: true,
        cleanedAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { cleanedAt: 'desc' },
      take: limit
    });

    // Calculate summary statistics
    const totalActivities = activities.length;
    const activitiesWithPrices = activities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const activitiesWithRatings = activities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
    const activitiesWithReviews = activities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0);

    const averagePrice = activitiesWithPrices.length > 0 
      ? activitiesWithPrices.reduce((sum, a) => sum + (a.priceNumeric || 0), 0) / activitiesWithPrices.length 
      : 0;

    const averageRating = activitiesWithRatings.length > 0 
      ? activitiesWithRatings.reduce((sum, a) => sum + (a.ratingNumeric || 0), 0) / activitiesWithRatings.length 
      : 0;

    const totalReviews = activitiesWithReviews.reduce((sum, a) => sum + (a.reviewCountNumeric || 0), 0);

    // Get platform breakdown
    const gygActivities = activities.filter(a => a.platform === 'gyg');
    const viatorActivities = activities.filter(a => a.platform === 'viator');

    // Get currency breakdown
    const currencyBreakdown = activities.reduce((acc, activity) => {
      const currency = activity.priceCurrency || 'Unknown';
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get region breakdown
    const regionBreakdown = activities.reduce((acc, activity) => {
      const region = activity.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      totalActivities,
      gygActivities: gygActivities.length,
      viatorActivities: viatorActivities.length,
      activitiesWithPrices: activitiesWithPrices.length,
      activitiesWithRatings: activitiesWithRatings.length,
      activitiesWithReviews: activitiesWithReviews.length,
      averagePrice: Math.round(averagePrice * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      city: city || 'All',
      platform: platform || 'All',
      region: region || 'All',
      currencyBreakdown,
      regionBreakdown,
      averageQualityScore: Math.round(activities.reduce((sum, a) => sum + a.qualityScore, 0) / activities.length)
    };

    return NextResponse.json({
      activities,
      summary
    });

  } catch (error) {
    console.error('Error fetching cleaned activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cleaned activities' },
      { status: 500 }
    );
  }
} 