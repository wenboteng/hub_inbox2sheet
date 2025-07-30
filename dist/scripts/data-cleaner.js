"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCleaner = void 0;
const dual_prisma_1 = require("../lib/dual-prisma");
class DataCleaner {
    constructor() {
        this.stats = {
            totalActivities: 0,
            cleanedActivities: 0,
            removedActivities: 0,
            priceOutliersRemoved: 0,
            invalidRatingsFixed: 0,
            duplicatesRemoved: 0,
            locationsEnhanced: 0,
            providersStandardized: 0,
            qualityScoreImproved: 0
        };
    }
    async cleanData() {
        console.log('🧹 STARTING DATA CLEANING PROCESS...\n');
        try {
            await dual_prisma_1.mainPrisma.$connect();
            // Get all activities
            const allActivities = await dual_prisma_1.mainPrisma.importedGYGActivity.findMany();
            this.stats.totalActivities = allActivities.length;
            console.log(`📊 Processing ${this.stats.totalActivities} activities...`);
            // Phase 1: Price Validation & Outlier Removal
            await this.cleanPrices(allActivities);
            // Phase 2: Rating Validation
            await this.cleanRatings(allActivities);
            // Phase 3: Location Enhancement
            await this.enhanceLocations(allActivities);
            // Phase 4: Provider Standardization
            await this.standardizeProviders(allActivities);
            // Phase 5: Duplicate Detection & Removal
            await this.removeDuplicates(allActivities);
            // Phase 6: Quality Scoring
            await this.updateQualityScores(allActivities);
            console.log('\n✅ DATA CLEANING COMPLETED!');
            this.printStats();
            return this.stats;
        }
        catch (error) {
            console.error('❌ Error during data cleaning:', error);
            throw error;
        }
        finally {
            await dual_prisma_1.mainPrisma.$disconnect();
        }
    }
    async cleanPrices(activities) {
        console.log('\n💰 Cleaning price data...');
        const priceOutliers = activities.filter(a => a.priceNumeric && a.priceNumeric > 500);
        for (const activity of priceOutliers) {
            await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                where: { id: activity.id },
                data: {
                    priceNumeric: null,
                    priceText: null,
                    qualityScore: Math.max(0, (activity.qualityScore || 0) - 20)
                }
            });
            this.stats.priceOutliersRemoved++;
        }
        console.log(`  Removed ${this.stats.priceOutliersRemoved} price outliers (>€500)`);
    }
    async cleanRatings(activities) {
        console.log('\n⭐ Cleaning rating data...');
        const invalidRatings = activities.filter(a => a.ratingNumeric && (a.ratingNumeric <= 0 || a.ratingNumeric > 5));
        for (const activity of invalidRatings) {
            await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                where: { id: activity.id },
                data: {
                    ratingNumeric: null,
                    ratingText: null,
                    qualityScore: Math.max(0, (activity.qualityScore || 0) - 15)
                }
            });
            this.stats.invalidRatingsFixed++;
        }
        console.log(`  Fixed ${this.stats.invalidRatingsFixed} invalid ratings`);
    }
    async enhanceLocations(activities) {
        console.log('\n🌍 Enhancing location data...');
        const activitiesWithoutLocation = activities.filter(a => !a.location || a.location === 'Unknown Location');
        for (const activity of activitiesWithoutLocation) {
            let inferredLocation = this.inferLocation(activity);
            if (inferredLocation) {
                await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                    where: { id: activity.id },
                    data: {
                        location: inferredLocation,
                        city: inferredLocation.split(',')[0]?.trim() || 'Unknown',
                        country: inferredLocation.split(',').pop()?.trim() || 'Unknown',
                        qualityScore: Math.min(100, (activity.qualityScore || 0) + 10)
                    }
                });
                this.stats.locationsEnhanced++;
            }
        }
        console.log(`  Enhanced ${this.stats.locationsEnhanced} locations`);
    }
    inferLocation(activity) {
        // Extract location from activity name
        const name = activity.activityName?.toLowerCase() || '';
        // Common city patterns
        const cityPatterns = [
            'london', 'amsterdam', 'vienna', 'madrid', 'paris', 'rome', 'barcelona',
            'berlin', 'prague', 'budapest', 'dublin', 'edinburgh', 'glasgow',
            'manchester', 'birmingham', 'liverpool', 'bristol', 'leeds', 'cardiff'
        ];
        for (const city of cityPatterns) {
            if (name.includes(city)) {
                return this.getFullLocation(city);
            }
        }
        // Extract from provider name if it contains location
        const provider = activity.providerName?.toLowerCase() || '';
        for (const city of cityPatterns) {
            if (provider.includes(city)) {
                return this.getFullLocation(city);
            }
        }
        return null;
    }
    getFullLocation(city) {
        const locationMap = {
            'london': 'London, UK',
            'amsterdam': 'Amsterdam, Netherlands',
            'vienna': 'Vienna, Austria',
            'madrid': 'Madrid, Spain',
            'paris': 'Paris, France',
            'rome': 'Rome, Italy',
            'barcelona': 'Barcelona, Spain',
            'berlin': 'Berlin, Germany',
            'prague': 'Prague, Czech Republic',
            'budapest': 'Budapest, Hungary',
            'dublin': 'Dublin, Ireland',
            'edinburgh': 'Edinburgh, UK',
            'glasgow': 'Glasgow, UK',
            'manchester': 'Manchester, UK',
            'birmingham': 'Birmingham, UK',
            'liverpool': 'Liverpool, UK',
            'bristol': 'Bristol, UK',
            'leeds': 'Leeds, UK',
            'cardiff': 'Cardiff, UK'
        };
        return locationMap[city] || `${city}, Unknown`;
    }
    async standardizeProviders(activities) {
        console.log('\n🏢 Standardizing provider names...');
        const unknownProviders = activities.filter(a => !a.providerName || a.providerName === 'Unknown');
        for (const activity of unknownProviders) {
            const inferredProvider = this.inferProvider(activity);
            if (inferredProvider) {
                await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                    where: { id: activity.id },
                    data: {
                        providerName: inferredProvider,
                        qualityScore: Math.min(100, (activity.qualityScore || 0) + 5)
                    }
                });
                this.stats.providersStandardized++;
            }
        }
        console.log(`  Standardized ${this.stats.providersStandardized} provider names`);
    }
    inferProvider(activity) {
        // Extract provider from activity name or other fields
        const name = activity.activityName?.toLowerCase() || '';
        // Common provider patterns
        if (name.includes('viator'))
            return 'Viator';
        if (name.includes('getyourguide') || name.includes('gyg'))
            return 'GetYourGuide';
        if (name.includes('evan evans'))
            return 'Evan Evans Tours';
        if (name.includes('premium tours'))
            return 'Premium Tours';
        if (name.includes('city wonders'))
            return 'City Wonders UK';
        return null;
    }
    async removeDuplicates(activities) {
        console.log('\n🔄 Removing duplicates...');
        // Group by similar names
        const nameGroups = new Map();
        for (const activity of activities) {
            const normalizedName = this.normalizeActivityName(activity.activityName);
            if (!nameGroups.has(normalizedName)) {
                nameGroups.set(normalizedName, []);
            }
            nameGroups.get(normalizedName).push(activity);
        }
        // Remove duplicates, keeping the highest quality record
        for (const [name, group] of Array.from(nameGroups.entries())) {
            if (group.length > 1) {
                // Sort by quality score and keep the best one
                group.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
                // Remove duplicates (keep first one)
                for (let i = 1; i < group.length; i++) {
                    await dual_prisma_1.mainPrisma.importedGYGActivity.delete({
                        where: { id: group[i].id }
                    });
                    this.stats.duplicatesRemoved++;
                }
            }
        }
        console.log(`  Removed ${this.stats.duplicatesRemoved} duplicate activities`);
    }
    normalizeActivityName(name) {
        return name?.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }
    async updateQualityScores(activities) {
        console.log('\n📊 Updating quality scores...');
        for (const activity of activities) {
            const qualityScore = this.calculateQualityScore(activity);
            if (qualityScore !== activity.qualityScore) {
                await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                    where: { id: activity.id },
                    data: { qualityScore }
                });
                this.stats.qualityScoreImproved++;
            }
        }
        console.log(`  Updated ${this.stats.qualityScoreImproved} quality scores`);
    }
    calculateQualityScore(activity) {
        let score = 0;
        // Completeness (40 points)
        if (activity.activityName)
            score += 10;
        if (activity.providerName && activity.providerName !== 'Unknown')
            score += 10;
        if (activity.location && activity.location !== 'Unknown Location')
            score += 10;
        if (activity.priceNumeric && activity.priceNumeric > 0)
            score += 5;
        if (activity.ratingNumeric && activity.ratingNumeric > 0)
            score += 5;
        // Accuracy (30 points)
        if (activity.priceNumeric && activity.priceNumeric <= 500)
            score += 15;
        if (activity.ratingNumeric && activity.ratingNumeric >= 1 && activity.ratingNumeric <= 5)
            score += 15;
        // Consistency (30 points)
        if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0)
            score += 10;
        if (activity.duration)
            score += 5;
        if (activity.description)
            score += 5;
        if (activity.url)
            score += 5;
        if (activity.extractionQuality === 'high')
            score += 5;
        return Math.min(100, score);
    }
    printStats() {
        console.log('\n📈 CLEANING STATISTICS:');
        console.log('========================');
        console.log(`Total Activities: ${this.stats.totalActivities}`);
        console.log(`Price Outliers Removed: ${this.stats.priceOutliersRemoved}`);
        console.log(`Invalid Ratings Fixed: ${this.stats.invalidRatingsFixed}`);
        console.log(`Locations Enhanced: ${this.stats.locationsEnhanced}`);
        console.log(`Providers Standardized: ${this.stats.providersStandardized}`);
        console.log(`Duplicates Removed: ${this.stats.duplicatesRemoved}`);
        console.log(`Quality Scores Updated: ${this.stats.qualityScoreImproved}`);
    }
}
exports.DataCleaner = DataCleaner;
// Run the cleaning if this script is executed directly
if (require.main === module) {
    const cleaner = new DataCleaner();
    cleaner.cleanData();
}
//# sourceMappingURL=data-cleaner.js.map