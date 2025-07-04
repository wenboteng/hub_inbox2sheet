import { gygPrisma } from '../lib/dual-prisma';

async function exploreGYGSchema() {
  console.log('🔍 EXPLORING GYG DATABASE SCHEMA...\n');

  try {
    await gygPrisma.$connect();
    console.log('✅ Connected to GYG database');

    // Get table information
    const tables = await gygPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Available tables:');
    (tables as any[]).forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });

    // Explore activities table schema
    console.log('\n📊 ACTIVITIES TABLE SCHEMA:');
    const activitiesColumns = await gygPrisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'activities'
      ORDER BY ordinal_position
    `;
    
    (activitiesColumns as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Get sample data from activities
    console.log('\n📋 SAMPLE ACTIVITIES DATA:');
    const sampleActivities = await gygPrisma.$queryRaw`
      SELECT * FROM activities LIMIT 3
    `;
    
    console.log('Sample records:');
    (sampleActivities as any[]).forEach((activity: any, index: number) => {
      console.log(`\n  Record ${index + 1}:`);
      Object.entries(activity).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    });

    // Get record count
    const count = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count FROM activities
    `;
    console.log(`\n📊 Total activities: ${(count as any[])[0]?.count}`);

    // Explore other interesting tables
    console.log('\n🔍 EXPLORING OTHER TABLES:');
    
    // Check Provider table
    try {
      const providerCount = await gygPrisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Provider"
      `;
      console.log(`  - Provider table: ${(providerCount as any[])[0]?.count} records`);
    } catch (error) {
      console.log('  - Provider table: Error accessing');
    }

    // Check pricing_analysis table
    try {
      const pricingCount = await gygPrisma.$queryRaw`
        SELECT COUNT(*) as count FROM pricing_analysis
      `;
      console.log(`  - pricing_analysis table: ${(pricingCount as any[])[0]?.count} records`);
    } catch (error) {
      console.log('  - pricing_analysis table: Error accessing');
    }

    // Check market_segments_summary table
    try {
      const marketCount = await gygPrisma.$queryRaw`
        SELECT COUNT(*) as count FROM market_segments_summary
      `;
      console.log(`  - market_segments_summary table: ${(marketCount as any[])[0]?.count} records`);
    } catch (error) {
      console.log('  - market_segments_summary table: Error accessing');
    }

    console.log('\n✅ Schema exploration completed!');

  } catch (error) {
    console.error('❌ Error exploring schema:', error);
  } finally {
    await gygPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  exploreGYGSchema().catch(console.error);
}

export { exploreGYGSchema }; 