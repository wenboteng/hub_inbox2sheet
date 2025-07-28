import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to detect if content is tourist-related (should be hidden from vendor FAQ)
function isTouristContent(question: string, answer: string): boolean {
  const touristKeywords = [
    // Tourist-specific keywords
    'travel', 'vacation', 'holiday', 'trip', 'sightseeing', 'tourist', 'visitor',
    'backpacking', 'solo travel', 'digital nomad', 'nomad', 'nomading',
    'first time', 'first solo', 'solo trip', 'backpacking trip',
    'itinerary', 'itineraries', 'travel plan', 'travel planning',
    'hostel', 'hostels', 'budget travel', 'cheap travel', 'travel budget',
    'travel tips', 'travel advice', 'travel recommendations',
    'best time to visit', 'when to go', 'weather', 'season',
    'safety', 'is it safe', 'crime', 'dangerous',
    'language', 'local language', 'speak english',
    'currency', 'money', 'exchange rate', 'atm', 'credit card',
    'transportation', 'public transport', 'bus', 'train', 'metro',
    'accommodation', 'hotel', 'airbnb', 'booking', 'reservation',
    'food', 'restaurant', 'local food', 'cuisine', 'dining',
    'attractions', 'things to do', 'places to visit', 'must see',
    'culture', 'cultural', 'local culture', 'customs', 'traditions',
    'visa', 'visa requirements', 'entry requirements', 'border',
    'airport', 'flight', 'airline', 'luggage', 'packing',
    'photography', 'camera', 'photo', 'instagram', 'social media',
    'nightlife', 'party', 'clubbing', 'bar', 'pub',
    'shopping', 'market', 'souvenir', 'gift',
    'health', 'medical', 'vaccination', 'insurance',
    'wifi', 'internet', 'connectivity', 'mobile data',
    'time zone', 'jet lag', 'time difference',
    'cost', 'price', 'expensive', 'cheap', 'budget',
    'recommendation', 'suggestion', 'advice', 'tip',
    'experience', 'story', 'tale', 'adventure',
    'meet people', 'make friends', 'social', 'community',
    'work remotely', 'remote work', 'work from', 'coworking',
    'long term', 'extended stay', 'month', 'week',
    'country', 'city', 'destination', 'place',
    'beach', 'mountain', 'hiking', 'trekking', 'outdoor',
    'museum', 'gallery', 'art', 'history', 'historical',
    'festival', 'event', 'celebration', 'holiday',
    'seasonal', 'peak season', 'off season', 'shoulder season'
  ];

  const vendorKeywords = [
    // Vendor-specific keywords (keep these)
    'host', 'hosting', 'property', 'listing', 'rental',
    'guest', 'customer', 'client', 'booking', 'reservation',
    'pricing', 'rate', 'price', 'revenue', 'income', 'profit',
    'marketing', 'seo', 'promotion', 'advertising', 'visibility',
    'review', 'rating', 'feedback', 'complaint', 'issue',
    'policy', 'rule', 'regulation', 'legal', 'compliance',
    'cancellation', 'refund', 'payment', 'commission',
    'platform', 'ota', 'airbnb', 'booking.com', 'viator',
    'dashboard', 'analytics', 'report', 'statistics',
    'verification', 'verified', 'superhost', 'badge',
    'calendar', 'availability', 'block', 'unblock',
    'message', 'communication', 'inquiry', 'question',
    'photo', 'image', 'description', 'amenity', 'feature',
    'location', 'address', 'map', 'neighborhood',
    'house rule', 'check-in', 'check-out', 'key',
    'cleaning', 'maintenance', 'repair', 'service',
    'insurance', 'liability', 'protection', 'coverage',
    'tax', 'taxation', 'financial', 'accounting',
    'support', 'help', 'assistance', 'customer service',
    'technical', 'setup', 'configuration', 'integration',
    'api', 'webhook', 'automation', 'tool', 'software',
    'mobile app', 'website', 'online', 'digital',
    'partnership', 'collaboration', 'network', 'community',
    'training', 'education', 'learning', 'resource',
    'best practice', 'strategy', 'optimization', 'improvement',
    'competition', 'market', 'industry', 'trend',
    'seasonal', 'demand', 'supply', 'capacity',
    'quality', 'standard', 'excellence', 'professional'
  ];

  const questionLower = question.toLowerCase();
  const answerLower = answer.toLowerCase();
  const combinedText = questionLower + ' ' + answerLower;

  // Count tourist vs vendor keywords
  let touristScore = 0;
  let vendorScore = 0;

  touristKeywords.forEach(keyword => {
    if (combinedText.includes(keyword.toLowerCase())) {
      touristScore += 1;
    }
  });

  vendorKeywords.forEach(keyword => {
    if (combinedText.includes(keyword.toLowerCase())) {
      vendorScore += 1;
    }
  });

  // Additional checks for tourist content patterns
  const touristPatterns = [
    /i'm (planning|going|visiting|traveling)/i,
    /my (trip|vacation|holiday|travel)/i,
    /first time (in|to|visiting)/i,
    /solo (travel|trip|backpacking)/i,
    /digital nomad/i,
    /backpacking/i,
    /itinerary/i,
    /hostel/i,
    /budget travel/i,
    /travel tips/i,
    /best time to visit/i,
    /is it safe/i,
    /local (food|culture|customs)/i,
    /visa requirements/i,
    /public transport/i,
    /things to do/i,
    /must see/i,
    /recommendation/i,
    /experience/i,
    /meet people/i,
    /work remotely/i,
    /long term/i,
    /extended stay/i
  ];

  const vendorPatterns = [
    /host/i,
    /property/i,
    /listing/i,
    /guest/i,
    /customer/i,
    /booking/i,
    /reservation/i,
    /pricing/i,
    /rate/i,
    /revenue/i,
    /income/i,
    /profit/i,
    /marketing/i,
    /seo/i,
    /review/i,
    /rating/i,
    /feedback/i,
    /policy/i,
    /rule/i,
    /regulation/i,
    /legal/i,
    /cancellation/i,
    /refund/i,
    /payment/i,
    /commission/i,
    /platform/i,
    /ota/i,
    /dashboard/i,
    /analytics/i,
    /report/i,
    /statistics/i,
    /verification/i,
    /verified/i,
    /superhost/i,
    /calendar/i,
    /availability/i,
    /message/i,
    /communication/i,
    /inquiry/i,
    /photo/i,
    /image/i,
    /description/i,
    /amenity/i,
    /feature/i,
    /location/i,
    /address/i,
    /house rule/i,
    /check-in/i,
    /check-out/i,
    /cleaning/i,
    /maintenance/i,
    /repair/i,
    /service/i,
    /insurance/i,
    /liability/i,
    /protection/i,
    /tax/i,
    /taxation/i,
    /financial/i,
    /accounting/i,
    /support/i,
    /help/i,
    /assistance/i,
    /technical/i,
    /setup/i,
    /configuration/i,
    /integration/i,
    /api/i,
    /webhook/i,
    /automation/i,
    /tool/i,
    /software/i,
    /mobile app/i,
    /website/i,
    /online/i,
    /digital/i,
    /partnership/i,
    /collaboration/i,
    /network/i,
    /training/i,
    /education/i,
    /learning/i,
    /resource/i,
    /best practice/i,
    /strategy/i,
    /optimization/i,
    /improvement/i,
    /competition/i,
    /market/i,
    /industry/i,
    /trend/i,
    /seasonal/i,
    /demand/i,
    /supply/i,
    /capacity/i,
    /quality/i,
    /standard/i,
    /excellence/i,
    /professional/i
  ];

  // Check for tourist patterns
  touristPatterns.forEach(pattern => {
    if (pattern.test(combinedText)) {
      touristScore += 2; // Give more weight to patterns
    }
  });

  // Check for vendor patterns
  vendorPatterns.forEach(pattern => {
    if (pattern.test(combinedText)) {
      vendorScore += 2; // Give more weight to patterns
    }
  });

  // Decision logic: if tourist score is significantly higher than vendor score, hide the content
  const ratio = touristScore / (vendorScore + 1); // Add 1 to avoid division by zero
  
  // If tourist score is 2x higher than vendor score, consider it tourist content
  return ratio > 2 || touristScore > 5;
}

