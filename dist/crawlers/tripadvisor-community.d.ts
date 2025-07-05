export interface TripAdvisorPost {
    platform: 'TripAdvisor';
    url: string;
    question: string;
    answer: string;
    author?: string;
    date?: string;
    category?: string;
    contentType: 'community';
    source: 'community';
    replies?: number;
    views?: number;
}
export declare function crawlTripAdvisorCommunity(): Promise<TripAdvisorPost[]>;
export declare function testTripAdvisorCrawler(): Promise<void>;
//# sourceMappingURL=tripadvisor-community.d.ts.map