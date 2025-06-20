"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterArticlesByLanguage = filterArticlesByLanguage;
exports.getLanguageStats = getLanguageStats;
exports.formatLanguageLabel = formatLanguageLabel;
exports.getBrowserLanguage = getBrowserLanguage;
exports.shouldOfferTranslation = shouldOfferTranslation;
exports.getTranslationSuggestion = getTranslationSuggestion;
const languageDetection_1 = require("./languageDetection");
/**
 * Filter articles by language preference
 * @param articles Array of articles to filter
 * @param options Language filtering options
 * @returns Filtered and sorted articles
 */
function filterArticlesByLanguage(articles, options = {}) {
    const { preferredLanguage = 'en', fallbackToMultilingual = true, showLanguageLabels = true } = options;
    // First, try to find articles in the preferred language
    const preferredArticles = articles.filter(article => article.language === preferredLanguage);
    // If we have preferred language articles, return them
    if (preferredArticles.length > 0) {
        return preferredArticles.map(article => ({
            ...article,
            languageName: (0, languageDetection_1.getLanguageName)(article.language),
            languageFlag: showLanguageLabels ? (0, languageDetection_1.getLanguageFlag)(article.language) : '',
            isNonPreferredLanguage: false,
        }));
    }
    // If no preferred language articles and fallback is enabled, return all articles
    if (fallbackToMultilingual) {
        return articles.map(article => ({
            ...article,
            languageName: (0, languageDetection_1.getLanguageName)(article.language),
            languageFlag: showLanguageLabels ? (0, languageDetection_1.getLanguageFlag)(article.language) : '',
            isNonPreferredLanguage: article.language !== preferredLanguage,
        }));
    }
    // No fallback, return empty array
    return [];
}
/**
 * Get language statistics from articles
 * @param articles Array of articles
 * @returns Language distribution statistics
 */
function getLanguageStats(articles) {
    const languageCounts = {};
    let total = 0;
    articles.forEach(article => {
        const lang = article.language || 'en';
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        total++;
    });
    // Find primary language
    let primaryLanguage = 'en';
    let primaryLanguageCount = 0;
    Object.entries(languageCounts).forEach(([lang, count]) => {
        if (count > primaryLanguageCount) {
            primaryLanguage = lang;
            primaryLanguageCount = count;
        }
    });
    return {
        total,
        languages: languageCounts,
        primaryLanguage,
        primaryLanguageCount,
    };
}
/**
 * Format language label for display
 * @param languageCode ISO 639-1 language code
 * @param showFlag Whether to include flag emoji
 * @returns Formatted language label
 */
function formatLanguageLabel(languageCode, showFlag = true) {
    const name = (0, languageDetection_1.getLanguageName)(languageCode);
    const flag = showFlag ? (0, languageDetection_1.getLanguageFlag)(languageCode) : '';
    if (languageCode === 'en') {
        return name; // Don't show flag for English (default)
    }
    return showFlag ? `${flag} ${name}` : name;
}
/**
 * Get browser language preference
 * @returns ISO 639-1 language code or 'en' as fallback
 */
function getBrowserLanguage() {
    if (typeof window === 'undefined') {
        return 'en'; // Server-side fallback
    }
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    // Extract primary language code (e.g., 'en-US' -> 'en')
    const primaryLang = browserLang.split('-')[0].toLowerCase();
    // Map common browser languages to supported codes
    const languageMap = {
        'en': 'en',
        'es': 'es',
        'it': 'it',
        'fr': 'fr',
        'de': 'de',
        'pt': 'pt',
        'ru': 'ru',
        'ja': 'ja',
        'ko': 'ko',
        'zh': 'zh',
        'ar': 'ar',
        'hi': 'hi',
        'nl': 'nl',
        'sv': 'sv',
        'no': 'no',
        'da': 'da',
        'fi': 'fi',
        'pl': 'pl',
        'tr': 'tr',
        'he': 'he',
        'el': 'el',
        'hu': 'hu',
        'cs': 'cs',
        'ro': 'ro',
        'bg': 'bg',
        'hr': 'hr',
        'sl': 'sl',
        'et': 'et',
        'lv': 'lv',
        'lt': 'lt',
        'mt': 'mt',
        'ca': 'ca',
        'eu': 'eu',
        'gl': 'gl',
        'th': 'th',
        'vi': 'vi',
        'id': 'id',
        'ms': 'ms',
        'bn': 'bn',
        'ta': 'ta',
        'te': 'te',
        'mr': 'mr',
        'gu': 'gu',
        'kn': 'kn',
        'ml': 'ml',
        'or': 'or',
        'pa': 'pa',
        'si': 'si',
        'ur': 'ur',
        'ne': 'ne',
        'my': 'my',
        'km': 'km',
        'lo': 'lo',
        'bo': 'bo',
        'dz': 'dz',
        'am': 'am',
        'ti': 'ti',
        'om': 'om',
        'so': 'so',
        'sw': 'sw',
        'zu': 'zu',
        'xh': 'xh',
        'af': 'af',
        'rw': 'rw',
        'ig': 'ig',
        'yo': 'yo',
        'ha': 'ha',
        'ff': 'ff',
        'wo': 'wo',
    };
    return languageMap[primaryLang] || 'en';
}
/**
 * Check if content should be translated
 * @param languageCode Current language code
 * @param preferredLanguage Preferred language code
 * @returns Whether translation should be offered
 */
function shouldOfferTranslation(languageCode, preferredLanguage = 'en') {
    // Don't offer translation for English content
    if (languageCode === 'en') {
        return false;
    }
    // Offer translation for non-preferred languages
    return languageCode !== preferredLanguage;
}
/**
 * Get translation suggestion text
 * @param languageCode Current language code
 * @returns Suggestion text for translation
 */
function getTranslationSuggestion(languageCode) {
    const languageName = (0, languageDetection_1.getLanguageName)(languageCode);
    return `This answer is in ${languageName}. Would you like it translated to English?`;
}