// Function to categorize vendor content based on keywords and patterns
function categorizeVendorContent(question: string, answer: string): string {
  const questionLower = question.toLowerCase();
  const answerLower = answer.toLowerCase();
  const combinedText = questionLower + ' ' + answerLower;

  // Define category keywords
  const categoryKeywords = {
    'Pricing & Revenue': ['pricing', 'price', 'rate', 'revenue', 'income', 'profit', 'cost', 'commission', 'fee', 'earnings', 'pricing strategy', 'dynamic pricing', 'seasonal pricing'],
    'Marketing & SEO': ['marketing', 'seo', 'promotion', 'advertising', 'visibility', 'ranking', 'search', 'optimization', 'campaign', 'social media', 'email marketing', 'content marketing'],
    'Customer Service': ['customer', 'guest', 'service', 'support', 'help', 'complaint', 'issue', 'problem', 'communication', 'message', 'inquiry', 'feedback'],
    'Technical Setup': ['technical', 'setup', 'configuration', 'integration', 'api', 'webhook', 'automation', 'tool', 'software', 'platform', 'system', 'dashboard'],
    'Booking & Cancellations': ['booking', 'reservation', 'cancellation', 'refund', 'payment', 'calendar', 'availability', 'block', 'unblock', 'instant book'],
    'Policies & Legal': ['policy', 'rule', 'regulation', 'legal', 'compliance', 'terms', 'condition', 'liability', 'insurance', 'tax', 'taxation', 'legal requirement'],
    'Vendor Insights': ['host', 'hosting', 'property', 'listing', 'rental', 'superhost', 'verified', 'badge', 'quality', 'standard', 'excellence', 'professional', 'best practice']
  };

  // Calculate scores for each category
  const categoryScores: Record<string, number> = {};
  
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      if (combinedText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    categoryScores[category] = score;
  });

  // Find the category with the highest score
  const bestCategory = Object.entries(categoryScores).reduce((best, [category, score]) => {
    return score > best.score ? { category, score } : best;
  }, { category: 'General', score: 0 });

  return bestCategory.score > 0 ? bestCategory.category : 'General';
}

// AI Summary generation function
function generateAISummary(content: string, question: string): {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  urgency: 'high' | 'medium' | 'low';
  impact: 'revenue' | 'customer' | 'technical' | 'general';
} {
  const contentLower = content.toLowerCase();
  const questionLower = question.toLowerCase();
  
  // Analyze content for urgency indicators
  const urgencyIndicators = {
    high: ['urgent', 'immediate', 'critical', 'emergency', 'asap', 'now', 'deadline', 'penalty', 'suspended', 'banned', 'cannot', 'cannot figure out', 'stuck', 'blocked'],
    medium: ['soon', 'recommended', 'should', 'important', 'consider', 'plan', 'need help', 'confused'],
    low: ['optional', 'future', 'consider', 'might', 'could', 'suggestion', 'wondering', 'curious']
  };
  
  let urgency: 'high' | 'medium' | 'low' = 'low';
  for (const [level, indicators] of Object.entries(urgencyIndicators)) {
    if (indicators.some(indicator => contentLower.includes(indicator))) {
      urgency = level as 'high' | 'medium' | 'low';
      break;
    }
  }
  
  // Analyze content for impact type
  const impactIndicators = {
    revenue: ['revenue', 'income', 'profit', 'earnings', 'money', 'pricing', 'commission', 'fee', 'booking', 'reservation', 'guest'],
    customer: ['guest', 'customer', 'review', 'rating', 'feedback', 'complaint', 'satisfaction', 'listing', 'property'],
    technical: ['technical', 'setup', 'configuration', 'api', 'integration', 'bug', 'error', 'settings', 'profile', 'account'],
    general: ['policy', 'rule', 'guideline', 'best practice', 'tip', 'help', 'support']
  };
  
  let impact: 'revenue' | 'customer' | 'technical' | 'general' = 'general';
  for (const [type, indicators] of Object.entries(impactIndicators)) {
    if (indicators.some(indicator => contentLower.includes(indicator))) {
      impact = type as 'revenue' | 'customer' | 'technical' | 'general';
      break;
    }
  }
  
  // Generate intelligent summary
  const summary = generateIntelligentSummary(content, question, urgency, impact);
  const keyPoints = extractKeyPoints(content, question);
  const actionItems = extractActionItems(content, question);
  
  return {
    summary,
    keyPoints,
    actionItems,
    urgency,
    impact
  };
}

