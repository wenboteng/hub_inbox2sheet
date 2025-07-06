// Reddit API Configuration
// For OAuth2 authentication, you'll need to create a Reddit app at:
// https://www.reddit.com/prefs/apps

export const REDDIT_CONFIG = {
  // OAuth2 Configuration (for future use)
  oauth: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    redirectUri: process.env.REDDIT_REDIRECT_URI || 'http://localhost:3000/auth/reddit/callback',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },

  // Target subreddits for travel content
  subreddits: [
    'travel',
    'solotravel',
    'backpacking',
    'digitalnomad',
    'travelhacks',
    'travelpartners',
    'travelphotos',
    'traveldeals',
    'traveling',
    'wanderlust'
  ],

  // Content filtering settings
  filters: {
    minScore: 5, // Minimum upvotes for a post
    minComments: 3, // Minimum comments for a post
    minContentLength: 100, // Minimum characters for post content
    minCommentLength: 50, // Minimum characters for comment content
    maxPostsPerSubreddit: 100, // Maximum posts to fetch per subreddit
    maxCommentsPerPost: 50, // Maximum comments to fetch per post
    maxCommentDepth: 3, // Maximum comment nesting depth
  },

  // Rate limiting settings
  rateLimit: {
    requestsPerMinute: 50, // Conservative limit (Reddit allows 60 for authenticated requests)
    delayBetweenRequests: 1200, // 1.2 seconds between requests
    maxRetries: 3,
    retryDelay: 60000, // 60 seconds on rate limit
  },

  // Content quality settings
  quality: {
    excludeKeywords: ['removed', 'deleted', '[deleted]', '[removed]'],
    maxSpecialCharRatio: 0.3, // Maximum ratio of special characters
    minTitleLength: 10, // Minimum title length
    requireSelfPost: true, // Only fetch text posts (not links/images)
  },

  // Time filtering
  timeFilter: 'month', // 'hour', 'day', 'week', 'month', 'year', 'all'
  sortBy: 'hot', // 'hot', 'new', 'top', 'rising'

  // Category mapping for subreddits
  categoryMap: {
    'travel': 'General Travel',
    'solotravel': 'Solo Travel',
    'backpacking': 'Backpacking',
    'digitalnomad': 'Digital Nomad',
    'travelhacks': 'Travel Tips & Hacks',
    'travelpartners': 'Travel Partners',
    'travelphotos': 'Travel Photography',
    'traveldeals': 'Travel Deals',
    'traveling': 'General Travel',
    'wanderlust': 'Travel Inspiration',
  } as { [key: string]: string },

  // API endpoints
  endpoints: {
    baseUrl: 'https://www.reddit.com',
    oauthUrl: 'https://oauth.reddit.com',
    authUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
  },

  // Scopes for OAuth2 (if needed)
  scopes: [
    'read', // Read public posts and comments
    'history', // Access browsing history
  ],
};

// Helper function to get category for a subreddit
export function getCategoryForSubreddit(subreddit: string): string {
  return REDDIT_CONFIG.categoryMap[subreddit] || 'Travel Discussion';
}

// Helper function to validate Reddit URL
export function isValidRedditUrl(url: string): boolean {
  return url.includes('reddit.com') && (url.includes('/r/') || url.includes('/comments/'));
}

// Helper function to extract subreddit from URL
export function extractSubredditFromUrl(url: string): string | null {
  const match = url.match(/reddit\.com\/r\/([^\/]+)/);
  return match ? match[1] : null;
}

// Helper function to extract post ID from URL
export function extractPostIdFromUrl(url: string): string | null {
  const match = url.match(/reddit\.com\/r\/[^\/]+\/comments\/([^\/]+)/);
  return match ? match[1] : null;
}

// Helper function to check if content meets quality standards
export function meetsQualityStandards(content: string, title?: string): boolean {
  if (!content || content.length < REDDIT_CONFIG.filters.minContentLength) {
    return false;
  }

  // Check for excluded keywords
  const lowerContent = content.toLowerCase();
  for (const keyword of REDDIT_CONFIG.quality.excludeKeywords) {
    if (lowerContent.includes(keyword)) {
      return false;
    }
  }

  // Check for too many special characters
  const specialCharRatio = (content.match(/[^\w\s]/g) || []).length / content.length;
  if (specialCharRatio > REDDIT_CONFIG.quality.maxSpecialCharRatio) {
    return false;
  }

  // Check title length if provided
  if (title && title.length < REDDIT_CONFIG.quality.minTitleLength) {
    return false;
  }

  return true;
} 