"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// City mapping based on location patterns
const CITY_MAPPING = {
    // UK locations - all map to London as requested
    'London': 'London',
    'London Heathrow Airport': 'London',
    'Emirates Stadium, London': 'London',
    'Stamford Bridge, London': 'London',
    'Unknown Location': 'Unknown', // Keep as unknown for now
    // European cities
    'Vienna': 'Vienna',
    'City Center, Vienna': 'Vienna',
    'Schönbrunn Palace, Vienna': 'Vienna',
    'Amsterdam': 'Amsterdam',
    'Amsterdam, Netherlands': 'Amsterdam',
    'Madrid': 'Madrid',
    'Madrid, Spain': 'Madrid',
    'Prado Museum, Madrid': 'Madrid',
    'Retiro Park, Madrid': 'Madrid',
    'Madrid region': 'Madrid',
    'Rome': 'Rome',
    'Galleria Borghese, Rome': 'Rome',
    'Barcelona': 'Barcelona',
    'Toledo': 'Toledo',
    'Toledo, Spain': 'Toledo',
    // Netherlands cities
    'Urmond, Netherlands': 'Urmond',
    'Dordrecht, Netherlands': 'Dordrecht',
    'Arnhem, Netherlands': 'Arnhem',
};
// Function to extract city from location
function extractCityFromLocation(location, region) {
    if (!location || location === 'Unknown Location') {
        return 'Unknown';
    }
    // Check exact matches first
    if (CITY_MAPPING[location]) {
        return CITY_MAPPING[location];
    }
    // Check if location contains city names
    const locationLower = location.toLowerCase();
    // UK cities - all map to London
    if (region === 'UK' || locationLower.includes('london')) {
        return 'London';
    }
    // European cities
    if (locationLower.includes('vienna'))
        return 'Vienna';
    if (locationLower.includes('amsterdam'))
        return 'Amsterdam';
    if (locationLower.includes('madrid'))
        return 'Madrid';
    if (locationLower.includes('rome'))
        return 'Rome';
    if (locationLower.includes('barcelona'))
        return 'Barcelona';
    if (locationLower.includes('paris'))
        return 'Paris';
    if (locationLower.includes('berlin'))
        return 'Berlin';
    if (locationLower.includes('milan'))
        return 'Milan';
    if (locationLower.includes('florence'))
        return 'Florence';
    if (locationLower.includes('venice'))
        return 'Venice';
    if (locationLower.includes('prague'))
        return 'Prague';
    if (locationLower.includes('budapest'))
        return 'Budapest';
    if (locationLower.includes('lisbon'))
        return 'Lisbon';
    if (locationLower.includes('porto'))
        return 'Porto';
    if (locationLower.includes('seville'))
        return 'Seville';
    if (locationLower.includes('granada'))
        return 'Granada';
    if (locationLower.includes('valencia'))
        return 'Valencia';
    if (locationLower.includes('bilbao'))
        return 'Bilbao';
    if (locationLower.includes('rotterdam'))
        return 'Rotterdam';
    if (locationLower.includes('the hague'))
        return 'The Hague';
    if (locationLower.includes('utrecht'))
        return 'Utrecht';
    if (locationLower.includes('eindhoven'))
        return 'Eindhoven';
    if (locationLower.includes('groningen'))
        return 'Groningen';
    if (locationLower.includes('salzburg'))
        return 'Salzburg';
    if (locationLower.includes('innsbruck'))
        return 'Innsbruck';
    if (locationLower.includes('linz'))
        return 'Linz';
    if (locationLower.includes('graz'))
        return 'Graz';
    if (locationLower.includes('klagenfurt'))
        return 'Klagenfurt';
    // If no match found, return the location as is (could be a specific venue)
    return location;
}
async function backfillCityData() {
    console.log('🏙️ BACKFILLING CITY DATA...\n');
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
    console.log(`📊 Found ${activitiesToUpdate.length} activities needing city backfill`);
    // Process in batches to avoid memory issues
    const batchSize = 100;
    let updatedCount = 0;
    let skippedCount = 0;
    for (let i = 0; i < activitiesToUpdate.length; i += batchSize) {
        const batch = activitiesToUpdate.slice(i, i + batchSize);
        console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activitiesToUpdate.length / batchSize)}`);
        for (const activity of batch) {
            const newCity = extractCityFromLocation(activity.location, activity.region);
            if (newCity !== 'Unknown') {
                try {
                    await prisma.cleanedActivity.update({
                        where: { id: activity.id },
                        data: { city: newCity }
                    });
                    updatedCount++;
                    if (updatedCount <= 10) { // Show first 10 updates as examples
                        console.log(`✅ Updated: "${activity.activityName.substring(0, 50)}..."`);
                        console.log(`   Location: "${activity.location}" → City: "${newCity}"`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error updating ${activity.id}:`, error);
                }
            }
            else {
                skippedCount++;
                if (skippedCount <= 5) { // Show first 5 skips as examples
                    console.log(`⏭️  Skipped: "${activity.activityName.substring(0, 50)}..."`);
                    console.log(`   Location: "${activity.location}" → Could not determine city`);
                }
            }
        }
    }
    console.log(`\n📈 BACKFILL RESULTS:`);
    console.log(`✅ Updated: ${updatedCount} activities`);
    console.log(`⏭️  Skipped: ${skippedCount} activities (could not determine city)`);
    console.log(`📊 Success rate: ${((updatedCount / activitiesToUpdate.length) * 100).toFixed(1)}%`);
    // Show summary of city distribution
    console.log(`\n🏙️ CITY DISTRIBUTION AFTER BACKFILL:`);
    const cityDistribution = await prisma.cleanedActivity.groupBy({
        by: ['city'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15
    });
    cityDistribution.forEach((item, index) => {
        console.log(`${index + 1}. ${item.city || 'Unknown'}: ${item._count?.id || 0} activities`);
    });
    await prisma.$disconnect();
}
backfillCityData().catch(console.error);
//# sourceMappingURL=backfill-city-data.js.map