function generateIntelligentSummary(content: string, question: string, urgency: string, impact: string): string {
  const questionLower = question.toLowerCase();
  
  // Count replies/answers in the content
  const replyCount = (content.match(/Latest reply|Reply to thread|replies?|answers?/gi) || []).length;
  const hasReplies = replyCount > 0 || content.includes('reply') || content.includes('answer');
  
  // Analyze the question type and create a situation overview
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust') || questionLower.includes('wrong box')) {
    if (hasReplies) {
      return `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The user has ${replyCount || 'several'} replies from the community, with the best answers providing step-by-step instructions to navigate the host dashboard and update property details.`;
    } else {
      return `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The community can help with specific steps to navigate the host dashboard and update property details.`;
    }
  }
  
  if (questionLower.includes('feedback') || questionLower.includes('review') || questionLower.includes('hear')) {
    if (hasReplies) {
      return `This question is asking for feedback on a new Airbnb listing. The user has ${replyCount || 'several'} replies from experienced hosts, with the best answers suggesting ways to get community feedback and improve listing quality.`;
    } else {
      return `This question is asking for feedback on a new Airbnb listing. The community can provide advice on getting feedback from experienced hosts and improving listing quality.`;
    }
  }
  
  if (questionLower.includes('pricing') || questionLower.includes('price') || questionLower.includes('rate')) {
    if (hasReplies) {
      return `This question is asking about pricing strategies for Airbnb listings. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering market research, Smart Pricing, and competitive rate setting.`;
    } else {
      return `This question is asking about pricing strategies for Airbnb listings. The community can help with market research, Smart Pricing, and competitive rate setting advice.`;
    }
  }
  
  if (questionLower.includes('photo') || questionLower.includes('picture') || questionLower.includes('image')) {
    if (hasReplies) {
      return `This question is asking about photography tips for Airbnb listings. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering photo quality, professional photography, and image optimization.`;
    } else {
      return `This question is asking about photography tips for Airbnb listings. The community can help with photo quality, professional photography, and image optimization advice.`;
    }
  }
  
  if (questionLower.includes('cancel') || questionLower.includes('refund') || questionLower.includes('policy')) {
    if (hasReplies) {
      return `This question is asking about cancellation policies and refunds. The user has ${replyCount || 'several'} replies from hosts, with the best answers explaining policy types and guest communication strategies.`;
    } else {
      return `This question is asking about cancellation policies and refunds. The community can help with policy types and guest communication strategies.`;
    }
  }
  
  if (questionLower.includes('guest') || questionLower.includes('visitor') || questionLower.includes('booking')) {
    if (hasReplies) {
      return `This question is asking about guest management and booking procedures. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering house rules, check-in procedures, and guest communication.`;
    } else {
      return `This question is asking about guest management and booking procedures. The community can help with house rules, check-in procedures, and guest communication.`;
    }
  }
  
  if (questionLower.includes('superhost') || questionLower.includes('rating') || questionLower.includes('review')) {
    if (hasReplies) {
      return `This question is asking about achieving Superhost status and maintaining ratings. The user has ${replyCount || 'several'} replies from Superhosts, with the best answers covering rating requirements, response times, and guest experience tips.`;
    } else {
      return `This question is asking about achieving Superhost status and maintaining ratings. The community can help with rating requirements, response times, and guest experience tips.`;
    }
  }
  
  if (questionLower.includes('instant book') || questionLower.includes('booking')) {
    if (hasReplies) {
      return `This question is asking about Instant Book settings and booking management. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering feature configuration and guest requirements.`;
    } else {
      return `This question is asking about Instant Book settings and booking management. The community can help with feature configuration and guest requirements.`;
    }
  }
  
  if (questionLower.includes('new') || questionLower.includes('first time')) {
    if (hasReplies) {
      return `This question is asking for advice for new hosts getting started. The user has ${replyCount || 'several'} replies from experienced hosts, with the best answers covering profile setup, listing optimization, and first-time hosting tips.`;
    } else {
      return `This question is asking for advice for new hosts getting started. The community can help with profile setup, listing optimization, and first-time hosting tips.`;
    }
  }
  
  if (questionLower.includes('listing') || questionLower.includes('property')) {
    if (hasReplies) {
      return `This question is asking about listing management and property settings. The user has ${replyCount || 'several'} replies from hosts, with the best answers providing guidance on dashboard navigation and property updates.`;
    } else {
      return `This question is asking about listing management and property settings. The community can help with dashboard navigation and property updates.`;
    }
  }
  
  // Generic fallback with situation overview
  if (hasReplies) {
    return `This question is asking for help with an Airbnb hosting issue. The user has ${replyCount || 'several'} replies from the community, with the best answers providing practical solutions and guidance.`;
  } else {
    return `This question is asking for help with an Airbnb hosting issue. The community can provide practical solutions and guidance.`;
  }
}

