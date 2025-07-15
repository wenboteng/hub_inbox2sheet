"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_js_1 = require("../src/lib/dual-prisma.js");
const fs_1 = require("fs");
const path_1 = require("path");
async function fetchCleanSaveActivities() {
    console.log('🚀 FETCHING, CLEANING & SAVING ACTIVITIES DATA');
    console.log('==============================================\n');
    try {
        // Connect to both databases
        await dual_prisma_js_1.gygPrisma.$connect();
        await dual_prisma_js_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Get total count from GYG database
        const totalCount = await dual_prisma_js_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM activities`;
        const totalRecords = Number(totalCount[0]?.count || 0);
        console.log(`📊 Found ${totalRecords} activities in GYG database`);
        // Get count of already imported activities
        const importedCount = await dual_prisma_js_1.mainPrisma.importedGYGActivity.count();
        console.log(`📊 Already imported: ${importedCount} activities`);
        // Fetch all activities from GYG database
        console.log('\n📥 FETCHING ACTIVITIES FROM GYG DATABASE...');
        const activities = await dual_prisma_js_1.gygPrisma.$queryRaw `
      SELECT 
        id, activity_name, provider_name, rating, review_count, price, 
        duration, description, location, tags, url, extraction_quality,
        price_numeric, rating_numeric, review_count_numeric, activity_url,
        created_at, updated_at, market_segment, popularity_level,
        data_quality_score, vendor_opportunity_score
      FROM activities 
      ORDER BY id
    `;
        console.log(`✅ Fetched ${activities.length} activities`);
        // Process and clean activities
        console.log('\n🧹 CLEANING AND PROCESSING ACTIVITIES...');
        const cleanedActivities = [];
        let processedCount = 0;
        let errorCount = 0;
        for (const activity of activities) {
            try {
                const cleanedActivity = await cleanActivity(activity);
                if (cleanedActivity) {
                    cleanedActivities.push(cleanedActivity);
                }
                processedCount++;
                if (processedCount % 50 === 0) {
                    console.log(`🔄 Processed ${processedCount}/${activities.length} activities...`);
                }
            }
            catch (error) {
                console.error(`❌ Error processing activity ${activity.id}:`, error);
                errorCount++;
            }
        }
        console.log(`\n✅ Cleaning completed: ${cleanedActivities.length} activities cleaned`);
        // Save to main database
        console.log('\n💾 SAVING TO MAIN DATABASE...');
        let savedCount = 0;
        let skippedCount = 0;
        for (const cleanedActivity of cleanedActivities) {
            try {
                // Check if activity already exists
                const existing = await dual_prisma_js_1.mainPrisma.importedGYGActivity.findFirst({
                    where: { originalId: cleanedActivity.originalId }
                });
                if (existing) {
                    // Update existing record
                    await dual_prisma_js_1.mainPrisma.importedGYGActivity.update({
                        where: { id: existing.id },
                        data: {
                            activityName: cleanedActivity.activityName,
                            providerName: cleanedActivity.providerName,
                            location: cleanedActivity.location,
                            priceText: cleanedActivity.priceText,
                            priceNumeric: cleanedActivity.priceNumeric,
                            ratingText: cleanedActivity.ratingText,
                            ratingNumeric: cleanedActivity.ratingNumeric,
                            reviewCountText: cleanedActivity.reviewCountText,
                            reviewCountNumeric: cleanedActivity.reviewCountNumeric,
                            duration: cleanedActivity.duration,
                            description: cleanedActivity.description,
                            extractionQuality: cleanedActivity.extractionQuality,
                            tags: cleanedActivity.tags,
                            url: cleanedActivity.url,
                            cleanedAt: new Date(),
                            qualityScore: cleanedActivity.qualityScore,
                            city: cleanedActivity.city,
                            country: cleanedActivity.country,
                            venue: cleanedActivity.venue,
                            priceCurrency: cleanedActivity.priceCurrency,
                            durationHours: cleanedActivity.durationHours,
                            durationDays: cleanedActivity.durationDays,
                            updatedAt: new Date()
                        }
                    });
                    savedCount++;
                }
                else {
                    // Create new record
                    await dual_prisma_js_1.mainPrisma.importedGYGActivity.create({
                        data: {
                            originalId: cleanedActivity.originalId,
                            activityName: cleanedActivity.activityName,
                            providerName: cleanedActivity.providerName,
                            location: cleanedActivity.location,
                            priceText: cleanedActivity.priceText,
                            priceNumeric: cleanedActivity.priceNumeric,
                            ratingText: cleanedActivity.ratingText,
                            ratingNumeric: cleanedActivity.ratingNumeric,
                            reviewCountText: cleanedActivity.reviewCountText,
                            reviewCountNumeric: cleanedActivity.reviewCountNumeric,
                            duration: cleanedActivity.duration,
                            description: cleanedActivity.description,
                            extractionQuality: cleanedActivity.extractionQuality,
                            tags: cleanedActivity.tags,
                            url: cleanedActivity.url,
                            cleanedAt: new Date(),
                            qualityScore: cleanedActivity.qualityScore,
                            city: cleanedActivity.city,
                            country: cleanedActivity.country,
                            venue: cleanedActivity.venue,
                            priceCurrency: cleanedActivity.priceCurrency,
                            durationHours: cleanedActivity.durationHours,
                            durationDays: cleanedActivity.durationDays
                        }
                    });
                    savedCount++;
                }
            }
            catch (error) {
                console.error(`❌ Error saving activity ${cleanedActivity.originalId}:`, error);
                skippedCount++;
            }
        }
        // Generate summary report
        const finalCount = await dual_prisma_js_1.mainPrisma.importedGYGActivity.count();
        const report = generateSummaryReport({
            totalRecords,
            importedCount,
            processedCount,
            cleanedCount: cleanedActivities.length,
            savedCount,
            skippedCount,
            errorCount,
            finalCount
        });
        // Save report to file
        const reportPath = (0, path_1.join)(process.cwd(), 'activities-import-report.md');
        (0, fs_1.writeFileSync)(reportPath, report, 'utf-8');
        console.log('\n🎉 ACTIVITIES IMPORT COMPLETED!');
        console.log('==============================');
        console.log(`📊 Total activities in GYG: ${totalRecords}`);
        console.log(`🧹 Successfully cleaned: ${cleanedActivities.length}`);
        console.log(`💾 Saved to main database: ${savedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📈 Final count in main DB: ${finalCount}`);
        console.log(`📁 Report saved: activities-import-report.md`);
    }
    catch (error) {
        console.error('❌ Error in fetch-clean-save process:', error);
    }
    finally {
        await dual_prisma_js_1.gygPrisma.$disconnect();
        await dual_prisma_js_1.mainPrisma.$disconnect();
    }
}
async function cleanActivity(activity) {
    // Basic validation
    if (!activity.id || !activity.activity_name) {
        return null;
    }
    // Clean activity name
    const activityName = activity.activity_name?.trim() || '';
    // Clean provider name
    const providerName = cleanProviderName(activity.provider_name);
    // Clean location
    const location = cleanLocation(activity.location);
    // Clean price
    const priceData = cleanPrice(activity.price, activity.price_numeric);
    // Clean rating
    const ratingData = cleanRating(activity.rating, activity.rating_numeric, activity.review_count, activity.review_count_numeric);
    // Clean duration
    const durationData = cleanDuration(activity.duration);
    // Clean description
    const description = activity.description?.trim() || null;
    // Clean tags
    const tags = cleanTags(activity.tags);
    // Clean URL
    const url = activity.url || activity.activity_url || null;
    // Calculate quality score
    const qualityScore = calculateQualityScore(activity);
    return {
        originalId: activity.id.toString(),
        activityName,
        providerName,
        location: location.city,
        priceText: priceData.original,
        priceNumeric: priceData.numeric,
        ratingText: ratingData.original,
        ratingNumeric: ratingData.rating,
        reviewCountText: ratingData.reviewText,
        reviewCountNumeric: ratingData.reviews,
        duration: durationData.original,
        description,
        extractionQuality: activity.extraction_quality || null,
        tags,
        url,
        qualityScore,
        city: location.city,
        country: location.country,
        venue: location.venue,
        priceCurrency: priceData.currency,
        durationHours: durationData.hours,
        durationDays: durationData.days
    };
}
function cleanProviderName(providerName) {
    if (!providerName)
        return 'Unknown';
    const cleaned = providerName.trim();
    if (cleaned.toLowerCase() === 'unknown' || cleaned === '') {
        return 'Unknown';
    }
    return cleaned;
}
function cleanLocation(location) {
    if (!location) {
        return { city: 'Unknown', country: 'Unknown', venue: null };
    }
    const cleaned = location.trim();
    // Extract city and country
    const parts = cleaned.split(',').map(part => part.trim());
    if (parts.length >= 2) {
        const city = parts[0];
        const country = parts[parts.length - 1];
        const venue = parts.length > 2 ? parts.slice(1, -1).join(', ') : null;
        return { city, country, venue };
    }
    else if (parts.length === 1) {
        return { city: parts[0], country: 'Unknown', venue: null };
    }
    return { city: 'Unknown', country: 'Unknown', venue: null };
}
function cleanPrice(priceText, priceNumeric) {
    if (priceNumeric && priceNumeric > 0) {
        return {
            original: priceText,
            numeric: priceNumeric,
            currency: extractCurrency(priceText)
        };
    }
    if (!priceText) {
        return { original: null, numeric: null, currency: null };
    }
    const cleaned = priceText.trim();
    // Extract numeric value
    const numericMatch = cleaned.match(/[\d,]+\.?\d*/);
    const numeric = numericMatch ? parseFloat(numericMatch[0].replace(/,/g, '')) : null;
    return {
        original: cleaned,
        numeric: numeric && numeric > 0 ? numeric : null,
        currency: extractCurrency(cleaned)
    };
}
function cleanRating(ratingText, ratingNumeric, reviewCountText, reviewCountNumeric) {
    // Use numeric values if available
    const rating = ratingNumeric && ratingNumeric > 0 && ratingNumeric <= 5 ? ratingNumeric : null;
    const reviews = reviewCountNumeric && reviewCountNumeric > 0 ? reviewCountNumeric : null;
    // If no numeric values, try to parse from text
    let parsedRating = rating;
    let parsedReviews = reviews;
    if (!parsedRating && ratingText) {
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        parsedRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
        if (parsedRating && (parsedRating < 0 || parsedRating > 5)) {
            parsedRating = null;
        }
    }
    if (!parsedReviews && reviewCountText) {
        const reviewMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
        if (reviewMatch) {
            parsedReviews = parseInt(reviewMatch[1].replace(/,/g, ''));
        }
    }
    return {
        original: ratingText,
        rating: parsedRating,
        reviewText: reviewCountText,
        reviews: parsedReviews
    };
}
function cleanDuration(duration) {
    if (!duration) {
        return { original: null, hours: null, days: null };
    }
    const cleaned = duration.trim().toLowerCase();
    // Extract hours
    const hoursMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*hours?/);
    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : null;
    // Extract days
    const daysMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*days?/);
    const days = daysMatch ? parseFloat(daysMatch[1]) : null;
    return {
        original: duration,
        hours,
        days
    };
}
function cleanTags(tags) {
    if (!tags)
        return [];
    if (Array.isArray(tags)) {
        return tags.filter(tag => tag && typeof tag === 'string').map(tag => tag.trim());
    }
    if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    return [];
}
function extractCurrency(text) {
    if (!text)
        return null;
    const currencyMatch = text.match(/[€$£¥₹₽₩₪₦₨₩₫₴₸₺₼₾₿]/);
    return currencyMatch ? currencyMatch[0] : null;
}
function calculateQualityScore(activity) {
    let score = 0;
    // Activity name (required)
    if (activity.activity_name?.trim())
        score += 20;
    // Provider name
    if (activity.provider_name?.trim() && activity.provider_name.toLowerCase() !== 'unknown')
        score += 15;
    // Location
    if (activity.location?.trim())
        score += 15;
    // Price data
    if (activity.price_numeric || (activity.price && activity.price.trim()))
        score += 10;
    // Rating data
    if (activity.rating_numeric || (activity.rating && activity.rating.trim()))
        score += 10;
    // Review count
    if (activity.review_count_numeric || (activity.review_count && activity.review_count.trim()))
        score += 10;
    // Description
    if (activity.description?.trim())
        score += 10;
    // Duration
    if (activity.duration?.trim())
        score += 5;
    // Tags
    if (activity.tags && (Array.isArray(activity.tags) ? activity.tags.length > 0 : activity.tags.trim()))
        score += 5;
    return Math.min(score, 100);
}
function generateSummaryReport(stats) {
    return `# Activities Data Import Report

*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*

## 📊 Import Summary

### Overview
- **Total activities in GYG database**: ${stats.totalRecords}
- **Previously imported**: ${stats.importedCount}
- **Processed in this run**: ${stats.processedCount}
- **Successfully cleaned**: ${stats.cleanedCount}
- **Saved to main database**: ${stats.savedCount}
- **Skipped due to errors**: ${stats.skippedCount}
- **Processing errors**: ${stats.errorCount}
- **Final count in main database**: ${stats.finalCount}

### Success Metrics
- **Processing success rate**: ${((stats.processedCount - stats.errorCount) / stats.processedCount * 100).toFixed(1)}%
- **Cleaning success rate**: ${(stats.cleanedCount / stats.processedCount * 100).toFixed(1)}%
- **Saving success rate**: ${(stats.savedCount / stats.cleanedCount * 100).toFixed(1)}%

## 🔍 Data Quality Analysis

### Data Coverage
- **Activities with names**: ${stats.cleanedCount}/${stats.totalRecords} (${(stats.cleanedCount / stats.totalRecords * 100).toFixed(1)}%)
- **Activities with providers**: TBD (requires detailed analysis)
- **Activities with locations**: TBD (requires detailed analysis)
- **Activities with prices**: TBD (requires detailed analysis)
- **Activities with ratings**: TBD (requires detailed analysis)

### Quality Distribution
- **High quality (80-100)**: TBD
- **Medium quality (50-79)**: TBD
- **Low quality (0-49)**: TBD

## 📈 Recommendations

### Immediate Actions
1. **Review error logs** for ${stats.errorCount} processing errors
2. **Analyze skipped records** to understand data quality issues
3. **Monitor data quality scores** for continuous improvement

### Long-term Improvements
1. **Enhance data extraction** for better coverage
2. **Implement automated quality monitoring**
3. **Set up regular data refresh cycles**
4. **Create data quality dashboards**

## 🔧 Technical Details

### Database Connections
- ✅ GYG Database: Connected successfully
- ✅ Main Database: Connected successfully
- ✅ Dual database operations: Working correctly

### Processing Pipeline
1. **Fetch**: Retrieved ${stats.totalRecords} activities from GYG database
2. **Clean**: Processed and cleaned ${stats.cleanedCount} activities
3. **Save**: Stored ${stats.savedCount} activities in main database
4. **Validate**: Quality checks and scoring applied

### Performance Metrics
- **Processing time**: TBD
- **Memory usage**: TBD
- **Database operations**: ${stats.savedCount} successful saves

---

*This report was generated automatically by the Activities Data Import System*
`;
}
if (require.main === module) {
    fetchCleanSaveActivities();
}
//# sourceMappingURL=fetch-clean-save-activities.js.map