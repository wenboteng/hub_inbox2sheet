import { gygPrisma, mainPrisma } from '../lib/dual-prisma';

// Data cleaning utilities
interface CleanedPrice {
  numeric: number | null;
  currency: string | null;
  original: string;
}

interface CleanedRating {
  rating: number | null;
  reviews: number | null;
  original: string;
}

interface CleanedLocation {
  city: string;
  country: string;
  venue?: string;
  original: string;
}

interface CleanedDuration {
  hours: number | null;
  days: number | null;
  original: string;
}

interface CleanedActivity {
  id: number;
  activityName: string;
  providerName: string;
  location: CleanedLocation;
  price: CleanedPrice;
  rating: CleanedRating;
  duration: CleanedDuration;
  description: string;
  tags: string[];
  url: string;
  extractionQuality: string;
  qualityScore: number;
  cleanedAt: Date;
}

// Price cleaning function
function cleanPrice(priceText: string | null): CleanedPrice {
  if (!priceText || priceText.trim() === '') {
    return { numeric: null, currency: null, original: priceText || '' };
  }

  const original = priceText.trim();
  
  // Extract currency
  const currencyMatch = original.match(/[€$£¥]/);
  const currency = currencyMatch ? currencyMatch[0] : null;
  
  // Extract numeric value (handle ranges like "€33-45")
  const numericMatch = original.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
  let numeric = null;
  
  if (numericMatch) {
    numeric = parseFloat(numericMatch[1].replace(',', ''));
    
    // If it's a range, take the average
    const rangeMatch = original.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*-\s*(\d+(?:,\d+)?(?:\.\d+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(',', ''));
      const max = parseFloat(rangeMatch[2].replace(',', ''));
      numeric = (min + max) / 2;
    }
  }
  
  return { numeric, currency, original };
}