function extractKeyPoints(content: string, question: string): string[] {
  const keyPoints: string[] = [];
  const questionLower = question.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Analyze question type and generate specific key points
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust') || questionLower.includes('wrong box')) {
    // Specific to listing details editing
    keyPoints.push(
      'Go to your Airbnb host dashboard and select the specific listing',
      'Navigate to "Listing details" or "Property details" section',
      'Update the bedroom count and bed count fields separately',
      'Save changes and wait for the update to process'
    );
  } else if (questionLower.includes('feedback') || questionLower.includes('review') || questionLower.includes('hear')) {
    // Specific to getting feedback on listings
    keyPoints.push(
      'Share your listing link with experienced hosts for feedback',
      'Join Airbnb host communities on Facebook or Reddit',
      'Ask specific questions about pricing, photos, or description',
      'Consider professional photography to improve listing appeal'
    );
  } else if (questionLower.includes('pricing') || questionLower.includes('price') || questionLower.includes('rate')) {
    // Specific to pricing questions
    keyPoints.push(
      'Research similar properties in your area for competitive pricing',
      'Use Airbnb\'s Smart Pricing tool for dynamic rate adjustment',
      'Consider seasonal pricing variations and local events',
      'Monitor your booking rate and adjust prices accordingly'
    );
  } else if (questionLower.includes('photo') || questionLower.includes('picture') || questionLower.includes('image')) {
    // Specific to photo-related questions
    keyPoints.push(
      'Use high-quality, well-lit photos that showcase your space',
      'Include photos of all bedrooms, bathrooms, and common areas',
      'Consider hiring a professional photographer for better results',
      'Update photos regularly to keep your listing fresh'
    );
  } else if (questionLower.includes('cancel') || questionLower.includes('refund') || questionLower.includes('policy')) {
    // Specific to cancellation/refund questions
    keyPoints.push(
      'Review your cancellation policy in your listing settings',
      'Understand the difference between flexible, moderate, and strict policies',
      'Communicate clearly with guests about your cancellation terms',
      'Consider offering partial refunds for extenuating circumstances'
    );
  } else if (questionLower.includes('guest') || questionLower.includes('visitor') || questionLower.includes('booking')) {
    // Specific to guest-related questions
    keyPoints.push(
      'Set clear house rules and communicate them to guests',
      'Use the messaging system to clarify expectations before arrival',
      'Consider setting minimum stay requirements for better guest quality',
      'Respond promptly to guest inquiries to improve response rate'
    );
  } else if (questionLower.includes('superhost') || questionLower.includes('rating') || questionLower.includes('review')) {
    // Specific to ratings and Superhost questions
    keyPoints.push(
      'Maintain a 4.8+ overall rating to qualify for Superhost status',
      'Respond to all guest messages within 1 hour',
      'Maintain a 90%+ response rate and 1% cancellation rate',
      'Provide exceptional guest experiences to earn positive reviews'
    );
  } else if (questionLower.includes('instant book') || questionLower.includes('booking')) {
    // Specific to booking settings
    keyPoints.push(
      'Enable Instant Book to increase your listing visibility',
      'Set clear requirements for guests (verified ID, positive reviews)',
      'Use the calendar to block dates when you\'re unavailable',
      'Consider requiring advance notice for better preparation time'
    );
  } else {
    // Look for specific solution steps in content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const solutionSteps = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return lower.includes('go to') || lower.includes('navigate to') || 
             lower.includes('click on') || lower.includes('select') ||
             lower.includes('edit') || lower.includes('update') ||
             lower.includes('settings') || lower.includes('dashboard');
    });
    
    // Add solution steps as key points
    solutionSteps.slice(0, 3).forEach(sentence => {
      const point = sentence.trim();
      if (point.length > 10 && point.length < 120) {
        keyPoints.push(point.charAt(0).toUpperCase() + point.slice(1));
      }
    });
    
    // If we don't have enough specific points, add question-specific guidance
    if (keyPoints.length < 3) {
      if (questionLower.includes('new') || questionLower.includes('first time')) {
        keyPoints.push(
          'Complete your profile with detailed information',
          'Add high-quality photos of your entire property',
          'Write a compelling description that highlights unique features'
        );
      } else {
        keyPoints.push(
          'Check your host dashboard for relevant settings',
          'Review Airbnb\'s help center for detailed guidance',
          'Contact Airbnb support for specific assistance'
        );
      }
    }
  }
  
  return keyPoints.slice(0, 4);
}

