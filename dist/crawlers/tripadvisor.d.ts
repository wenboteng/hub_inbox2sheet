export interface TripAdvisorArticle {
    platform: 'TripAdvisor';
    url: string;
    question: string;
    answer: string;
    category?: string;
}
export declare function crawlTripAdvisorArticles(): Promise<TripAdvisorArticle[]>;
//# sourceMappingURL=tripadvisor.d.ts.map