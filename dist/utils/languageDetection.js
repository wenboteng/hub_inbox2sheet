"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
exports.getLanguageName = getLanguageName;
exports.getLanguageFlag = getLanguageFlag;
exports.isLanguageDetectionReliable = isLanguageDetectionReliable;
const franc_1 = require("franc");
// Language mapping from franc codes to ISO 639-1
const LANGUAGE_MAPPING = {
    'eng': 'en',
    'spa': 'es',
    'ita': 'it',
    'fra': 'fr',
    'deu': 'de',
    'por': 'pt',
    'rus': 'ru',
    'jpn': 'ja',
    'kor': 'ko',
    'cmn': 'zh',
    'ara': 'ar',
    'hin': 'hi',
    'nld': 'nl',
    'swe': 'sv',
    'nor': 'no',
    'dan': 'da',
    'fin': 'fi',
    'pol': 'pl',
    'tur': 'tr',
    'heb': 'he',
    'ell': 'el',
    'hun': 'hu',
    'ces': 'cs',
    'ron': 'ro',
    'bul': 'bg',
    'hrv': 'hr',
    'slv': 'sl',
    'est': 'et',
    'lav': 'lv',
    'lit': 'lt',
    'mlt': 'mt',
    'cat': 'ca',
    'eus': 'eu',
    'glg': 'gl',
    'oci': 'oc',
    'bre': 'br',
    'cym': 'cy',
    'gle': 'ga',
    'gla': 'gd',
    'cor': 'kw',
    'mon': 'mn',
    'kaz': 'kk',
    'kir': 'ky',
    'uzb': 'uz',
    'tgl': 'tl',
    'ind': 'id',
    'msa': 'ms',
    'tha': 'th',
    'vie': 'vi',
    'ben': 'bn',
    'tam': 'ta',
    'tel': 'te',
    'mar': 'mr',
    'guj': 'gu',
    'kan': 'kn',
    'mal': 'ml',
    'ori': 'or',
    'pan': 'pa',
    'sin': 'si',
    'urd': 'ur',
    'nep': 'ne',
    'mya': 'my',
    'khm': 'km',
    'lao': 'lo',
    'tib': 'bo',
    'dzo': 'dz',
    'amh': 'am',
    'tir': 'ti',
    'orm': 'om',
    'som': 'so',
    'swa': 'sw',
    'zul': 'zu',
    'xho': 'xh',
    'afr': 'af',
    'nbl': 'nr',
    'sot': 'st',
    'tsn': 'tn',
    'ven': 've',
    'tso': 'ts',
    'ssw': 'ss',
    'nya': 'ny',
    'bem': 'bem',
    'lin': 'ln',
    'kon': 'kg',
    'lug': 'lg',
    'run': 'rn',
    'kin': 'rw',
    'ibo': 'ig',
    'yor': 'yo',
    'hau': 'ha',
    'ful': 'ff',
    'wol': 'wo',
    'sus': 'sus',
    'man': 'man',
    'dyu': 'dyu',
    'bam': 'bm',
    'ewe': 'ee',
    'twi': 'tw',
    'mos': 'mos',
    'kab': 'kab',
    'ber': 'ber',
};
// Minimum confidence threshold for language detection
const MIN_CONFIDENCE = 0.3;
// Minimum text length for reliable language detection
const MIN_TEXT_LENGTH = 50;
/**
 * Detect the language of the given text
 * @param text The text to analyze
 * @returns Language detection result with ISO 639-1 code
 */
function detectLanguage(text) {
    // Clean and prepare text for detection
    const cleanText = text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 1000); // Limit to first 1000 chars for performance
    // Check if text is too short for reliable detection
    if (cleanText.length < MIN_TEXT_LENGTH) {
        return {
            language: 'en', // Default to English for short texts
            confidence: 0,
            isReliable: false
        };
    }
    try {
        // Use franc to detect language - it returns a string (language code)
        const detectedCode = (0, franc_1.franc)(cleanText, { minLength: MIN_TEXT_LENGTH });
        // Franc doesn't provide confidence scores in the basic version
        // We'll use a simple heuristic based on text length and detection result
        const confidence = detectedCode !== 'und' ? 0.8 : 0.1;
        // Map franc language code to ISO 639-1
        const language = LANGUAGE_MAPPING[detectedCode] || 'en';
        // Determine if detection is reliable
        const isReliable = confidence >= MIN_CONFIDENCE && detectedCode !== 'und';
        return {
            language,
            confidence,
            isReliable
        };
    }
    catch (error) {
        console.warn('[LANGUAGE_DETECTION] Error detecting language:', error);
        return {
            language: 'en', // Fallback to English
            confidence: 0,
            isReliable: false
        };
    }
}
/**
 * Get language name from ISO 639-1 code
 * @param code ISO 639-1 language code
 * @returns Human-readable language name
 */
