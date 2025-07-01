#!/usr/bin/env tsx
interface Article {
    url: string;
    question: string;
    answer: string;
    platform: string;
    category: string;
}
export declare function scrapeAirbnbCommunity(): Promise<Article[]>;
export {};
//# sourceMappingURL=airbnb-community-crawler.d.ts.map