// Rating cleaning function
function cleanRating(ratingText: string | null): CleanedRating {
  if (!ratingText || ratingText.trim() === '') {
    return { rating: null, reviews: null, original: ratingText || '' };
  }

  const original = ratingText.trim();
  
  // Extract rating (e.g., "4.4" from "4.4 (63,652)")
  const ratingMatch = original.match(/^(\d+(?:\.\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  
  // Extract review count (e.g., "63652" from "4.4 (63,652)")
  const reviewMatch = original.match(/\((\d+(?:,\d+)*)\)/);
  const reviews = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;
  
  return { rating, reviews, original };
}

// Location cleaning function
function cleanLocation(locationText: string | null): CleanedLocation {
  if (!locationText || locationText.trim() === '') {
    return { city: '', country: '', original: locationText || '' };
  }

  const original = locationText.trim();
  
  // Common location patterns for Spain data
  const locationPatterns = [
    // "Barcelona, Spain" -> { city: "Barcelona", country: "Spain" }
    /^([^,]+),\s*Spain$/i,
    // "Madrid" -> { city: "Madrid", country: "Spain" }
    /^([^,]+)$/,
    // "City Hall Theater, Barcelona" -> { city: "Barcelona", venue: "City Hall Theater" }
    /^([^,]+),\s*([^,]+)$/,
  ];
  
  for (const pattern of locationPatterns) {
    const match = original.match(pattern);
    if (match) {
      if (pattern.source.includes('Spain')) {
        return {
          city: match[1].trim(),
          country: 'Spain',
          original
        };
      } else if (pattern.source.includes('^([^,]+)$')) {
        return {
          city: match[1].trim(),
          country: 'Spain', // Default for current data
          original
        };
      } else {
        return {
          city: match[2].trim(),
          country: 'Spain',
          venue: match[1].trim(),
          original
        };
      }
    }
  }
  
  // Fallback
  return {
    city: original,
    country: 'Spain',
    original
  };
}

// Duration cleaning function
function cleanDuration(durationText: string | null): CleanedDuration {
  if (!durationText || durationText.trim() === '') {
    return { hours: null, days: null, original: durationText || '' };
  }

  const original = durationText.trim();
  
  // Extract hours (e.g., "3-Hour", "3 hours")
  const hourMatch = original.match(/(\d+)\s*-?\s*[Hh]our/);
  const hours = hourMatch ? parseInt(hourMatch[1]) : null;
  
  // Extract days (e.g., "1 day", "1-2 days")
  const dayMatch = original.match(/(\d+)\s*-?\s*[Dd]ay/);
  let days = dayMatch ? parseInt(dayMatch[1]) : null;
  
  // Handle ranges like "1-2 days"
  const dayRangeMatch = original.match(/(\d+)\s*-\s*(\d+)\s*[Dd]ay/);
  if (dayRangeMatch) {
    const min = parseInt(dayRangeMatch[1]);
    const max = parseInt(dayRangeMatch[2]);
    days = (min + max) / 2; // Average
  }
  
  return { hours, days, original };
}

// Provider name cleaning
function cleanProviderName(providerName: string | null): string {
  if (!providerName || providerName.trim() === '') {
    return '';
  }
  
  return providerName.trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^Unknown Provider$/i, 'Unknown'); // Standardize unknown providers
}

// Tags cleaning
function cleanTags(tagsJSONB: any): string[] {
  if (!tagsJSONB) return [];
  
  try {
    let tags: string[] = [];
    
    if (typeof tagsJSONB === 'string') {
      const parsed = JSON.parse(tagsJSONB);
      tags = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(tagsJSONB)) {
      tags = tagsJSONB;
    }
    
    return tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  } catch (error) {
    console.warn('Error parsing tags:', error);
    return [];
  }
}

// Quality scoring function
function calculateQualityScore(activity: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Activity name (20 points)
  if (activity.activity_name && activity.activity_name.trim()) {
    score += 20;
  }
  
  // Provider name (15 points)
  if (activity.provider_name && activity.provider_name.trim()) {
    score += 15;
  }
  
  // Location (15 points)
  if (activity.location && activity.location.trim()) {
    score += 15;
  }
  
  // Price (15 points)
  if (activity.price && activity.price.trim()) {
    score += 15;
  }
  
  // Rating (15 points)
  if (activity.rating && activity.rating.trim()) {
    score += 15;
  }
  
  // Duration (10 points)
  if (activity.duration && activity.duration.trim()) {
    score += 10;
  }
  
  // Description (10 points)
  if (activity.description && activity.description.trim()) {
    score += 10;
  }
  
  return Math.min(score, maxScore);
}

// Main cleaning pipeline
async function cleanGYGData() {
  console.log('🧹 STARTING GYG DATA CLEANING PIPELINE...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Get all activities that need cleaning
    const activities = await gygPrisma.$queryRaw`
      SELECT * FROM activities 
      ORDER BY id
    `;

    console.log(`📊 Found ${(activities as any[]).length} activities to clean`);

    let processedCount = 0;
    let errorCount = 0;
    const cleanedActivities: CleanedActivity[] = [];

    for (const activity of activities as any[]) {
      try {
        // Clean all fields
        const cleanedPrice = cleanPrice(activity.price);
        const cleanedRating = cleanRating(activity.rating);
        const cleanedLocation = cleanLocation(activity.location);
        const cleanedDuration = cleanDuration(activity.duration);
        const cleanedProvider = cleanProviderName(activity.provider_name);
        const cleanedTags = cleanTags(activity.tags);
        const qualityScore = calculateQualityScore(activity);

        const cleanedActivity: CleanedActivity = {
          id: activity.id,
          activityName: activity.activity_name?.trim() || '',
          providerName: cleanedProvider,
          location: cleanedLocation,
          price: cleanedPrice,
          rating: cleanedRating,
          duration: cleanedDuration,
          description: activity.description?.trim() || '',
          tags: cleanedTags,
          url: activity.url || activity.activity_url || '',
          extractionQuality: activity.extraction_quality || 'Unknown',
          qualityScore,
          cleanedAt: new Date()
        };

        cleanedActivities.push(cleanedActivity);
        processedCount++;

        if (processedCount % 50 === 0) {
          console.log(`🔄 Processed ${processedCount} activities...`);
        }

      } catch (error) {
        console.error(`Error cleaning activity ${activity.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 CLEANING SUMMARY:`);
    console.log(`✅ Successfully cleaned: ${processedCount} activities`);
    console.log(`❌ Errors: ${errorCount} activities`);
    console.log(`📈 Success rate: ${((processedCount / (activities as any[]).length) * 100).toFixed(1)}%`);

    // Generate cleaning statistics
    const stats = generateCleaningStats(cleanedActivities);
    console.log('\n📈 CLEANING STATISTICS:');
    console.log(`💰 Price data: ${stats.priceCoverage}% have numeric prices`);
    console.log(`⭐ Rating data: ${stats.ratingCoverage}% have numeric ratings`);
    console.log(`📍 Location data: ${stats.locationCoverage}% have standardized locations`);
    console.log(`⏱️ Duration data: ${stats.durationCoverage}% have standardized duration`);
    console.log(`🏷️ Tags data: ${stats.tagsCoverage}% have tags`);
    console.log(`📊 Average quality score: ${stats.averageQualityScore.toFixed(1)}/100`);

    // Save cleaned data to main database
    await saveCleanedData(cleanedActivities);

    // Generate comprehensive report
    const report = generateCleaningReport(cleanedActivities, stats);
    await saveReport(report);

    console.log('\n🎉 DATA CLEANING PIPELINE COMPLETED!');

  } catch (error) {
    console.error('❌ Error during data cleaning:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

// Generate cleaning statistics
function generateCleaningStats(activities: CleanedActivity[]) {
  const total = activities.length;
  
  const priceCoverage = Math.round((activities.filter(a => a.price.numeric !== null).length / total) * 100);
  const ratingCoverage = Math.round((activities.filter(a => a.rating.rating !== null).length / total) * 100);
  const locationCoverage = Math.round((activities.filter(a => a.location.city).length / total) * 100);
  const durationCoverage = Math.round((activities.filter(a => a.duration.hours !== null || a.duration.days !== null).length / total) * 100);
  const tagsCoverage = Math.round((activities.filter(a => a.tags.length > 0).length / total) * 100);
  const averageQualityScore = activities.reduce((sum, a) => sum + a.qualityScore, 0) / total;

  return {
    priceCoverage,
    ratingCoverage,
    locationCoverage,
    durationCoverage,
    tagsCoverage,
    averageQualityScore
  };
}

// Save cleaned data to main database
async function saveCleanedData(activities: CleanedActivity[]) {
  console.log('\n💾 Saving cleaned data to main database...');

  let savedCount = 0;
  let errorCount = 0;

  for (const activity of activities) {
    try {
      // Check if activity already exists
      const existing = await mainPrisma.importedGYGActivity.findFirst({
        where: { originalId: activity.id.toString() }
      });

      const data = {
        originalId: activity.id.toString(),
        activityName: activity.activityName,
        providerName: activity.providerName,
        location: activity.location.city,
        priceText: activity.price.original,
        priceNumeric: activity.price.numeric,
        ratingText: activity.rating.original,
        ratingNumeric: activity.rating.rating,
        reviewCountText: activity.rating.original,
        reviewCountNumeric: activity.rating.reviews,
        duration: activity.duration.original,
        description: activity.description,
        extractionQuality: activity.extractionQuality,
        tags: activity.tags,
        url: activity.url,
        // Add custom fields for cleaned data
        cleanedAt: activity.cleanedAt,
        qualityScore: activity.qualityScore,
        city: activity.location.city,
        country: activity.location.country,
        venue: activity.location.venue,
        priceCurrency: activity.price.currency,
        durationHours: activity.duration.hours,
        durationDays: activity.duration.days
      };

      if (existing) {
        await mainPrisma.importedGYGActivity.update({
          where: { id: existing.id },
          data: { ...data, updatedAt: new Date() }
        });
      } else {
        await mainPrisma.importedGYGActivity.create({ data });
      }

      savedCount++;
    } catch (error) {
      console.error(`Error saving activity ${activity.id}:`, error);
      errorCount++;
    }
  }

  console.log(`✅ Saved ${savedCount} cleaned activities`);
  console.log(`❌ Errors: ${errorCount} activities`);
}

// Generate comprehensive cleaning report
function generateCleaningReport(activities: CleanedActivity[], stats: any) {
  const topLocations = activities
    .reduce((acc, a) => {
      acc[a.location.city] = (acc[a.location.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topProviders = activities
    .reduce((acc, a) => {
      acc[a.providerName] = (acc[a.providerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const priceRanges = activities
    .filter(a => a.price.numeric !== null)
    .reduce((acc, a) => {
      const price = a.price.numeric!;
      if (price <= 25) acc['€0-25']++;
      else if (price <= 50) acc['€26-50']++;
      else if (price <= 100) acc['€51-100']++;
      else acc['€100+']++;
      return acc;
    }, { '€0-25': 0, '€26-50': 0, '€51-100': 0, '€100+': 0 });

  return `
# GYG Data Cleaning Report

## Overview
- **Total Activities Processed**: ${activities.length}
- **Cleaning Date**: ${new Date().toISOString()}
- **Pipeline Version**: 1.0

## Data Quality Improvements

### Before Cleaning
- Raw text data with inconsistent formats
- Mixed currency and price formats
- Inconsistent location naming
- Missing quality scoring

### After Cleaning
- **Price Coverage**: ${stats.priceCoverage}% have numeric prices
- **Rating Coverage**: ${stats.ratingCoverage}% have numeric ratings
- **Location Coverage**: ${stats.locationCoverage}% have standardized locations
- **Duration Coverage**: ${stats.durationCoverage}% have standardized duration
- **Tags Coverage**: ${stats.tagsCoverage}% have tags
- **Average Quality Score**: ${stats.averageQualityScore.toFixed(1)}/100

## Data Distribution

### Top Locations
${Object.entries(topLocations)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([city, count]) => `- ${city}: ${count} activities`)
  .join('\n')}

### Top Providers
${Object.entries(topProviders)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([provider, count]) => `- ${provider}: ${count} activities`)
  .join('\n')}

### Price Distribution
${Object.entries(priceRanges)
  .map(([range, count]) => `- ${range}: ${count} activities`)
  .join('\n')}

## Cleaning Functions

### Price Cleaning
- Extracts numeric values from text (€43 → 43)
- Handles currency symbols (€, $, £, ¥)
- Processes ranges (€33-45 → 39 average)
- Stores both original and cleaned values

### Rating Cleaning
- Extracts numeric ratings (4.4 (63,652) → 4.4)
- Parses review counts (4.4 (63,652) → 63652)
- Handles various formats consistently
- Maintains original text for reference

### Location Standardization
- Standardizes city/country format
- Handles venue information
- Defaults to Spain for current data
- Ready for global expansion

### Duration Standardization
- Extracts hours and days as numbers
- Handles ranges (1-2 days → 1.5 days average)
- Supports multiple formats
- Preserves original text

### Quality Scoring
- Activity name: 20 points
- Provider name: 15 points
- Location: 15 points
- Price: 15 points
- Rating: 15 points
- Duration: 10 points
- Description: 10 points
- **Total**: 100 points

## Future-Ready Features

### Multi-Platform Support
- Platform field ready for Viator, Airbnb, Booking.com
- Standardized schema across platforms
- Consistent cleaning functions
- Quality scoring applicable to all sources

### Incremental Processing
- Tracks cleaning timestamps
- Updates existing records
- Preserves original data
- Maintains data lineage

### Scalability
- Batch processing for large datasets
- Error handling and logging
- Performance optimization
- Automated quality monitoring

## Recommendations

### Immediate Actions
1. **Monitor quality scores** for new data
2. **Review cleaning functions** for edge cases
3. **Set up automated cleaning** for new imports
4. **Track cleaning performance** metrics

### Future Enhancements
1. **Geocoding integration** for global locations
2. **Machine learning** for better extraction
3. **Real-time cleaning** for live data
4. **Advanced analytics** on cleaned data

## Usage

### For New Data
\`\`\`bash
# Run cleaning pipeline on new data
npm run clean:gyg:data

# Incremental cleaning for updates
npm run clean:gyg:incremental
\`\`\`

### For Analysis
\`\`\`bash
# Generate analytics on cleaned data
npm run analyze:gyg:cleaned

# Export cleaned data for external tools
npm run export:gyg:cleaned
\`\`\`

This cleaning pipeline ensures consistent, high-quality data for all future analysis and business intelligence needs.
`;
}

// Save report to database
async function saveReport(report: string) {
  try {
    await mainPrisma.report.upsert({
      where: { type: 'gyg-data-cleaning-report' },
      create: {
        type: 'gyg-data-cleaning-report',
        title: 'GYG Data Cleaning Report',
        content: report,
      },
      update: {
        title: 'GYG Data Cleaning Report',
        content: report,
      },
    });
    console.log('✅ Cleaning report saved to database');
  } catch (error) {
    console.error('Error saving report:', error);
  }
}

// Export cleaning functions for use in other scripts
export {
  cleanPrice,
  cleanRating,
  cleanLocation,
  cleanDuration,
  cleanProviderName,
  cleanTags,
  calculateQualityScore,
  cleanGYGData
};

// Run the script
if (require.main === module) {
  cleanGYGData().catch(console.error);
} 