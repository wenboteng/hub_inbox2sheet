interface DataQualityReport {
    totalActivities: number;
    gygActivities: number;
    viatorActivities: number;
    dataQuality: {
        missingPrices: number;
        missingRatings: number;
        missingReviews: number;
        missingLocations: number;
        missingProviders: number;
        invalidPrices: number;
        invalidRatings: number;
        duplicateActivities: number;
    };
    locationAnalysis: {
        totalUniqueLocations: number;
        topLocations: Array<{
            location: string;
            count: number;
        }>;
        unknownLocations: number;
    };
    providerAnalysis: {
        totalUniqueProviders: number;
        topProviders: Array<{
            provider: string;
            count: number;
        }>;
        unknownProviders: number;
    };
    priceAnalysis: {
        priceRange: {
            min: number;
            max: number;
            average: number;
        };
        currencyDistribution: Array<{
            currency: string;
            count: number;
        }>;
        priceOutliers: number;
    };
    ratingAnalysis: {
        ratingRange: {
            min: number;
            max: number;
            average: number;
        };
        ratingDistribution: Array<{
            range: string;
            count: number;
        }>;
        invalidRatings: number;
    };
    platformAnalysis: {
        gygQuality: {
            total: number;
            withPrices: number;
            withRatings: number;
            withReviews: number;
            withLocations: number;
        };
        viatorQuality: {
            total: number;
            withPrices: number;
            withRatings: number;
            withReviews: number;
            withLocations: number;
        };
    };
    cleaningRecommendations: string[];
}
declare function analyzeDataQuality(): Promise<DataQualityReport>;
export { analyzeDataQuality };
//# sourceMappingURL=analyze-data-quality.d.ts.map