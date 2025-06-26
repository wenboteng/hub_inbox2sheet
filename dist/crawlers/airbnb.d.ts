import { Browser } from 'puppeteer';
export interface AirbnbArticle {
    platform: 'Airbnb';
    url: string;
    question: string;
    answer: string;
    rawHtml?: string;
}
export declare function crawlAirbnbArticle(url: string, browser: Browser): Promise<AirbnbArticle | null>;
export declare function crawlAirbnbArticles(): Promise<AirbnbArticle[]>;
//# sourceMappingURL=airbnb.d.ts.map