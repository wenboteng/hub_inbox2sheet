interface Article {
    url: string;
    question: string;
    answer: string;
    platform: string;
    category: string;
    contentType: 'official' | 'community';
}
export declare function scrapeAirbnb(): Promise<Article[]>;
export {};
//# sourceMappingURL=airbnb.d.ts.map