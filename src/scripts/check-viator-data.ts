import { gygPrisma } from '../lib/dual-prisma';

async function checkViatorData() {
  console.log('🔍 CHECKING VIATOR DATA IN GYG DATABASE...\n');

  try {
    await gygPrisma.$connect();
    
    // Check total count
    const totalCount = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM viator_activities`;
    console.log(`📊 Total Viator activities in GYG database: ${(totalCount as any[])[0].count}`);

    // Check sample data structure
    const sample = await gygPrisma.$queryRaw`SELECT * FROM viator_activities LIMIT 3`;
    console.log('\n📋 Sample Viator activity structure:');
    const sampleData = (sample as any[])[0];
    console.log(`ID: ${sampleData.id}`);
    console.log(`Name: ${sampleData.activity_name}`);
    console.log(`Provider: ${sampleData.provider_name}`);
    console.log(`Location: ${sampleData.location}`);
    console.log(`Price: ${sampleData.price}`);
    console.log(`Rating: ${sampleData.rating}`);

    // Check for null/missing required fields
    const missingFields = await gygPrisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN id IS NULL THEN 1 END) as missing_id,
        COUNT(CASE WHEN activity_name IS NULL OR activity_name = '' THEN 1 END) as missing_name,
        COUNT(CASE WHEN provider_name IS NULL OR provider_name = '' THEN 1 END) as missing_provider,
        COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as missing_location
      FROM viator_activities
    `;
    console.log('\n🔍 Missing fields analysis:');
    const missingData = (missingFields as any[])[0];
    console.log(`Total: ${missingData.total}`);
    console.log(`Missing ID: ${missingData.missing_id}`);
    console.log(`Missing Name: ${missingData.missing_name}`);
    console.log(`Missing Provider: ${missingData.missing_provider}`);
    console.log(`Missing Location: ${missingData.missing_location}`);

    // Check data quality
    const qualityCheck = await gygPrisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN price IS NOT NULL AND price != '' THEN 1 END) as has_price,
        COUNT(CASE WHEN rating IS NOT NULL AND rating != '' THEN 1 END) as has_rating,
        COUNT(CASE WHEN review_count IS NOT NULL AND review_count != '' THEN 1 END) as has_reviews,
        COUNT(CASE WHEN extraction_quality = 'high' THEN 1 END) as high_quality,
        COUNT(CASE WHEN extraction_quality = 'medium' THEN 1 END) as medium_quality,
        COUNT(CASE WHEN extraction_quality = 'low' THEN 1 END) as low_quality
      FROM viator_activities
    `;
    console.log('\n📈 Data quality analysis:');
    const qualityData = (qualityCheck as any[])[0];
    console.log(`Total: ${qualityData.total}`);
    console.log(`Has Price: ${qualityData.has_price}`);
    console.log(`Has Rating: ${qualityData.has_rating}`);
    console.log(`Has Reviews: ${qualityData.has_reviews}`);
    console.log(`High Quality: ${qualityData.high_quality}`);
    console.log(`Medium Quality: ${qualityData.medium_quality}`);
    console.log(`Low Quality: ${qualityData.low_quality}`);

    // Check activities that would pass our import filter
    const importableActivities = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM viator_activities 
      WHERE id IS NOT NULL 
        AND activity_name IS NOT NULL AND activity_name != ''
        AND provider_name IS NOT NULL AND provider_name != ''
        AND (location IS NOT NULL AND location != '')
    `;
    console.log(`\n✅ Activities that would pass import filter: ${(importableActivities as any[])[0].count}`);

    // Check activities with location data
    const activitiesWithLocation = await gygPrisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM viator_activities 
      WHERE location IS NOT NULL AND location != ''
    `;
    console.log(`📍 Activities with location data: ${(activitiesWithLocation as any[])[0].count}`);

    // Check top locations
    const topLocations = await gygPrisma.$queryRaw`
      SELECT location, COUNT(*) as count 
      FROM viator_activities 
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location 
      ORDER BY count DESC 
      LIMIT 10
    `;
    console.log('\n🌍 Top 10 locations:');
    (topLocations as any[]).forEach((row: any) => {
      console.log(`  ${row.location}: ${row.count} activities`);
    });

    // Check top providers
    const topProviders = await gygPrisma.$queryRaw`
      SELECT provider_name, COUNT(*) as count 
      FROM viator_activities 
      WHERE provider_name IS NOT NULL AND provider_name != ''
      GROUP BY provider_name 
      ORDER BY count DESC 
      LIMIT 10
    `;
    console.log('\n🏢 Top 10 providers:');
    (topProviders as any[]).forEach((row: any) => {
      console.log(`  ${row.provider_name}: ${row.count} activities`);
    });

    // Check activities without location but with other data
    const activitiesWithoutLocation = await gygPrisma.$queryRaw`
      SELECT id, activity_name, provider_name, price, rating
      FROM viator_activities 
      WHERE (location IS NULL OR location = '')
        AND activity_name IS NOT NULL AND activity_name != ''
      LIMIT 5
    `;
    console.log('\n⚠️  Sample activities without location:');
    (activitiesWithoutLocation as any[]).forEach((row: any) => {
      console.log(`  ID: ${row.id}, Name: ${row.activity_name}, Provider: ${row.provider_name}`);
    });

  } catch (error) {
    console.error('❌ Error checking Viator data:', error);
  } finally {
    await gygPrisma.$disconnect();
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkViatorData();
}

export { checkViatorData }; 