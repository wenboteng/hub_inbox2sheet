// Related search suggestions based on common vendor queries
const relatedSearchMap: Record<string, string[]> = {
  // Payment related
  payout: [
    "How to update bank details for payouts",
    "What causes payment delays?",
    "How to change payout frequency",
    "Payout processing times",
    "Troubleshooting failed payouts"
  ],
  payment: [
    "Payment processing timeline",
    "How to check payment status",
    "Payment method requirements",
    "International payment options",
    "Payment security measures"
  ],
  
  // Booking related
  booking: [
    "How to modify a booking",
    "Cancellation policy for vendors",
    "Booking calendar management",
    "Guest communication guidelines",
    "Booking confirmation process"
  ],
  cancel: [
    "Cancellation refund timeline",
    "How to handle guest cancellations",
    "Cancellation fee structure",
    "Emergency cancellation process",
    "Cancellation notification requirements"
  ],
  
  // Support related
  help: [
    "How to contact support",
    "Common troubleshooting steps",
    "Support response times",
    "Escalation process for urgent issues",
    "Support documentation resources"
  ],
  support: [
    "Getting help with technical issues",
    "Support ticket submission",
    "Phone support availability",
    "Live chat support options",
    "Support team contact methods"
  ],
  
  // Account related
  account: [
    "How to update profile information",
    "Account security settings",
    "Password reset process",
    "Account verification requirements",
    "Profile optimization tips"
  ],
  
  // Reviews related
  review: [
    "How to respond to reviews",
    "Review management best practices",
    "Handling negative reviews",
    "Review notification settings",
    "Review analytics and insights"
  ],
  
  // Fees related
  fee: [
    "Platform fee structure",
    "Commission calculation methods",
    "Fee payment schedule",
    "Fee dispute process",
    "Tax implications of fees"
  ],
  
  // Delay related
  delay: [
    "Payment delay troubleshooting",
    "Processing time expectations",
    "Delay notification system",
    "Escalating delayed payments",
    "Preventing payment delays"
  ]
};

// Fallback suggestions for general queries
const generalSuggestions = [
  "How to get started as a vendor",
  "Best practices for tour operators",
  "Platform guidelines and policies",
  "Guest communication tips",
  "Revenue optimization strategies"
];

/**
 * Generate related search suggestions based on the query
 */
export function generateRelatedSearches(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];
  
  // Check for specific intent matches
  for (const [intent, relatedSearches] of Object.entries(relatedSearchMap)) {
    if (lowerQuery.includes(intent)) {
      // Add 2-3 related searches for this intent
      suggestions.push(...relatedSearches.slice(0, 3));
      break; // Only match one intent to avoid overwhelming
    }
  }
  
  // If no specific intent found, add general suggestions
  if (suggestions.length === 0) {
    suggestions.push(...generalSuggestions.slice(0, 3));
  }
  
  // Ensure we don't return more than 3 suggestions
  return suggestions.slice(0, 3);
}

/**
 * Get contextual suggestions based on search results
 */
export function getContextualSuggestions(query: string, results: any[]): string[] {
  const baseSuggestions = generateRelatedSearches(query);
  
  // If we have results, we could add more specific suggestions
  // For now, return the base suggestions
  return baseSuggestions;
} 