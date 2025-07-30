import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeLocationData() {
  console.log('🔍 ANALYZING LOCATION DATA FOR COMPETITOR ANALYSIS...\n');

  // Get sample of activities with location data
  const activitiesWithLocation = await prisma.cleanedActivity.findMany({
    where: {
      OR: [
        { city: { not: '' } },
        { location: { not: '' } }
      ]
    },
    select: {
      id: true,
      activityName: true,
      providerName: true,
      city: true,
      location: true,
      country: true,
      region: true,
      priceNumeric: true,
      ratingNumeric: true,
      platform: true
    },
    take: 50
  });

  console.log('📊 SAMPLE ACTIVITIES WITH LOCATION DATA:');
  console.log('==========================================');
  activitiesWithLocation.forEach((activity, index) => {
    console.log(`${index + 1}. ${activity.activityName}`);
    console.log(`   Provider: ${activity.providerName}`);
    console.log(`   City: "${activity.city}"`);
    console.log(`   Location: "${activity.location}"`);
    console.log(`   Country: "${activity.country}"`);
    console.log(`   Region: "${activity.region}"`);
    console.log(`   Platform: ${activity.platform}`);
    console.log('');
  });

  // Analyze city vs location consistency
  console.log('🏙️ CITY VS LOCATION ANALYSIS:');
  console.log('==============================');
  
  const cityLocationAnalysis = await prisma.cleanedActivity.groupBy({
    by: ['city', 'location'],
    _count: { id: true },
    where: {
      OR: [
        { city: { not: '' } },
        { location: { not: '' } }
      ]
    },
    orderBy: { _count: { id: 'desc' } },
    take: 20
  });

  console.log('Top 20 City-Location combinations:');
  cityLocationAnalysis.forEach((item, index) => {
    console.log(`${index + 1}. City: "${item.city}" | Location: "${item.location}" | Count: ${item._count?.id || 0}`);
  });

  // Check for specific cities
  console.log('\n🎯 SPECIFIC CITY ANALYSIS:');
  console.log('==========================');
  
  const cities = ['London', 'Paris', 'Rome', 'Amsterdam', 'Vienna', 'Madrid'];
  
  for (const city of cities) {
    const cityActivities = await prisma.cleanedActivity.findMany({
      where: {
        OR: [
          { city: { contains: city, mode: 'insensitive' } },
          { location: { contains: city, mode: 'insensitive' } }
        ]
      },
      select: {
        city: true,
        location: true,
        providerName: true,
        activityName: true
      },
      take: 5
    });

    console.log(`\n${city.toUpperCase()}:`);
    cityActivities.forEach((activity, index) => {
      console.log(`  ${index + 1}. City: "${activity.city}" | Location: "${activity.location}"`);
      console.log(`     Provider: ${activity.providerName}`);
      console.log(`     Activity: ${activity.activityName.substring(0, 50)}...`);
    });
  }

  // Analyze location patterns
  console.log('\n🔍 LOCATION PATTERN ANALYSIS:');
  console.log('=============================');
  
  const locationPatterns = await prisma.cleanedActivity.groupBy({
    by: ['location'],
    _count: { id: true },
    where: {
      location: { not: '' }
    },
    orderBy: { _count: { id: 'desc' } },
    take: 15
  });

  console.log('Most common location patterns:');
  locationPatterns.forEach((pattern, index) => {
    console.log(`${index + 1}. "${pattern.location}" - ${pattern._count?.id || 0} activities`);
  });

  await prisma.$disconnect();
}

analyzeLocationData().catch(console.error); 