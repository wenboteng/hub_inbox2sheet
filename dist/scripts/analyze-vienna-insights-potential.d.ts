declare function analyzeViennaInsightsPotential(): Promise<{
    totalActivities: number;
    pricingInsights: {
        'Budget (\u20AC0-25)': number;
        'Mid-range (\u20AC26-75)': number;
        'Premium (\u20AC76-150)': number;
        'Luxury (\u20AC150+)': number;
    };
    ratingInsights: {
        'Excellent (4.5-5.0)': number;
        'Very Good (4.0-4.4)': number;
        'Good (3.5-3.9)': number;
        'Average (3.0-3.4)': number;
        'Below Average (<3.0)': number;
    };
    activityTypes: {
        [k: string]: number;
    };
    topProviders: number;
    reviewInsights: {
        'High Popularity (1000+ reviews)': number;
        'Popular (100-999 reviews)': number;
        'Moderate (10-99 reviews)': number;
        'Low (<10 reviews)': number;
    };
    valueInsights: number;
}>;
export { analyzeViennaInsightsPotential };
//# sourceMappingURL=analyze-vienna-insights-potential.d.ts.map