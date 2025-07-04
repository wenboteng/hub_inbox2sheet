interface CleanedPrice {
    numeric: number | null;
    currency: string | null;
    original: string;
}
interface CleanedRating {
    rating: number | null;
    reviews: number | null;
    original: string;
}
interface CleanedLocation {
    city: string;
    country: string;
    venue?: string;
    original: string;
}
interface CleanedDuration {
    hours: number | null;
    days: number | null;
    original: string;
}
declare function cleanPrice(priceText: string | null): CleanedPrice;
declare function cleanRating(ratingText: string | null, reviewCountText?: string | null): CleanedRating;
declare function cleanLocation(locationText: string | null): CleanedLocation;
declare function cleanDuration(durationText: string | null): CleanedDuration;
declare function cleanProviderName(providerName: string | null): string;
declare function cleanTags(tagsJSONB: any): string[];
declare function calculateQualityScore(activity: any): number;
declare function cleanGYGData(): Promise<void>;
export { cleanPrice, cleanRating, cleanLocation, cleanDuration, cleanProviderName, cleanTags, calculateQualityScore, cleanGYGData };
//# sourceMappingURL=data-cleaning-pipeline.d.ts.map