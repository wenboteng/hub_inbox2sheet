import { mainPrisma, gygPrisma } from '../lib/dual-prisma';

// London keywords for identification (same as import script)
const londonKeywords = [
  'london', 'londres', 'londra', 'london eye', 'buckingham', 'westminster',
  'tower of london', 'big ben', 'thames', 'chelsea', 'soho', 'camden',
  'covent garden', 'piccadilly', 'oxford street', 'regent street',
  'hyde park', 'kensington', 'greenwich', 'windsor', 'stonehenge',
  'bath', 'oxford', 'cambridge', 'warner bros', 'harry potter',
  'heathrow', 'gatwick', 'stansted', 'luton', 'city airport'
];

function isLondonActivity(activityName: string): boolean {
  if (!activityName) return false;
  const lowerName = activityName.toLowerCase();
  return londonKeywords.some(keyword => lowerName.includes(keyword));
}

function parsePrice(priceText: string | null): { numeric: number | null; currency: string } {
  if (!priceText) return { numeric: null, currency: '£' };
  
  const currencyMatch = priceText.match(/[€$£]/);
  const currency = currencyMatch ? currencyMatch[0] : '£';
  
  const numericMatch = priceText.match(/(\d+(?:\.\d{2})?)/);
  const numeric = numericMatch ? parseFloat(numericMatch[1]) : null;
  
  return { numeric, currency };
}

