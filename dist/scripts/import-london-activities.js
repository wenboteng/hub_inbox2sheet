"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_1 = require("../lib/dual-prisma");
// London keywords for identification
const londonKeywords = [
    'london', 'londres', 'londra', 'london eye', 'buckingham', 'westminster',
    'tower of london', 'big ben', 'thames', 'chelsea', 'soho', 'camden',
    'covent garden', 'piccadilly', 'oxford street', 'regent street',
    'hyde park', 'kensington', 'greenwich', 'windsor', 'stonehenge',
    'bath', 'oxford', 'cambridge', 'warner bros', 'harry potter',
    'heathrow', 'gatwick', 'stansted', 'luton', 'city airport'
];
function isLondonActivity(activityName) {
    if (!activityName)
        return false;
    const lowerName = activityName.toLowerCase();
    return londonKeywords.some(keyword => lowerName.includes(keyword));
}
function parsePrice(priceText) {
    if (!priceText)
        return { numeric: null, currency: '£' };
    // Extract currency and numeric value
    const currencyMatch = priceText.match(/[€$£]/);
    const currency = currencyMatch ? currencyMatch[0] : '£';
    const numericMatch = priceText.match(/(\d+(?:\.\d{2})?)/);
    const numeric = numericMatch ? parseFloat(numericMatch[1]) : null;
    return { numeric, currency };
}
function parseRating(ratingText) {
    if (!ratingText)
        return null;
    const match = ratingText.match(/(\d+(?:\.\d)?)/);
    return match ? parseFloat(match[1]) : null;
}
function parseReviewCount(reviewText) {
    if (!reviewText)
        return null;
    const match = reviewText.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}
