# Reddit API Integration

This document explains the Reddit API integration for crawling travel-related content from 10 popular travel subreddits.

## Overview

The Reddit integration consists of two crawlers:
1. **Basic Reddit Crawler** (`src/crawlers/reddit.ts`) - Simple implementation using public JSON API
2. **Enhanced Reddit Crawler** (`src/crawlers/reddit-enhanced.ts`) - Advanced implementation with better error handling and quality filtering

## Target Subreddits

The crawlers target 10 popular travel subreddits:

1. **r/travel** - General Travel
2. **r/solotravel** - Solo Travel
3. **r/backpacking** - Backpacking
4. **r/digitalnomad** - Digital Nomad
5. **r/travelhacks** - Travel Tips & Hacks
6. **r/travelpartners** - Travel Partners
7. **r/travelphotos** - Travel Photography
8. **r/traveldeals** - Travel Deals
9. **r/traveling** - General Travel
10. **r/wanderlust** - Travel Inspiration

## Features

### Content Filtering
- **Minimum Score**: 5 upvotes
- **Minimum Comments**: 3 comments
- **Content Length**: 100+ characters for posts, 50+ for comments
- **Quality Filtering**: Excludes deleted/removed content
- **Self Posts Only**: Only text posts (no links/images)

### Rate Limiting
- **Requests per minute**: 50 (conservative limit)
- **Delay between requests**: 1.2 seconds
- **Retry logic**: 3 attempts with exponential backoff
- **Rate limit handling**: 60-second wait on 429 errors

### Content Processing
- **Language Detection**: Automatic language detection
- **Content Deduplication**: Prevents duplicate articles
- **Slug Generation**: SEO-friendly URLs
- **Metadata Extraction**: Author, score, upvote ratio, etc.

## Setup

### 1. Install Dependencies

```bash
npm install axios reddit
```

### 2. Environment Variables (Optional - for OAuth2)

For enhanced functionality with OAuth2 authentication, add these to your `.env` file:

```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback
```

### 3. Create Reddit App (for OAuth2)

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the details:
   - **Name**: Your app name
   - **Type**: Web app
   - **Description**: Travel content crawler
   - **About URL**: Your website URL
   - **Redirect URI**: http://localhost:3000/auth/reddit/callback
4. Note down the Client ID and Client Secret

## Usage

### Basic Crawler

```bash
# Test the basic Reddit crawler
npm run test:reddit

# Run the basic Reddit crawler
npm run crawl:reddit
```

### Enhanced Crawler

```bash
# Test the enhanced Reddit crawler
npm run test:reddit-enhanced

# Run the enhanced Reddit crawler
npm run crawl:reddit-enhanced
```

### Integration with Main Scraper

The Reddit crawler is automatically included in the main scraping process:

```bash
npm run scrape
```

## Configuration

### Basic Configuration

Edit `src/config/reddit.ts` to modify:

- Target subreddits
- Content filtering criteria
- Rate limiting settings
- Quality standards

### Example Configuration Changes

```typescript
// Change target subreddits
subreddits: [
  'travel',
  'solotravel',
  'backpacking',
  // Add more subreddits here
],

// Adjust content filtering
filters: {
  minScore: 10, // Increase minimum upvotes
  minComments: 5, // Increase minimum comments
  maxPostsPerSubreddit: 200, // Increase posts per subreddit
},

// Adjust rate limiting
rateLimit: {
  requestsPerMinute: 60, // Increase rate limit
  delayBetweenRequests: 1000, // Decrease delay
},
```

## Output

### Database Schema

Reddit content is stored in the `Article` table with:

- **platform**: 'Reddit'
- **source**: 'reddit'
- **contentType**: 'community'
- **category**: Mapped from subreddit (e.g., 'General Travel', 'Solo Travel')
- **author**: Reddit username
- **url**: Full Reddit post URL

### Content Structure

Each article contains:
- **Question**: Post title
- **Answer**: Post content + metadata + top comments
- **Metadata**: Author, score, upvote ratio, comment count, etc.

## Monitoring

### Crawl Statistics

The crawlers provide detailed statistics:

```
📈 REDDIT CRAWL RESULTS
=======================
Duration: 15.2 minutes
Subreddits processed: 10
Posts discovered: 850
Posts extracted: 245
Comments extracted: 1,234
Total new content: 1,479
Total requests made: 1,250
Rate limit hits: 2
Errors: 5
Success rate: 99.7%
```

### Database Impact

```
📊 DATABASE IMPACT
==================
Before: 0 Reddit articles
After: 1,479 Reddit articles
Growth: +1,479 articles
Growth percentage: +100%
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Error: `HTTP error 429: Too Many Requests`
   - Solution: The crawler automatically handles this with retry logic

2. **Empty Results**
   - Check if subreddit exists and is accessible
   - Verify content filtering criteria aren't too strict

3. **Authentication Errors**
   - For OAuth2: Verify client credentials
   - For public API: Check user agent string

### Debug Mode

Enable debug logging by setting:

```typescript
console.log('[REDDIT] Debug mode enabled');
```

## Future Enhancements

### Planned Features

1. **OAuth2 Authentication**
   - Higher rate limits (60 requests/minute)
   - Access to private subreddits
   - Better error handling

2. **Advanced Filtering**
   - Sentiment analysis
   - Topic classification
   - Spam detection

3. **Real-time Monitoring**
   - Live crawl statistics
   - Performance metrics
   - Error tracking

4. **Content Enrichment**
   - AI-generated summaries
   - Related content linking
   - Quality scoring

## API Limits

### Public API (Current)
- **Rate Limit**: 60 requests/minute
- **Authentication**: None required
- **Access**: Public posts only

### OAuth2 API (Future)
- **Rate Limit**: 60 requests/minute
- **Authentication**: Required
- **Access**: Public + private content (with permissions)

## Best Practices

1. **Respect Rate Limits**: Always stay within Reddit's rate limits
2. **Quality Over Quantity**: Focus on high-quality content
3. **Error Handling**: Implement proper retry logic
4. **Monitoring**: Track crawl statistics and errors
5. **Content Validation**: Filter out low-quality or inappropriate content

## Support

For issues or questions about the Reddit integration:

1. Check the troubleshooting section above
2. Review the configuration options
3. Monitor the crawl logs for specific errors
4. Test with a single subreddit first

## License

This Reddit integration follows Reddit's API terms of service and respects their rate limiting policies. 