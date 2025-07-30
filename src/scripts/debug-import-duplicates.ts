import { mainPrisma, gygPrisma } from '../lib/dual-prisma';

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

async function debugImportDuplicates() {
  console.log('🔍 DEBUGGING IMPORT DUPLICATES...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Check current London activities in cleaned table
    const currentLondonCount = await mainPrisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`📊 Current London activities in cleaned table: ${currentLondonCount}`);

    // Get a sample of GYG London activities
    console.log('\n📥 CHECKING GYG LONDON ACTIVITIES...');
    console.log('=====================================');
    
    const gygActivities = await gygPrisma.$queryRaw`
      SELECT 
        id, activity_name, provider_name, location, price, rating, review_count,
        duration, description, activity_url, extraction_quality
      FROM gyg_activities
      LIMIT 1000
    `;
    
    const gygLondonActivities = (gygActivities as any[]).filter(activity => 
      isLondonActivity(activity.activity_name)
    );
    
    console.log(`Found ${gygLondonActivities.length} GYG London activities in sample`);
    
    // Check first 5 activities for duplicates
    console.log('\n🔍 CHECKING FIRST 5 GYG ACTIVITIES FOR DUPLICATES:');
    console.log('==================================================');
    
    for (let i = 0; i < Math.min(5, gygLondonActivities.length); i++) {
      const activity = gygLondonActivities[i];
      
      console.log(`\n${i + 1}. Activity: "${activity.activity_name}"`);
      console.log(`   Provider: ${activity.provider_name}`);
      console.log(`   Location: ${activity.location}`);
      
      // Check if exists in cleaned table
      const existing = await mainPrisma.cleanedActivity.findFirst({
        where: {
          activityName: activity.activity_name,
          providerName: activity.provider_name,
          city: 'London'
        }
      });
      
      if (existing) {
        console.log(`   ❌ DUPLICATE FOUND in cleaned table:`);
        console.log(`      ID: ${existing.id}`);
        console.log(`      Original ID: ${existing.originalId}`);
        console.log(`      Platform: ${existing.platform}`);
        console.log(`      Original Source: ${existing.originalSource}`);
      } else {
        console.log(`   ✅ NO DUPLICATE - Ready to import`);
      }
    }

    // Check what's already in the cleaned table
    console.log('\n📋 CURRENT LONDON ACTIVITIES IN CLEANED TABLE:');
    console.log('=============================================');
    
    const existingLondonActivities = await mainPrisma.cleanedActivity.findMany({
      where: { city: 'London' },
      select: {
        id: true,
        activityName: true,
        providerName: true,
        platform: true,
        originalSource: true,
        originalId: true
      },
      take: 10
    });
    
    console.log(`Sample of ${existingLondonActivities.length} existing London activities:`);
    existingLondonActivities.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 50)}..."`);
      console.log(`   Provider: ${activity.providerName}`);
      console.log(`   Platform: ${activity.platform}`);
      console.log(`   Source: ${activity.originalSource}`);
      console.log(`   Original ID: ${activity.originalId}`);
      console.log('');
    });

    // Check if there are activities with 'gyg' or 'viator' in originalSource
    console.log('\n🔍 CHECKING ORIGINAL SOURCES IN CLEANED TABLE:');
    console.log('=============================================');
    
    const sourceCounts = await mainPrisma.cleanedActivity.groupBy({
      by: ['originalSource'],
      where: { city: 'London' },
      _count: { id: true }
    });
    
    sourceCounts.forEach(source => {
      console.log(`${source.originalSource}: ${source._count.id} activities`);
    });

    // Check for activities with 'gyg' in platform
    const gygPlatformCount = await mainPrisma.cleanedActivity.count({
      where: { 
        city: 'London',
        platform: 'gyg'
      }
    });
    
    console.log(`\nPlatform 'gyg': ${gygPlatformCount} activities`);
    
    const viatorPlatformCount = await mainPrisma.cleanedActivity.count({
      where: { 
        city: 'London',
        platform: 'viator'
      }
    });
    
    console.log(`Platform 'viator': ${viatorPlatformCount} activities`);

    // Check if the issue is with the duplicate detection logic
    console.log('\n🔍 TESTING DUPLICATE DETECTION LOGIC:');
    console.log('=====================================');
    
    // Get a sample activity that should be unique
    const sampleGygActivity = gygLondonActivities[0];
    if (sampleGygActivity) {
      console.log(`Testing duplicate detection for: "${sampleGygActivity.activity_name}"`);
      
      // Check with exact match
      const exactMatch = await mainPrisma.cleanedActivity.findFirst({
        where: {
          activityName: sampleGygActivity.activity_name,
          providerName: sampleGygActivity.provider_name,
          city: 'London'
        }
      });
      
      console.log(`Exact match found: ${exactMatch ? 'YES' : 'NO'}`);
      
      if (exactMatch) {
        console.log(`Matched record details:`);
        console.log(`  ID: ${exactMatch.id}`);
        console.log(`  Original ID: ${exactMatch.originalId}`);
        console.log(`  Platform: ${exactMatch.platform}`);
        console.log(`  Source: ${exactMatch.originalSource}`);
      }
      
      // Check with just activity name
      const nameMatch = await mainPrisma.cleanedActivity.findFirst({
        where: {
          activityName: sampleGygActivity.activity_name,
          city: 'London'
        }
      });
      
      console.log(`Name-only match found: ${nameMatch ? 'YES' : 'NO'}`);
    }

    console.log('\n🎯 ANALYSIS:');
    console.log('============');
    console.log('The issue is likely that:');
    console.log('1. Activities from GYG are already in the cleaned table');
    console.log('2. They were imported previously with different originalSource/platform values');
    console.log('3. The duplicate detection is working correctly');
    console.log('4. We need to check what data is already there vs what we want to add');

  } catch (error) {
    console.error('❌ Error debugging duplicates:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

debugImportDuplicates().catch(console.error); 