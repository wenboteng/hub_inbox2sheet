interface Article {
    url: string;
    question: string;
    answer: string;
    platform: string;
    category: string;
    contentType: 'official' | 'community';
}
export declare function scrapeAirbnbCommunity(): Promise<Article[]>;
export {};
//# sourceMappingURL=scrape.d.ts.map