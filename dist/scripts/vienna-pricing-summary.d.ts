declare function showViennaPricingSummary(): Promise<{
    totalActivities: number;
    priceRanges: {
        'Budget (\u20AC0-25)': number;
        'Mid-range (\u20AC26-75)': number;
        'Premium (\u20AC76-150)': number;
        'Luxury (\u20AC151-300)': number;
        'Ultra-Luxury (\u20AC300+)': number;
    };
    valueAnalysis: number;
    activityTypes: number;
    avgPrice: number;
    avgRating: number;
}>;
export { showViennaPricingSummary };
//# sourceMappingURL=vienna-pricing-summary.d.ts.map