declare function generateViennaPricingReport(): Promise<{
    totalActivities: number;
    priceRanges: {
        [k: string]: number;
    };
    valueAnalysis: number;
    activityTypes: number;
    venues: number;
    providers: number;
}>;
export { generateViennaPricingReport };
//# sourceMappingURL=generate-vienna-pricing-report.d.ts.map