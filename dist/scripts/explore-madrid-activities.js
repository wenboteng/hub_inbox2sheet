"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_1 = require("../lib/dual-prisma");
async function exploreMadridActivities() {
    console.log('🔍 EXPLORING MADRID ACTIVITIES TABLE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        console.log('✅ Connected to GYG database');
        // Get table schema
        console.log('📊 MADRID ACTIVITIES TABLE SCHEMA:');
        const madridColumns = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'madrid_activities'
      ORDER BY ordinal_position
    `;
        madridColumns.forEach((col) => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        // Get record count
        const count = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT COUNT(*) as count FROM madrid_activities
    `;
        console.log(`\n📊 Total madrid activities: ${count[0]?.count}`);
        // Get sample data
        console.log('\n📋 SAMPLE MADRID ACTIVITIES DATA:');
        const sampleMadridActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT * FROM madrid_activities LIMIT 3
    `;
        console.log('Sample records:');
        sampleMadridActivities.forEach((activity, index) => {
            console.log(`\n  Record ${index + 1}:`);
            Object.entries(activity).forEach(([key, value]) => {
                // Truncate long values for readability
                const displayValue = typeof value === 'string' && value.length > 100
                    ? value.substring(0, 100) + '...'
                    : value;
                console.log(`    ${key}: ${displayValue}`);
            });
        });
        // Check if it has similar structure to activities table
        console.log('\n🔍 COMPARING WITH MAIN ACTIVITIES TABLE:');
        const activitiesColumns = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'activities'
      ORDER BY ordinal_position
    `;
        const madridColumnNames = madridColumns.map((col) => col.column_name);
        const activitiesColumnNames = activitiesColumns.map((col) => col.column_name);
        const commonColumns = madridColumnNames.filter(col => activitiesColumnNames.includes(col));
        const uniqueToMadrid = madridColumnNames.filter(col => !activitiesColumnNames.includes(col));
        const uniqueToActivities = activitiesColumnNames.filter(col => !madridColumnNames.includes(col));
        console.log(`✅ Common columns: ${commonColumns.length}`);
        console.log(`🆕 Unique to Madrid: ${uniqueToMadrid.length} (${uniqueToMadrid.join(', ')})`);
        console.log(`🆕 Unique to Activities: ${uniqueToActivities.length} (${uniqueToActivities.join(', ')})`);
        // Check data quality
        console.log('\n📈 MADRID ACTIVITIES DATA QUALITY:');
        const qualityStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activity_name IS NOT NULL AND activity_name != '' THEN 1 END) as has_name,
        COUNT(CASE WHEN provider_name IS NOT NULL AND provider_name != '' THEN 1 END) as has_provider,
        COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as has_location,
        COUNT(CASE WHEN price IS NOT NULL AND price != '' THEN 1 END) as has_price,
        COUNT(CASE WHEN rating IS NOT NULL AND rating != '' THEN 1 END) as has_rating
      FROM madrid_activities
    `;
        const stats = qualityStats[0];
        console.log(`   Total records: ${stats.total}`);
        console.log(`   Has activity name: ${stats.has_name} (${((stats.has_name / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Has provider name: ${stats.has_provider} (${((stats.has_provider / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Has location: ${stats.has_location} (${((stats.has_location / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Has price: ${stats.has_price} (${((stats.has_price / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Has rating: ${stats.has_rating} (${((stats.has_rating / stats.total) * 100).toFixed(1)}%)`);
        console.log('\n✅ Madrid activities exploration completed!');
    }
    catch (error) {
        console.error('❌ Error exploring Madrid activities:', error);
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
    }
}
// Run the exploration
exploreMadridActivities().catch(console.error);
//# sourceMappingURL=explore-madrid-activities.js.map