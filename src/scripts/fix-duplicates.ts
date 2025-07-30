import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  key: string;
  activities: any[];
  count: number;
}

async function findDuplicates() {
  console.log('🔍 Finding duplicate activities...');
  
  // Get all activities
  const activities = await prisma.importedGYGActivity.findMany({
    orderBy: { importedAt: 'desc' }
  });
  
  console.log(`📊 Total activities: ${activities.length}`);
  
  // Group by activity name and provider
  const groups: { [key: string]: any[] } = {};
  
  activities.forEach(activity => {
    const key = `${activity.activityName}|${activity.providerName}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  });
  
  // Find duplicates
  const duplicates: DuplicateGroup[] = [];
  
  Object.entries(groups).forEach(([key, activities]) => {
    if (activities.length > 1) {
      duplicates.push({
        key,
        activities,
        count: activities.length
      });
    }
  });
  
  // Sort by count (most duplicates first)
  duplicates.sort((a, b) => b.count - a.count);
  
  console.log(`🚨 Found ${duplicates.length} duplicate groups`);
  console.log(`📈 Total duplicate activities: ${duplicates.reduce((sum, group) => sum + group.count, 0)}`);
  
  // Show top 10 duplicates
  console.log('\n🔝 TOP 10 DUPLICATE ACTIVITIES:');
  duplicates.slice(0, 10).forEach((group, index) => {
    const [activityName, providerName] = group.key.split('|');
    console.log(`${index + 1}. "${activityName}" by ${providerName} (${group.count} duplicates)`);
    
    // Show details of each duplicate
    group.activities.forEach((activity, i) => {
      console.log(`   ${i + 1}. ID: ${activity.id}, Platform: ${activity.platform}, Imported: ${activity.importedAt}`);
    });
    console.log('');
  });
  
  return duplicates;
}

async function fixDuplicates(duplicates: DuplicateGroup[]) {
  console.log('\n🔧 Fixing duplicates...');
  
  let totalRemoved = 0;
  let totalKept = 0;
  
  for (const group of duplicates) {
    const [activityName, providerName] = group.key.split('|');
    
    // Sort by import date (keep the most recent)
    const sortedActivities = group.activities.sort((a, b) => 
      new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
    );
    
    // Keep the most recent one, remove the rest
    const toKeep = sortedActivities[0];
    const toRemove = sortedActivities.slice(1);
    
    console.log(`📝 "${activityName}" by ${providerName}:`);
    console.log(`   ✅ Keeping: ${toKeep.id} (imported: ${toKeep.importedAt})`);
    
    // Remove duplicates
    for (const activity of toRemove) {
      try {
        await prisma.importedGYGActivity.delete({
          where: { id: activity.id }
        });
        console.log(`   ❌ Removed: ${activity.id} (imported: ${activity.importedAt})`);
        totalRemoved++;
      } catch (error) {
        console.error(`   ⚠️  Error removing ${activity.id}:`, error);
      }
    }
    
    totalKept++;
  }
  
  console.log(`\n📊 Duplicate Fix Results:`);
  console.log(`✅ Kept: ${totalKept} unique activities`);
  console.log(`❌ Removed: ${totalRemoved} duplicate activities`);
  
  return { totalKept, totalRemoved };
}

async function cleanCleanedActivities() {
  console.log('\n🧹 Cleaning the cleaned_activities table...');
  
  // Remove all existing cleaned activities
  const deletedCount = await prisma.cleanedActivity.deleteMany({});
  console.log(`🗑️  Removed ${deletedCount.count} existing cleaned activities`);
  
  // Re-run the cleaning pipeline
  console.log('🔄 Re-running cleaning pipeline...');
  
  // Re-run the cleaning pipeline
  console.log('🔄 Re-running cleaning pipeline...');
  const { execSync } = require('child_process');
  execSync('npx tsx src/scripts/data-cleaning-pipeline.ts', { stdio: 'inherit' });
}

async function main() {
  try {
    console.log('🚀 Starting duplicate detection and fix process...\n');
    
    // Step 1: Find duplicates
    const duplicates = await findDuplicates();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    // Step 2: Fix duplicates
    const { totalKept, totalRemoved } = await fixDuplicates(duplicates);
    
    // Step 3: Clean and re-run cleaning pipeline
    await cleanCleanedActivities();
    
    console.log('\n🎉 Duplicate fix process completed!');
    console.log(`📈 Final stats: Kept ${totalKept} unique activities, removed ${totalRemoved} duplicates`);
    
  } catch (error) {
    console.error('❌ Error during duplicate fix process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main(); 