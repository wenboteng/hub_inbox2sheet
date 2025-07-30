import { mainPrisma } from '../lib/dual-prisma';

interface DataQualityReport {
  totalActivities: number;
  gygActivities: number;
  viatorActivities: number;
  dataQuality: {
    missingPrices: number;
    missingRatings: number;
    missingReviews: number;
    missingLocations: number;
    missingProviders: number;
    invalidPrices: number;
    invalidRatings: number;
    duplicateActivities: number;
  };
  locationAnalysis: {
    totalUniqueLocations: number;
    topLocations: Array<{ location: string; count: number }>;
    unknownLocations: number;
  };
  providerAnalysis: {
    totalUniqueProviders: number;
    topProviders: Array<{ provider: string; count: number }>;
    unknownProviders: number;
  };
  priceAnalysis: {
    priceRange: { min: number; max: number; average: number };
    currencyDistribution: Array<{ currency: string; count: number }>;
    priceOutliers: number;
  };
  ratingAnalysis: {
    ratingRange: { min: number; max: number; average: number };
    ratingDistribution: Array<{ range: string; count: number }>;
    invalidRatings: number;
  };
  platformAnalysis: {
    gygQuality: {
      total: number;
      withPrices: number;
      withRatings: number;
      withReviews: number;
      withLocations: number;
    };
    viatorQuality: {
      total: number;
      withPrices: number;
      withRatings: number;
      withReviews: number;
      withLocations: number;
    };
  };
  cleaningRecommendations: string[];
}

