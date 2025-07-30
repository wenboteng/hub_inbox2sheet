import { mainPrisma, gygPrisma } from '../lib/dual-prisma';

interface LondonActivity {
  id: string;
  activityName: string;
  providerName: string;
  location: string;
  city: string;
  country: string;
  priceText: string | null;
  priceNumeric: number | null;
  priceCurrency: string;
  ratingText: string | null;
  ratingNumeric: number | null;
  reviewCountText: string | null;
  reviewCountNumeric: number | null;
  duration: string | null;
  description: string | null;
  url: string | null;
  platform: string;
  originalSource: string;
  qualityScore: number;
}

// London keywords for identification
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
  
  maxScore += 40;
  if (activity.activityName && activity.activityName.trim()) score += 10;
  if (activity.providerName && activity.providerName.trim()) score += 10;
  if (activity.location && activity.location.trim()) score += 10;
  if (activity.city && activity.city.trim()) score += 10;
  
  maxScore += 20;
  if (activity.priceNumeric && activity.priceNumeric > 0) score += 10;
  if (activity.priceText) score += 10;
  
  maxScore += 20;
  if (activity.ratingNumeric && activity.ratingNumeric > 0) score += 10;
  if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0) score += 10;
  
  maxScore += 20;
  if (activity.description && activity.description.trim()) score += 5;
  if (activity.duration && activity.duration.trim()) score += 5;
  if (activity.url) score += 5;
  if (activity.country && activity.country.trim()) score += 5;
  
  return Math.round((score / maxScore) * 100);
}

