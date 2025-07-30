import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// City detection patterns from activity names
const CITY_PATTERNS = {
  'London': [
    'london', 'londres', 'londra', 'london eye', 'buckingham', 'westminster', 
    'stonehenge', 'windsor', 'bath', 'oxford', 'cotswolds', 'downton abbey',
    'hampton court', 'tower of london', 'big ben', 'thames', 'chelsea',
    'arsenal', 'emirates stadium', 'stamford bridge', 'paddington'
  ],
  'Madrid': [
    'madrid', 'prado', 'retiro', 'alcazar', 'toledo', 'segovia', 'guadarrama',
    'granada', 'valencia', 'bilbao', 'seville', 'andalucia'
  ],
  'Vienna': [
    'vienna', 'wien', 'schönbrunn', 'belvedere', 'st stephan', 'hofburg',
    'salzburg', 'hallstatt', 'innsbruck', 'austria'
  ],
  'Rome': [
    'rome', 'roma', 'colosseum', 'vatican', 'sistine', 'pantheon', 'forum',
    'trevi', 'borghese', 'trastevere', 'italy', 'florence', 'venice', 'milan'
  ],
  'Amsterdam': [
    'amsterdam', 'netherlands', 'holland', 'canal', 'rijksmuseum', 'van gogh',
    'anne frank', 'keukenhof', 'rotterdam', 'the hague', 'utrecht'
  ],
  'Paris': [
    'paris', 'eiffel', 'louvre', 'notre dame', 'champs elysees', 'arc de triomphe',
    'versailles', 'montmartre', 'seine', 'france'
  ],
  'Barcelona': [
    'barcelona', 'sagrada familia', 'park guell', 'catalonia', 'catalunya',
    'gothic quarter', 'ramblas', 'montjuic'
  ],
  'Berlin': [
    'berlin', 'brandenburg gate', 'reichstag', 'checkpoint charlie',
    'museum island', 'germany', 'munich', 'hamburg'
  ],
  'Prague': [
    'prague', 'prag', 'charles bridge', 'old town square', 'prague castle',
    'czech', 'czech republic'
  ],
  'Budapest': [
    'budapest', 'hungary', 'parliament', 'chain bridge', 'buda castle',
    'thermal baths', 'danube'
  ]
};

// Function to detect city from activity name
function detectCityFromActivityName(activityName: string, region: string | null): string {
  const nameLower = activityName.toLowerCase();
  
  // First check if region gives us a clue
  if (region === 'UK') {
    return 'London';
  }
  
  // Check each city's patterns
  for (const [city, patterns] of Object.entries(CITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (nameLower.includes(pattern)) {
        return city;
      }
    }
  }
  
  // Check for "from [city]" or "to [city]" patterns
  const fromMatch = nameLower.match(/from\s+([a-z]+)/);
  if (fromMatch) {
    const fromCity = fromMatch[1];
    for (const city of Object.keys(CITY_PATTERNS)) {
      if (fromCity.includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  
  const toMatch = nameLower.match(/to\s+([a-z]+)/);
  if (toMatch) {
    const toCity = toMatch[1];
    for (const city of Object.keys(CITY_PATTERNS)) {
      if (toCity.includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  
  return 'Unknown';
}

async function smartCityBackfill() {
  console.log('🧠 SMART CITY BACKFILL USING ACTIVITY NAMES...\n');
  
  // Get all activities that need city backfill
  const activitiesToUpdate = await prisma.cleanedActivity.findMany({
    where: {
      OR: [
        { city: 'Unknown' },
        { city: '' }
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
      platform: true
    }
  });
  
  console.log(`📊 Found ${activitiesToUpdate.length} activities needing smart city backfill`);
  
  // Process in batches
  const batchSize = 100;
  let updatedCount = 0;
  let skippedCount = 0;
  let cityStats: { [key: string]: number } = {};
  
  for (let i = 0; i < activitiesToUpdate.length; i += batchSize) {
    const batch = activitiesToUpdate.slice(i, i + batchSize);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activitiesToUpdate.length / batchSize)}`);
    
    for (const activity of batch) {
      const detectedCity = detectCityFromActivityName(activity.activityName, activity.region);
      
      if (detectedCity !== 'Unknown') {
        try {
          await prisma.cleanedActivity.update({
            where: { id: activity.id },
            data: { city: detectedCity }
          });
          updatedCount++;
          
          // Track city statistics
          cityStats[detectedCity] = (cityStats[detectedCity] || 0) + 1;
          
          if (updatedCount <= 10) { // Show first 10 updates as examples
            console.log(`✅ Updated: "${activity.activityName.substring(0, 50)}..."`);
            console.log(`   Detected City: "${detectedCity}" (from activity name)`);
          }
        } catch (error) {
          console.error(`❌ Error updating ${activity.id}:`, error);
        }
      } else {
        skippedCount++;
        if (skippedCount <= 5) { // Show first 5 skips as examples
          console.log(`⏭️  Skipped: "${activity.activityName.substring(0, 50)}..."`);
          console.log(`   Could not detect city from name`);
        }
      }
    }
  }
  
  console.log(`\n📈 SMART BACKFILL RESULTS:`);
  console.log(`✅ Updated: ${updatedCount} activities`);
  console.log(`⏭️  Skipped: ${skippedCount} activities (could not detect city)`);
  console.log(`📊 Success rate: ${((updatedCount / activitiesToUpdate.length) * 100).toFixed(1)}%`);
  
  // Show city distribution
  console.log(`\n🏙️ CITY DISTRIBUTION FROM SMART BACKFILL:`);
  Object.entries(cityStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([city, count]) => {
      console.log(`${city}: ${count} activities`);
    });
  
  // Show final city distribution
  console.log(`\n🏙️ FINAL CITY DISTRIBUTION:`);
  const finalCityDistribution = await prisma.cleanedActivity.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 15
  });
  
  finalCityDistribution.forEach((item, index) => {
    console.log(`${index + 1}. ${item.city || 'Unknown'}: ${item._count?.id || 0} activities`);
  });
  
  await prisma.$disconnect();
}

smartCityBackfill().catch(console.error); 