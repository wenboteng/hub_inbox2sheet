"use strict";
// Simple heuristic language detection without external dependencies
// Focuses on the most common languages for travel/booking content
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
exports.getLanguageName = getLanguageName;
exports.getLanguageFlag = getLanguageFlag;
exports.isLanguageDetectionReliable = isLanguageDetectionReliable;
// Common words and patterns for different languages
const LANGUAGE_PATTERNS = {
    en: {
        words: ['the', 'and', 'for', 'with', 'this', 'that', 'you', 'are', 'have', 'will', 'can', 'help', 'support', 'booking', 'travel', 'host', 'guest'],
        patterns: [/\bthe\b/i, /\band\b/i, /\bfor\b/i, /\bwith\b/i, /\bthis\b/i, /\bthat\b/i, /\byou\b/i, /\bare\b/i, /\bhave\b/i, /\bwill\b/i, /\bcan\b/i]
    },
    es: {
        words: ['el', 'la', 'los', 'las', 'y', 'de', 'en', 'con', 'por', 'para', 'este', 'esta', 'estos', 'estas', 'tú', 'eres', 'tienes', 'puedes', 'ayuda', 'reserva', 'viaje', 'anfitrión', 'huésped'],
        patterns: [/\bel\b/i, /\bla\b/i, /\blos\b/i, /\blas\b/i, /\by\b/i, /\bde\b/i, /\ben\b/i, /\bcon\b/i, /\bpor\b/i, /\bpara\b/i, /\beste\b/i, /\besta\b/i, /\btú\b/i, /\beres\b/i, /\btienes\b/i]
    },
    fr: {
        words: ['le', 'la', 'les', 'et', 'de', 'en', 'avec', 'pour', 'ce', 'cette', 'ces', 'tu', 'es', 'as', 'peux', 'aide', 'réservation', 'voyage', 'hôte', 'invité'],
        patterns: [/\ble\b/i, /\bla\b/i, /\bles\b/i, /\bet\b/i, /\bde\b/i, /\ben\b/i, /\bavec\b/i, /\bpour\b/i, /\bce\b/i, /\bcette\b/i, /\btu\b/i, /\bes\b/i, /\bas\b/i, /\bpeux\b/i]
    },
    de: {
        words: ['der', 'die', 'das', 'und', 'von', 'in', 'mit', 'für', 'diese', 'diesen', 'du', 'bist', 'hast', 'kannst', 'hilfe', 'buchung', 'reise', 'gastgeber', 'gast'],
        patterns: [/\bder\b/i, /\bdie\b/i, /\bdas\b/i, /\bund\b/i, /\bvon\b/i, /\bin\b/i, /\bmit\b/i, /\bfür\b/i, /\bdiese\b/i, /\bdu\b/i, /\bbist\b/i, /\bhast\b/i, /\bkannst\b/i]
    },
    it: {
        words: ['il', 'la', 'gli', 'le', 'e', 'di', 'in', 'con', 'per', 'questo', 'questa', 'questi', 'queste', 'tu', 'sei', 'hai', 'puoi', 'aiuto', 'prenotazione', 'viaggio', 'ospite'],
        patterns: [/\bil\b/i, /\bla\b/i, /\bgli\b/i, /\ble\b/i, /\be\b/i, /\bdi\b/i, /\bin\b/i, /\bcon\b/i, /\bper\b/i, /\bquesto\b/i, /\bquesta\b/i, /\btu\b/i, /\bsei\b/i, /\bhai\b/i, /\bpuoi\b/i]
    },
    pt: {
        words: ['o', 'a', 'os', 'as', 'e', 'de', 'em', 'com', 'para', 'este', 'esta', 'estes', 'estas', 'tu', 'és', 'tens', 'podes', 'ajuda', 'reserva', 'viagem', 'anfitrião', 'hóspede'],
        patterns: [/\bo\b/i, /\ba\b/i, /\bos\b/i, /\bas\b/i, /\be\b/i, /\bde\b/i, /\bem\b/i, /\bcom\b/i, /\bpara\b/i, /\beste\b/i, /\besta\b/i, /\btu\b/i, /\bés\b/i, /\btens\b/i, /\bpodes\b/i]
    },
    ru: {
        words: ['и', 'в', 'на', 'с', 'по', 'для', 'это', 'эта', 'эти', 'ты', 'есть', 'можешь', 'помощь', 'бронирование', 'путешествие', 'хозяин', 'гость'],
        patterns: [/\bи\b/i, /\bв\b/i, /\bна\b/i, /\bс\b/i, /\bпо\b/i, /\bдля\b/i, /\bэто\b/i, /\bэта\b/i, /\bты\b/i, /\bесть\b/i, /\bможешь\b/i]
    },
    ja: {
        words: ['の', 'に', 'は', 'を', 'が', 'で', 'と', 'から', 'まで', 'この', 'その', 'あなた', 'です', 'ます', 'できます', 'ヘルプ', '予約', '旅行', 'ホスト', 'ゲスト'],
        patterns: [/\bの\b/i, /\bに\b/i, /\bは\b/i, /\bを\b/i, /\bが\b/i, /\bで\b/i, /\bと\b/i, /\bから\b/i, /\bまで\b/i, /\bこの\b/i, /\bその\b/i, /\bあなた\b/i, /\bです\b/i, /\bます\b/i]
    },
    ko: {
        words: ['의', '에', '는', '을', '를', '가', '에서', '와', '과', '부터', '까지', '이', '그', '당신', '입니다', '수', '있습니다', '도움', '예약', '여행', '호스트', '게스트'],
        patterns: [/\b의\b/i, /\b에\b/i, /\b는\b/i, /\b을\b/i, /\b를\b/i, /\b가\b/i, /\b에서\b/i, /\b와\b/i, /\b과\b/i, /\b부터\b/i, /\b까지\b/i, /\b이\b/i, /\b그\b/i, /\b당신\b/i, /\b입니다\b/i]
    },
    zh: {
        words: ['的', '在', '是', '有', '和', '与', '为', '这个', '那个', '你', '可以', '帮助', '预订', '旅行', '主人', '客人'],
        patterns: [/\b的\b/i, /\b在\b/i, /\b是\b/i, /\b有\b/i, /\b和\b/i, /\b与\b/i, /\b为\b/i, /\b这个\b/i, /\b那个\b/i, /\b你\b/i, /\b可以\b/i]
    },
    ar: {
        words: ['ال', 'في', 'من', 'إلى', 'على', 'مع', 'هذا', 'هذه', 'أنت', 'يمكن', 'مساعدة', 'حجز', 'سفر', 'مضيف', 'ضيف'],
        patterns: [/\bال\b/i, /\bفي\b/i, /\bمن\b/i, /\bإلى\b/i, /\bعلى\b/i, /\bمع\b/i, /\bهذا\b/i, /\bهذه\b/i, /\bأنت\b/i, /\bيمكن\b/i]
    },
    hi: {
        words: ['का', 'की', 'के', 'में', 'से', 'पर', 'के', 'साथ', 'यह', 'वह', 'आप', 'हैं', 'कर', 'सकते', 'मदद', 'बुकिंग', 'यात्रा', 'मेजबान', 'मेहमान'],
        patterns: [/\bका\b/i, /\bकी\b/i, /\bके\b/i, /\bमें\b/i, /\bसे\b/i, /\bपर\b/i, /\bसाथ\b/i, /\bयह\b/i, /\bवह\b/i, /\bआप\b/i, /\bहैं\b/i, /\bकर\b/i, /\bसकते\b/i]
    }
};
// Minimum text length for reliable detection
const MIN_TEXT_LENGTH = 20;
/**
 * Simple heuristic language detection
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
        const scores = {};
        const words = cleanText.toLowerCase().split(/\s+/);
        // Count matches for each language
        for (const [langCode, langData] of Object.entries(LANGUAGE_PATTERNS)) {
            let score = 0;
            // Check word matches
            for (const word of words) {
                if (langData.words.includes(word)) {
                    score += 1;
                }
            }
            // Check pattern matches
            for (const pattern of langData.patterns) {
                const matches = cleanText.match(pattern);
                if (matches) {
                    score += matches.length;
                }
            }
            scores[langCode] = score;
        }
        // Find the language with the highest score
        let bestLanguage = 'en'; // Default
        let bestScore = 0;
        for (const [langCode, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestLanguage = langCode;
            }
        }
        // Calculate confidence based on score and text length
        const maxPossibleScore = Math.min(words.length, 20); // Cap at 20 for reasonable confidence
        const confidence = bestScore > 0 ? Math.min(bestScore / maxPossibleScore, 1) : 0;
        // Determine if detection is reliable
        const isReliable = confidence >= 0.3 && bestScore >= 2;
        return {
            language: bestLanguage,
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
    return flagMap[code] || code.toUpperCase();
}
/**
 * Check if language detection result is reliable
 * @param result Language detection result
 * @returns True if the detection is considered reliable
 */
function isLanguageDetectionReliable(result) {
    return result.isReliable && result.confidence >= 0.3;
}
