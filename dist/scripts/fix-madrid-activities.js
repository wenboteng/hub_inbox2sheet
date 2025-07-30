"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Madrid-specific patterns that should override the general backfill
const MADRID_PATTERNS = [
    'madrid:', 'from madrid:', 'to madrid:', 'madrid to', 'madrid -',
    'segovia', 'toledo', 'guadarrama', 'alcazar', 'prado', 'retiro',
    'santiago bernabeu', 'reina sofia', 'thyssen', 'salamanca', 'avila',
    'cordoba', 'andalucia', 'andalusia', 'flamenco', 'tapas', 'sangria'
];
// Function to check if activity should be Madrid
function shouldBeMadrid(activityName) {
    const nameLower = activityName.toLowerCase();
    for (const pattern of MADRID_PATTERNS) {
        if (nameLower.includes(pattern)) {
            return true;
        }
    }
    return false;
}
async function fixMadridActivities() {
    console.log('🔧 FIXING MADRID ACTIVITIES INCORRECTLY IN LONDON...\n');
    // Find all activities in London that should actually be Madrid
    const activitiesToFix = await prisma.cleanedActivity.findMany({
        where: {
            city: 'London'
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
    console.log(`📊 Checking ${activitiesToFix.length} London activities for Madrid misclassifications...`);
    let fixedCount = 0;
    let checkedCount = 0;
    for (const activity of activitiesToFix) {
        checkedCount++;
        if (shouldBeMadrid(activity.activityName)) {
            try {
                await prisma.cleanedActivity.update({
                    where: { id: activity.id },
                    data: { city: 'Madrid' }
                });
                fixedCount++;
                if (fixedCount <= 10) { // Show first 10 fixes as examples
                    console.log(`✅ Fixed: "${activity.activityName.substring(0, 60)}..."`);
                    console.log(`   Changed from London to Madrid`);
                }
            }
            catch (error) {
                console.error(`❌ Error fixing ${activity.id}:`, error);
            }
        }
        // Show progress every 100 activities
        if (checkedCount % 100 === 0) {
            console.log(`🔄 Checked ${checkedCount}/${activitiesToFix.length} activities...`);
        }
    }
    console.log(`\n📈 MADRID FIX RESULTS:`);
    console.log(`✅ Fixed: ${fixedCount} activities (London → Madrid)`);
    console.log(`📊 Checked: ${checkedCount} activities`);
    // Show updated city distribution
    console.log(`\n🏙️ UPDATED CITY DISTRIBUTION:`);
    const cityDistribution = await prisma.cleanedActivity.groupBy({
        by: ['city'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
    });
    cityDistribution.forEach((item, index) => {
        console.log(`${index + 1}. ${item.city || 'Unknown'}: ${item._count?.id || 0} activities`);
    });
    // Verify the fix
    console.log(`\n🔍 VERIFYING FIX:`);
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
            city: true
        },
        take: 5
    });
    if (madridInLondon.length > 0) {
        console.log(`⚠️  Still found ${madridInLondon.length} Madrid-related activities in London:`);
        madridInLondon.forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activityName}"`);
        });
    }
    else {
        console.log('✅ No Madrid activities found in London - fix successful!');
    }
    await prisma.$disconnect();
}
fixMadridActivities().catch(console.error);
//# sourceMappingURL=fix-madrid-activities.js.map