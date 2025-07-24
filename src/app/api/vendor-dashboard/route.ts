import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VendorDashboardData {
  activities: Activity[];
  marketInsights: MarketInsights;
  topCompetitors: TopCompetitor[];
  otaDistribution: OTADistribution;
  pricingDistribution: PricingDistribution;
  totalCount: number;
}

interface Activity {
  id: string;
  activityName: string;
  providerName: string;
  rating: number | null;
  reviewCount: number | null;
  price: number | null;
  priceText: string | null;
  priceCurrency: string | null;
  platform: string;
  url: string | null;
  duration: string | null;
  venue: string | null;
  tags: string[];
  qualityScore: number | null;
}

interface MarketInsights {
  totalCompetitors: number;
  averagePrice: number;
  averageRating: number;
  priceRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  marketSaturation: 'low' | 'medium' | 'high';
  pricingOpportunity: 'undervalued' | 'competitive' | 'premium';
}

interface TopCompetitor {
  providerName: string;
  activityCount: number;
  averageRating: number;
  averagePrice: number;
  totalReviews: number;
}

interface OTADistribution {
  getyourguide: number;
  viator: number;
  airbnb: number;
  booking: number;
  total: number;
}

interface PricingDistribution {
  budget: number; // €0-25
  midRange: number; // €26-75
  premium: number; // €76-150
  luxury: number; // €151-300
  ultraLuxury: number; // €300+
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    // Build where clause for city filtering
    const whereClause: any = {
      OR: [
        { city: { contains: city, mode: 'insensitive' } },
        { location: { contains: city, mode: 'insensitive' } },
        { activityName: { contains: city, mode: 'insensitive' } },
        { venue: { contains: city, mode: 'insensitive' } }
      ]
    };

    // Add category filter if specified
    if (category && category !== 'all') {
      whereClause.tags = {
        hasSome: [category]
      };
    }

    // Get activities
    const activities = await prisma.importedGYGActivity.findMany({
      where: whereClause,
      select: {
        id: true,
        activityName: true,
        providerName: true,
        ratingNumeric: true,
        reviewCountNumeric: true,
        priceNumeric: true,
        priceText: true,
        priceCurrency: true,
        url: true,
        duration: true,
        venue: true,
        tags: true,
        qualityScore: true,
        location: true,
        city: true
      },
      orderBy: [
        { ratingNumeric: 'desc' },
        { reviewCountNumeric: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.importedGYGActivity.count({
      where: whereClause
    });

    // Get all activities for analytics (without pagination)
    const allActivities = await prisma.importedGYGActivity.findMany({
      where: whereClause,
      select: {
        providerName: true,
        ratingNumeric: true,
        reviewCountNumeric: true,
        priceNumeric: true,
        priceText: true,
        tags: true
      }
    });

    // Calculate market insights
    const validPrices = allActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const validRatings = allActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);

    const averagePrice = validPrices.length > 0 
      ? validPrices.reduce((sum, a) => sum + a.priceNumeric!, 0) / validPrices.length 
      : 0;

    const averageRating = validRatings.length > 0 
      ? validRatings.reduce((sum, a) => sum + a.ratingNumeric!, 0) / validRatings.length 
      : 0;

    const priceRange = {
      min: validPrices.length > 0 ? Math.min(...validPrices.map(a => a.priceNumeric!)) : 0,
      max: validPrices.length > 0 ? Math.max(...validPrices.map(a => a.priceNumeric!)) : 0
    };

    const ratingRange = {
      min: validRatings.length > 0 ? Math.min(...validRatings.map(a => a.ratingNumeric!)) : 0,
      max: validRatings.length > 0 ? Math.max(...validRatings.map(a => a.ratingNumeric!)) : 0
    };

    // Determine market saturation
    let marketSaturation: 'low' | 'medium' | 'high' = 'low';
    if (allActivities.length > 100) marketSaturation = 'high';
    else if (allActivities.length > 50) marketSaturation = 'medium';

    // Determine pricing opportunity
    let pricingOpportunity: 'undervalued' | 'competitive' | 'premium' = 'competitive';
    if (averagePrice < 50) pricingOpportunity = 'undervalued';
    else if (averagePrice > 150) pricingOpportunity = 'premium';

    // Calculate top competitors
    const providerStats = new Map<string, {
      activityCount: number;
      totalRating: number;
      totalPrice: number;
      totalReviews: number;
      ratingCount: number;
      priceCount: number;
    }>();

    allActivities.forEach(activity => {
      const provider = activity.providerName || 'Unknown';
      const stats = providerStats.get(provider) || {
        activityCount: 0,
        totalRating: 0,
        totalPrice: 0,
        totalReviews: 0,
        ratingCount: 0,
        priceCount: 0
      };

      stats.activityCount++;
      if (activity.ratingNumeric) {
        stats.totalRating += activity.ratingNumeric;
        stats.ratingCount++;
      }
      if (activity.priceNumeric) {
        stats.totalPrice += activity.priceNumeric;
        stats.priceCount++;
      }
      if (activity.reviewCountNumeric) {
        stats.totalReviews += activity.reviewCountNumeric;
      }

      providerStats.set(provider, stats);
    });

    const topCompetitors: TopCompetitor[] = Array.from(providerStats.entries())
      .map(([providerName, stats]) => ({
        providerName,
        activityCount: stats.activityCount,
        averageRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0,
        averagePrice: stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : 0,
        totalReviews: stats.totalReviews
      }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 5);

    // Calculate OTA distribution (simplified - all from GYG for now)
    const otaDistribution: OTADistribution = {
      getyourguide: allActivities.length,
      viator: 0,
      airbnb: 0,
      booking: 0,
      total: allActivities.length
    };

    // Calculate pricing distribution
    const pricingDistribution: PricingDistribution = {
      budget: validPrices.filter(p => p.priceNumeric! <= 25).length,
      midRange: validPrices.filter(p => p.priceNumeric! > 25 && p.priceNumeric! <= 75).length,
      premium: validPrices.filter(p => p.priceNumeric! > 75 && p.priceNumeric! <= 150).length,
      luxury: validPrices.filter(p => p.priceNumeric! > 150 && p.priceNumeric! <= 300).length,
      ultraLuxury: validPrices.filter(p => p.priceNumeric! > 300).length
    };

    // Transform activities for response
    const transformedActivities: Activity[] = activities.map(activity => ({
      id: activity.id,
      activityName: activity.activityName,
      providerName: activity.providerName,
      rating: activity.ratingNumeric,
      reviewCount: activity.reviewCountNumeric,
      price: activity.priceNumeric,
      priceText: activity.priceText,
      priceCurrency: activity.priceCurrency,
      platform: 'GetYourGuide', // For now, all from GYG
      url: activity.url,
      duration: activity.duration,
      venue: activity.venue,
      tags: activity.tags || [],
      qualityScore: activity.qualityScore
    }));

    const marketInsights: MarketInsights = {
      totalCompetitors: allActivities.length,
      averagePrice,
      averageRating,
      priceRange,
      ratingRange,
      marketSaturation,
      pricingOpportunity
    };

    const response: VendorDashboardData = {
      activities: transformedActivities,
      marketInsights,
      topCompetitors,
      otaDistribution,
      pricingDistribution,
      totalCount
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[VENDOR-DASHBOARD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor dashboard data' },
      { status: 500 }
    );
  }
} 