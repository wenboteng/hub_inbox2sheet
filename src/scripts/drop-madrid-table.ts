import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropMadridTable() {
  console.log('🗑️ DROPPING IMPORTED MADRID ACTIVITY TABLE...\n');

  try {
    // First, let's check what's in the table
    console.log('📊 CHECKING TABLE CONTENTS:');
    console.log('============================');
    
    const totalCount = await prisma.importedMadridActivity.count();
    console.log(`Total activities in ImportedMadridActivity: ${totalCount}`);
    
    if (totalCount > 0) {
      // Show sample data
      const sampleData = await prisma.importedMadridActivity.findMany({
        select: {
          id: true,
          activityName: true,
          city: true,
          priceNumeric: true,
          ratingNumeric: true
        },
        take: 5
      });
      
      console.log('\nSample data from ImportedMadridActivity:');
      sampleData.forEach((item, index) => {
        console.log(`${index + 1}. "${item.activityName.substring(0, 50)}..."`);
        console.log(`   City: "${item.city}" | Price: ${item.priceNumeric} | Rating: ${item.ratingNumeric}`);
      });
    }
    
    // Check if this table is referenced in CleanedActivity
    console.log('\n🔍 CHECKING FOR REFERENCES:');
    console.log('============================');
    
    const cleanedActivitiesFromMadrid = await prisma.cleanedActivity.count({
      where: {
        originalSource: 'viator'
      }
    });
    
    console.log(`Cleaned activities from Viator source: ${cleanedActivitiesFromMadrid}`);
    
    if (cleanedActivitiesFromMadrid > 0) {
      console.log('⚠️  WARNING: There are cleaned activities that reference Viator source');
      console.log('   These might be affected if we drop the Madrid table');
      
      const sampleCleaned = await prisma.cleanedActivity.findMany({
        where: {
          originalSource: 'viator'
        },
        select: {
          id: true,
          activityName: true,
          city: true,
          originalSource: true,
          platform: true
        },
        take: 5
      });
      
      console.log('\nSample cleaned activities from Viator:');
      sampleCleaned.forEach((item, index) => {
        console.log(`${index + 1}. "${item.activityName.substring(0, 50)}..."`);
        console.log(`   City: "${item.city}" | Source: ${item.originalSource} | Platform: ${item.platform}`);
      });
    }
    
    // Confirm with user
    console.log('\n❓ CONFIRMATION:');
    console.log('================');
    console.log(`Are you sure you want to drop the ImportedMadridActivity table?`);
    console.log(`- This will remove ${totalCount} activities from the table`);
    console.log(`- The cleaned activities will remain (${cleanedActivitiesFromMadrid} from Viator source)`);
    console.log(`- This will help avoid confusion with London data analysis`);
    console.log(`- Madrid-specific analysis scripts will need to be updated`);
    
    // For safety, let's not auto-drop. Instead, provide instructions
    console.log('\n📋 SAFE DROP INSTRUCTIONS:');
    console.log('===========================');
    console.log('1. Use your database interface to drop the table');
    console.log('2. Or run this SQL command: DROP TABLE "ImportedMadridActivity";');
    console.log('3. Update the Prisma schema to remove the model');
    console.log('4. Run: npx prisma generate');
    console.log('5. Update any scripts that reference this table');
    
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    console.log('=======================');
    console.log('1. ✅ Drop the ImportedMadridActivity table (safe to do)');
    console.log('2. ✅ Keep the CleanedActivity table (contains processed data)');
    console.log('3. ✅ Focus on London data analysis with the remaining 1,024 activities');
    console.log('4. ⚠️  Update Madrid-specific scripts if needed later');
    
    console.log('\n💡 BENEFITS OF DROPPING THIS TABLE:');
    console.log('====================================');
    console.log('- Eliminates confusion about data sources');
    console.log('- Simplifies London data analysis');
    console.log('- Reduces database complexity');
    console.log('- Focuses on the main data pipeline (GYG → CleanedActivity)');
    
  } catch (error) {
    console.error('❌ Error analyzing Madrid table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

dropMadridTable().catch(console.error); 