function calculateQualityScore(activity) {
    let score = 0;
    let maxScore = 0;
    // Basic required fields (40 points)
    maxScore += 40;
    if (activity.activityName && activity.activityName.trim())
        score += 10;
    if (activity.providerName && activity.providerName.trim())
        score += 10;
    if (activity.location && activity.location.trim())
        score += 10;
    if (activity.city && activity.city.trim())
        score += 10;
    // Pricing data (20 points)
    maxScore += 20;
    if (activity.priceNumeric && activity.priceNumeric > 0)
        score += 10;
    if (activity.priceText)
        score += 10;
    // Rating data (20 points)
    maxScore += 20;
    if (activity.ratingNumeric && activity.ratingNumeric > 0)
        score += 10;
    if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0)
        score += 10;
    // Additional data (20 points)
    maxScore += 20;
    if (activity.description && activity.description.trim())
        score += 5;
    if (activity.duration && activity.duration.trim())
        score += 5;
    if (activity.url)
        score += 5;
    if (activity.country && activity.country.trim())
        score += 5;
    return Math.round((score / maxScore) * 100);
}
async function importLondonActivities() {
    console.log('🇬🇧 IMPORTING LONDON ACTIVITIES TO CLEANED TABLE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Check current London activities in cleaned table
        const currentLondonCount = await dual_prisma_1.mainPrisma.cleanedActivity.count({
            where: { city: 'London' }
        });
        console.log(`📊 Current London activities in cleaned table: ${currentLondonCount}`);
        // Import GYG London Activities
        console.log('\n📥 IMPORTING GYG LONDON ACTIVITIES...');
        console.log('=====================================');
        const gygActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        id, activity_name, provider_name, location, price, rating, review_count,
        duration, description, activity_url, extraction_quality
      FROM gyg_activities
    `;
        const gygLondonActivities = gygActivities.filter(activity => isLondonActivity(activity.activity_name));
        console.log(`Found ${gygLondonActivities.length} GYG London activities`);
        let gygImported = 0;
        let gygSkipped = 0;
        for (const activity of gygLondonActivities) {
            try {
                // Check if already exists
                const existing = await dual_prisma_1.mainPrisma.cleanedActivity.findFirst({
                    where: {
                        activityName: activity.activity_name,
                        providerName: activity.provider_name,
                        city: 'London'
                    }
                });
                if (existing) {
                    gygSkipped++;
                    continue;
                }
                // Parse data
                const priceData = parsePrice(activity.price);
                const ratingNumeric = parseRating(activity.rating);
                const reviewCountNumeric = parseReviewCount(activity.review_count);
                // Create activity object
                const londonActivity = {
                    id: `gyg_${activity.id}`,
                    activityName: activity.activity_name,
                    providerName: activity.provider_name || 'Unknown',
                    location: activity.location || 'London',
                    city: 'London',
                    country: 'UK',
                    priceText: activity.price,
                    priceNumeric: priceData.numeric,
                    priceCurrency: priceData.currency,
                    ratingText: activity.rating,
                    ratingNumeric,
                    reviewCountText: activity.review_count,
                    reviewCountNumeric,
                    duration: activity.duration,
                    description: activity.description,
                    url: activity.activity_url,
                    platform: 'gyg',
                    originalSource: 'gyg',
                    qualityScore: 0
                };
                // Calculate quality score
                londonActivity.qualityScore = calculateQualityScore(londonActivity);
                // Only import if quality score is good enough
                if (londonActivity.qualityScore >= 70) {
                    await dual_prisma_1.mainPrisma.cleanedActivity.create({
                        data: {
                            originalId: londonActivity.id,
                            activityName: londonActivity.activityName,
                            providerName: londonActivity.providerName,
                            location: londonActivity.location,
                            city: londonActivity.city,
                            country: londonActivity.country,
                            region: 'UK',
                            priceNumeric: londonActivity.priceNumeric,
                            priceCurrency: londonActivity.priceCurrency,
                            priceText: londonActivity.priceText,
                            ratingNumeric: londonActivity.ratingNumeric,
                            ratingText: londonActivity.ratingText,
                            reviewCountNumeric: londonActivity.reviewCountNumeric,
                            reviewCountText: londonActivity.reviewCountText,
                            duration: londonActivity.duration,
                            description: londonActivity.description,
                            url: londonActivity.url,
                            qualityScore: londonActivity.qualityScore,
                            originalSource: londonActivity.originalSource,
                            platform: londonActivity.platform
                        }
                    });
                    gygImported++;
                    if (gygImported % 50 === 0) {
                        console.log(`  Imported ${gygImported} GYG activities...`);
                    }
                }
                else {
                    gygSkipped++;
                }
            }
            catch (error) {
                console.error(`Error importing GYG activity ${activity.id}:`, error);
                gygSkipped++;
            }
        }
        console.log(`✅ GYG London activities: ${gygImported} imported, ${gygSkipped} skipped`);
        // Import Viator London Activities
        console.log('\n📥 IMPORTING VIATOR LONDON ACTIVITIES...');
        console.log('========================================');
        const viatorActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        id, activity_name, provider_name, location, price, rating, review_count,
        duration, description, activity_url, extraction_quality
      FROM viator_activities
    `;
        const viatorLondonActivities = viatorActivities.filter(activity => isLondonActivity(activity.activity_name));
        console.log(`Found ${viatorLondonActivities.length} Viator London activities`);
        let viatorImported = 0;
        let viatorSkipped = 0;
        for (const activity of viatorLondonActivities) {
            try {
                // Check if already exists
                const existing = await dual_prisma_1.mainPrisma.cleanedActivity.findFirst({
                    where: {
                        activityName: activity.activity_name,
                        providerName: activity.provider_name,
                        city: 'London'
                    }
                });
                if (existing) {
                    viatorSkipped++;
                    continue;
                }
                // Parse data
                const priceData = parsePrice(activity.price);
                const ratingNumeric = parseRating(activity.rating);
                const reviewCountNumeric = parseReviewCount(activity.review_count);
                // Create activity object
                const londonActivity = {
                    id: `viator_${activity.id}`,
                    activityName: activity.activity_name,
                    providerName: activity.provider_name || 'Unknown',
                    location: 'London', // Assign London since location is often missing
                    city: 'London',
                    country: 'UK',
                    priceText: activity.price,
                    priceNumeric: priceData.numeric,
                    priceCurrency: priceData.currency,
                    ratingText: activity.rating,
                    ratingNumeric,
                    reviewCountText: activity.review_count,
                    reviewCountNumeric,
                    duration: activity.duration,
                    description: activity.description,
                    url: activity.activity_url,
                    platform: 'viator',
                    originalSource: 'viator',
                    qualityScore: 0
                };
                // Calculate quality score
                londonActivity.qualityScore = calculateQualityScore(londonActivity);
                // Only import if quality score is good enough
                if (londonActivity.qualityScore >= 70) {
                    await dual_prisma_1.mainPrisma.cleanedActivity.create({
                        data: {
                            originalId: londonActivity.id,
                            activityName: londonActivity.activityName,
                            providerName: londonActivity.providerName,
                            location: londonActivity.location,
                            city: londonActivity.city,
                            country: londonActivity.country,
                            region: 'UK',
                            priceNumeric: londonActivity.priceNumeric,
                            priceCurrency: londonActivity.priceCurrency,
                            priceText: londonActivity.priceText,
                            ratingNumeric: londonActivity.ratingNumeric,
                            ratingText: londonActivity.ratingText,
                            reviewCountNumeric: londonActivity.reviewCountNumeric,
                            reviewCountText: londonActivity.reviewCountText,
                            duration: londonActivity.duration,
                            description: londonActivity.description,
                            url: londonActivity.url,
                            qualityScore: londonActivity.qualityScore,
                            originalSource: londonActivity.originalSource,
                            platform: londonActivity.platform
                        }
                    });
                    viatorImported++;
                    if (viatorImported % 50 === 0) {
                        console.log(`  Imported ${viatorImported} Viator activities...`);
                    }
                }
                else {
                    viatorSkipped++;
                }
            }
            catch (error) {
                console.error(`Error importing Viator activity ${activity.id}:`, error);
                viatorSkipped++;
            }
        }
        console.log(`✅ Viator London activities: ${viatorImported} imported, ${viatorSkipped} skipped`);
        // Final Summary
        console.log('\n🎯 IMPORT SUMMARY:');
        console.log('==================');
        const finalLondonCount = await dual_prisma_1.mainPrisma.cleanedActivity.count({
            where: { city: 'London' }
        });
        console.log(`📊 London activities before import: ${currentLondonCount}`);
        console.log(`📊 London activities after import: ${finalLondonCount}`);
        console.log(`📈 Total new London activities added: ${finalLondonCount - currentLondonCount}`);
        console.log(`✅ GYG activities imported: ${gygImported}`);
        console.log(`✅ Viator activities imported: ${viatorImported}`);
        console.log(`⏭️  Activities skipped (duplicates/low quality): ${gygSkipped + viatorSkipped}`);
        // URL Analysis
        const londonWithUrls = await dual_prisma_1.mainPrisma.cleanedActivity.count({
            where: {
                city: 'London',
                url: { not: null }
            }
        });
        console.log(`🔗 London activities with URLs: ${londonWithUrls}/${finalLondonCount} (${Math.round((londonWithUrls / finalLondonCount) * 100)}%)`);
        console.log('\n🎉 London activities import completed successfully!');
        console.log('✅ Users can now click on activity URLs to visit OTA sites');
        console.log('✅ Ready for comprehensive London tourism analysis');
    }
    catch (error) {
        console.error('❌ Error importing London activities:', error);
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
importLondonActivities().catch(console.error);
//# sourceMappingURL=import-london-activities.js.map