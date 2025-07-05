export interface StackOverflowPost {
    platform: 'StackOverflow';
    url: string;
    question: string;
    answer: string;
    author?: string;
    date?: string;
    category?: string;
    contentType: 'community';
    source: 'community';
    score?: number;
    tags?: string[];
    isAccepted?: boolean;
}
export declare function crawlStackOverflow(): Promise<StackOverflowPost[]>;
export declare function testStackOverflowCrawler(): Promise<void>;
//# sourceMappingURL=stackoverflow.d.ts.map