interface QualityMetrics {
    totalActivities: number;
    priceCoverage: number;
    ratingCoverage: number;
    locationCoverage: number;
    durationCoverage: number;
    tagsCoverage: number;
    averageQualityScore: number;
    qualityDistribution: Record<string, number>;
    topIssues: string[];
    recommendations: string[];
}
declare function monitorDataQuality(): Promise<void>;
declare function calculateQualityMetrics(): Promise<QualityMetrics>;
export { monitorDataQuality, calculateQualityMetrics };
//# sourceMappingURL=data-quality-monitor.d.ts.map