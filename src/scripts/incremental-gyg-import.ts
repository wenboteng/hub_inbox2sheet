import { mainPrisma, gygPrisma } from '../lib/dual-prisma';

async function incrementalGYGImport() {
  console.log('🔄 INCREMENTAL GYG DATA IMPORT...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Get the latest import timestamp from main database
    const latestImport = await mainPrisma.importedGYGActivity.findFirst({
      orderBy: { importedAt: 'desc' },
      select: { importedAt: true }
    });

    const lastImportTime = latestImport?.importedAt || new Date(0);
    console.log(`📅 Last import time: ${lastImportTime.toISOString()}`);

    // Get new activities from GYG database
    const newActivities = await gygPrisma.$queryRaw`
      SELECT * FROM activities 
      WHERE created_at > ${lastImportTime}
         OR updated_at > ${lastImportTime}
      ORDER BY created_at DESC
    `;

    const newCount = (newActivities as any[]).length;
    console.log(`📊 Found ${newCount} new/updated activities in GYG database`);

    if (newCount === 0) {
      console.log('✅ No new data to import');
      return;
    }

    // Process new activities
    let processedCount = 0;
    let errorCount = 0;

    for (const activity of newActivities as any[]) {
      try {
        if (activity.id && activity.activity_name && activity.provider_name && activity.location) {
          // Check if activity already exists
          const existing = await mainPrisma.importedGYGActivity.findFirst({
            where: { originalId: activity.id.toString() }
          });

          if (existing) {
            // Update existing record
            await mainPrisma.importedGYGActivity.update({
              where: { id: existing.id },
              data: {
                activityName: activity.activity_name.trim(),
                providerName: activity.provider_name.trim(),
                location: activity.location.trim(),
                priceText: activity.price?.trim() || null,
                priceNumeric: parsePriceFromText(activity.price),
                ratingText: activity.rating?.trim() || null,
                ratingNumeric: parseRatingFromText(activity.rating),
                reviewCountText: activity.review_count?.trim() || null,
                reviewCountNumeric: parseReviewCountFromText(activity.review_count),
                duration: activity.duration?.trim() || null,
                description: activity.description?.trim() || null,
                extractionQuality: activity.extraction_quality || null,
                tags: parseTagsFromJSONB(activity.tags),
                url: activity.url || activity.activity_url || null,
                updatedAt: new Date(),
              },
            });
            console.log(`🔄 Updated activity: ${activity.activity_name}`);
          } else {
            // Create new record
            await mainPrisma.importedGYGActivity.create({
              data: {
                originalId: activity.id.toString(),
                activityName: activity.activity_name.trim(),
                providerName: activity.provider_name.trim(),
                location: activity.location.trim(),
                priceText: activity.price?.trim() || null,
                priceNumeric: parsePriceFromText(activity.price),
                ratingText: activity.rating?.trim() || null,
                ratingNumeric: parseRatingFromText(activity.rating),
                reviewCountText: activity.review_count?.trim() || null,
                reviewCountNumeric: parseReviewCountFromText(activity.review_count),
                duration: activity.duration?.trim() || null,
                description: activity.description?.trim() || null,
                extractionQuality: activity.extraction_quality || null,
                tags: parseTagsFromJSONB(activity.tags),
                url: activity.url || activity.activity_url || null,
              },
            });
            console.log(`➕ Added new activity: ${activity.activity_name}`);
          }

          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing activity ${activity.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 INCREMENTAL IMPORT SUMMARY:`);
    console.log(`✅ Successfully processed: ${processedCount} activities`);
    console.log(`❌ Errors: ${errorCount} activities`);
    console.log(`📈 Success rate: ${((processedCount / newCount) * 100).toFixed(1)}%`);

    // Generate incremental import report
    const report = `
# GYG Incremental Import Report

## Import Summary
- **New Activities Found**: ${newCount}
- **Successfully Processed**: ${processedCount}
- **Errors**: ${errorCount}
- **Success Rate**: ${((processedCount / newCount) * 100).toFixed(1)}%

## Import Strategy
- **Incremental**: Only imports new/updated data
- **Update Existing**: Updates records that have changed
- **Add New**: Creates new records for new activities
- **Efficient**: Minimal processing overhead

## Benefits
1. **Fast**: Only processes new data
2. **Efficient**: No duplicate processing
3. **Up-to-date**: Always has latest data
4. **Safe**: No data loss or conflicts

## Next Steps
1. **Schedule**: Run this script regularly (daily/weekly)
2. **Monitor**: Track import success rates
3. **Analyze**: Use updated data for insights
4. **Automate**: Set up cron jobs for regular sync

## Usage
\`\`\`bash
# Run incremental import
npm run import:gyg:incremental

# Schedule daily import (cron)
0 2 * * * cd /path/to/project && npm run import:gyg:incremental
\`\`\`
`;

    // Save report
    await mainPrisma.report.upsert({
      where: { type: 'gyg-incremental-import-report' },
      create: {
        type: 'gyg-incremental-import-report',
        title: 'GYG Incremental Import Report',
        content: report,
        isPublic: false,
      },
      update: {
        title: 'GYG Incremental Import Report',
        content: report,
        isPublic: false,
      },
    });

    console.log('✅ Incremental import report saved');
    console.log('\n🎉 INCREMENTAL GYG IMPORT COMPLETED!');

  } catch (error) {
    console.error('❌ Error during incremental import:', error);
    throw error;
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

function parsePriceFromText(priceText: string): number | null {
  if (!priceText) return null;
  const match = priceText.match(/[€$]?(\d+(?:,\d+)?(?:\.\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '')) : null;
}

function parseRatingFromText(ratingText: string): number | null {
  if (!ratingText) return null;
  const match = ratingText.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const rating = parseFloat(match[1]);
    return rating >= 0 && rating <= 5 ? rating : null;
  }
  return null;
}

function parseReviewCountFromText(reviewText: string): number | null {
  if (!reviewText) return null;
  const match = reviewText.match(/(\d+(?:,\d+)*)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

function parseTagsFromJSONB(tagsJSONB: any): string[] {
  if (!tagsJSONB) return [];
  try {
    if (typeof tagsJSONB === 'string') {
      const parsed = JSON.parse(tagsJSONB);
      return Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(tagsJSONB)) {
      return tagsJSONB;
    }
  } catch (error) {
    console.warn('Error parsing tags JSONB:', error);
  }
  return [];
}

// Run the script
if (require.main === module) {
  incrementalGYGImport().catch(console.error);
}

export { incrementalGYGImport }; 