function extractActionItems(content: string, question: string): string[] {
  const actionItems: string[] = [];
  const questionLower = question.toLowerCase();
  
  // Generate highly specific action items based on question type
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust') || questionLower.includes('wrong box')) {
    actionItems.push(
      'Log into your Airbnb host account',
      'Go to "Manage listings" and select your specific property',
      'Click on "Listing details" in the left sidebar',
      'Scroll to "Bedrooms and beds" section',
      'Update the numbers and click "Save"'
    );
  } else if (questionLower.includes('feedback') || questionLower.includes('review') || questionLower.includes('hear')) {
    actionItems.push(
      'Copy your listing URL from your host dashboard',
      'Join "Airbnb Host Community" Facebook group',
      'Post your listing with specific questions about improvements',
      'Ask for feedback on pricing, photos, and description',
      'Implement suggested changes based on community feedback'
    );
  } else if (questionLower.includes('pricing') || questionLower.includes('price') || questionLower.includes('rate')) {
    actionItems.push(
      'Research 5-10 similar properties in your neighborhood',
      'Note their nightly rates and occupancy rates',
      'Enable Smart Pricing in your listing settings',
      'Set your base price 10-15% below market average',
      'Adjust prices based on seasonal demand and local events'
    );
  } else if (questionLower.includes('photo') || questionLower.includes('picture') || questionLower.includes('image')) {
    actionItems.push(
      'Take photos during daylight hours with natural lighting',
      'Capture all rooms from multiple angles',
      'Include photos of amenities, parking, and neighborhood',
      'Consider hiring a professional photographer ($100-200)',
      'Upload high-resolution images (minimum 1024x683 pixels)'
    );
  } else if (questionLower.includes('cancel') || questionLower.includes('refund') || questionLower.includes('policy')) {
    actionItems.push(
      'Go to your listing settings and select "Policies"',
      'Choose between Flexible, Moderate, or Strict cancellation',
      'Set your policy based on your hosting style and location',
      'Communicate policy clearly in your listing description',
      'Be prepared to handle cancellation requests professionally'
    );
  } else if (questionLower.includes('guest') || questionLower.includes('visitor') || questionLower.includes('booking')) {
    actionItems.push(
      'Create detailed house rules in your listing settings',
      'Set up automated messages for booking confirmations',
      'Establish check-in/check-out procedures',
      'Prepare a welcome guide with local recommendations',
      'Set up key exchange or self-check-in instructions'
    );
  } else if (questionLower.includes('superhost') || questionLower.includes('rating') || questionLower.includes('review')) {
    actionItems.push(
      'Monitor your ratings in the host dashboard',
      'Respond to all messages within 1 hour (set notifications)',
      'Maintain calendar accuracy and avoid cancellations',
      'Provide welcome gifts or local recommendations',
      'Follow up with guests after their stay for reviews'
    );
  } else if (questionLower.includes('instant book') || questionLower.includes('booking')) {
    actionItems.push(
      'Go to your listing settings and find "Booking settings"',
      'Toggle "Instant Book" to enable the feature',
      'Set guest requirements (verified ID, positive reviews)',
      'Configure advance notice requirements (1-3 days)',
      'Set up automated messages for instant bookings'
    );
  } else if (questionLower.includes('new') || questionLower.includes('first time')) {
    actionItems.push(
      'Complete your host profile with personal information',
      'Add at least 20 high-quality photos of your property',
      'Write a detailed description highlighting unique features',
      'Set competitive pricing based on local market research',
      'Enable Instant Book to increase booking opportunities'
    );
  } else {
    // Generic but still specific action items
    actionItems.push(
      'Access your Airbnb host dashboard',
      'Navigate to the relevant settings section',
      'Make the necessary changes to your listing',
      'Save and publish your updates',
      'Test the changes from a guest perspective'
    );
  }
  
  return actionItems.slice(0, 5);
}

// Function to check if we should generate a new summary
function shouldGenerateSummary(article: any): boolean {
  // If no summary exists, generate one
  if (!article.aiSummary) return true;
  
  // If summary is older than 30 days, regenerate
  if (article.summaryGeneratedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (article.summaryGeneratedAt < thirtyDaysAgo) return true;
  }
  
  // If summary is generic, regenerate
  if (article.aiSummary.includes('This question is asking for help with an Airbnb hosting issue')) {
    return true;
  }
  
  return false;
}

