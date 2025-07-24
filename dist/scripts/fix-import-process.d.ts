declare function parseReviewCountFromText(reviewText: string): {
    text: string;
    numeric: number | null;
};
declare function parseRatingFromText(ratingText: string): {
    text: string;
    numeric: number | null;
};
declare function parsePriceFromText(priceText: string): {
    text: string;
    numeric: number | null;
    currency: string | null;
};
declare function fixImportProcess(): Promise<{
    functionsUpdated: boolean;
    testCasesProcessed: number;
    reportGenerated: boolean;
}>;
export { fixImportProcess, parseReviewCountFromText, parseRatingFromText, parsePriceFromText };
//# sourceMappingURL=fix-import-process.d.ts.map