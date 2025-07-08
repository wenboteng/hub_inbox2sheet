interface EnrichmentResult {
    enrichedContent: string;
    shareSuggestions: string[];
}
declare function mockEnrichReportTitleAndIntro(title: string, intro: string): {
    enrichedTitle: string;
    enrichedIntro: string;
};
declare function mockGenerateSummaryBoxes(reportContent: string): string[];
declare function mockGenerateShareSuggestions(reportContent: string): string[];
declare function mockEnrichReportWithGPT(reportContent: string, originalTitle?: string): EnrichmentResult;
declare function testGPTEnrichment(): Promise<void>;
//# sourceMappingURL=test-gpt-enrichment-mock.d.ts.map