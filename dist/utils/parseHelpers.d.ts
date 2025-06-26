export interface ParsedContent {
    title: string;
    content: string;
    rawHtml?: string;
}
export declare function parseContent(html: string, selectors: {
    title: string;
    content: string;
}): ParsedContent;
export declare function cleanText(text: string): string;
//# sourceMappingURL=parseHelpers.d.ts.map