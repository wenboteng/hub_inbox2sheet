# Crawler Development Guide - Lessons Learned

## 🎯 Overview
This guide summarizes the key learnings from our current crawler system to help you build a robust, production-ready crawler while avoiding common pitfalls and debugging issues.

## 🏗️ Architecture & Technology Stack

### Core Dependencies (Recommended Versions)
```json
{
  "dependencies": {
    "puppeteer": "^24.10.2",        // ✅ PROVEN: Works well with serverless
    "cheerio": "^1.0.0-rc.10",      // ✅ PROVEN: Lightweight HTML parsing
    "axios": "^1.10.0",             // ✅ PROVEN: Reliable HTTP client
    "@prisma/client": "^5.22.0",    // ✅ PROVEN: Type-safe database
    "franc": "^6.2.0",              // ✅ PROVEN: Language detection
    "date-fns": "^3.3.1"            // ✅ PROVEN: Date handling
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "prisma": "^5.10.2"
  }
}
```

### ❌ AVOID: Playwright
- **Issue**: Poor compatibility with serverless platforms like Render
- **Problem**: Complex setup, memory issues, inconsistent behavior
- **Solution**: Stick with Puppeteer - it's battle-tested in our production environment

## 🚀 Puppeteer Configuration (Critical for Production)

### Environment-Specific Setup
```typescript
// src/utils/puppeteer.ts - Production-ready configuration
export async function createBrowser() {
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  const isLinux = process.platform === 'linux';
  
  // Cache directory for Chrome installation
  const cacheDir = isRender && isLinux 
    ? '/opt/render/.cache/puppeteer'  // Render-specific path
    : path.join(process.env.HOME || '', '.cache', 'puppeteer');
  
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--safebrowsing-disable-auto-update',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ],
    executablePath: await ensureChromeInstalled(),
    timeout: 30000,
  };
  
  return await puppeteer.launch(launchOptions);
}
```

### Chrome Installation Strategy
```typescript
async function ensureChromeInstalled(): Promise<string> {
  // 1. Try to find existing Chrome installation
  const existingChrome = await findChromeExecutable(cacheDir, process.platform);
  if (existingChrome) return existingChrome;
  
  // 2. Try system Chrome as fallback
  const systemChrome = await findSystemChrome();
  if (systemChrome) return systemChrome;
  
  // 3. Install Chrome via Puppeteer
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  
  // 4. Verify installation
  const newChrome = await findChromeExecutable(cacheDir, process.platform);
  if (!newChrome) throw new Error('Chrome installation failed');
  
  return newChrome;
}
```

## 🏢 Serverless Platform Configuration (Render)

### render.yaml Configuration
```yaml
envVarGroups:
  - name: crawler-secrets
    envVars:
      - key: PUPPETEER_CACHE_DIR
        value: /opt/render/.cache/puppeteer
      - key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
        value: "false"
      - key: NODE_VERSION
        value: "18.20.2"

services:
  - type: cron
    name: crawler-job
    runtime: node
    plan: starter
    schedule: "0 2 * * *"  # Daily at 2am UTC
    buildCommand: |
      npm install
      npx prisma generate
      npm run build:scripts
      
      # Install Chrome for Puppeteer
      npx puppeteer browsers install chrome || {
        echo "Failed to install Chrome via puppeteer. Trying system install..."
        apt-get update && apt-get install -y google-chrome-stable || echo "System Chrome installation failed."
      }
    startCommand: npm run scrape:all
```

## 🛡️ Anti-Detection & Reliability

### Request Interception
```typescript
// Block unnecessary resources for performance
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (['image', 'font', 'media', 'stylesheet'].includes(request.resourceType())) {
    request.abort();
  } else {
    request.continue();
  }
});
```

### Rate Limiting & Delays
```typescript
// Random delays to avoid detection
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// Use between requests
await delay(getRandomDelay(2000, 5000));
```

### User Agent Rotation
```typescript
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
```

## 📊 Content Processing & Quality

### Content Deduplication
```typescript
// Use SHA-256 hashing for content deduplication
import crypto from 'crypto';

export function generateContentHash(content: string): string {
  const normalizedContent = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim();
  
  const hash = crypto.createHash('sha256');
  hash.update(normalizedContent);
  return hash.digest('hex');
}
```

### Language Detection
```typescript
// Simple heuristic language detection (no external dependencies)
export function detectLanguage(text: string): { language: string; confidence: number } {
  const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 1000);
  
  // Language patterns for common languages
  const patterns = {
    en: /\b(the|and|for|with|this|that|you|are|have|will|can)\b/i,
    es: /\b(el|la|los|las|y|de|en|con|por|para)\b/i,
    fr: /\b(le|la|les|et|de|en|avec|pour)\b/i,
    // Add more languages as needed
  };
  
  let bestLanguage = 'en';
  let bestScore = 0;
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = cleanText.match(pattern);
    if (matches && matches.length > bestScore) {
      bestScore = matches.length;
      bestLanguage = lang;
    }
  }
  
  return {
    language: bestLanguage,
    confidence: bestScore / 10 // Normalize to 0-1
  };
}
```

