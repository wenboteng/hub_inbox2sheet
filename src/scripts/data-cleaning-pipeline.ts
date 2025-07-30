import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleaningConfig {
  qualityThreshold: number; // 70% as requested
  priceOutliers: {
    uk: { max: number; currency: string };
    europe: { max: number; currency: string };
  };
  ratingOutliers: { min: number; max: number };
  reviewCountOutliers: { min: number; max: number };
}

const CLEANING_CONFIG: CleaningConfig = {
  qualityThreshold: 70,
  priceOutliers: {
    uk: { max: 500, currency: '£' },
    europe: { max: 500, currency: '€' }
  },
  ratingOutliers: { min: 1.0, max: 5.0 },
  reviewCountOutliers: { min: 0, max: 100000 }
};

// Currency mapping for different regions
const CURRENCY_MAPPING = {
  'UK': '£',
  'United Kingdom': '£',
  'England': '£',
  'Scotland': '£',
  'Wales': '£',
  'Northern Ireland': '£',
  'London': '£',
  'Manchester': '£',
  'Birmingham': '£',
  'Liverpool': '£',
  'Edinburgh': '£',
  'Glasgow': '£',
  'Cardiff': '£',
  'Belfast': '£',
  'Spain': '€',
  'Madrid': '€',
  'Barcelona': '€',
  'Valencia': '€',
  'Netherlands': '€',
  'Amsterdam': '€',
  'Rotterdam': '€',
  'Austria': '€',
  'Vienna': '€',
  'Salzburg': '€',
  'Germany': '€',
  'Berlin': '€',
  'Munich': '€',
  'France': '€',
  'Paris': '€',
  'Lyon': '€',
  'Italy': '€',
  'Rome': '€',
  'Milan': '€',
  'Venice': '€',
  'Florence': '€'
};

// Region mapping
const REGION_MAPPING = {
  'UK': 'UK',
  'United Kingdom': 'UK',
  'England': 'UK',
  'Scotland': 'UK',
  'Wales': 'UK',
  'Northern Ireland': 'UK',
  'London': 'UK',
  'Manchester': 'UK',
  'Birmingham': 'UK',
  'Liverpool': 'UK',
  'Edinburgh': 'UK',
  'Glasgow': 'UK',
  'Cardiff': 'UK',
  'Belfast': 'UK',
  'Spain': 'Europe',
  'Madrid': 'Europe',
  'Barcelona': 'Europe',
  'Netherlands': 'Europe',
  'Amsterdam': 'Europe',
  'Austria': 'Europe',
  'Vienna': 'Europe',
  'Germany': 'Europe',
  'Berlin': 'Europe',
  'France': 'Europe',
  'Paris': 'Europe',
  'Italy': 'Europe',
  'Rome': 'Europe',
  'Milan': 'Europe'
};

