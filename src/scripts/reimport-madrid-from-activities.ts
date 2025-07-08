import { mainPrisma, gygPrisma } from '../lib/dual-prisma';
import { slugify } from '../utils/slugify';

function parsePriceFromText(priceText: string | null): number | null {
  if (!priceText) return null;
  const numericMatch = priceText.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
  return numericMatch ? parseFloat(numericMatch[1].replace(',', '')) : null;
}

function parseRatingFromText(ratingText: string | null): number | null {
  if (!ratingText) return null;
  const ratingMatch = ratingText.match(/^(\d+(?:\.\d+)?)/);
  return ratingMatch ? parseFloat(ratingMatch[1]) : null;
}

function parseReviewCountFromText(reviewText: string | null): number | null {
  if (!reviewText) return null;
  const reviewMatch = reviewText.match(/(\d+(?:,\d+)*)/);
  return reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;
}

function parseTagsFromJSONB(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return [tags];
  return [];
}

async function reimportMadridFromActivities() {
  console.log('🔄 RE-IMPORTING MADRID ACTIVITIES FROM GYG activities TABLE...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    console.log('✅ Connected to both databases');

    // Get all Madrid activities from the GYG activities table
    const madridActivities = await gygPrisma.$queryRaw`
      SELECT * FROM activities WHERE location ILIKE '%madrid%'
    `;
    console.log(`📊 Found ${(madridActivities as any[]).length} Madrid activities in GYG activities table`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const activity of madridActivities as any[]) {
      try {
        // Use the original id from the activities table
        const originalId = activity.id?.toString();
        if (!originalId) continue;

        // Check if already exists in main GYG table
        const exists = await mainPrisma.importedGYGActivity.findUnique({
          where: { originalId }
        });
        if (exists) {
          skippedCount++;
          continue;
        }

        // Parse data
        const priceNumeric = parsePriceFromText(activity.price);
        const ratingNumeric = parseRatingFromText(activity.rating);
        const reviewCountNumeric = parseReviewCountFromText(activity.review_count);
        const tags = parseTagsFromJSONB(activity.tags);

        await mainPrisma.importedGYGActivity.create({
          data: {
            originalId,
            activityName: activity.activity_name?.trim() || '',
            providerName: activity.provider_name?.trim() || '',
            location: activity.location?.trim() || '',
            priceText: activity.price?.trim() || null,
            priceNumeric,
            ratingText: activity.rating?.trim() || null,
            ratingNumeric,
            reviewCountText: activity.review_count?.trim() || null,
            reviewCountNumeric,
            duration: activity.duration?.trim() || null,
            description: activity.description?.trim() || null,
            extractionQuality: activity.extraction_quality || null,
            tags,
            url: activity.url || activity.activity_url || null,
          },
        });
        importedCount++;
      } catch (error) {
        console.error('Error importing Madrid activity:', error);
        errorCount++;
      }
    }

    console.log(`\n✅ Re-imported ${importedCount} Madrid activities from activities table`);
    console.log(`⏭️ Skipped (already existed): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Save report
    const report = `
# Madrid Activities Re-import Report

## Summary
- **Re-imported**: ${importedCount}
- **Skipped (already existed)**: ${skippedCount}
- **Errors**: ${errorCount}

## Why This Was Done
- Ensure only Madrid activities from the GYG activities table are present in the main GYG table
- Avoid duplication with the separate Madrid table
- Maintain data integrity for location-based analysis
`;
    await mainPrisma.report.upsert({
      where: { type: 'madrid-reimport-report' },
      create: {
        type: 'madrid-reimport-report',
        title: 'Madrid Activities Re-import Report',
        slug: slugify('Madrid Activities Re-import Report'),
        content: report,
        isPublic: false,
      },
      update: {
        title: 'Madrid Activities Re-import Report',
        slug: slugify('Madrid Activities Re-import Report'),
        content: report,
        isPublic: false,
      },
    });
    console.log('✅ Re-import report saved to database');
    console.log('\n🎉 MADRID ACTIVITIES RE-IMPORT COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Error during Madrid re-import:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

reimportMadridFromActivities().catch(console.error); 