function getLanguageName(code) {
    const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'it': 'Italian',
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'nl': 'Dutch',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'da': 'Danish',
        'fi': 'Finnish',
        'pl': 'Polish',
        'tr': 'Turkish',
        'he': 'Hebrew',
        'el': 'Greek',
        'hu': 'Hungarian',
        'cs': 'Czech',
        'ro': 'Romanian',
        'bg': 'Bulgarian',
        'hr': 'Croatian',
        'sl': 'Slovenian',
        'et': 'Estonian',
        'lv': 'Latvian',
        'lt': 'Lithuanian',
        'mt': 'Maltese',
        'ca': 'Catalan',
        'eu': 'Basque',
        'gl': 'Galician',
        'oc': 'Occitan',
        'br': 'Breton',
        'cy': 'Welsh',
        'ga': 'Irish',
        'gd': 'Scottish Gaelic',
        'kw': 'Cornish',
        'mn': 'Mongolian',
        'kk': 'Kazakh',
        'ky': 'Kyrgyz',
        'uz': 'Uzbek',
        'tl': 'Tagalog',
        'id': 'Indonesian',
        'ms': 'Malay',
        'th': 'Thai',
        'vi': 'Vietnamese',
        'bn': 'Bengali',
        'ta': 'Tamil',
        'te': 'Telugu',
        'mr': 'Marathi',
        'gu': 'Gujarati',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'or': 'Odia',
        'pa': 'Punjabi',
        'si': 'Sinhala',
        'ur': 'Urdu',
        'ne': 'Nepali',
        'my': 'Myanmar',
        'km': 'Khmer',
        'lo': 'Lao',
        'bo': 'Tibetan',
        'dz': 'Dzongkha',
        'am': 'Amharic',
        'ti': 'Tigrinya',
        'om': 'Oromo',
        'so': 'Somali',
        'sw': 'Swahili',
        'zu': 'Zulu',
        'xh': 'Xhosa',
        'af': 'Afrikaans',
        'nr': 'Southern Ndebele',
        'st': 'Southern Sotho',
        'tn': 'Tswana',
        've': 'Venda',
        'ts': 'Tsonga',
        'ss': 'Swati',
        'ny': 'Chichewa',
        'rw': 'Kinyarwanda',
        'ig': 'Igbo',
        'yo': 'Yoruba',
        'ha': 'Hausa',
        'ff': 'Fula',
        'wo': 'Wolof',
    };
    return languageNames[code] || code.toUpperCase();
}
/**
 * Get flag emoji for language code
 * @param code ISO 639-1 language code
 * @returns Flag emoji or language code
 */
function getLanguageFlag(code) {
    const flagMap = {
        'en': '🇺🇸',
        'es': '🇪🇸',
        'it': '🇮🇹',
        'fr': '🇫🇷',
        'de': '🇩🇪',
        'pt': '🇵🇹',
        'ru': '🇷🇺',
        'ja': '🇯🇵',
        'ko': '🇰🇷',
        'zh': '🇨🇳',
        'ar': '🇸🇦',
        'hi': '🇮🇳',
        'nl': '🇳🇱',
        'sv': '🇸🇪',
        'no': '🇳🇴',
        'da': '🇩🇰',
        'fi': '🇫🇮',
        'pl': '🇵🇱',
        'tr': '🇹🇷',
        'he': '🇮🇱',
        'el': '🇬🇷',
        'hu': '🇭🇺',
        'cs': '🇨🇿',
        'ro': '🇷🇴',
        'bg': '🇧🇬',
        'hr': '🇭🇷',
        'sl': '🇸🇮',
        'et': '🇪🇪',
        'lv': '🇱🇻',
        'lt': '🇱🇹',
        'mt': '🇲🇹',
        'ca': '🇪🇸',
        'eu': '🇪🇸',
        'gl': '🇪🇸',
        'th': '🇹🇭',
        'vi': '🇻🇳',
        'id': '🇮🇩',
        'ms': '🇲🇾',
        'bn': '🇧🇩',
        'ta': '🇮🇳',
        'te': '🇮🇳',
        'mr': '🇮🇳',
        'gu': '🇮🇳',
        'kn': '🇮🇳',
        'ml': '🇮🇳',
        'or': '🇮🇳',
        'pa': '🇮🇳',
        'si': '🇱🇰',
        'ur': '🇵🇰',
        'ne': '🇳🇵',
        'my': '🇲🇲',
        'km': '🇰🇭',
        'lo': '🇱🇦',
        'bo': '🇨🇳',
        'dz': '🇧🇹',
        'am': '🇪🇹',
        'ti': '🇪🇷',
        'om': '🇪🇹',
        'so': '🇸🇴',
        'sw': '🇹🇿',
        'zu': '🇿🇦',
        'xh': '🇿🇦',
        'af': '🇿🇦',
        'rw': '🇷🇼',
        'ig': '🇳🇬',
        'yo': '🇳🇬',
        'ha': '🇳🇬',
        'ff': '🇸🇳',
        'wo': '🇸🇳',
    };
    return flagMap[code] || `[${code.toUpperCase()}]`;
}
/**
 * Check if the detected language is reliable enough to use
 * @param result Language detection result
 * @returns True if the detection is reliable
 */
function isLanguageDetectionReliable(result) {
    return result.isReliable && result.confidence >= MIN_CONFIDENCE;
}
