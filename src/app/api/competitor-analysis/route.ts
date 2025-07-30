import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Activity type keywords for matching
const ACTIVITY_TYPE_KEYWORDS = {
  'walking tour': ['walking tour', 'walking', 'foot tour', 'guided walk'],
  'food tour': ['food tour', 'culinary tour', 'gastronomy', 'wine tour', 'beer tour'],
  'museum': ['museum', 'gallery', 'exhibition'],
  'castle': ['castle', 'palace', 'fortress'],
  'river cruise': ['river cruise', 'boat tour', 'canal cruise', 'water tour'],
  'day trip': ['day trip', 'day tour', 'excursion'],
  'private tour': ['private tour', 'private guide'],
  'hop on hop off': ['hop on hop off', 'hop-on', 'bus tour'],
  'adventure': ['adventure', 'hiking', 'climbing', 'outdoor'],
  'cultural': ['cultural', 'heritage', 'historical'],
  'entertainment': ['entertainment', 'show', 'theater', 'concert'],
  'transport': ['transfer', 'airport transfer', 'transportation']
};

// Function to extract activity type from activity name
function extractActivityType(activityName: string): string {
  const nameLower = activityName.toLowerCase();
  
  for (const [type, keywords] of Object.entries(ACTIVITY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return type;
      }
    }
  }
  
  return 'general'; // Default category
}

