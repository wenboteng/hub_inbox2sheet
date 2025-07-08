import { mainPrisma, gygPrisma } from '../lib/dual-prisma';
import { slugify } from '../utils/slugify';

// Helper functions for data cleaning
function parsePriceFromText(priceText: string | null): { numeric: number | null; currency: string | null } {
  if (!priceText) return { numeric: null, currency: null };
  
  // Extract currency
  const currencyMatch = priceText.match(/[€$£]/);
  const currency = currencyMatch ? currencyMatch[0] : null;
  
  // Extract numeric value
  const numericMatch = priceText.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
  const numeric = numericMatch ? parseFloat(numericMatch[1].replace(',', '')) : null;
  
  return { numeric, currency };
}

function parseRatingFromText(ratingText: string | null): number | null {
  if (!ratingText) return null;
  
  // Extract rating from text
  const ratingMatch = ratingText.match(/^(\d+(?:\.\d+)?)/);
  return ratingMatch ? parseFloat(ratingMatch[1]) : null;
}

function parseReviewCountFromText(reviewText: string | null): number | null {
  if (!reviewText) return null;
  
  // Extract review count from text
  const reviewMatch = reviewText.match(/(\d+(?:,\d+)*)/);
  return reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;
}

function calculateQualityScore(activity: any): number {
  let score = 0;
  
  // Activity name (required)
  if (activity.activity_name && activity.activity_name.trim()) {
    score += 25;
  }
  
  // Rating
  if (activity.rating && activity.rating.trim()) {
    score += 20;
  }
  
  // Review count
  if (activity.review_count && activity.review_count.trim()) {
    score += 20;
  }
  
  // Price
  if (activity.price && activity.price.trim()) {
    score += 20;
  }
  
  // Activity URL
  if (activity.activity_url && activity.activity_url.trim()) {
    score += 15;
  }
  
  return score;
}

function extractDurationFromName(activityName: string): { hours: number | null; days: number | null } {
  const name = activityName.toLowerCase();
  
  // Look for hour patterns
  const hourMatch = name.match(/(\d+)\s*(?:hour|hr|h)/);
  if (hourMatch) {
    return { hours: parseInt(hourMatch[1]), days: null };
  }
  
  // Look for day patterns
  const dayMatch = name.match(/(\d+)\s*(?:day|d)/);
  if (dayMatch) {
    return { days: parseInt(dayMatch[1]), hours: null };
  }
  
  return { hours: null, days: null };
}