### Content Cleaning
```typescript
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\n+/g, '\n')          // Normalize line breaks
    .replace(/[^\w\s.,!?;:()[\]{}'"`~@#$%^&*+=|\\/<>-]/g, '') // Remove special chars
    .trim();
}
```

## 🗄️ Database Schema (Prisma)

### Recommended Schema
```prisma
model Article {
  id          String   @id @default(cuid())
  url         String   @unique
  question    String
  answer      String   @db.Text
  platform    String   // e.g., "Airbnb", "Booking.com"
  category    String?  // e.g., "help-center", "community"
  contentType String   @default("help-center") // "help-center" | "community"
  source      String   @default("scraped")     // "scraped" | "api" | "manual"
  
  // Content quality fields
  contentHash String?  @unique // For deduplication
  language    String?  @default("en")
  isDuplicate Boolean  @default(false)
  
  // Metadata
  author      String?
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Indexes for performance
  @@index([platform])
  @@index([contentType])
  @@index([language])
  @@index([createdAt])
}
```

## 🔄 Crawler Architecture Patterns

### Base Crawler Class
```typescript
abstract class BaseCrawler {
  protected browser: Browser | null = null;
  protected stats = {
    processed: 0,
    errors: 0,
    skipped: 0
  };

  abstract async crawl(): Promise<void>;
  
  protected async initialize(): Promise<void> {
    this.browser = await createBrowser();
  }
  
  protected async cleanup(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
  
  protected async delay(min: number, max: number): Promise<void> {
    const delayMs = Math.floor(Math.random() * (max - min) + min);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  protected async createPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    await this.setupPage(page);
    return page;
  }
  
  private async setupPage(page: Page): Promise<void> {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setDefaultTimeout(30000);
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }
}
```

### Platform-Specific Crawler
```typescript
class AirbnbCommunityCrawler extends BaseCrawler {
  private config = {
    baseUrl: 'https://community.withairbnb.com',
    selectors: {
      threadLinks: 'a[href*="/td-p/"], a[href*="/m-p/"]',
      threadTitle: '.lia-message-subject, .page-title',
      threadContent: '.lia-message-body-content, .lia-message-body',
      replyPosts: '.lia-message-body, .lia-message',
    },
    rateLimit: { minDelay: 2000, maxDelay: 5000 }
  };

  async crawl(): Promise<void> {
    try {
      await this.initialize();
      const page = await this.createPage();
      
      // Your crawling logic here
      await this.discoverAndProcessThreads(page);
      
    } finally {
      await this.cleanup();
    }
  }
  
  private async discoverAndProcessThreads(page: Page): Promise<void> {
    // Implementation specific to Airbnb Community
  }
}
```

## 🚨 Error Handling & Monitoring

### Robust Error Handling
```typescript
async function scrapeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed: ${error}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError!;
}
```

### Comprehensive Logging
```typescript
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error || '');
  }
};
```

## 📈 Performance Optimization

### Memory Management
```typescript
// Close pages after use
const page = await browser.newPage();
try {
  await page.goto(url);
  // ... processing
} finally {
  await page.close();
}

// Regular garbage collection in long-running processes
if (processCount % 100 === 0) {
  global.gc && global.gc();
}
```

### Batch Processing
```typescript
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    
    // Delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## 🔧 Development Workflow

### Scripts for Testing
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run build:scripts && next build",
    "build:scripts": "tsc --project tsconfig.scripts.json",
    "scrape": "tsx src/scripts/scrape.ts",
    "test:crawler": "tsx src/scripts/test-crawler.ts",
    "test:puppeteer": "tsx src/scripts/test-puppeteer.ts"
  }
}
```

### Testing Strategy
```typescript
// Test individual components
async function testPuppeteerSetup() {
  const browser = await createBrowser();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example.com');
    console.log('✅ Puppeteer setup working');
  } catch (error) {
    console.error('❌ Puppeteer setup failed:', error);
  } finally {
    await browser.close();
  }
}
```

## 🎯 Key Success Factors

1. **Use Puppeteer, not Playwright** - Proven compatibility with serverless
2. **Implement proper Chrome installation** - Handle Render environment
3. **Use content deduplication** - Avoid duplicate content
4. **Implement rate limiting** - Respect target sites
5. **Handle errors gracefully** - Retry mechanisms and logging
6. **Monitor memory usage** - Close pages and browsers properly
7. **Use TypeScript** - Type safety prevents runtime errors
8. **Test thoroughly** - Individual component testing

## 🚫 Common Pitfalls to Avoid

1. **Not handling Chrome installation** - Will fail in production
2. **No rate limiting** - Will get blocked
3. **Memory leaks** - Not closing pages/browsers
4. **Poor error handling** - Silent failures
5. **No content deduplication** - Duplicate data
6. **Hardcoded selectors** - Sites change, selectors break
7. **No monitoring** - Can't debug production issues

This guide should help you build a robust crawler system while avoiding the debugging issues we encountered. The key is to start with proven technologies and implement proper error handling and monitoring from the beginning. 