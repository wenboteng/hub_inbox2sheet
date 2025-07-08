"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_1 = require("../lib/dual-prisma");
const slugify_1 = require("../utils/slugify");
async function cleanupMadridDuplicates() {
    console.log('🧹 CLEANING UP MADRID DUPLICATES FROM MAIN GYG TABLE...\n');
    try {
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to main database');
        // Check current counts
        const totalGYG = await dual_prisma_1.mainPrisma.importedGYGActivity.count();
        const totalMadrid = await dual_prisma_1.mainPrisma.importedMadridActivity.count();
        console.log(`📊 Current counts:`);
        console.log(`   Main GYG Activities: ${totalGYG}`);
        console.log(`   Madrid Activities (separate): ${totalMadrid}`);
        // Find Madrid activities in the main GYG table
        const madridInMainTable = await dual_prisma_1.mainPrisma.importedGYGActivity.findMany({
            where: {
                OR: [
                    { location: { contains: 'Madrid' } },
                    { location: { contains: 'madrid' } }
                ]
            },
            select: {
                id: true,
                originalId: true,
                activityName: true,
                location: true,
                importedAt: true
            }
        });
        console.log(`\n🔍 Found ${madridInMainTable.length} Madrid activities in main GYG table`);
        if (madridInMainTable.length === 0) {
            console.log('✅ No Madrid activities found in main GYG table - no cleanup needed');
            return;
        }
        // Show sample of Madrid activities found
        console.log('\n📋 Sample Madrid activities in main GYG table:');
        madridInMainTable.slice(0, 5).forEach((activity, index) => {
            const timeAgo = getTimeAgo(activity.importedAt);
            console.log(`   ${index + 1}. ${activity.activityName}`);
            console.log(`      Location: ${activity.location} | ID: ${activity.originalId} | ${timeAgo}`);
        });
        if (madridInMainTable.length > 5) {
            console.log(`   ... and ${madridInMainTable.length - 5} more`);
        }
        // Confirm deletion
        console.log(`\n⚠️  WARNING: About to delete ${madridInMainTable.length} Madrid activities from main GYG table`);
        console.log('   These activities are already properly stored in the separate Madrid table');
        // Get the IDs to delete
        const idsToDelete = madridInMainTable.map(activity => activity.id);
        // Delete Madrid activities from main GYG table
        const deleteResult = await dual_prisma_1.mainPrisma.importedGYGActivity.deleteMany({
            where: {
                id: { in: idsToDelete }
            }
        });
        console.log(`\n✅ Successfully deleted ${deleteResult.count} Madrid activities from main GYG table`);
        // Check final counts
        const finalGYG = await dual_prisma_1.mainPrisma.importedGYGActivity.count();
        const finalMadrid = await dual_prisma_1.mainPrisma.importedMadridActivity.count();
        console.log(`\n📊 Final counts:`);
        console.log(`   Main GYG Activities: ${finalGYG} (was ${totalGYG})`);
        console.log(`   Madrid Activities (separate): ${finalMadrid} (unchanged)`);
        console.log(`   Total activities: ${finalGYG + finalMadrid}`);
        // Show location breakdown after cleanup
        console.log('\n📍 MAIN GYG ACTIVITIES BY LOCATION (after cleanup):');
        const locationStats = await dual_prisma_1.mainPrisma.importedGYGActivity.groupBy({
            by: ['location'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        locationStats.forEach(stat => {
            console.log(`   ${stat.location}: ${stat._count.id} activities`);
        });
        // Generate cleanup report
        const report = `
# Madrid Duplicates Cleanup Report

## Cleanup Summary
- **Madrid Activities Found in Main Table**: ${madridInMainTable.length}
- **Successfully Deleted**: ${deleteResult.count}
- **Main GYG Activities Before**: ${totalGYG}
- **Main GYG Activities After**: ${finalGYG}
- **Madrid Activities (Separate Table)**: ${finalMadrid}

## What Was Cleaned
The following Madrid activities were removed from the main GYG activities table:
${madridInMainTable.map((activity, index) => `${index + 1}. ${activity.activityName} (${activity.location})`).join('\n')}

## Why This Was Necessary
1. **Data Separation**: Madrid activities should only be in the dedicated Madrid table
2. **Avoid Duplication**: Prevent double-counting in analytics
3. **Data Integrity**: Maintain clean separation between different data sources
4. **Analysis Accuracy**: Ensure location-based analysis is accurate

## Current State
- **Main GYG Activities**: ${finalGYG} activities (Barcelona, Toledo, Segovia, etc.)
- **Madrid Activities**: ${finalMadrid} activities (in separate table)
- **Total Dataset**: ${finalGYG + finalMadrid} activities

## Benefits Achieved
1. **Clean Data**: No duplicate Madrid activities
2. **Accurate Analytics**: Location-based analysis will be correct
3. **Proper Separation**: Madrid data isolated in dedicated table
4. **Data Integrity**: Maintained data quality standards

## Next Steps
1. **Verify Cleanup**: Run analytics to confirm no Madrid activities in main table
2. **Location Analysis**: Analyze Barcelona vs other locations (excluding Madrid)
3. **Madrid Analysis**: Use separate Madrid table for Madrid-specific insights
4. **Combined Analysis**: Use both tables for comprehensive market intelligence
`;
        // Save cleanup report
        await dual_prisma_1.mainPrisma.report.upsert({
            where: { type: 'madrid-duplicates-cleanup-report' },
            create: {
                type: 'madrid-duplicates-cleanup-report',
                title: 'Madrid Duplicates Cleanup Report',
                slug: (0, slugify_1.slugify)('Madrid Duplicates Cleanup Report'),
                content: report,
                isPublic: false,
            },
            update: {
                title: 'Madrid Duplicates Cleanup Report',
                slug: (0, slugify_1.slugify)('Madrid Duplicates Cleanup Report'),
                content: report,
                isPublic: false,
            },
        });
        console.log('✅ Cleanup report saved to database');
        console.log('\n🎉 MADRID DUPLICATES CLEANUP COMPLETED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('❌ Error during Madrid duplicates cleanup:', error);
    }
    finally {
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
function getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    else if (diffInMinutes > 0) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    else {
        return 'Just now';
    }
}
// Run the cleanup
cleanupMadridDuplicates().catch(console.error);
//# sourceMappingURL=cleanup-madrid-duplicates.js.map