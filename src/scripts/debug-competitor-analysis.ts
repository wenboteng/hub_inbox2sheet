import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCompetitorAnalysis() {
  console.log('🔍 DEBUGGING COMPETITOR ANALYSIS...\n');

  // Check Evan Evans Tours activities
  console.log('📊 EVAN EVANS TOURS ACTIVITIES:');
  const evanEvansActivities = await prisma.cleanedActivity.findMany({
    where: {
      providerName: 'Evan Evans Tours'
    },
    select: {
      id: true,
      activityName: true,
      city: true,
      location: true,
      region: true,
      platform: true
    }
  });

  console.log(`Found ${evanEvansActivities.length} Evan Evans activities:`);
  evanEvansActivities.forEach((activity, index) => {
    console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
    console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Region: "${activity.region}" | Platform: ${activity.platform}`);
  });

  // Check what activities are being found as competitors for day trips in London
  console.log('\n🎯 DAY TRIP COMPETITORS IN LONDON:');
  const dayTripCompetitors = await prisma.cleanedActivity.findMany({
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

  console.log(`Found ${dayTripCompetitors.length} day trip competitors in London:`);
  dayTripCompetitors.forEach((activity, index) => {
    console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
    console.log(`   Provider: ${activity.providerName}`);
    console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Region: "${activity.region}" | Platform: ${activity.platform}`);
  });

  // Check for Madrid activities that might be incorrectly categorized
  console.log('\n🇪🇸 MADRID ACTIVITIES WITH "day trip" IN NAME:');
  const madridDayTrips = await prisma.cleanedActivity.findMany({
    where: {
      OR: [
        { city: 'Madrid' },
        { location: { contains: 'Madrid' } }
      ],
      activityName: {
        contains: 'day trip',
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
    },
    take: 10
  });

  console.log(`Found ${madridDayTrips.length} Madrid day trip activities:`);
  madridDayTrips.forEach((activity, index) => {
    console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
    console.log(`   Provider: ${activity.providerName}`);
    console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Region: "${activity.region}" | Platform: ${activity.platform}`);
  });

  // Check the specific activities mentioned in the screenshot
  console.log('\n🔍 SPECIFIC ACTIVITIES FROM SCREENSHOT:');
  const specificActivities = [
    'Madrid: Hiking & Visit Segovia Day Trip with Transport',
    'Stonehenge Morning Day Trip with Admission',
    'London: Harry Potter Studio Tour and Oxford Day Trip',
    'From Madrid: Day Trip to Guadarrama National Park'
  ];

  for (const activityName of specificActivities) {
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

  await prisma.$disconnect();
}

debugCompetitorAnalysis().catch(console.error); 