// Function to generate and store AI summary
async function generateAndStoreSummary(article: any, prisma: PrismaClient) {
  const questionLower = article.question.toLowerCase();
  
  // Count replies/answers in the content
  const replyCount = (article.answer.match(/Latest reply|Reply to thread|replies?|answers?/gi) || []).length;
  const hasReplies = replyCount > 0 || article.answer.includes('reply') || article.answer.includes('answer');
  
  // Generate specific summary based on question type
  let aiSummary = '';
  let keyPoints: string[] = [];
  let actionItems: string[] = [];
  let urgency = 'low';
  let impact = 'general';
  
  // Analyze the question type and create a situation overview
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust') || questionLower.includes('wrong box')) {
    urgency = 'high';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The user has ${replyCount || 'several'} replies from the community, with the best answers providing step-by-step instructions to navigate the host dashboard and update property details.`;
    } else {
      aiSummary = `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The community can help with specific steps to navigate the host dashboard and update property details.`;
    }
    keyPoints = [
      'Go to your Airbnb host dashboard and select the specific listing',
      'Navigate to "Listing details" or "Property details" section',
      'Update the bedroom count and bed count fields separately',
      'Save changes and wait for the update to process'
    ];
    actionItems = [
      'Log into your Airbnb host account',
      'Go to "Manage listings" and select your specific property',
      'Click on "Listing details" in the left sidebar',
      'Scroll to "Bedrooms and beds" section',
      'Update the numbers and click "Save"'
    ];
  } else if (questionLower.includes('feedback') || questionLower.includes('review') || questionLower.includes('hear')) {
    urgency = 'medium';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking for feedback on a new Airbnb listing. The user has ${replyCount || 'several'} replies from experienced hosts, with the best answers suggesting ways to get community feedback and improve listing quality.`;
    } else {
      aiSummary = `This question is asking for feedback on a new Airbnb listing. The community can provide advice on getting feedback from experienced hosts and improving listing quality.`;
    }
    keyPoints = [
      'Share your listing link with experienced hosts for feedback',
      'Join Airbnb host communities on Facebook or Reddit',
      'Ask specific questions about pricing, photos, or description',
      'Consider professional photography to improve listing appeal'
    ];
    actionItems = [
      'Copy your listing URL from your host dashboard',
      'Join "Airbnb Host Community" Facebook group',
      'Post your listing with specific questions about improvements',
      'Ask for feedback on pricing, photos, and description',
      'Implement suggested changes based on community feedback'
    ];
  } else if (questionLower.includes('pricing') || questionLower.includes('price') || questionLower.includes('rate')) {
    urgency = 'high';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking about pricing strategies for Airbnb listings. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering market research, Smart Pricing, and competitive rate setting.`;
    } else {
      aiSummary = `This question is asking about pricing strategies for Airbnb listings. The community can help with market research, Smart Pricing, and competitive rate setting advice.`;
    }
    keyPoints = [
      'Research similar properties in your area for competitive pricing',
      'Use Airbnb\'s Smart Pricing tool to optimize rates',
      'Consider seasonal demand and local events',
      'Monitor your conversion rates and adjust accordingly'
    ];
    actionItems = [
      'Search for similar listings in your area',
      'Enable Smart Pricing in your listing settings',
      'Set competitive base rates based on market research',
      'Adjust prices for peak seasons and local events',
      'Track booking conversion rates monthly'
    ];
  } else if (questionLower.includes('photo') || questionLower.includes('picture') || questionLower.includes('image')) {
    urgency = 'medium';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking about photography tips for Airbnb listings. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering photo quality, professional photography, and image optimization.`;
    } else {
      aiSummary = `This question is asking about photography tips for Airbnb listings. The community can help with photo quality, professional photography, and image optimization advice.`;
    }
    keyPoints = [
      'Use high-quality, well-lit photos that showcase your space',
      'Take photos from multiple angles to show the full property',
      'Consider professional photography for better results',
      'Ensure photos accurately represent your listing'
    ];
    actionItems = [
      'Clean and declutter your space before taking photos',
      'Use natural lighting and avoid flash when possible',
      'Take photos from multiple angles and heights',
      'Consider hiring a professional photographer',
      'Update photos regularly to keep them current'
    ];
  } else if (questionLower.includes('cancel') || questionLower.includes('refund') || questionLower.includes('policy')) {
    urgency = 'high';
    impact = 'customer';
    if (hasReplies) {
      aiSummary = `This question is asking about cancellation policies and refunds. The user has ${replyCount || 'several'} replies from hosts, with the best answers explaining policy types and guest communication strategies.`;
    } else {
      aiSummary = `This question is asking about cancellation policies and refunds. The community can help with policy types and guest communication strategies.`;
    }
    keyPoints = [
      'Set your cancellation policy in listing settings',
      'Communicate policy clearly to guests before booking',
      'Understand the different policy types available',
      'Handle cancellations professionally and promptly'
    ];
    actionItems = [
      'Go to your listing settings and select cancellation policy',
      'Choose between Flexible, Moderate, or Strict policies',
      'Clearly communicate policy in your listing description',
      'Respond to cancellation requests within 24 hours',
      'Document all communication for reference'
    ];
  } else if (questionLower.includes('guest') || questionLower.includes('visitor') || questionLower.includes('booking')) {
    urgency = 'medium';
    impact = 'customer';
    if (hasReplies) {
      aiSummary = `This question is asking about guest management and booking procedures. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering house rules, check-in procedures, and guest communication.`;
    } else {
      aiSummary = `This question is asking about guest management and booking procedures. The community can help with house rules, check-in procedures, and guest communication.`;
    }
    keyPoints = [
      'Set clear house rules and communicate them to guests',
      'Use automated messaging for booking confirmations',
      'Establish smooth check-in and check-out procedures',
      'Respond promptly to guest inquiries and concerns'
    ];
    actionItems = [
      'Create detailed house rules in your listing settings',
      'Set up automated messages for booking confirmations',
      'Establish check-in/check-out procedures',
      'Prepare a welcome guide with local recommendations',
      'Set up key exchange or self-check-in instructions'
    ];
  } else if (questionLower.includes('superhost') || questionLower.includes('rating') || questionLower.includes('review')) {
    urgency = 'high';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking about achieving Superhost status and maintaining ratings. The user has ${replyCount || 'several'} replies from Superhosts, with the best answers covering rating requirements, response times, and guest experience tips.`;
    } else {
      aiSummary = `This question is asking about achieving Superhost status and maintaining ratings. The community can help with rating requirements, response times, and guest experience tips.`;
    }
    keyPoints = [
      'Maintain a 4.8+ rating to qualify for Superhost status',
      'Respond to messages within 1 hour',
      'Provide exceptional guest experiences',
      'Have at least 10 completed trips in the past year'
    ];
    actionItems = [
      'Monitor your response rate and time in host dashboard',
      'Set up automated responses for common questions',
      'Go above and beyond for guest requests',
      'Ask for reviews after each stay',
      'Address any negative feedback promptly'
    ];
  } else if (questionLower.includes('instant book') || questionLower.includes('booking')) {
    urgency = 'medium';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking about Instant Book settings and booking management. The user has ${replyCount || 'several'} replies from hosts, with the best answers covering feature configuration and guest requirements.`;
    } else {
      aiSummary = `This question is asking about Instant Book settings and booking management. The community can help with feature configuration and guest requirements.`;
    }
    keyPoints = [
      'Enable Instant Book to increase visibility and bookings',
      'Set guest requirements for better control',
      'Configure booking preferences and restrictions',
      'Monitor and manage Instant Book reservations'
    ];
    actionItems = [
      'Go to your listing settings and enable Instant Book',
      'Set guest requirements (verified ID, positive reviews)',
      'Configure advance notice and minimum stay requirements',
      'Set up automated messages for Instant Book guests',
      'Monitor bookings and adjust settings as needed'
    ];
  } else if (questionLower.includes('new') || questionLower.includes('first time')) {
    urgency = 'medium';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking for advice for new hosts getting started. The user has ${replyCount || 'several'} replies from experienced hosts, with the best answers covering profile setup, listing optimization, and first-time hosting tips.`;
    } else {
      aiSummary = `This question is asking for advice for new hosts getting started. The community can help with profile setup, listing optimization, and first-time hosting tips.`;
    }
    keyPoints = [
      'Complete your profile with detailed information',
      'Add high-quality photos of your entire property',
      'Write a compelling description that highlights unique features',
      'Set competitive pricing based on local market research'
    ];
    actionItems = [
      'Complete your host profile with personal information',
      'Add at least 20 high-quality photos of your property',
      'Write a detailed description highlighting unique features',
      'Set competitive pricing based on local market research',
      'Enable Instant Book to increase booking opportunities'
    ];
  } else if (questionLower.includes('listing') || questionLower.includes('property')) {
    urgency = 'medium';
    impact = 'revenue';
    if (hasReplies) {
      aiSummary = `This question is asking about listing management and property settings. The user has ${replyCount || 'several'} replies from hosts, with the best answers providing guidance on dashboard navigation and property updates.`;
    } else {
      aiSummary = `This question is asking about listing management and property settings. The community can help with dashboard navigation and property updates.`;
    }
    keyPoints = [
      'Access your host dashboard to manage listing details',
      'Update property information and amenities regularly',
      'Manage availability calendar and pricing',
      'Monitor listing performance and guest feedback'
    ];
    actionItems = [
      'Log into your Airbnb host dashboard',
      'Navigate to "Manage listings" section',
      'Update property details and amenities',
      'Set your availability calendar',
      'Review and respond to guest feedback'
    ];
  } else {
    // Generic fallback with situation overview
    urgency = 'low';
    impact = 'general';
    if (hasReplies) {
      aiSummary = `This question is asking for help with an Airbnb hosting issue. The user has ${replyCount || 'several'} replies from the community, with the best answers providing practical solutions and guidance.`;
    } else {
      aiSummary = `This question is asking for help with an Airbnb hosting issue. The community can provide practical solutions and guidance.`;
    }
    keyPoints = [
      'Check your host dashboard for relevant settings',
      'Review Airbnb\'s help center for detailed guidance',
      'Contact Airbnb support for specific assistance',
      'Join host communities for peer advice'
    ];
    actionItems = [
      'Access your Airbnb host dashboard',
      'Navigate to the relevant settings section',
      'Make the necessary changes to your listing',
      'Save and publish your updates',
      'Test the changes from a guest perspective'
    ];
  }
  
  // Store the generated summary in the database
  await prisma.article.update({
    where: { id: article.id },
    data: {
      aiSummary,
      keyPoints,
      actionItems,
      urgency,
      impact,
      summaryGeneratedAt: new Date()
    } as any
  });
  
  return { aiSummary, keyPoints, actionItems, urgency, impact };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';
    const platform = searchParams.get('platform') || 'all';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const topOnly = searchParams.get('topOnly') === 'true';
    const includeTouristContent = searchParams.get('includeTouristContent') === 'true'; // New parameter

    // Build where clause for filtering - use ALL existing data, not just FAQ
    const where: any = {
      crawlStatus: 'active',
      isDuplicate: false,
      language: 'en', // Focus on English content
    };

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category !== 'all') {
      // Map category IDs to category names
      const categoryMap: Record<string, string> = {
        'pricing-revenue': 'Pricing & Revenue',
        'marketing-seo': 'Marketing & SEO',
        'customer-service': 'Customer Service',
        'technical-setup': 'Technical Setup',
        'booking-cancellations': 'Booking & Cancellations',
        'policies-legal': 'Policies & Legal',
        'vendor-insights': 'Vendor Insights', // New category for vendor-specific content
        'general': 'General'
      };
      
      where.category = categoryMap[category] || category;
    }

    if (platform !== 'all') {
      where.platform = { contains: platform, mode: 'insensitive' };
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'quality':
        orderBy = { votes: 'desc' };
        break;
      case 'views':
        orderBy = { lastUpdated: 'desc' };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { votes: 'desc' };
    }

    // Get questions from existing Article table - ALL content, not just FAQ
    const articles = await prisma.article.findMany({
      where,
      orderBy,
      take: 100, // Increased limit to show more content
    });

    // Log filtering statistics
    const totalArticles = articles.length;
    const touristArticles = articles.filter(article => isTouristContent(article.question, article.answer));
    const vendorArticles = articles.filter(article => !isTouristContent(article.question, article.answer));
    
    console.log(`FAQ Filtering Stats: Total=${totalArticles}, Tourist=${touristArticles.length}, Vendor=${vendorArticles.length}, IncludeTourist=${includeTouristContent}`);

    // Transform articles to FAQ format and filter out tourist content
    const questionsPromises = articles
      .filter(article => includeTouristContent || !isTouristContent(article.question, article.answer)) // Filter out tourist content unless explicitly requested
      .map(async article => { // Make it async to await generateAndStoreSummary
        // Determine difficulty based on content
        const difficulty = determineDifficulty(article.answer);
        const estimatedTime = Math.ceil(article.answer.split(' ').length / 200);
        const contentQuality = calculateContentQuality(article);
        
        // Extract tags from content
        const tags = extractTags(article.question, article.answer);
        
        // Check if we should generate a new summary
        if (shouldGenerateSummary(article)) {
          const { aiSummary, keyPoints, actionItems, urgency, impact } = await generateAndStoreSummary(article, prisma);
          return {
            id: article.id,
            question: article.question,
            answer: article.answer,
            categoryId: categorizeVendorContent(article.question, article.answer).toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-'),
            platform: article.platform,
            tags,
            upvotes: article.votes || 0,
            downvotes: 0,
            viewCount: 0,
            isTopQuestion: article.isVerified || article.contentType === 'official',
            isTopAnswered: article.isVerified || article.contentType === 'official',
            difficulty,
            estimatedTime,
            contentQuality,
            isVerified: article.isVerified || article.contentType === 'official',
            lastUpdated: article.lastUpdated.toISOString(),
            sourceUrl: article.url, // Add source URL
            contentType: article.contentType, // Add content type
            source: article.source, // Add source information
            // AI Summary data
            aiSummary: aiSummary,
            keyPoints: keyPoints,
            actionItems: actionItems,
            urgency: urgency,
            impact: impact,
            category: {
              id: categorizeVendorContent(article.question, article.answer).toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-'),
              name: categorizeVendorContent(article.question, article.answer),
              description: getCategoryDescription(categorizeVendorContent(article.question, article.answer)),
              icon: getCategoryIcon(categorizeVendorContent(article.question, article.answer)),
              color: getCategoryColor(categorizeVendorContent(article.question, article.answer)),
              priority: getCategoryPriority(categorizeVendorContent(article.question, article.answer)),
              questionCount: 0
            }
          };
        } else {
          return {
            id: article.id,
            question: article.question,
            answer: article.answer,
            categoryId: categorizeVendorContent(article.question, article.answer).toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-'),
            platform: article.platform,
            tags,
            upvotes: article.votes || 0,
            downvotes: 0,
            viewCount: 0,
            isTopQuestion: article.isVerified || article.contentType === 'official',
            isTopAnswered: article.isVerified || article.contentType === 'official',
            difficulty,
            estimatedTime,
            contentQuality,
            isVerified: article.isVerified || article.contentType === 'official',
            lastUpdated: article.lastUpdated.toISOString(),
            sourceUrl: article.url, // Add source URL
            contentType: article.contentType, // Add content type
            source: article.source, // Add source information
            // AI Summary data
            aiSummary: (article as any).aiSummary || '',
            keyPoints: (article as any).keyPoints || [],
            actionItems: (article as any).actionItems || [],
            urgency: (article as any).urgency || 'low',
            impact: (article as any).impact || 'general',
            category: {
              id: categorizeVendorContent(article.question, article.answer).toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-'),
              name: categorizeVendorContent(article.question, article.answer),
              description: getCategoryDescription(categorizeVendorContent(article.question, article.answer)),
              icon: getCategoryIcon(categorizeVendorContent(article.question, article.answer)),
              color: getCategoryColor(categorizeVendorContent(article.question, article.answer)),
              priority: getCategoryPriority(categorizeVendorContent(article.question, article.answer)),
              questionCount: 0
            }
          };
        }
      });

    const questions = await Promise.all(questionsPromises);

    // Filter by difficulty if specified
    const filteredQuestions = difficulty !== 'all' 
      ? questions.filter(q => q.difficulty === difficulty)
      : questions;

    // Filter top questions if requested
    const finalQuestions = topOnly 
      ? filteredQuestions.filter(q => q.isTopQuestion)
      : filteredQuestions;

    // If no questions found, return mock data
    if (finalQuestions.length === 0) {
      const mockQuestions = [
        {
          id: '1',
          question: 'How can I optimize my tour pricing for maximum revenue?',
          answer: 'Start by analyzing your competitors\' pricing, consider your costs, and test different price points. Use dynamic pricing based on demand and seasonality. Monitor your conversion rates and adjust accordingly.',
          categoryId: 'pricing-revenue',
          platform: 'Airbnb',
          tags: ['pricing', 'revenue', 'optimization'],
          upvotes: 45,
          downvotes: 2,
          viewCount: 1200,
          isTopQuestion: true,
          isTopAnswered: true,
          difficulty: 'intermediate',
          estimatedTime: 5,
          contentQuality: 85,
          isVerified: true,
          lastUpdated: '2024-01-15T10:30:00Z',
          sourceUrl: 'https://www.airbnb.com/help/article/1234',
          contentType: 'official',
          source: 'help_center',
          category: {
            id: 'pricing-revenue',
            name: 'Pricing & Revenue',
            description: 'Strategies for pricing tours and revenue optimization',
            icon: '💰',
            color: '#10B981',
            priority: 1,
            questionCount: 25
          }
        }
      ];
      return NextResponse.json(mockQuestions);
    }

    return NextResponse.json(await Promise.all(finalQuestions)); // Await all async operations
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// Helper functions
function determineDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' {
  const wordCount = content.split(' ').length;
  const hasTechnicalTerms = /api|integration|configuration|technical|setup/i.test(content);
  const hasComplexConcepts = /strategy|optimization|analysis|metrics|analytics/i.test(content);
  
  if (hasTechnicalTerms && hasComplexConcepts) return 'advanced';
  if (hasTechnicalTerms || hasComplexConcepts) return 'intermediate';
  return 'beginner';
}

function calculateContentQuality(article: any): number {
  let score = 70; // Base score
  
  // Length bonus
  const wordCount = article.answer.split(' ').length;
  if (wordCount > 200) score += 10;
  if (wordCount > 500) score += 10;
  
  // Platform bonus (official sources are better)
  if (article.contentType === 'official') score += 15;
  if (article.isVerified) score += 10;
  
  // Language bonus (English content preferred)
  if (article.language === 'en') score += 5;
  
  // Recency bonus
  const daysSinceUpdate = (Date.now() - article.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 30) score += 5;
  if (daysSinceUpdate < 7) score += 5;
  
  return Math.min(100, score);
}

function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const commonTags = [
    'pricing', 'marketing', 'seo', 'customer-service', 'booking', 'cancellation',
    'revenue', 'profit', 'optimization', 'strategy', 'platform', 'integration',
    'reviews', 'ratings', 'analytics', 'reporting', 'compliance', 'legal'
  ];
  
  return commonTags.filter(tag => text.includes(tag.replace('-', ' ')));
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Pricing & Revenue': 'Strategies for pricing tours and revenue optimization',
    'Marketing & SEO': 'Digital marketing and SEO strategies',
    'Customer Service': 'Guest relations and customer support',
    'Technical Setup': 'Platform configuration and technical requirements',
    'Booking & Cancellations': 'Reservation management and cancellation policies',
    'Policies & Legal': 'Legal requirements and terms of service',
    'General': 'General tour vendor questions and tips'
  };
  return descriptions[category] || 'General tour vendor questions and tips';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Pricing & Revenue': '💰',
    'Marketing & SEO': '📈',
    'Customer Service': '🎯',
    'Technical Setup': '⚙️',
    'Booking & Cancellations': '📅',
    'Policies & Legal': '⚖️',
    'General': '📚'
  };
  return icons[category] || '📚';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Pricing & Revenue': '#10B981',
    'Marketing & SEO': '#3B82F6',
    'Customer Service': '#F59E0B',
    'Technical Setup': '#8B5CF6',
    'Booking & Cancellations': '#EF4444',
    'Policies & Legal': '#6B7280',
    'General': '#9CA3AF'
  };
  return colors[category] || '#9CA3AF';
}

function getCategoryPriority(category: string): number {
  const priorities: Record<string, number> = {
    'Pricing & Revenue': 1,
    'Marketing & SEO': 2,
    'Customer Service': 3,
    'Technical Setup': 4,
    'Booking & Cancellations': 5,
    'Policies & Legal': 6,
    'General': 7
  };
  return priorities[category] || 7;
} 