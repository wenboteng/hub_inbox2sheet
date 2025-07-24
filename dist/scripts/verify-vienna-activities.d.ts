declare function verifyViennaActivities(): Promise<{
    totalViennaActivities: number;
    duplicates: number;
    withAllData: number;
    qualityMetrics: {
        total: number;
        withProviderName: number;
        withRating: number;
        withReviewCount: number;
        withPrice: number;
        withAllData: number;
        missingData: any[];
    };
}>;
export { verifyViennaActivities };
//# sourceMappingURL=verify-vienna-activities.d.ts.map