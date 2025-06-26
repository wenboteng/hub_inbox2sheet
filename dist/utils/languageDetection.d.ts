export interface LanguageDetectionResult {
    language: string;
    confidence: number;
    isReliable: boolean;
}
/**
 * Simple heuristic language detection
 * @param text The text to analyze
 * @returns Language detection result with ISO 639-1 code
 */
export declare function detectLanguage(text: string): LanguageDetectionResult;
/**
 * Get language name from ISO 639-1 code
 * @param code ISO 639-1 language code
 * @returns Human-readable language name
 */
export declare function getLanguageName(code: string): string;
/**
 * Get flag emoji for language code
 * @param code ISO 639-1 language code
 * @returns Flag emoji or language code
 */
export declare function getLanguageFlag(code: string): string;
/**
 * Check if language detection result is reliable
 * @param result Language detection result
 * @returns True if the detection is considered reliable
 */
export declare function isLanguageDetectionReliable(result: LanguageDetectionResult): boolean;
//# sourceMappingURL=languageDetection.d.ts.map