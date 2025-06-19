"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandSearchTerms = expandSearchTerms;
exports.buildExpandedSearchQuery = buildExpandedSearchQuery;
exports.getRelatedTerms = getRelatedTerms;
// Common synonyms and related terms for tour/activity vendor queries
const synonymMap = {
    // Payment related
    "payout": ["payment", "receiving funds", "compensation", "earnings", "revenue", "money"],
    "refund": ["return", "reimbursement", "money back", "chargeback"],
    "payment": ["transaction", "transfer", "deposit", "payout"],
    "fee": ["charge", "cost", "commission", "service charge"],
    // Booking related
    "booking": ["reservation", "order", "purchase", "slot"],
    "cancel": ["cancellation", "refund", "terminate", "withdraw"],
    "modify": ["change", "update", "edit", "adjust", "reschedule"],
    "availability": ["calendar", "schedule", "slots", "capacity"],
    // Customer related
    "customer": ["guest", "client", "traveler", "tourist", "visitor"],
    "contact": ["reach", "message", "communicate", "email", "phone", "reach out", "get in touch"],
    "review": ["feedback", "rating", "comment", "testimonial"],
    // Timing related
    "delay": ["hold", "processing", "payment timing", "wait", "pending"],
    "schedule": ["timing", "calendar", "availability", "time slot"],
    "duration": ["length", "time", "period", "span"],
    // Status related
    "status": ["state", "condition", "progress", "stage"],
    "pending": ["processing", "waiting", "in progress", "on hold"],
    "confirmed": ["approved", "verified", "booked", "reserved"],
    // Support related
    "help": ["support", "assistance", "guidance", "aid"],
    "issue": ["problem", "concern", "error", "trouble"],
    // Platform specific
    "listing": ["experience", "activity", "tour", "offering"],
    "host": ["guide", "provider", "operator", "vendor"],
    "platform": ["marketplace", "site", "website", "portal"]
};
/**
 * Expands a search query with related terms and synonyms
 */
function expandSearchTerms(query) {
    const terms = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set();
    // Add original terms
    terms.forEach(term => expandedTerms.add(term));
    // Add synonyms for each term
    terms.forEach(term => {
        // Check for exact matches
        if (synonymMap[term]) {
            synonymMap[term].forEach(synonym => expandedTerms.add(synonym));
        }
        // Check for partial matches (e.g., "payment" in "payment processing")
        Object.entries(synonymMap).forEach(([key, synonyms]) => {
            if (term.includes(key) || key.includes(term)) {
                synonyms.forEach(synonym => expandedTerms.add(synonym));
            }
        });
    });
    return Array.from(expandedTerms);
}
/**
 * Combines multiple search terms with OR operator for flexible matching
 */
function buildExpandedSearchQuery(query) {
    const expandedTerms = expandSearchTerms(query);
    return expandedTerms.join(" OR ");
}
/**
 * Gets related terms for highlighting in results
 */
function getRelatedTerms(query) {
    return expandSearchTerms(query);
}
