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

async function importMissingHighQualityViatorNoDesc() {
  console.log('📥 IMPORTING MISSING HIGH-QUALITY VIATOR ACTIVITIES (NO DESC)...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Check current London activities
    const currentLondonCount = await mainPrisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`📊 Current London activities: ${currentLondonCount}`);

    // Get all Viator activities and filter for London
    const allViatorActivities = await gygPrisma.$queryRaw`
      SELECT 
        id, activity_name, provider_name, location, price, rating, review_count,
        duration, activity_url, extraction_quality
      FROM viator_activities
    `;
    
    const viatorLondonActivities = (allViatorActivities as any[]).filter(activity => 
      isLondonActivity(activity.activity_name)
    );
    
    console.log(`📊 Total Viator London activities: ${viatorLondonActivities.length}`);
    
    // Find missing activities and calculate quality scores
    const missingActivities = [];
    const qualityScores = [];
    
    for (const activity of viatorLondonActivities) {
      // Check if exists in cleaned table
      const existing = await mainPrisma.cleanedActivity.findFirst({
        where: {
          activityName: activity.activity_name,
          providerName: activity.provider_name,
          city: 'London'
        }
      });
      
      if (!existing) {
        // Calculate quality score
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
          url: activity.activity_url,
          qualityScore: 0
        };
        
        processedActivity.qualityScore = calculateQualityScore(processedActivity);
        
        missingActivities.push(activity);
        qualityScores.push(processedActivity);
      }
    }
    
    console.log(`❌ Missing Viator activities: ${missingActivities.length}`);
    
    // Filter for high quality activities (≥70%)
    const highQualityActivities = qualityScores.filter(activity => activity.qualityScore >= 70);
    
    console.log(`✅ High quality activities (≥70%): ${highQualityActivities.length}`);
    
    if (highQualityActivities.length === 0) {
      console.log('❌ No high-quality activities to import');
      return;
    }
    
    // Import high quality activities
    console.log('\n📥 IMPORTING HIGH-QUALITY ACTIVITIES...');
    console.log('==========================================');
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 0; i < highQualityActivities.length; i++) {
      const activity = highQualityActivities[i];
      const originalActivity = missingActivities[i];
      
      try {
        console.log(`\n${i + 1}/${highQualityActivities.length}. "${activity.activityName.substring(0, 60)}..."`);
        console.log(`   Quality Score: ${activity.qualityScore}%`);
        console.log(`   Provider: ${activity.providerName}`);
        console.log(`   Price: ${activity.priceText || 'N/A'}`);
        console.log(`   Rating: ${activity.ratingText || 'N/A'}`);
        console.log(`   URL: ${activity.url ? 'Yes' : 'No'}`);
        
        // Import to cleaned table WITHOUT description field
        await mainPrisma.cleanedActivity.create({
          data: {
            originalId: `viator_${originalActivity.id}`,
            activityName: activity.activityName,
            providerName: activity.providerName,
            location: activity.location,
            city: activity.city,
            country: activity.country,
            region: 'UK',
            priceNumeric: activity.priceNumeric,
            priceCurrency: activity.priceCurrency,
            priceText: activity.priceText,
            ratingNumeric: activity.ratingNumeric,
            ratingText: activity.ratingText,
            reviewCountNumeric: activity.reviewCountNumeric,
            reviewCountText: activity.reviewCountText,
            duration: activity.duration,
            url: activity.url,
            qualityScore: activity.qualityScore,
            originalSource: 'viator',
            platform: 'viator'
          }
        });
        
        imported++;
        console.log(`   ✅ Imported successfully`);
        
      } catch (error) {
        console.error(`   ❌ Error importing: ${error}`);
        skipped++;
      }
    }
    
    // Final summary
    console.log('\n🎯 IMPORT SUMMARY:');
    console.log('==================');
    
    const finalLondonCount = await mainPrisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`📊 London activities before import: ${currentLondonCount}`);
    console.log(`📊 London activities after import: ${finalLondonCount}`);
    console.log(`📈 Total new London activities added: ${finalLondonCount - currentLondonCount}`);
    console.log(`✅ High-quality activities imported: ${imported}`);
    console.log(`⏭️  Activities skipped: ${skipped}`);
    
    // URL Analysis
    const londonWithUrls = await mainPrisma.cleanedActivity.count({
      where: { 
        city: 'London',
        url: { not: null }
      }
    });
    
    console.log(`🔗 London activities with URLs: ${londonWithUrls}/${finalLondonCount} (${Math.round((londonWithUrls/finalLondonCount)*100)}%)`);
    
    console.log('\n🎉 High-quality Viator activities import completed successfully!');
    console.log('✅ Ready for London tourism analysis and reports');

  } catch (error) {
    console.error('❌ Error importing high-quality Viator activities:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

importMissingHighQualityViatorNoDesc().catch(console.error); 