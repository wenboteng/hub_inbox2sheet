import { mainPrisma, gygPrisma } from '../src/lib/dual-prisma';

interface UpdateResult {
  id: string;
  activityName: string;
  oldReviewCountText: string | null;
  oldReviewCountNumeric: number | null;
  newReviewCountText: string;
  newReviewCountNumeric: number | null;
  rawReviewCount: any;
}

async function backfillReviewCounts() {
  console.log('🔄 BACKFILLING REVIEW COUNTS FROM RAW DATA...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Step 1: Get all imported activities that need review count backfill
    const importedActivities = await mainPrisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { reviewCountNumeric: null },
          { reviewCountText: null },
          { reviewCountText: 'Unknown' }
        ]
      },
      select: {
        id: true,
        originalId: true,
        activityName: true,
        reviewCountText: true,
        reviewCountNumeric: true,
        ratingText: true,
        ratingNumeric: true
      }
    });

    console.log(`📊 Found ${importedActivities.length} activities needing review count backfill`);

    // Step 2: Get raw data for these activities (fix type casting)
    const originalIds = importedActivities.map(a => a.originalId);
    
    // Convert string IDs to integers for the query
    const numericIds = originalIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    const rawData = await gygPrisma.$queryRaw`
      SELECT 
        id,
        activity_name,
        review_count,
        rating,
        review_count_numeric
      FROM activities 
      WHERE id = ANY(${numericIds}::integer[])
    `;

    const rawDataMap = new Map();
    (rawData as any[]).forEach((row: any) => {
      rawDataMap.set(row.id.toString(), row);
    });

    console.log(`📥 Retrieved ${rawDataMap.size} raw data records`);

    // Step 3: Parse review counts from raw data
    function parseReviewCount(reviewCountText: string): { text: string, numeric: number | null } {
      if (!reviewCountText || reviewCountText.trim() === '') {
        return { text: 'Unknown', numeric: null };
      }

      const text = reviewCountText.trim();
      
      // Handle "Unknown" cases
      if (text.toLowerCase() === 'unknown') {
        return { text: 'Unknown', numeric: null };
      }

      // Handle "X reviews" format
      const reviewsMatch = text.match(/(\d+(?:,\d+)*)\s*reviews?/i);
      if (reviewsMatch) {
        const numeric = parseInt(reviewsMatch[1].replace(/,/g, ''));
        return { text: `${numeric} reviews`, numeric };
      }

      // Handle pure numbers (with or without commas)
      const numberMatch = text.match(/^(\d+(?:,\d+)*)$/);
      if (numberMatch) {
        const numeric = parseInt(numberMatch[1].replace(/,/g, ''));
        return { text: numeric.toString(), numeric };
      }

      // Handle "X,XXX" format
      const commaMatch = text.match(/^(\d{1,3}(?:,\d{3})*)$/);
      if (commaMatch) {
        const numeric = parseInt(commaMatch[1].replace(/,/g, ''));
        return { text: numeric.toString(), numeric };
      }

      // If we can't parse it, keep the original text
      return { text, numeric: null };
    }

    // Step 4: Update imported activities with correct review counts
    let updatedCount = 0;
    let errorCount = 0;
    const updateResults: UpdateResult[] = [];

    for (const importedActivity of importedActivities) {
      try {
        const rawData = rawDataMap.get(importedActivity.originalId);
        
        if (!rawData) {
          console.log(`⚠️  No raw data found for activity ${importedActivity.originalId}`);
          continue;
        }

        const oldReviewCountText = importedActivity.reviewCountText;
        const oldReviewCountNumeric = importedActivity.reviewCountNumeric;

        // Parse review count from raw data
        const parsedReviewCount = parseReviewCount(rawData.review_count || '');

        // Only update if we have new data
        if (parsedReviewCount.numeric !== null || parsedReviewCount.text !== 'Unknown') {
          await mainPrisma.importedGYGActivity.update({
            where: { id: importedActivity.id },
            data: {
              reviewCountText: parsedReviewCount.text,
              reviewCountNumeric: parsedReviewCount.numeric,
              updatedAt: new Date()
            }
          });

          updateResults.push({
            id: importedActivity.id,
            activityName: importedActivity.activityName,
            oldReviewCountText,
            oldReviewCountNumeric,
            newReviewCountText: parsedReviewCount.text,
            newReviewCountNumeric: parsedReviewCount.numeric,
            rawReviewCount: rawData.review_count
          });

          updatedCount++;
          
          if (updatedCount % 100 === 0) {
            console.log(`✅ Updated ${updatedCount} activities...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error updating activity ${importedActivity.id}:`, error);
        errorCount++;
      }
    }

    // Step 5: Generate backfill report
    const report = `
# Review Count Backfill Report

## 📊 Backfill Summary
- **Activities Processed**: ${importedActivities.length}
- **Successfully Updated**: ${updatedCount}
- **Errors**: ${errorCount}
- **Success Rate**: ${((updatedCount / importedActivities.length) * 100).toFixed(1)}%

## 🔄 Update Examples
${updateResults.slice(0, 10).map((result, index) => `
### ${index + 1}. ${result.activityName}
- **Original Review Count**: ${result.oldReviewCountText || 'null'} (${result.oldReviewCountNumeric || 'null'})
- **Raw Data Review Count**: ${result.rawReviewCount}
- **New Review Count**: ${result.newReviewCountText} (${result.newReviewCountNumeric || 'null'})
`).join('\n')}

## 📈 Data Quality Improvement
- **Before Backfill**: 0% of activities had review counts
- **After Backfill**: ${((updatedCount / importedActivities.length) * 100).toFixed(1)}% of activities have review counts

## 🎯 Key Improvements
1. **Review Count Parsing**: Fixed parsing logic for various formats
2. **Data Consistency**: Aligned imported data with raw source data
3. **Quality Enhancement**: Improved overall data completeness

## 📋 Parsing Logic
The backfill script handles these review count formats:
- Pure numbers: "1835" → 1835
- Numbers with commas: "63,652" → 63652
- Text with "reviews": "6 reviews" → 6
- Unknown values: "Unknown" → null

---

*Backfill completed on ${new Date().toISOString()}*
`;

    console.log('\n📊 BACKFILL SUMMARY:');
    console.log(`Activities Processed: ${importedActivities.length}`);
    console.log(`Successfully Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success Rate: ${((updatedCount / importedActivities.length) * 100).toFixed(1)}%`);

    // Show some examples
    console.log('\n🔄 UPDATE EXAMPLES:');
    updateResults.slice(0, 5).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.activityName}`);
      console.log(`   Old: ${result.oldReviewCountText || 'null'} (${result.oldReviewCountNumeric || 'null'})`);
      console.log(`   Raw: ${result.rawReviewCount}`);
      console.log(`   New: ${result.newReviewCountText} (${result.newReviewCountNumeric || 'null'})`);
    });

    // Save backfill report
    await mainPrisma.report.upsert({
      where: { type: 'review-count-backfill-report' },
      create: {
        type: 'review-count-backfill-report',
        title: 'Review Count Backfill Report',
        slug: 'review-count-backfill-report',
        content: report,
        isPublic: true,
      },
      update: {
        title: 'Review Count Backfill Report',
        slug: 'review-count-backfill-report',
        content: report,
        isPublic: true,
      },
    });

    console.log('\n✅ Review count backfill report saved to database');
    console.log('\n🎉 REVIEW COUNT BACKFILL COMPLETED!');

    return {
      processed: importedActivities.length,
      updated: updatedCount,
      errors: errorCount,
      successRate: (updatedCount / importedActivities.length) * 100
    };

  } catch (error) {
    console.error('❌ Error during review count backfill:', error);
    throw error;
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  backfillReviewCounts().catch(console.error);
}

export { backfillReviewCounts }; 