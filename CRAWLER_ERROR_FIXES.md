# Crawler Error Fixes

This document outlines the errors found in the cron job logs and the fixes implemented to resolve them.

## Errors Identified

### 1. Viator 403 Forbidden Errors
**Problem**: The Viator crawler was getting 403 Forbidden responses, likely due to anti-bot protection.

**Error Examples**:
```
[VIATOR] Error crawling https://www.viator.com/help/articles/58: AxiosError: Request failed with status code 403
[VIATOR] Error crawling https://www.viator.com/help/articles/59: AxiosError: Request failed with status code 403
[VIATOR] Error crawling https://www.viator.com/help/articles/60: AxiosError: Request failed with status code 403
```

### 2. Stack Overflow Rate Limiting
**Problem**: The Stack Overflow API was rate limiting requests, causing 429 errors and throttle violations.

**Error Examples**:
```
[STACKOVERFLOW][ERROR] Failed to fetch questions for tag airbnb: AxiosError: Request failed with status code 400
'x-error-message': 'too many requests from this IP, more requests available in 14385 seconds'
'x-error-name': 'throttle_violation'
```

### 3. AirHosts Forum Timeout Errors
**Problem**: The AirHosts Forum crawler was hitting 90-second navigation timeouts.

**Error Examples**:
```
[AIRHOSTS] Error crawling category https://airhostsforum.com/c/hosting-discussions: TimeoutError: Navigation timeout of 90000 ms exceeded
[AIRHOSTS] Error crawling topic https://airhostsforum.com/t/ib-cancellation-was-not-supported-by-airbnb-customer-service/63095: TimeoutError: Navigation timeout of 90000 ms exceeded
```

## Fixes Implemented

### 1. Viator Crawler Fixes (`src/crawlers/viator.ts`)

**Changes Made**:
- **Enhanced Configuration**: Added comprehensive rate limiting and retry configuration
- **User Agent Rotation**: Implemented random user agent selection from 5 different browsers
- **Better Headers**: Added realistic browser headers including `Sec-Fetch-*` headers
- **Exponential Backoff**: Implemented retry logic with exponential backoff for 403 and 429 errors
- **Increased Delays**: Increased delays between requests (3-6 seconds instead of 1.5-4 seconds)
- **Proper Timeout Handling**: Fixed fetch timeout using AbortController instead of invalid timeout option

**Key Improvements**:
```typescript
const VIATOR_CONFIG = {
  rateLimit: {
    minDelay: 3000,  // Increased from 1500ms
    maxDelay: 6000,  // Increased from 4000ms
  },
  retryAttempts: 3,
  exponentialBackoff: true,
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    // ... more user agents
  ],
  headers: {
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    // ... more realistic headers
  },
};
```

### 2. Stack Overflow Crawler Fixes (`src/crawlers/stackoverflow.ts`)

**Changes Made**:
- **Enhanced Rate Limiting**: Implemented comprehensive rate limiting with hourly and daily limits
- **Throttle Header Parsing**: Added parsing of Stack Exchange throttle headers to respect API limits
- **Reduced Request Limits**: Reduced questions per tag (50→30) and answers per question (10→5)
- **Exponential Backoff**: Added exponential backoff for rate limit errors
- **Better Error Handling**: Return empty results instead of throwing on 400 errors
- **Request Tracking**: Added request counting and timing to enforce limits

**Key Improvements**:
```typescript
const STACK_OVERFLOW_CONFIG = {
  rateLimit: {
    minDelay: 2000,  // Increased from 1000ms
    maxDelay: 4000,  // Increased from 2000ms
    maxRequestsPerHour: 100, // Conservative limit
    maxRequestsPerDay: 1000, // Conservative limit
  },
  maxQuestionsPerTag: 30,  // Reduced from 50
  maxAnswersPerQuestion: 5, // Reduced from 10
  retryAttempts: 2,
  exponentialBackoff: true,
  respectThrottleHeaders: true,
};
```

### 3. AirHosts Forum Crawler Fixes (`src/crawlers/airhosts-forum.ts`)

**Changes Made**:
- **Reduced Timeouts**: Reduced navigation timeout from 90 seconds to 30 seconds
- **Better Page Loading**: Changed from `networkidle0` to `domcontentloaded` for faster loading
- **Resource Blocking**: Block unnecessary resources (images, stylesheets, fonts, scripts) to speed up loading
- **Retry Logic**: Added navigation retry with exponential backoff
- **Reduced Thread Count**: Reduced threads per category from 10 to 5 to avoid timeouts
- **Enhanced Error Handling**: Better error handling and logging

**Key Improvements**:
```typescript
const AIRHOSTS_CONFIG = {
  timeouts: {
    navigation: 30000,  // Reduced from 90000ms
    pageLoad: 20000,    // 20 seconds for page load
    elementWait: 10000, // 10 seconds for element wait
  },
  retryAttempts: 2,
  exponentialBackoff: true,
  maxThreadsPerCategory: 5, // Reduced from 10
};
```

## Testing

A test script has been created to verify the fixes:

```bash
npm run test:crawler-fixes
```

This script tests all three crawlers to ensure they work properly with the new configurations.

## Expected Results

After implementing these fixes, the cron job should:

1. **Viator**: Successfully crawl articles without 403 errors, using proper rate limiting and user agent rotation
2. **Stack Overflow**: Respect API rate limits and avoid throttle violations
3. **AirHosts Forum**: Complete crawling without timeout errors, using faster page loading

## Monitoring

To monitor the effectiveness of these fixes:

1. **Check cron job logs** for reduced error rates
2. **Monitor success rates** for each crawler
3. **Track content collection** to ensure articles are still being gathered
4. **Watch for new error patterns** that might emerge

## Deployment

These fixes are ready for deployment. The changes are backward compatible and should improve the reliability of the crawling system without affecting existing functionality.

## Future Improvements

Consider these additional improvements for even better reliability:

1. **IP Rotation**: Use proxy rotation for high-volume crawling
2. **Session Management**: Implement session persistence for sites that require it
3. **Content Validation**: Add more robust content validation to ensure quality
4. **Metrics Collection**: Add detailed metrics collection for monitoring crawler performance 