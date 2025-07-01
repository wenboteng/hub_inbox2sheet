export interface GetYourGuideArticle {
    platform: 'GetYourGuide';
    url: string;
    question: string;
    answer: string;
    category?: string;
}
export interface PaginationInfo {
    hasNextPage: boolean;
    nextPageUrl?: string;
    currentPage: number;
    totalPages?: number;
}
export declare function crawlGetYourGuideArticle(url: string): Promise<GetYourGuideArticle | null>;
export declare function crawlGetYourGuideArticlesWithPagination(urls?: string[]): Promise<GetYourGuideArticle[]>;
export declare function crawlGetYourGuideArticles(urls?: string[]): Promise<GetYourGuideArticle[]>;
//# sourceMappingURL=getyourguide.d.ts.map