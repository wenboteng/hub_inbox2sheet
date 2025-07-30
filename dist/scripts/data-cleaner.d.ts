interface CleaningStats {
    totalActivities: number;
    cleanedActivities: number;
    removedActivities: number;
    priceOutliersRemoved: number;
    invalidRatingsFixed: number;
    duplicatesRemoved: number;
    locationsEnhanced: number;
    providersStandardized: number;
    qualityScoreImproved: number;
}
declare class DataCleaner {
    private stats;
    cleanData(): Promise<CleaningStats>;
    private cleanPrices;
    private cleanRatings;
    private enhanceLocations;
    private inferLocation;
    private getFullLocation;
    private standardizeProviders;
    private inferProvider;
    private removeDuplicates;
    private normalizeActivityName;
    private updateQualityScores;
    private calculateQualityScore;
    private printStats;
}
export { DataCleaner };
//# sourceMappingURL=data-cleaner.d.ts.map