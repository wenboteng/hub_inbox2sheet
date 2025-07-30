import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCityFix() {
  console.log('🔍 VERIFYING CITY BACKFILL FIX...\n');

  // Check the specific activities from the screenshot
  const problematicActivities = [
    'Madrid: Hiking & Visit Segovia Day Trip with Transport',
    'From Madrid: Day Trip to Guadarrama National Park'
  ];

  console.log('🇪🇸 CHECKING MADRID ACTIVITIES:');
  for (const activityName of problematicActivities) {
    const activities = await prisma.cleanedActivity.findMany({
      where: {
        activityName: {
          contains: activityName.substring(0, 30),
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        activityName: true,
        providerName: true,
        city: true,
        location: true,
        region: true,
        platform: true
      }
    });

    console.log(`\n"${activityName}":`);
    activities.forEach((activity, index) => {
      console.log(`  ${index + 1}. Provider: ${activity.providerName}`);
      console.log(`     City: "${activity.city}" | Location: "${activity.location}" | Region: "${activity.region}" | Platform: ${activity.platform}`);
    });
  }

  // Check London day trip competitors to make sure no Madrid activities are there
  console.log('\n🇬🇧 CHECKING LONDON DAY TRIP COMPETITORS:');
  const londonDayTrips = await prisma.cleanedActivity.findMany({
    where: {
      city: 'London',
      activityName: {
        contains: 'day trip',
        mode: 'insensitive'
      },
      providerName: { not: 'Evan Evans Tours' }
    },
    select: {
      id: true,
      activityName: true,
      providerName: true,
      city: true,
      location: true,
      region: true,
      platform: true
    },
    take: 10
  });

  console.log(`Found ${londonDayTrips.length} day trip competitors in London:`);
  londonDayTrips.forEach((activity, index) => {
    console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
    console.log(`   Provider: ${activity.providerName}`);
    console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Region: "${activity.region}" | Platform: ${activity.platform}`);
  });

  // Check if any Madrid activities are incorrectly in London
  console.log('\n🚨 CHECKING FOR MADRID ACTIVITIES IN LONDON:');
  const madridInLondon = await prisma.cleanedActivity.findMany({
    where: {
      city: 'London',
      OR: [
        { activityName: { contains: 'Madrid', mode: 'insensitive' } },
        { activityName: { contains: 'Segovia', mode: 'insensitive' } },
        { activityName: { contains: 'Guadarrama', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      activityName: true,
      providerName: true,
      city: true,
      location: true,
      region: true,
      platform: true
    }
  });

  if (madridInLondon.length > 0) {
    console.log(`❌ Found ${madridInLondon.length} Madrid-related activities incorrectly in London:`);
    madridInLondon.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName}"`);
      console.log(`   Provider: ${activity.providerName} | City: ${activity.city}`);
    });
  } else {
    console.log('✅ No Madrid activities found in London - fix successful!');
  }

  // Check overall city distribution
  console.log('\n🏙️ FINAL CITY DISTRIBUTION:');
  const cityDistribution = await prisma.cleanedActivity.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  cityDistribution.forEach((item, index) => {
    console.log(`${index + 1}. ${item.city || 'Unknown'}: ${item._count?.id || 0} activities`);
  });

  await prisma.$disconnect();
}

verifyCityFix().catch(console.error); 