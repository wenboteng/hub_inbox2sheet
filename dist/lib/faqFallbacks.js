"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQ_FALLBACKS = void 0;
exports.findMatchingFallback = findMatchingFallback;
exports.getFallbackForPlatform = getFallbackForPlatform;
exports.FAQ_FALLBACKS = [
    // Airbnb Payouts
    {
        id: 'airbnb-payout-timing',
        platform: 'Airbnb',
        category: 'payouts',
        triggerKeywords: ['payout', 'payment', 'get paid', 'receive money', 'when money', 'payment timing', 'funds', 'earnings'],
        question: 'When can I get payment from Airbnb?',
        answer: 'Airbnb typically sends payouts 24 hours after the guest checks in. The exact timing may vary depending on your selected payout method and country. For most payout methods, you\'ll receive your earnings within 3-5 business days after the guest checks in.',
        confidence: 'high',
        source: 'https://www.airbnb.com/help/article/425/when-youll-get-your-payout',
        lastUpdated: '2024-01-01'
    },
    {
        id: 'airbnb-payout-methods',
        platform: 'Airbnb',
        category: 'payouts',
        triggerKeywords: ['payout method', 'how to get paid', 'bank account', 'direct deposit', 'payment options'],
        question: 'What payout methods does Airbnb offer?',
        answer: 'Airbnb offers several payout methods including direct deposit to your bank account, PayPal, international wire transfers, and other local payment options depending on your country. You can set up your preferred payout method in your account settings.',
        confidence: 'high',
        source: 'https://www.airbnb.com/help/article/425/when-youll-get-your-payout',
        lastUpdated: '2024-01-01'
    },
    {
        id: 'airbnb-cancellation-refund',
        platform: 'Airbnb',
        category: 'cancellations',
        triggerKeywords: ['cancel', 'cancellation', 'refund', 'money back', 'cancel booking'],
        question: 'How do cancellations and refunds work on Airbnb?',
        answer: 'Airbnb\'s cancellation policy depends on the host\'s chosen policy. Guests can typically cancel and receive a full refund if they cancel within 48 hours of booking and at least 14 days before check-in. Hosts can choose from flexible, moderate, or strict cancellation policies.',
        confidence: 'high',
        source: 'https://www.airbnb.com/help/article/1237/cancellation-policies',
        lastUpdated: '2024-01-01'
    },
    // GetYourGuide Payouts
    {
        id: 'getyourguide-payout-timing',
        platform: 'GetYourGuide',
        category: 'payouts',
        triggerKeywords: ['payout', 'payment', 'get paid', 'receive money', 'when money', 'payment timing', 'funds', 'earnings'],
        question: 'When can I get payment from GetYourGuide?',
        answer: 'GetYourGuide typically processes payouts within 30-45 days after the tour or activity takes place. The exact timing depends on your contract terms and payout method. You can track your earnings in your partner dashboard.',
        confidence: 'medium',
        source: 'https://partner.getyourguide.com/',
        lastUpdated: '2024-01-01'
    },
    {
        id: 'getyourguide-commission',
        platform: 'GetYourGuide',
        category: 'payouts',
        triggerKeywords: ['commission', 'fee', 'percentage', 'how much', 'earnings', 'revenue share'],
        question: 'What commission does GetYourGuide take?',
        answer: 'GetYourGuide typically takes a commission of 20-30% on bookings, though this can vary based on your partnership agreement and the type of activity. Commission rates are negotiated individually with partners.',
        confidence: 'medium',
        source: 'https://partner.getyourguide.com/',
        lastUpdated: '2024-01-01'
    },
    // Viator Payouts
    {
        id: 'viator-payout-timing',
        platform: 'Viator',
        category: 'payouts',
        triggerKeywords: ['payout', 'payment', 'get paid', 'receive money', 'when money', 'payment timing', 'funds', 'earnings'],
        question: 'When can I get payment from Viator?',
        answer: 'Viator typically processes payments within 30-60 days after the tour or activity completion. Payment timing depends on your supplier agreement and the specific terms of your partnership.',
        confidence: 'medium',
        source: 'https://www.viator.com/partner/',
        lastUpdated: '2024-01-01'
    },
    // Booking.com Payouts
    {
        id: 'booking-payout-timing',
        platform: 'Booking.com',
        category: 'payouts',
        triggerKeywords: ['payout', 'payment', 'get paid', 'receive money', 'when money', 'payment timing', 'funds', 'earnings'],
        question: 'When can I get payment from Booking.com?',
        answer: 'Booking.com typically processes payments within 7-14 days after guest check-out, depending on your payment model. For properties using the commission model, payments are usually processed monthly.',
        confidence: 'high',
        source: 'https://partner.booking.com/',
        lastUpdated: '2024-01-01'
    }
];
function findMatchingFallback(query, platform) {
    const normalizedQuery = query.toLowerCase();
    // Filter by platform if specified
    const relevantFallbacks = platform
        ? exports.FAQ_FALLBACKS.filter(fallback => fallback.platform.toLowerCase() === platform.toLowerCase())
        : exports.FAQ_FALLBACKS;
    // Find the best match based on keyword overlap
    let bestMatch = null;
    let bestScore = 0;
    for (const fallback of relevantFallbacks) {
        const matchingKeywords = fallback.triggerKeywords.filter(keyword => normalizedQuery.includes(keyword.toLowerCase()));
        const score = matchingKeywords.length / fallback.triggerKeywords.length;
        if (score > bestScore && score >= 0.3) { // At least 30% keyword match
            bestScore = score;
            bestMatch = fallback;
        }
    }
    return bestMatch;
}
function getFallbackForPlatform(platform, category) {
    let fallbacks = exports.FAQ_FALLBACKS.filter(fallback => fallback.platform.toLowerCase() === platform.toLowerCase());
    if (category) {
        fallbacks = fallbacks.filter(fallback => fallback.category.toLowerCase() === category.toLowerCase());
    }
    return fallbacks;
}
