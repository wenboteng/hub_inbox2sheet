import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Use singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET - Fetch user products (now provider-based)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    
    // Get user's linked providers
    const userProviders = await prisma.userProduct.findMany({
      where: { 
        userId,
        isActive: true 
      },
      select: {
        id: true,
        providerName: true,
        linkedAt: true,
        linkedActivityCount: true
      },
      orderBy: { linkedAt: 'desc' }
    });

    return NextResponse.json({ userProviders });
  } catch (error) {
    console.error('Error fetching user providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user providers' },
      { status: 500 }
    );
  }
}

// POST - Link provider and all their activities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || 'demo-user';
    const providerName = body.providerName;
    
    if (!providerName) {
      return NextResponse.json(
        { error: 'Provider name is required' },
        { status: 400 }
      );
    }

    // Check if provider already exists in our cleaned database
    const providerActivities = await prisma.cleanedActivity.findMany({
      where: {
        providerName: {
          contains: providerName,
          mode: 'insensitive' // Case-insensitive search
        }
      },
      select: {
        id: true,
        activityName: true,
        providerName: true,
        location: true,
        city: true,
        country: true,
        region: true,
        priceNumeric: true,
        priceCurrency: true,
        priceText: true,
        ratingNumeric: true,
        ratingText: true,
        reviewCountNumeric: true,
        reviewCountText: true,
        category: true,
        activityType: true,
        duration: true,
        durationHours: true,
        durationDays: true,
        description: true,
        venue: true,
        platform: true,
        url: true
      }
    });

    if (providerActivities.length === 0) {
      return NextResponse.json(
        { 
          error: 'Provider not found', 
          message: `No activities found for provider "${providerName}" in our database. Please check the spelling or try a different provider name.` 
        },
        { status: 404 }
      );
    }

    // Check if provider is already linked to this user
    const existingLink = await prisma.userProduct.findFirst({
      where: {
        userId,
        providerName: {
          contains: providerName,
          mode: 'insensitive'
        },
        isActive: true
      }
    });

    if (existingLink) {
      return NextResponse.json(
        { 
          error: 'Provider already linked',
          message: `Provider "${providerName}" is already linked to your account.`
        },
        { status: 409 }
      );
    }

    // Create provider link record
    const userProvider = await prisma.userProduct.create({
      data: {
        userId,
        providerName: providerActivities[0].providerName, // Use the exact name from DB
        location: 'Multiple Locations',
        city: 'Multiple Cities',
        country: 'Multiple Countries',
        region: 'Multiple Regions',
        priceNumeric: null, // Will be calculated from linked activities
        priceCurrency: '£', // Default, will be updated
        priceText: 'Variable',
        ratingNumeric: null, // Will be calculated from linked activities
        ratingText: 'Variable',
        reviewCountNumeric: null, // Will be calculated from linked activities
        reviewCountText: 'Variable',
        category: 'multiple',
        activityType: 'multiple',
        duration: 'Variable',
        durationHours: null,
        durationDays: null,
        description: `Linked provider with ${providerActivities.length} activities`,
        venue: 'Multiple Venues',
        platform: 'multiple',
        url: null,
        linkedActivityCount: providerActivities.length,
        linkedAt: new Date()
      }
    });

    // Calculate aggregated stats from linked activities
    const stats = calculateProviderStats(providerActivities);
    
    // Update the provider record with calculated stats
    await prisma.userProduct.update({
      where: { id: userProvider.id },
      data: {
        priceNumeric: stats.averagePrice,
        priceCurrency: stats.primaryCurrency,
        priceText: `${stats.primaryCurrency}${Math.round(stats.averagePrice || 0)}`,
        ratingNumeric: stats.averageRating,
        ratingText: `${Math.round((stats.averageRating || 0) * 10) / 10}`,
        reviewCountNumeric: stats.totalReviews,
        reviewCountText: `${stats.totalReviews} total reviews`,
        region: stats.primaryRegion
      }
    });

    return NextResponse.json({ 
      userProvider: {
        ...userProvider,
        linkedActivities: providerActivities.length,
        stats
      }
    });
  } catch (error) {
    console.error('Error linking provider:', error);
    return NextResponse.json(
      { error: 'Failed to link provider' },
      { status: 500 }
    );
  }
}

// Helper function to calculate provider statistics
function calculateProviderStats(activities: any[]) {
  const prices = activities.filter(a => a.priceNumeric && a.priceNumeric > 0);
  const ratings = activities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
  const reviews = activities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0);
  
  // Currency distribution
  const currencyCounts: { [key: string]: number } = {};
  activities.forEach(a => {
    if (a.priceCurrency) {
      currencyCounts[a.priceCurrency] = (currencyCounts[a.priceCurrency] || 0) + 1;
    }
  });
  const primaryCurrency = Object.keys(currencyCounts).sort((a, b) => 
    currencyCounts[b] - currencyCounts[a]
  )[0] || '£';

  // Region distribution
  const regionCounts: { [key: string]: number } = {};
  activities.forEach(a => {
    if (a.region) {
      regionCounts[a.region] = (regionCounts[a.region] || 0) + 1;
    }
  });
  const primaryRegion = Object.keys(regionCounts).sort((a, b) => 
    regionCounts[b] - regionCounts[a]
  )[0] || 'UK';

  return {
    averagePrice: prices.length > 0 ? 
      prices.reduce((sum, a) => sum + a.priceNumeric, 0) / prices.length : null,
    averageRating: ratings.length > 0 ? 
      ratings.reduce((sum, a) => sum + a.ratingNumeric, 0) / ratings.length : null,
    totalReviews: reviews.reduce((sum, a) => sum + a.reviewCountNumeric, 0),
    primaryCurrency,
    primaryRegion,
    totalActivities: activities.length,
    priceRange: prices.length > 0 ? {
      min: Math.min(...prices.map(a => a.priceNumeric)),
      max: Math.max(...prices.map(a => a.priceNumeric))
    } : null
  };
}

// DELETE - Unlink provider
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    await prisma.userProduct.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking provider:', error);
    return NextResponse.json(
      { error: 'Failed to unlink provider' },
      { status: 500 }
    );
  }
} 