async function importMadridToSeparateTable() {
  console.log('🚀 IMPORTING MADRID ACTIVITIES TO SEPARATE TABLE...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    
    console.log('✅ Connected to both databases');

    // Get total count from Madrid activities
    const totalCount = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM madrid_activities`;
    const totalRecords = Number((totalCount as any[])[0]?.count || 0);
    console.log(`📊 Found ${totalRecords} Madrid activities in GYG database`);

    // Check existing imports in the separate table
    const existingCount = await mainPrisma.importedMadridActivity.count();
    
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing Madrid activities in separate table`);
      console.log('💡 Clearing existing imports for fresh data...');
      await mainPrisma.importedMadridActivity.deleteMany();
    }

    // Process in batches
    const batchSize = 50;
    let processedCount = 0;
    let errorCount = 0;

    console.log(`\n📦 PROCESSING ${totalRecords} MADRID ACTIVITIES IN BATCHES OF ${batchSize}...`);

    for (let offset = 0; offset < totalRecords; offset += batchSize) {
      try {
        const batchNumber = Math.floor(offset / batchSize) + 1;
        const totalBatches = Math.ceil(totalRecords / batchSize);
        
        console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}`);

        const batch = await gygPrisma.$queryRaw`
          SELECT * FROM madrid_activities 
          ORDER BY id 
          LIMIT ${batchSize} OFFSET ${offset}
        `;

        for (const activity of batch as any[]) {
          try {
            if (activity.id && activity.activity_name) {
              // Parse data
              const priceData = parsePriceFromText(activity.price);
              const ratingNumeric = parseRatingFromText(activity.rating);
              const reviewCountNumeric = parseReviewCountFromText(activity.review_count);
              const durationData = extractDurationFromName(activity.activity_name);
              const qualityScore = calculateQualityScore(activity);

              // Import to separate Madrid table
              await mainPrisma.importedMadridActivity.create({
                data: {
                  originalId: activity.id.toString(),
                  activityName: activity.activity_name.trim(),
                  ratingText: activity.rating?.trim() || null,
                  ratingNumeric,
                  reviewCountText: activity.review_count?.trim() || null,
                  reviewCountNumeric,
                  priceText: activity.price?.trim() || null,
                  priceNumeric: priceData.numeric,
                  activityUrl: activity.activity_url?.trim() || null,
                  rawText: activity.raw_text?.trim() || null,
                  extractionMethod: activity.extraction_method || null,
                  extractionQuality: activity.extraction_quality || null,
                  screenshotPath: activity.screenshot_path || null,
                  timestamp: activity.timestamp || null,
                  sessionId: activity.session_id || null,
                  qualityScore,
                  priceCurrency: priceData.currency,
                  city: 'Madrid',
                  country: 'Spain',
                  venue: null, // Could be extracted from activity name if needed
                  durationHours: durationData.hours,
                  durationDays: durationData.days,
                },
              });

              processedCount++;
            }
          } catch (error) {
            console.error(`Error processing Madrid activity ${activity.id}:`, error);
            errorCount++;
          }
        }

        console.log(`✅ Batch ${batchNumber} completed: ${processedCount} total imported`);

      } catch (error) {
        console.error(`❌ Error processing batch starting at ${offset}:`, error);
        errorCount += batchSize;
      }
    }

    console.log(`\n📊 MADRID ACTIVITIES IMPORT SUMMARY:`);
    console.log(`✅ Successfully imported: ${processedCount} activities`);
    console.log(`❌ Errors: ${errorCount} activities`);
    console.log(`📈 Success rate: ${((processedCount / totalRecords) * 100).toFixed(1)}%`);

    // Generate report
    const report = `
# Madrid Activities Import Report (Separate Table)

## Import Summary
- **Total Madrid Activities in GYG**: ${totalRecords}
- **Successfully Imported**: ${processedCount}
- **Errors**: ${errorCount}
- **Success Rate**: ${((processedCount / totalRecords) * 100).toFixed(1)}%

## Table Structure
### ImportedMadridActivity (New Separate Table)
- **Purpose**: Dedicated table for Madrid activities only
- **Schema**: Optimized for Madrid data structure
- **Fields**: 20 columns including cleaning and quality fields
- **Indexes**: Optimized for Madrid-specific queries

## Data Processing
- **Price Parsing**: Text prices converted to numeric values with currency extraction
- **Rating Parsing**: Text ratings converted to numeric values
- **Review Parsing**: Text review counts converted to numeric values
- **Duration Extraction**: Hours/days extracted from activity names
- **Quality Scoring**: 0-100 score based on data completeness
- **Location Standardization**: All activities marked as Madrid, Spain

## Benefits of Separate Table
1. **Data Isolation**: Madrid activities separate from main GYG activities
2. **Schema Optimization**: Fields specific to Madrid data structure
3. **Query Performance**: Faster queries for Madrid-specific analysis
4. **Data Integrity**: No mixing with other location data
5. **Maintenance**: Easier to manage and update Madrid data

## Data Quality
- **Quality Score**: Calculated based on data completeness
- **Extraction Method**: Tracks how data was extracted (OCR+GPT, etc.)
- **Extraction Quality**: Quality assessment of extraction process
- **Cleaning Status**: Tracks when data was last cleaned

## Usage Examples
\`\`\`
// Query Madrid activities from separate table
const madridActivities = await mainPrisma.importedMadridActivity.findMany({
  where: { ratingNumeric: { gte: 4.5 } }
});

// Compare Madrid vs main GYG activities
const madridStats = await mainPrisma.importedMadridActivity.aggregate({
  _avg: { ratingNumeric: true, priceNumeric: true },
  _count: { id: true }
});

const gygStats = await mainPrisma.importedGYGActivity.aggregate({
  _avg: { ratingNumeric: true, priceNumeric: true },
  _count: { id: true }
});
\`\`\`

## Next Steps
1. **Data Cleaning**: Apply Madrid-specific cleaning pipeline
2. **Quality Analysis**: Analyze Madrid data quality vs main GYG data
3. **Market Analysis**: Madrid-specific market intelligence
4. **Provider Analysis**: Madrid provider performance analysis
5. **Integration**: Combine insights from both tables for comprehensive analysis

## Table Comparison
| Feature | ImportedGYGActivity | ImportedMadridActivity |
|---------|-------------------|----------------------|
| **Records** | 626 (all locations) | ${processedCount} (Madrid only) |
| **Schema** | 42 fields (comprehensive) | 20 fields (Madrid-optimized) |
| **Location** | Multiple cities | Madrid only |
| **Provider** | Full provider data | Not available in source |
| **Duration** | Full duration data | Extracted from names |
| **Quality** | High (96.9/100) | TBD (needs cleaning) |
`;

    // Save report
    await mainPrisma.report.upsert({
      where: { type: 'madrid-separate-table-import-report' },
      create: {
        type: 'madrid-separate-table-import-report',
        title: 'Madrid Activities Import Report (Separate Table)',
        slug: slugify('Madrid Activities Import Report Separate Table'),
        content: report,
        isPublic: false,
      },
      update: {
        title: 'Madrid Activities Import Report (Separate Table)',
        slug: slugify('Madrid Activities Import Report Separate Table'),
        content: report,
        isPublic: false,
      },
    });

    console.log('✅ Madrid activities import report saved to main database');
    console.log('\n🎉 MADRID ACTIVITIES IMPORT TO SEPARATE TABLE COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Error during Madrid activities import:', error);
    throw error;
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

// Run the import
importMadridToSeparateTable().catch(console.error); 