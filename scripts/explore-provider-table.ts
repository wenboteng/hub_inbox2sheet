import { gygPrisma } from '../src/lib/dual-prisma.js';

async function exploreProviderTable() {
  console.log('🔍 EXPLORING PROVIDER TABLE IN GYG DATABASE...\n');

  try {
    await gygPrisma.$connect();
    console.log('✅ Connected to GYG database');

    // Get Provider table schema
    console.log('📊 PROVIDER TABLE SCHEMA:');
    const providerColumns = await gygPrisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Provider'
      ORDER BY ordinal_position
    `;
    
    (providerColumns as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Get total count
    const count = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Provider"
    `;
    console.log(`\n📊 Total providers: ${(count as any[])[0]?.count}`);

    // Get sample data
    console.log('\n📋 SAMPLE PROVIDER DATA:');
    const sampleProviders = await gygPrisma.$queryRaw`
      SELECT * FROM "Provider" LIMIT 5
    `;
    
    console.log('Sample records:');
    (sampleProviders as any[]).forEach((provider: any, index: number) => {
      console.log(`\n  Record ${index + 1}:`);
      Object.entries(provider).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    });

    // Get some basic statistics
    console.log('\n📈 PROVIDER STATISTICS:');
    
    // Check if there are any unique fields we can analyze
    const uniqueFields = await gygPrisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Provider' 
        AND (column_name LIKE '%name%' OR column_name LIKE '%email%' OR column_name LIKE '%phone%')
    `;
    
    console.log('Potential unique fields for analysis:');
    (uniqueFields as any[]).forEach((field: any) => {
      console.log(`  - ${field.column_name}`);
    });

    console.log('\n✅ Provider table exploration completed!');

  } catch (error) {
    console.error('❌ Error exploring provider table:', error);
  } finally {
    await gygPrisma.$disconnect();
  }
}

if (require.main === module) {
  exploreProviderTable();
} 