import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateLondonDataIncrease() {
  console.log('🔍 INVESTIGATING LONDON DATA INCREASE...\n');

  try {
    // Check all sources of London data
    console.log('📊 LONDON DATA BY SOURCE:');
    console.log('==========================');
    
    // Original GYG data
    const originalGYGLondon = await prisma.importedGYGActivity.count({
      where: {
        OR: [
          { city: { contains: 'London', mode: 'insensitive' } },
          { location: { contains: 'London', mode: 'insensitive' } }
        ]
      }
    });
    
    // Original Viator data (Madrid table - might contain other cities)
    const originalViatorLondon = await prisma.importedMadridActivity.count({
      where: {
        city: { contains: 'London', mode: 'insensitive' }
      }
    });
    
    // Cleaned data by platform
    const cleanedLondonGYG = await prisma.cleanedActivity.count({
      where: {
        city: 'London',
        originalSource: 'gyg'
      }
    });
    
    const cleanedLondonViator = await prisma.cleanedActivity.count({
      where: {
        city: 'London',
        originalSource: 'viator'
      }
    });
    
    console.log(`Original GYG London: ${originalGYGLondon}`);
    console.log(`Original Viator London: ${originalViatorLondon}`);
    console.log(`Cleaned GYG London: ${cleanedLondonGYG}`);
    console.log(`Cleaned Viator London: ${cleanedLondonViator}`);
    console.log(`Total Original London: ${originalGYGLondon + originalViatorLondon}`);
    console.log(`Total Cleaned London: ${cleanedLondonGYG + cleanedLondonViator}`);
    
    // Check if there are activities that got city assigned during cleaning
    console.log('\n🔍 CITY ASSIGNMENT ANALYSIS:');
    console.log('============================');
    
    // Check activities that might have been assigned London during cleaning
    const londonAssignedActivities = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London',
        OR: [
          { originalSource: 'gyg' },
          { originalSource: 'viator' }
        ]
      },
      select: {
        id: true,
        activityName: true,
        originalSource: true,
        platform: true,
        originalTableId: true
      },
      take: 20
    });
    
    console.log('\nSample London Activities by Source:');
    londonAssignedActivities.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   Source: ${activity.originalSource} | Platform: ${activity.platform} | Original ID: ${activity.originalTableId}`);
    });
    
    // Check if there are activities from other cities that got mapped to London
    console.log('\n🔍 CITY MAPPING ANALYSIS:');
    console.log('=========================');
    
    // Check the smart city backfill script to see what cities get mapped to London
    const cityMappingScript = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London'
      },
      select: {
        id: true,
        activityName: true,
        location: true,
        originalSource: true,
        platform: true
      },
      take: 10
    });
    
    console.log('\nSample London Activities with Location Details:');
    cityMappingScript.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   Location: "${activity.location}" | Source: ${activity.originalSource} | Platform: ${activity.platform}`);
    });
    
    // Check if there are activities that were originally from other cities but got mapped to London
    console.log('\n🔍 POTENTIAL CITY MAPPING ISSUES:');
    console.log('==================================');
    
    // Look for activities that might have been incorrectly mapped
    const potentialMappingIssues = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London',
        activityName: {
          contains: 'Madrid',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        activityName: true,
        location: true,
        originalSource: true,
        platform: true
      },
      take: 10
    });
    
    if (potentialMappingIssues.length > 0) {
      console.log('\nFound activities with Madrid in name but London city:');
      potentialMappingIssues.forEach((activity, index) => {
        console.log(`${index + 1}. "${activity.activityName}"`);
        console.log(`   Location: "${activity.location}" | Source: ${activity.originalSource}`);
      });
    } else {
      console.log('\n✅ No obvious city mapping issues found');
    }
    
    // Check the data cleaning pipeline to understand the city assignment logic
    console.log('\n🔍 CLEANING PIPELINE CITY LOGIC:');
    console.log('=================================');
    
    // Check if there's a city backfill process that might be affecting London
    const londonActivitiesWithDifferentLocations = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London',
        location: {
          not: 'London'
        }
      },
      select: {
        id: true,
        activityName: true,
        location: true,
        city: true,
        originalSource: true
      },
      take: 10
    });
    
    console.log('\nLondon activities with different locations:');
    londonActivitiesWithDifferentLocations.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Source: ${activity.originalSource}`);
    });
    
    // Check if there are activities that were originally from other cities but got assigned to London
    console.log('\n🔍 ORIGINAL CITY ANALYSIS:');
    console.log('==========================');
    
    // Check what cities were in the original data before cleaning
    const originalCities = await prisma.importedGYGActivity.groupBy({
      by: ['city'],
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10
    });
    
    console.log('\nTop cities in original GYG data:');
    originalCities.forEach((city, index) => {
      console.log(`${index + 1}. "${city.city}": ${city._count.city} activities`);
    });
    
    console.log('\n🎯 CONCLUSIONS:');
    console.log('===============');
    console.log('1. The cleaning process is adding London activities, not removing them');
    console.log('2. This suggests city mapping/backfill logic is working');
    console.log('3. Activities from other cities might be getting mapped to London');
    console.log('4. The data collection might have been more comprehensive than expected');
    console.log('5. Need to verify if the city mapping is correct');
    
  } catch (error) {
    console.error('❌ Error investigating London data increase:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateLondonDataIncrease().catch(console.error); 