async function importLondonActivitiesBatch() {
  console.log('🇬🇧 IMPORTING LONDON ACTIVITIES (BATCH MODE)...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Check current London activities
    const currentLondonCount = await mainPrisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`📊 Current London activities: ${currentLondonCount}`);

    // Import GYG London Activities in batches
    console.log('\n📥 IMPORTING GYG LONDON ACTIVITIES (BATCH MODE)...');
    console.log('==================================================');
    
    const batchSize = 100;
    let gygImported = 0;
    let gygSkipped = 0;
    let gygProcessed = 0;
    
    // Get total GYG activities first
    const totalGygActivities = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count FROM gyg_activities
    `;
    const totalGyg = Number((totalGygActivities as any[])[0]?.count || 0);
    console.log(`📊 Total GYG activities to scan: ${totalGyg}`);
    
    // Process in batches
    for (let offset = 0; offset < totalGyg; offset += batchSize) {
      console.log(`\n🔄 Processing GYG batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalGyg/batchSize)}...`);
      
      const gygBatch = await gygPrisma.$queryRaw`
        SELECT 
          id, activity_name, provider_name, location, price, rating, review_count,
          duration, description, activity_url, extraction_quality
        FROM gyg_activities
        LIMIT ${batchSize} OFFSET ${offset}
      `;
      
      const gygLondonBatch = (gygBatch as any[]).filter(activity => 
        isLondonActivity(activity.activity_name)
      );
      
      console.log(`  Found ${gygLondonBatch.length} London activities in this batch`);
      
      for (const activity of gygLondonBatch) {
        try {
          // Check if already exists
          const existing = await mainPrisma.cleanedActivity.findFirst({
            where: {
              activityName: activity.activity_name,
              providerName: activity.provider_name,
              city: 'London'
            }
          });
          
          if (existing) {
            gygSkipped++;
            continue;
          }
          
          // Parse data
          const priceData = parsePrice(activity.price);
          const ratingNumeric = parseRating(activity.rating);
          const reviewCountNumeric = parseReviewCount(activity.review_count);
          
          // Create activity object
          const londonActivity: LondonActivity = {
            id: `gyg_${activity.id}`,
            activityName: activity.activity_name,
            providerName: activity.provider_name || 'Unknown',
            location: activity.location || 'London',
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
            platform: 'gyg',
            originalSource: 'gyg',
            qualityScore: 0
          };
          
          // Calculate quality score
          londonActivity.qualityScore = calculateQualityScore(londonActivity);
          
          // Only import if quality score is good enough
          if (londonActivity.qualityScore >= 70) {
            await mainPrisma.cleanedActivity.create({
              data: {
                originalId: londonActivity.id,
                activityName: londonActivity.activityName,
                providerName: londonActivity.providerName,
                location: londonActivity.location,
                city: londonActivity.city,
                country: londonActivity.country,
                region: 'UK',
                priceNumeric: londonActivity.priceNumeric,
                priceCurrency: londonActivity.priceCurrency,
                priceText: londonActivity.priceText,
                ratingNumeric: londonActivity.ratingNumeric,
                ratingText: londonActivity.ratingText,
                reviewCountNumeric: londonActivity.reviewCountNumeric,
                reviewCountText: londonActivity.reviewCountText,
                duration: londonActivity.duration,
                description: londonActivity.description,
                url: londonActivity.url,
                qualityScore: londonActivity.qualityScore,
                originalSource: londonActivity.originalSource,
                platform: londonActivity.platform
              }
            });
            
            gygImported++;
          } else {
            gygSkipped++;
          }
          
          gygProcessed++;
        } catch (error) {
          console.error(`Error importing GYG activity ${activity.id}:`, error);
          gygSkipped++;
          gygProcessed++;
        }
      }
      
      console.log(`  ✅ Batch complete: ${gygImported} imported, ${gygSkipped} skipped`);
      
      // Add a small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ GYG London activities: ${gygImported} imported, ${gygSkipped} skipped`);

    // Import Viator London Activities in batches
    console.log('\n📥 IMPORTING VIATOR LONDON ACTIVITIES (BATCH MODE)...');
    console.log('====================================================');
    
    let viatorImported = 0;
    let viatorSkipped = 0;
    let viatorProcessed = 0;
    
    // Get total Viator activities
    const totalViatorActivities = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count FROM viator_activities
    `;
    const totalViator = Number((totalViatorActivities as any[])[0]?.count || 0);
    console.log(`📊 Total Viator activities to scan: ${totalViator}`);
    
    // Process in batches
    for (let offset = 0; offset < totalViator; offset += batchSize) {
      console.log(`\n🔄 Processing Viator batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalViator/batchSize)}...`);
      
      const viatorBatch = await gygPrisma.$queryRaw`
        SELECT 
          id, activity_name, provider_name, location, price, rating, review_count,
          duration, description, activity_url, extraction_quality
        FROM viator_activities
        LIMIT ${batchSize} OFFSET ${offset}
      `;
      
      const viatorLondonBatch = (viatorBatch as any[]).filter(activity => 
        isLondonActivity(activity.activity_name)
      );
      
      console.log(`  Found ${viatorLondonBatch.length} London activities in this batch`);
      
      for (const activity of viatorLondonBatch) {
        try {
          // Check if already exists
          const existing = await mainPrisma.cleanedActivity.findFirst({
            where: {
              activityName: activity.activity_name,
              providerName: activity.provider_name,
              city: 'London'
            }
          });
          
          if (existing) {
            viatorSkipped++;
            continue;
          }
          
          // Parse data
          const priceData = parsePrice(activity.price);
          const ratingNumeric = parseRating(activity.rating);
          const reviewCountNumeric = parseReviewCount(activity.review_count);
          
          // Create activity object
          const londonActivity: LondonActivity = {
            id: `viator_${activity.id}`,
            activityName: activity.activity_name,
            providerName: activity.provider_name || 'Unknown',
            location: 'London', // Assign London since location is often missing
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
            platform: 'viator',
            originalSource: 'viator',
            qualityScore: 0
          };
          
          // Calculate quality score
          londonActivity.qualityScore = calculateQualityScore(londonActivity);
          
          // Only import if quality score is good enough
          if (londonActivity.qualityScore >= 70) {
            await mainPrisma.cleanedActivity.create({
              data: {
                originalId: londonActivity.id,
                activityName: londonActivity.activityName,
                providerName: londonActivity.providerName,
                location: londonActivity.location,
                city: londonActivity.city,
                country: londonActivity.country,
                region: 'UK',
                priceNumeric: londonActivity.priceNumeric,
                priceCurrency: londonActivity.priceCurrency,
                priceText: londonActivity.priceText,
                ratingNumeric: londonActivity.ratingNumeric,
                ratingText: londonActivity.ratingText,
                reviewCountNumeric: londonActivity.reviewCountNumeric,
                reviewCountText: londonActivity.reviewCountText,
                duration: londonActivity.duration,
                description: londonActivity.description,
                url: londonActivity.url,
                qualityScore: londonActivity.qualityScore,
                originalSource: londonActivity.originalSource,
                platform: londonActivity.platform
              }
            });
            
            viatorImported++;
          } else {
            viatorSkipped++;
          }
          
          viatorProcessed++;
        } catch (error) {
          console.error(`Error importing Viator activity ${activity.id}:`, error);
          viatorSkipped++;
          viatorProcessed++;
        }
      }
      
      console.log(`  ✅ Batch complete: ${viatorImported} imported, ${viatorSkipped} skipped`);
      
      // Add a small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Viator London activities: ${viatorImported} imported, ${viatorSkipped} skipped`);

    // Final Summary
    console.log('\n🎯 IMPORT SUMMARY:');
    console.log('==================');
    
    const finalLondonCount = await mainPrisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`📊 London activities before import: ${currentLondonCount}`);
    console.log(`📊 London activities after import: ${finalLondonCount}`);
    console.log(`📈 Total new London activities added: ${finalLondonCount - currentLondonCount}`);
    console.log(`✅ GYG activities imported: ${gygImported}`);
    console.log(`✅ Viator activities imported: ${viatorImported}`);
    console.log(`⏭️  Activities skipped (duplicates/low quality): ${gygSkipped + viatorSkipped}`);
    
    // URL Analysis
    const londonWithUrls = await mainPrisma.cleanedActivity.count({
      where: { 
        city: 'London',
        url: { not: null }
      }
    });
    
    console.log(`🔗 London activities with URLs: ${londonWithUrls}/${finalLondonCount} (${Math.round((londonWithUrls/finalLondonCount)*100)}%)`);
    
    console.log('\n🎉 London activities import completed successfully!');
    console.log('✅ Users can now click on activity URLs to visit OTA sites');
    console.log('✅ Ready for comprehensive London tourism analysis');

  } catch (error) {
    console.error('❌ Error importing London activities:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

importLondonActivitiesBatch().catch(console.error); 