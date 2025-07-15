export interface ViatorArticle {
    platform: 'Viator';
    url: string;
    question: string;
    answer: string;
    rawHtml?: string;
}
export declare function crawlViatorArticle(url: string): Promise<ViatorArticle>;
export declare function crawlViatorArticles(): Promise<ViatorArticle[]>;
//# sourceMappingURL=viator.d.ts.map