export function cleanPrice(priceText: string): { original: string; numeric: number | null; currency: string } {
  if (!priceText || typeof priceText !== 'string') {
    return { original: '', numeric: null, currency: '£' };
  }

  const cleaned = priceText.trim();
  if (!cleaned) {
    return { original: '', numeric: null, currency: '£' };
  }

  // Extract numeric value and currency
  const priceMatch = cleaned.match(/[£€$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (!priceMatch) {
    return { original: cleaned, numeric: null, currency: '£' };
  }

  const numericValue = parseFloat(priceMatch[1].replace(/,/g, ''));
  const currency = cleaned.includes('€') ? '€' : cleaned.includes('$') ? '$' : '£';

  return {
    original: cleaned,
    numeric: numericValue,
    currency
  };
}

export function cleanRating(ratingText: string): { original: string; rating: number | null; reviews: number | null } {
  if (!ratingText || typeof ratingText !== 'string') {
    return { original: '', rating: null, reviews: null };
  }

  const cleaned = ratingText.trim();
  if (!cleaned) {
    return { original: '', rating: null, reviews: null };
  }

  // Extract rating and review count
  const ratingMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  const reviewMatch = cleaned.match(/\((\d+(?:,\d{3})*)\s*reviews?\)/i);

  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  const reviews = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

  return {
    original: cleaned,
    rating,
    reviews
  };
}

export function cleanLocation(locationText: string): { city: string; country: string; venue: string } {
  if (!locationText || typeof locationText !== 'string') {
    return { city: '', country: '', venue: '' };
  }

  const cleaned = locationText.trim();
  if (!cleaned) {
    return { city: '', country: '', venue: '' };
  }

  // Simple parsing - could be enhanced
  const parts = cleaned.split(',').map(part => part.trim());
  
  return {
    city: parts[0] || '',
    country: parts[parts.length - 1] || '',
    venue: parts.slice(1, -1).join(', ') || ''
  };
}

export function cleanDuration(durationText: string): { original: string; hours: number | null; days: number | null } {
  if (!durationText || typeof durationText !== 'string') {
    return { original: '', hours: null, days: null };
  }

  const cleaned = durationText.trim();
  if (!cleaned) {
    return { original: '', hours: null, days: null };
  }

  // Extract hours and days
  const hourMatch = cleaned.match(/(\d+)\s*hours?/i);
  const dayMatch = cleaned.match(/(\d+)\s*days?/i);

  const hours = hourMatch ? parseInt(hourMatch[1]) : null;
  const days = dayMatch ? parseInt(dayMatch[1]) : null;

  return {
    original: cleaned,
    hours,
    days
  };
}

export function cleanProviderName(providerText: string): string {
  if (!providerText || typeof providerText !== 'string') {
    return '';
  }

  return providerText.trim();
}

export function cleanTags(tagsText: string): string[] {
  if (!tagsText || typeof tagsText !== 'string') {
    return [];
  }

  const cleaned = tagsText.trim();
  if (!cleaned) {
    return [];
  }

  // Split by common delimiters and clean
  return cleaned.split(/[,;|]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
}

function determineCurrency(location: string, city: string, country: string): string {
  // Check country first
  if (country && CURRENCY_MAPPING[country as keyof typeof CURRENCY_MAPPING]) {
    return CURRENCY_MAPPING[country as keyof typeof CURRENCY_MAPPING];
  }
  
  // Check city
  if (city && CURRENCY_MAPPING[city as keyof typeof CURRENCY_MAPPING]) {
    return CURRENCY_MAPPING[city as keyof typeof CURRENCY_MAPPING];
  }
  
  // Check location
  if (location && CURRENCY_MAPPING[location as keyof typeof CURRENCY_MAPPING]) {
    return CURRENCY_MAPPING[location as keyof typeof CURRENCY_MAPPING];
  }
  
  // Default to £ for UK focus
  return '£';
}

function determineRegion(location: string, city: string, country: string): string {
  // Check country first
  if (country && REGION_MAPPING[country as keyof typeof REGION_MAPPING]) {
    return REGION_MAPPING[country as keyof typeof REGION_MAPPING];
  }
  
  // Check city
  if (city && REGION_MAPPING[city as keyof typeof REGION_MAPPING]) {
    return REGION_MAPPING[city as keyof typeof REGION_MAPPING];
  }
  
  // Check location
  if (location && REGION_MAPPING[location as keyof typeof REGION_MAPPING]) {
    return REGION_MAPPING[location as keyof typeof REGION_MAPPING];
  }
  
  // Default to UK for focus
  return 'UK';
}

export function calculateQualityScore(activity: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Basic required fields (40 points)
  maxScore += 40;
  if (activity.activityName && activity.activityName.trim()) score += 10;
  if (activity.providerName && activity.providerName.trim()) score += 10;
  if (activity.location && activity.location.trim()) score += 10;
  if (activity.city && activity.city.trim()) score += 10;
  
  // Pricing data (20 points)
  maxScore += 20;
  if (activity.priceNumeric && activity.priceNumeric > 0) score += 10;
  if (activity.priceCurrency) score += 10;
  
  // Rating data (20 points)
  maxScore += 20;
  if (activity.ratingNumeric && activity.ratingNumeric > 0) score += 10;
  if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0) score += 10;
  
  // Additional data (20 points)
  maxScore += 20;
  if (activity.description && activity.description.trim()) score += 5;
  if (activity.duration && activity.duration.trim()) score += 5;
  if (activity.url) score += 5;
  if (activity.country && activity.country.trim()) score += 5;
  
  return Math.round((score / maxScore) * 100);
}

function cleanActivityData(activity: any): any {
  const cleaned = { ...activity };
  
  // Clean text fields
  if (cleaned.activityName) {
    cleaned.activityName = cleaned.activityName.trim();
  }
  if (cleaned.providerName) {
    cleaned.providerName = cleaned.providerName.trim();
  }
  if (cleaned.location) {
    cleaned.location = cleaned.location.trim();
  }
  if (cleaned.city) {
    cleaned.city = cleaned.city.trim();
  }
  if (cleaned.country) {
    cleaned.country = cleaned.country.trim();
  }
  
  // Determine currency and region
  cleaned.priceCurrency = determineCurrency(cleaned.location, cleaned.city, cleaned.country);
  cleaned.region = determineRegion(cleaned.location, cleaned.city, cleaned.country);
  
  // Clean price data
  if (cleaned.priceNumeric) {
    const maxPrice = cleaned.priceCurrency === '£' ? 
      CLEANING_CONFIG.priceOutliers.uk.max : 
      CLEANING_CONFIG.priceOutliers.europe.max;
    
    if (cleaned.priceNumeric > maxPrice) {
      cleaned.priceNumeric = null;
      cleaned.priceText = null;
    }
  }
  
  // Clean rating data
  if (cleaned.ratingNumeric) {
    if (cleaned.ratingNumeric < CLEANING_CONFIG.ratingOutliers.min || 
        cleaned.ratingNumeric > CLEANING_CONFIG.ratingOutliers.max) {
      cleaned.ratingNumeric = null;
      cleaned.ratingText = null;
    }
  }
  
  // Clean review count data
  if (cleaned.reviewCountNumeric) {
    if (cleaned.reviewCountNumeric < CLEANING_CONFIG.reviewCountOutliers.min || 
        cleaned.reviewCountNumeric > CLEANING_CONFIG.reviewCountOutliers.max) {
      cleaned.reviewCountNumeric = null;
      cleaned.reviewCountText = null;
    }
  }
  
  // Determine platform
  cleaned.platform = cleaned.tags?.includes('viator') ? 'viator' : 'gyg';
  cleaned.originalSource = cleaned.platform;
  
  // Calculate quality score
  cleaned.qualityScore = calculateQualityScore(cleaned);
  
  return cleaned;
}

async function runCleaningPipeline() {
  try {
    console.log('🚀 Starting data cleaning pipeline...');
    console.log(`📊 Quality threshold: ${CLEANING_CONFIG.qualityThreshold}%`);
    
    // Get all activities from ImportedGYGActivity
    const activities = await prisma.importedGYGActivity.findMany({
      orderBy: { importedAt: 'desc' }
    });
    
    console.log(`📋 Total activities to process: ${activities.length}`);
    
    let processedCount = 0;
    let highQualityCount = 0;
    let skippedCount = 0;
    
    // Process activities in batches
    const batchSize = 100;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      
      for (const activity of batch) {
        try {
          // Clean the activity data
          const cleanedActivity = cleanActivityData(activity);
          
          // Check if quality meets threshold
          if (cleanedActivity.qualityScore >= CLEANING_CONFIG.qualityThreshold) {
            // Insert into cleaned table
            await prisma.cleanedActivity.create({
              data: {
                originalId: cleanedActivity.originalId,
                activityName: cleanedActivity.activityName,
                providerName: cleanedActivity.providerName,
                location: cleanedActivity.location,
                city: cleanedActivity.city || 'Unknown',
                country: cleanedActivity.country || 'Unknown',
                region: cleanedActivity.region,
                priceNumeric: cleanedActivity.priceNumeric,
                priceCurrency: cleanedActivity.priceCurrency,
                priceText: cleanedActivity.priceText,
                ratingNumeric: cleanedActivity.ratingNumeric,
                ratingText: cleanedActivity.ratingText,
                reviewCountNumeric: cleanedActivity.reviewCountNumeric,
                reviewCountText: cleanedActivity.reviewCountText,
                duration: cleanedActivity.duration,
                durationHours: cleanedActivity.durationHours,
                durationDays: cleanedActivity.durationDays,
                description: cleanedActivity.description,
                venue: cleanedActivity.venue,
                qualityScore: cleanedActivity.qualityScore,
                originalSource: cleanedActivity.originalSource,
                platform: cleanedActivity.platform,
                originalTableId: cleanedActivity.id,
                url: cleanedActivity.url
              }
            });
            
            highQualityCount++;
          } else {
            skippedCount++;
          }
          
          processedCount++;
          
          if (processedCount % 100 === 0) {
            console.log(`📈 Processed ${processedCount}/${activities.length} activities...`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing activity ${activity.originalId}:`, error);
          skippedCount++;
        }
      }
    }
    
    // Final statistics
    console.log('\n📊 Cleaning Pipeline Results:');
    console.log(`✅ Total processed: ${processedCount}`);
    console.log(`🎯 High quality (≥${CLEANING_CONFIG.qualityThreshold}%): ${highQualityCount}`);
    console.log(`⏭️  Skipped (low quality): ${skippedCount}`);
    console.log(`📈 Success rate: ${Math.round((highQualityCount / processedCount) * 100)}%`);
    
    // Currency distribution
    const currencyStats = await prisma.cleanedActivity.groupBy({
      by: ['priceCurrency'],
      _count: { priceCurrency: true }
    });
    
    console.log('\n💰 Currency Distribution:');
    currencyStats.forEach(stat => {
      console.log(`  ${stat.priceCurrency}: ${stat._count.priceCurrency} activities`);
    });
    
    // Platform distribution
    const platformStats = await prisma.cleanedActivity.groupBy({
      by: ['platform'],
      _count: { platform: true }
    });
    
    console.log('\n🔗 Platform Distribution:');
    platformStats.forEach(stat => {
      console.log(`  ${stat.platform}: ${stat._count.platform} activities`);
    });
    
    // Region distribution
    const regionStats = await prisma.cleanedActivity.groupBy({
      by: ['region'],
      _count: { region: true }
    });
    
    console.log('\n🌍 Region Distribution:');
    regionStats.forEach(stat => {
      console.log(`  ${stat.region}: ${stat._count.region} activities`);
    });
    
    console.log('\n🎉 Data cleaning pipeline completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in cleaning pipeline:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the pipeline
runCleaningPipeline()
  .then(() => {
    console.log('✅ Cleaning pipeline completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleaning pipeline failed:', error);
    process.exit(1);
  }); 