async function analyzeDataQuality(): Promise<DataQualityReport> {
  console.log('🔍 ANALYZING DATA QUALITY FOR INSIGHTDECK...\n');

  try {
    await mainPrisma.$connect();

    // Get all activities
    const allActivities = await mainPrisma.importedGYGActivity.findMany({
      select: {
        id: true,
        originalId: true,
        activityName: true,
        providerName: true,
        location: true,
        city: true,
        country: true,
        priceText: true,
        priceNumeric: true,
        priceCurrency: true,
        ratingText: true,
        ratingNumeric: true,
        reviewCountText: true,
        reviewCountNumeric: true,
        tags: true,
        extractionQuality: true,
        qualityScore: true,
        importedAt: true
      }
    });

    console.log(`📊 Total activities in database: ${allActivities.length}`);

    // Separate GYG and Viator activities
    const gygActivities = allActivities.filter(a => !a.tags.includes('viator'));
    const viatorActivities = allActivities.filter(a => a.tags.includes('viator'));

    console.log(`📈 GYG activities: ${gygActivities.length}`);
    console.log(`📈 Viator activities: ${viatorActivities.length}`);

    // Data quality analysis
    const missingPrices = allActivities.filter(a => !a.priceNumeric || a.priceNumeric <= 0).length;
    const missingRatings = allActivities.filter(a => !a.ratingNumeric || a.ratingNumeric <= 0).length;
    const missingReviews = allActivities.filter(a => !a.reviewCountNumeric || a.reviewCountNumeric <= 0).length;
    const missingLocations = allActivities.filter(a => !a.location || a.location === 'Unknown Location').length;
    const missingProviders = allActivities.filter(a => !a.providerName || a.providerName === '').length;

    // Price analysis
    const validPrices = allActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const priceRange = validPrices.length > 0 ? {
      min: Math.min(...validPrices.map(p => p.priceNumeric!)),
      max: Math.max(...validPrices.map(p => p.priceNumeric!)),
      average: validPrices.reduce((sum, p) => sum + p.priceNumeric!, 0) / validPrices.length
    } : { min: 0, max: 0, average: 0 };

    // Rating analysis
    const validRatings = allActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0 && a.ratingNumeric <= 5);
    const ratingRange = validRatings.length > 0 ? {
      min: Math.min(...validRatings.map(r => r.ratingNumeric!)),
      max: Math.max(...validRatings.map(r => r.ratingNumeric!)),
      average: validRatings.reduce((sum, r) => sum + r.ratingNumeric!, 0) / validRatings.length
    } : { min: 0, max: 0, average: 0 };

    // Location analysis
    const locations = allActivities
      .filter(a => a.location && a.location !== 'Unknown Location')
      .map(a => a.location);
    const uniqueLocations = Array.from(new Set(locations));
    const locationCounts = uniqueLocations.map(location => ({
      location,
      count: locations.filter(l => l === location).length
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    // Provider analysis
    const providers = allActivities
      .filter(a => a.providerName && a.providerName !== '')
      .map(a => a.providerName);
    const uniqueProviders = Array.from(new Set(providers));
    const providerCounts = uniqueProviders.map(provider => ({
      provider,
      count: providers.filter(p => p === provider).length
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    // Currency analysis
    const currencies = allActivities
      .filter(a => a.priceCurrency)
      .map(a => a.priceCurrency);
    const currencyCounts = Array.from(new Set(currencies)).map(currency => ({
      currency: currency || 'Unknown',
      count: currencies.filter(c => c === currency).length
    })).sort((a, b) => b.count - a.count);

    // Rating distribution
    const ratingDistribution = [
      { range: '1.0-2.0', count: validRatings.filter(r => r.ratingNumeric! >= 1.0 && r.ratingNumeric! < 2.0).length },
      { range: '2.0-3.0', count: validRatings.filter(r => r.ratingNumeric! >= 2.0 && r.ratingNumeric! < 3.0).length },
      { range: '3.0-4.0', count: validRatings.filter(r => r.ratingNumeric! >= 3.0 && r.ratingNumeric! < 4.0).length },
      { range: '4.0-5.0', count: validRatings.filter(r => r.ratingNumeric! >= 4.0 && r.ratingNumeric! <= 5.0).length }
    ];

    // Platform-specific quality
    const gygQuality = {
      total: gygActivities.length,
      withPrices: gygActivities.filter(a => a.priceNumeric && a.priceNumeric > 0).length,
      withRatings: gygActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0).length,
      withReviews: gygActivities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0).length,
      withLocations: gygActivities.filter(a => a.location && a.location !== 'Unknown Location').length
    };

    const viatorQuality = {
      total: viatorActivities.length,
      withPrices: viatorActivities.filter(a => a.priceNumeric && a.priceNumeric > 0).length,
      withRatings: viatorActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0).length,
      withReviews: viatorActivities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0).length,
      withLocations: viatorActivities.filter(a => a.location && a.location !== 'Unknown Location').length
    };

    // Identify cleaning recommendations
    const cleaningRecommendations = [];

    if (missingPrices > allActivities.length * 0.1) {
      cleaningRecommendations.push(`High missing price data (${missingPrices} activities). Need price extraction improvement.`);
    }

    if (missingLocations > allActivities.length * 0.3) {
      cleaningRecommendations.push(`High missing location data (${missingLocations} activities). Need location inference or extraction.`);
    }

    if (priceRange.max > 1000) {
      cleaningRecommendations.push(`Price outliers detected (max: ${priceRange.max}). Need price validation and outlier removal.`);
    }

    if (validRatings.filter(r => r.ratingNumeric! > 5).length > 0) {
      cleaningRecommendations.push(`Invalid ratings detected (>5.0). Need rating validation.`);
    }

    if (uniqueLocations.length < 50) {
      cleaningRecommendations.push(`Limited location diversity (${uniqueLocations.length} unique locations). Need broader geographic coverage.`);
    }

    // Check for duplicates
    const activityNames = allActivities.map(a => a.activityName?.toLowerCase().trim());
    const duplicateNames = activityNames.filter((name, index) => activityNames.indexOf(name) !== index);
    const duplicateActivities = new Set(duplicateNames).size;

    if (duplicateActivities > 0) {
      cleaningRecommendations.push(`Duplicate activities detected (${duplicateActivities} potential duplicates). Need deduplication.`);
    }

    const report: DataQualityReport = {
      totalActivities: allActivities.length,
      gygActivities: gygActivities.length,
      viatorActivities: viatorActivities.length,
      dataQuality: {
        missingPrices,
        missingRatings,
        missingReviews,
        missingLocations,
        missingProviders,
        invalidPrices: 0, // Would need more analysis
        invalidRatings: validRatings.filter(r => r.ratingNumeric! > 5).length,
        duplicateActivities
      },
      locationAnalysis: {
        totalUniqueLocations: uniqueLocations.length,
        topLocations: locationCounts,
        unknownLocations: missingLocations
      },
      providerAnalysis: {
        totalUniqueProviders: uniqueProviders.length,
        topProviders: providerCounts,
        unknownProviders: missingProviders
      },
      priceAnalysis: {
        priceRange,
        currencyDistribution: currencyCounts,
        priceOutliers: validPrices.filter(p => p.priceNumeric! > priceRange.average * 3).length
      },
      ratingAnalysis: {
        ratingRange,
        ratingDistribution,
        invalidRatings: validRatings.filter(r => r.ratingNumeric! > 5).length
      },
      platformAnalysis: {
        gygQuality,
        viatorQuality
      },
      cleaningRecommendations
    };

    // Print detailed report
    console.log('\n📋 DETAILED DATA QUALITY REPORT:');
    console.log('=====================================');
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`Total Activities: ${report.totalActivities}`);
    console.log(`GYG Activities: ${report.gygActivities}`);
    console.log(`Viator Activities: ${report.viatorActivities}`);

    console.log(`\n🔍 DATA QUALITY ISSUES:`);
    console.log(`Missing Prices: ${report.dataQuality.missingPrices} (${((report.dataQuality.missingPrices / report.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`Missing Ratings: ${report.dataQuality.missingRatings} (${((report.dataQuality.missingRatings / report.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`Missing Reviews: ${report.dataQuality.missingReviews} (${((report.dataQuality.missingReviews / report.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`Missing Locations: ${report.dataQuality.missingLocations} (${((report.dataQuality.missingLocations / report.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`Missing Providers: ${report.dataQuality.missingProviders} (${((report.dataQuality.missingProviders / report.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`Invalid Ratings: ${report.dataQuality.invalidRatings}`);
    console.log(`Duplicate Activities: ${report.dataQuality.duplicateActivities}`);

    console.log(`\n🌍 LOCATION ANALYSIS:`);
    console.log(`Unique Locations: ${report.locationAnalysis.totalUniqueLocations}`);
    console.log(`Unknown Locations: ${report.locationAnalysis.unknownLocations}`);
    console.log(`Top 5 Locations:`);
    report.locationAnalysis.topLocations.slice(0, 5).forEach(loc => {
      console.log(`  ${loc.location}: ${loc.count} activities`);
    });

    console.log(`\n🏢 PROVIDER ANALYSIS:`);
    console.log(`Unique Providers: ${report.providerAnalysis.totalUniqueProviders}`);
    console.log(`Top 5 Providers:`);
    report.providerAnalysis.topProviders.slice(0, 5).forEach(prov => {
      console.log(`  ${prov.provider}: ${prov.count} activities`);
    });

    console.log(`\n💰 PRICE ANALYSIS:`);
    console.log(`Price Range: €${report.priceAnalysis.priceRange.min.toFixed(2)} - €${report.priceAnalysis.priceRange.max.toFixed(2)}`);
    console.log(`Average Price: €${report.priceAnalysis.priceRange.average.toFixed(2)}`);
    console.log(`Price Outliers: ${report.priceAnalysis.priceOutliers}`);
    console.log(`Currency Distribution:`);
    report.priceAnalysis.currencyDistribution.forEach(curr => {
      console.log(`  ${curr.currency}: ${curr.count} activities`);
    });

    console.log(`\n⭐ RATING ANALYSIS:`);
    console.log(`Rating Range: ${report.ratingAnalysis.ratingRange.min.toFixed(1)} - ${report.ratingAnalysis.ratingRange.max.toFixed(1)}`);
    console.log(`Average Rating: ${report.ratingAnalysis.ratingRange.average.toFixed(2)}`);
    console.log(`Rating Distribution:`);
    report.ratingAnalysis.ratingDistribution.forEach(dist => {
      console.log(`  ${dist.range}: ${dist.count} activities`);
    });

    console.log(`\n📱 PLATFORM QUALITY COMPARISON:`);
    console.log(`GYG Quality:`);
    console.log(`  Total: ${report.platformAnalysis.gygQuality.total}`);
    console.log(`  With Prices: ${report.platformAnalysis.gygQuality.withPrices} (${((report.platformAnalysis.gygQuality.withPrices / report.platformAnalysis.gygQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Ratings: ${report.platformAnalysis.gygQuality.withRatings} (${((report.platformAnalysis.gygQuality.withRatings / report.platformAnalysis.gygQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Reviews: ${report.platformAnalysis.gygQuality.withReviews} (${((report.platformAnalysis.gygQuality.withReviews / report.platformAnalysis.gygQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Locations: ${report.platformAnalysis.gygQuality.withLocations} (${((report.platformAnalysis.gygQuality.withLocations / report.platformAnalysis.gygQuality.total) * 100).toFixed(1)}%)`);

    console.log(`\nViator Quality:`);
    console.log(`  Total: ${report.platformAnalysis.viatorQuality.total}`);
    console.log(`  With Prices: ${report.platformAnalysis.viatorQuality.withPrices} (${((report.platformAnalysis.viatorQuality.withPrices / report.platformAnalysis.viatorQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Ratings: ${report.platformAnalysis.viatorQuality.withRatings} (${((report.platformAnalysis.viatorQuality.withRatings / report.platformAnalysis.viatorQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Reviews: ${report.platformAnalysis.viatorQuality.withReviews} (${((report.platformAnalysis.viatorQuality.withReviews / report.platformAnalysis.viatorQuality.total) * 100).toFixed(1)}%)`);
    console.log(`  With Locations: ${report.platformAnalysis.viatorQuality.withLocations} (${((report.platformAnalysis.viatorQuality.withLocations / report.platformAnalysis.viatorQuality.total) * 100).toFixed(1)}%)`);

    console.log(`\n🚨 CLEANING RECOMMENDATIONS:`);
    report.cleaningRecommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    return report;

  } catch (error) {
    console.error('❌ Error analyzing data quality:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeDataQuality();
}

export { analyzeDataQuality }; 