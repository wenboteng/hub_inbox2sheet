export declare function cleanPrice(priceText: string): {
    original: string;
    numeric: number | null;
    currency: string;
};
export declare function cleanRating(ratingText: string): {
    original: string;
    rating: number | null;
    reviews: number | null;
};
export declare function cleanLocation(locationText: string): {
    city: string;
    country: string;
    venue: string;
};
export declare function cleanDuration(durationText: string): {
    original: string;
    hours: number | null;
    days: number | null;
};
export declare function cleanProviderName(providerText: string): string;
export declare function cleanTags(tagsText: string): string[];
export declare function calculateQualityScore(activity: any): number;
//# sourceMappingURL=data-cleaning-pipeline.d.ts.map