// Function to calculate competitive metrics
function calculateCompetitiveMetrics(userActivities: any[], competitors: any[]) {
  const metrics = {
    totalCompetitors: competitors.length,
    userActivities: userActivities.length,
    priceAnalysis: {
      userAveragePrice: 0,
      marketAveragePrice: 0,
      pricePositioning: 'competitive' as 'premium' | 'competitive' | 'budget',
      priceGap: 0
    },
    ratingAnalysis: {
      userAverageRating: 0,
      marketAverageRating: 0,
      ratingPositioning: 'average' as 'high' | 'average' | 'low',
      ratingGap: 0
    },
    marketShare: 0,
    opportunities: [] as string[],
    threats: [] as string[]
  };

  // Calculate user averages
  const userPrices = userActivities.filter(a => a.priceNumeric).map(a => a.priceNumeric);
  const userRatings = userActivities.filter(a => a.ratingNumeric).map(a => a.ratingNumeric);
  
  metrics.priceAnalysis.userAveragePrice = userPrices.length > 0 
    ? userPrices.reduce((a, b) => a + b, 0) / userPrices.length 
    : 0;
  
  metrics.ratingAnalysis.userAverageRating = userRatings.length > 0 
    ? userRatings.reduce((a, b) => a + b, 0) / userRatings.length 
    : 0;

  // Calculate market averages
  const marketPrices = competitors.filter(a => a.priceNumeric).map(a => a.priceNumeric);
  const marketRatings = competitors.filter(a => a.ratingNumeric).map(a => a.ratingNumeric);
  
  metrics.priceAnalysis.marketAveragePrice = marketPrices.length > 0 
    ? marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length 
    : 0;
  
  metrics.ratingAnalysis.marketAverageRating = marketRatings.length > 0 
    ? marketRatings.reduce((a, b) => a + b, 0) / marketRatings.length 
    : 0;

  // Calculate positioning
  if (metrics.priceAnalysis.userAveragePrice > 0 && metrics.priceAnalysis.marketAveragePrice > 0) {
    const priceDiff = ((metrics.priceAnalysis.userAveragePrice - metrics.priceAnalysis.marketAveragePrice) / metrics.priceAnalysis.marketAveragePrice) * 100;
    metrics.priceAnalysis.priceGap = priceDiff;
    
    if (priceDiff > 20) metrics.priceAnalysis.pricePositioning = 'premium';
    else if (priceDiff < -20) metrics.priceAnalysis.pricePositioning = 'budget';
    else metrics.priceAnalysis.pricePositioning = 'competitive';
  }

  if (metrics.ratingAnalysis.userAverageRating > 0 && metrics.ratingAnalysis.marketAverageRating > 0) {
    const ratingDiff = ((metrics.ratingAnalysis.userAverageRating - metrics.ratingAnalysis.marketAverageRating) / metrics.ratingAnalysis.marketAverageRating) * 100;
    metrics.ratingAnalysis.ratingGap = ratingDiff;
    
    if (ratingDiff > 10) metrics.ratingAnalysis.ratingPositioning = 'high';
    else if (ratingDiff < -10) metrics.ratingAnalysis.ratingPositioning = 'low';
    else metrics.ratingAnalysis.ratingPositioning = 'average';
  }

  // Calculate market share
  const totalActivities = userActivities.length + competitors.length;
  metrics.marketShare = totalActivities > 0 ? (userActivities.length / totalActivities) * 100 : 0;

  // Generate insights
  if (metrics.priceAnalysis.pricePositioning === 'premium' && metrics.ratingAnalysis.ratingPositioning === 'high') {
    metrics.opportunities.push('Premium positioning with high ratings - consider expanding premium offerings');
  } else if (metrics.priceAnalysis.pricePositioning === 'budget' && metrics.ratingAnalysis.ratingPositioning === 'low') {
    metrics.threats.push('Low price and low rating positioning - consider quality improvements');
  } else if (metrics.priceAnalysis.pricePositioning === 'premium' && metrics.ratingAnalysis.ratingPositioning === 'low') {
    metrics.threats.push('Premium pricing with low ratings - urgent need for quality improvement');
  } else if (metrics.priceAnalysis.pricePositioning === 'budget' && metrics.ratingAnalysis.ratingPositioning === 'high') {
    metrics.opportunities.push('High value proposition - consider gradual price increases');
  }

  if (metrics.marketShare < 5) {
    metrics.opportunities.push('Low market share - opportunity for expansion');
  } else if (metrics.marketShare > 20) {
    metrics.threats.push('High market share - risk of market saturation');
  }

  return metrics;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    // Get user's linked providers
    const userProducts = await prisma.userProduct.findMany({
      where: { userId },
      select: {
        id: true,
        providerName: true,
        city: true,
        region: true
      }
    });

    if (userProducts.length === 0) {
      return NextResponse.json({
        error: 'No linked providers found',
        competitors: [],
        analysis: null
      });
    }

    const competitorAnalysis = [];

    // Analyze each user provider
    for (const userProduct of userProducts) {
      // Get user's activities in this city
      const userActivities = await prisma.cleanedActivity.findMany({
        where: {
          providerName: userProduct.providerName,
          city: { not: 'Unknown' }
        },
        select: {
          id: true,
          activityName: true,
          providerName: true,
          city: true,
          priceNumeric: true,
          ratingNumeric: true,
          reviewCountNumeric: true,
          platform: true
        }
      });

      if (userActivities.length === 0) continue;

      // Group user activities by city and activity type
      const userActivityGroups = new Map<string, any[]>();
      
      userActivities.forEach(activity => {
        const activityType = extractActivityType(activity.activityName);
        const key = `${activity.city}-${activityType}`;
        
        if (!userActivityGroups.has(key)) {
          userActivityGroups.set(key, []);
        }
        userActivityGroups.get(key)!.push(activity);
      });

      // Analyze each city-activity type combination
      for (const [cityActivityKey, userActivitiesInGroup] of Array.from(userActivityGroups.entries())) {
        const [city, activityType] = cityActivityKey.split('-');
        
        // Find competitors in the same city and activity type
        const competitors = await prisma.cleanedActivity.findMany({
          where: {
            city: city,
            providerName: { not: userProduct.providerName },
            activityName: {
              contains: ACTIVITY_TYPE_KEYWORDS[activityType as keyof typeof ACTIVITY_TYPE_KEYWORDS]?.[0] || '',
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            activityName: true,
            providerName: true,
            city: true,
            priceNumeric: true,
            ratingNumeric: true,
            reviewCountNumeric: true,
            platform: true
          },
          take: 50 // Limit to top 50 competitors
        });

        if (competitors.length === 0) continue;

        // Calculate competitive metrics
        const metrics = calculateCompetitiveMetrics(userActivitiesInGroup, competitors);

        competitorAnalysis.push({
          city,
          activityType,
          providerName: userProduct.providerName,
          userActivities: userActivitiesInGroup.length,
          competitors: competitors.length,
          metrics,
          topCompetitors: competitors
            .sort((a, b) => (b.ratingNumeric || 0) - (a.ratingNumeric || 0))
            .slice(0, 5)
            .map(c => ({
              providerName: c.providerName,
              activityName: c.activityName,
              price: c.priceNumeric,
              rating: c.ratingNumeric,
              reviews: c.reviewCountNumeric,
              platform: c.platform
            }))
        });
      }
    }

    // Calculate overall competitive summary
    const overallSummary = {
      totalCities: new Set(competitorAnalysis.map(c => c.city)).size,
      totalActivityTypes: new Set(competitorAnalysis.map(c => c.activityType)).size,
      averageMarketShare: competitorAnalysis.length > 0 
        ? competitorAnalysis.reduce((sum, c) => sum + c.metrics.marketShare, 0) / competitorAnalysis.length 
        : 0,
      averagePricePositioning: competitorAnalysis.length > 0 
        ? competitorAnalysis.reduce((sum, c) => sum + (c.metrics.priceAnalysis.priceGap || 0), 0) / competitorAnalysis.length 
        : 0,
      averageRatingPositioning: competitorAnalysis.length > 0 
        ? competitorAnalysis.reduce((sum, c) => sum + (c.metrics.ratingAnalysis.ratingGap || 0), 0) / competitorAnalysis.length 
        : 0
    };

    return NextResponse.json({
      competitorAnalysis,
      overallSummary,
      totalAnalyses: competitorAnalysis.length
    });

  } catch (error) {
    console.error('Error in competitor analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze competitors' },
      { status: 500 }
    );
  }
} 