function parseRating(ratingText: string | null): number | null {
  if (!ratingText) return null;
  const match = ratingText.match(/(\d+(?:\.\d)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseReviewCount(reviewText: string | null): number | null {
  if (!reviewText) return null;
  const match = reviewText.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function calculateQualityScore(activity: any): number {
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
  if (activity.priceText) score += 10;
  
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

async function analyzeMissingViatorActivities() {
  console.log('🔍 ANALYZING MISSING VIATOR ACTIVITIES...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Get all Viator activities and filter for London
    const allViatorActivities = await gygPrisma.$queryRaw`
      SELECT 
        id, activity_name, provider_name, location, price, rating, review_count,
        duration, description, activity_url, extraction_quality
      FROM viator_activities
    `;
    
    const viatorLondonActivities = (allViatorActivities as any[]).filter(activity => 
      isLondonActivity(activity.activity_name)
    );
    
    console.log(`📊 Total Viator London activities in second DB: ${viatorLondonActivities.length}`);
    
    // Check which ones are already in cleaned table
    const missingActivities = [];
    const existingActivities = [];
    
    for (const activity of viatorLondonActivities) {
      // Check if exists in cleaned table
      const existing = await mainPrisma.cleanedActivity.findFirst({
        where: {
          activityName: activity.activity_name,
          providerName: activity.provider_name,
          city: 'London'
        }
      });
      
      if (existing) {
        existingActivities.push(activity);
      } else {
        missingActivities.push(activity);
      }
    }
    
    console.log(`📋 Viator London activities in cleaned table: ${existingActivities.length}`);
    console.log(`❌ Missing Viator London activities: ${missingActivities.length}`);
    
    // Analyze missing activities
    console.log('\n🔍 ANALYZING MISSING VIATOR ACTIVITIES...');
    console.log('==========================================');
    
    // Quality score analysis
    const qualityScores = missingActivities.map(activity => {
      const priceData = parsePrice(activity.price);
      const ratingNumeric = parseRating(activity.rating);
      const reviewCountNumeric = parseReviewCount(activity.review_count);
      
      const processedActivity = {
        activityName: activity.activity_name,
        providerName: activity.provider_name || 'Unknown',
        location: 'London',
        city: 'London',
        country: 'UK',
        priceText: activity.price,
        priceNumeric: priceData.numeric,
        priceCurrency: priceData.currency,
        ratingText: activity.rating,
        ratingNumeric,
        reviewCountText: activity.review_count,
        reviewCountNumeric,
        duration: activity.duration,
        description: activity.description,
        url: activity.activity_url,
        qualityScore: 0
      };
      
      processedActivity.qualityScore = calculateQualityScore(processedActivity);
      return processedActivity;
    });
    
    // Quality distribution
    const qualityDistribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '40-49': 0,
      '30-39': 0,
      '20-29': 0,
      '10-19': 0,
      '0-9': 0
    };
    
    qualityScores.forEach(activity => {
      const score = activity.qualityScore;
      if (score >= 90) qualityDistribution['90-100']++;
      else if (score >= 80) qualityDistribution['80-89']++;
      else if (score >= 70) qualityDistribution['70-79']++;
      else if (score >= 60) qualityDistribution['60-69']++;
      else if (score >= 50) qualityDistribution['50-59']++;
      else if (score >= 40) qualityDistribution['40-49']++;
      else if (score >= 30) qualityDistribution['30-39']++;
      else if (score >= 20) qualityDistribution['20-29']++;
      else if (score >= 10) qualityDistribution['10-19']++;
      else qualityDistribution['0-9']++;
    });
    
    console.log('\n📊 QUALITY SCORE DISTRIBUTION:');
    console.log('==============================');
    Object.entries(qualityDistribution).forEach(([range, count]) => {
      const percentage = Math.round((count / missingActivities.length) * 100);
      console.log(`${range}: ${count} activities (${percentage}%)`);
    });
    
    // Activities that would pass 70% threshold
    const highQualityActivities = qualityScores.filter(activity => activity.qualityScore >= 70);
    const lowQualityActivities = qualityScores.filter(activity => activity.qualityScore < 70);
    
    console.log(`\n✅ High quality activities (≥70%): ${highQualityActivities.length}`);
    console.log(`❌ Low quality activities (<70%): ${lowQualityActivities.length}`);
    
    // Data completeness analysis
    console.log('\n📊 DATA COMPLETENESS ANALYSIS:');
    console.log('==============================');
    
    const completenessStats = {
      hasPrice: 0,
      hasRating: 0,
      hasReviews: 0,
      hasDescription: 0,
      hasDuration: 0,
      hasUrl: 0
    };
    
    missingActivities.forEach(activity => {
      if (activity.price) completenessStats.hasPrice++;
      if (activity.rating) completenessStats.hasRating++;
      if (activity.review_count) completenessStats.hasReviews++;
      if (activity.description) completenessStats.hasDescription++;
      if (activity.duration) completenessStats.hasDuration++;
      if (activity.activity_url) completenessStats.hasUrl++;
    });
    
    Object.entries(completenessStats).forEach(([field, count]) => {
      const percentage = Math.round((count / missingActivities.length) * 100);
      console.log(`${field}: ${count}/${missingActivities.length} (${percentage}%)`);
    });
    
    // Sample high quality missing activities
    console.log('\n✅ SAMPLE HIGH QUALITY MISSING ACTIVITIES (≥70%):');
    console.log('==================================================');
    
    const sampleHighQuality = highQualityActivities.slice(0, 10);
    sampleHighQuality.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   Provider: ${activity.providerName}`);
      console.log(`   Quality Score: ${activity.qualityScore}%`);
      console.log(`   Price: ${activity.priceText || 'N/A'}`);
      console.log(`   Rating: ${activity.ratingText || 'N/A'}`);
      console.log(`   Reviews: ${activity.reviewCountText || 'N/A'}`);
      console.log(`   URL: ${activity.url ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Sample low quality missing activities
    console.log('\n❌ SAMPLE LOW QUALITY MISSING ACTIVITIES (<70%):');
    console.log('=================================================');
    
    const sampleLowQuality = lowQualityActivities.slice(0, 10);
    sampleLowQuality.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   Provider: ${activity.providerName}`);
      console.log(`   Quality Score: ${activity.qualityScore}%`);
      console.log(`   Price: ${activity.priceText || 'N/A'}`);
      console.log(`   Rating: ${activity.ratingText || 'N/A'}`);
      console.log(`   Reviews: ${activity.reviewCountText || 'N/A'}`);
      console.log(`   URL: ${activity.url ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Provider analysis
    console.log('\n🏢 PROVIDER ANALYSIS:');
    console.log('=====================');
    
    const providerCounts: Record<string, number> = {};
    missingActivities.forEach(activity => {
      const provider = activity.provider_name || 'Unknown';
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    });
    
    const topProviders = Object.entries(providerCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10);
    
    console.log('Top providers with missing activities:');
    topProviders.forEach(([provider, count]) => {
      console.log(`  ${provider}: ${count} activities`);
    });
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    
    if (highQualityActivities.length > 0) {
      console.log(`✅ BACKFILL RECOMMENDED: ${highQualityActivities.length} high-quality activities`);
      console.log(`   - Quality score ≥70%`);
      console.log(`   - Good data completeness`);
      console.log(`   - Worth importing`);
    }
    
    if (lowQualityActivities.length > 0) {
      console.log(`❌ RECOLLECT RECOMMENDED: ${lowQualityActivities.length} low-quality activities`);
      console.log(`   - Quality score <70%`);
      console.log(`   - Poor data completeness`);
      console.log(`   - Need fresh data collection`);
    }
    
    console.log('\n📋 ACTION PLAN:');
    console.log('===============');
    console.log('1. Backfill high-quality activities (≥70%) immediately');
    console.log('2. Ask content team to recollect low-quality activities (<70%)');
    console.log('3. Focus on providers with most missing activities');
    console.log('4. Prioritize activities with missing prices, ratings, or URLs');

  } catch (error) {
    console.error('❌ Error analyzing missing Viator activities:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

analyzeMissingViatorActivities().catch(console.error); 