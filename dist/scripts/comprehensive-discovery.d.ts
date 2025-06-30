interface Article {
    url: string;
    question: string;
    answer: string;
    platform: string;
    category: string;
    contentType: 'official' | 'community';
}
declare function deepScrapeAirbnb(): Promise<Article[]>;
declare function scrapeTripAdvisor(): Promise<Article[]>;
declare function scrapeBooking(): Promise<Article[]>;
declare function scrapeReddit(): Promise<Article[]>;
declare function scrapeQuora(): Promise<Article[]>;
export { deepScrapeAirbnb, scrapeTripAdvisor, scrapeBooking, scrapeReddit, scrapeQuora };
//# sourceMappingURL=comprehensive-discovery.d.ts.map