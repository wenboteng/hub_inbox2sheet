import { PrismaClient } from '@prisma/client';
import { cleanText } from '../utils/parseHelpers';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';

const prisma = new PrismaClient();

// Reddit API Configuration
const REDDIT_CONFIG = {
  // Popular travel subreddits to target
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
  // API rate limiting (Reddit allows 60 requests per minute)
  rateLimit: {
    requestsPerMinute: 30, // More conservative limit
    delayBetweenRequests: 2000, // 2 seconds between requests
  },
  // Content filtering
  minScore: 5, // Minimum upvotes for a post
  minComments: 3, // Minimum comments for a post
  maxPostsPerSubreddit: 100, // Maximum posts to fetch per subreddit
  maxCommentsPerPost: 50, // Maximum comments to fetch per post
  // Time filtering (posts from last 30 days)
  timeFilter: 'month', // 'hour', 'day', 'week', 'month', 'year', 'all'
  // Content types to fetch
  sortBy: 'hot', // 'hot', 'new', 'top', 'rising'
};

interface RedditPost {
  platform: 'Reddit';
  url: string;
  question: string;
  answer: string;
  author?: string;
  date?: string;
  category?: string;
  contentType: 'community';
  source: 'reddit';
  isThread: boolean;
  threadId?: string;
  replyTo?: string;
  rawHtml?: string;
  subreddit: string;
  score: number;
  commentCount: number;
}

interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  replies?: RedditComment[];
}

interface CrawlStats {
  subredditsProcessed: number;
  postsDiscovered: number;
  postsExtracted: number;
  commentsExtracted: number;
  errors: string[];
  skippedPosts: string[];
}

class RedditCrawler {
  private stats: CrawlStats = {
    subredditsProcessed: 0,
    postsDiscovered: 0,
    postsExtracted: 0,
    commentsExtracted: 0,
    errors: [],
    skippedPosts: [],
  };
  private processedUrls = new Set<string>();
  private reddit: any = null;

  constructor() {
    // Initialize Reddit API client
    this.initializeRedditClient();
  }

  private initializeRedditClient(): void {
    // For now, we'll use a simple approach with fetch
    // In production, you'd want to use proper OAuth2 authentication
    console.log('[REDDIT] Initializing Reddit API client...');
  }

  private async delay(): Promise<void> {
    const delayMs = Math.floor(
      Math.random() * 
      (REDDIT_CONFIG.rateLimit.delayBetweenRequests * 2 - REDDIT_CONFIG.rateLimit.delayBetweenRequests) + 
      REDDIT_CONFIG.rateLimit.delayBetweenRequests
    );
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async fetchRedditData(endpoint: string): Promise<any> {
    try {
      const response = await fetch(`https://www.reddit.com${endpoint}.json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (response.status === 429) {
        console.warn(`[REDDIT] Rate limit hit for ${endpoint}, waiting 60 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
        return this.fetchRedditData(endpoint); // Retry once
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[REDDIT] Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  private async fetchSubredditPosts(subreddit: string): Promise<any[]> {
    console.log(`[REDDIT] Fetching posts from r/${subreddit}...`);
    
    const endpoint = `/r/${subreddit}/${REDDIT_CONFIG.sortBy}.json?limit=${REDDIT_CONFIG.maxPostsPerSubreddit}&t=${REDDIT_CONFIG.timeFilter}`;
    const data = await this.fetchRedditData(endpoint);
    
    if (!data.data || !data.data.children) {
      console.warn(`[REDDIT] No posts found for r/${subreddit}`);
      return [];
    }

    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => {
        // Filter out non-text posts and low-quality content
        return (
          post.is_self && // Only text posts
          post.score >= REDDIT_CONFIG.minScore &&
          post.num_comments >= REDDIT_CONFIG.minComments &&
          !post.stickied && // Not stickied posts
          !post.over_18 && // Not NSFW
          post.selftext && post.selftext.length > 50 // Minimum content length
        );
      });

    console.log(`[REDDIT] Found ${posts.length} qualifying posts in r/${subreddit}`);
    return posts;
  }

  private async fetchPostComments(postId: string): Promise<RedditComment[]> {
    try {
      const endpoint = `/comments/${postId}.json`;
      const data = await this.fetchRedditData(endpoint);
      
      if (!data[1] || !data[1].data || !data[1].data.children) {
        return [];
      }

      const comments = data[1].data.children
        .map((child: any) => child.data)
        .filter((comment: any) => {
          return (
            comment.body &&
            comment.body.length > 20 && // Minimum comment length
            comment.score > 0 && // Positive score
            !comment.deleted &&
            !comment.removed
          );
        })
        .map((comment: any) => ({
          id: comment.id,
          body: comment.body,
          author: comment.author,
          score: comment.score,
          created_utc: comment.created_utc,
        }))
        .slice(0, REDDIT_CONFIG.maxCommentsPerPost);

      return comments;
    } catch (error) {
      console.error(`[REDDIT] Error fetching comments for post ${postId}:`, error);
      return [];
    }
  }

  private extractCategoryFromSubreddit(subreddit: string): string {
    const categoryMap: { [key: string]: string } = {
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
    };

    return categoryMap[subreddit] || 'Travel Discussion';
  }

  private async convertPostToArticle(post: any, subreddit: string): Promise<RedditPost> {
    const category = this.extractCategoryFromSubreddit(subreddit);
    const url = `https://reddit.com${post.permalink}`;
    const question = cleanText(post.title);
    const answer = cleanText(post.selftext);
    
    // Create a comprehensive answer that includes the post content and top comments
    let fullAnswer = answer;
    
    // Add post metadata
    fullAnswer += `\n\n---\n\n**Post Details:**\n`;
    fullAnswer += `- **Subreddit:** r/${subreddit}\n`;
    fullAnswer += `- **Author:** u/${post.author}\n`;
    fullAnswer += `- **Score:** ${post.score} upvotes\n`;
    fullAnswer += `- **Comments:** ${post.num_comments}\n`;
    fullAnswer += `- **Posted:** ${new Date(post.created_utc * 1000).toLocaleDateString()}\n`;

    return {
      platform: 'Reddit',
      url,
      question,
      answer: fullAnswer,
      author: post.author,
      date: new Date(post.created_utc * 1000).toISOString(),
      category,
      contentType: 'community',
      source: 'reddit',
      isThread: true,
      threadId: post.id,
      subreddit,
      score: post.score,
      commentCount: post.num_comments,
    };
  }

  private async convertCommentToArticle(
    comment: RedditComment,
    post: any,
    subreddit: string
  ): Promise<RedditPost> {
    const category = this.extractCategoryFromSubreddit(subreddit);
    const url = `https://reddit.com${post.permalink}`;
    const question = cleanText(post.title);
    const answer = cleanText(comment.body);
    
    // Create context for the comment
    let fullAnswer = `**Comment by u/${comment.author}:**\n\n${answer}\n\n`;
    fullAnswer += `**Original Post Context:**\n${cleanText(post.selftext.substring(0, 500))}...\n\n`;
    fullAnswer += `---\n\n**Details:**\n`;
    fullAnswer += `- **Subreddit:** r/${subreddit}\n`;
    fullAnswer += `- **Comment Score:** ${comment.score} upvotes\n`;
    fullAnswer += `- **Posted:** ${new Date(comment.created_utc * 1000).toLocaleDateString()}\n`;

    return {
      platform: 'Reddit',
      url,
      question,
      answer: fullAnswer,
      author: comment.author,
      date: new Date(comment.created_utc * 1000).toISOString(),
      category,
      contentType: 'community',
      source: 'reddit',
      isThread: false,
      threadId: post.id,
      replyTo: post.id,
      subreddit,
      score: comment.score,
      commentCount: 1,
    };
  }

  private async saveToDatabase(posts: RedditPost[]): Promise<void> {
    if (posts.length === 0) return;

    console.log(`[REDDIT] Saving ${posts.length} articles to database...`);

    for (const post of posts) {
      try {
        // Check if article already exists
        const existing = await prisma.article.findUnique({
          where: { url: post.url }
        });

        if (existing) {
          console.log(`[REDDIT] Article already exists: ${post.question.substring(0, 50)}...`);
          continue;
        }

        // Use English as default language for Reddit content
        const language: string = 'en';

        // Create slug
        const slug = slugify(post.question);

        // Save to database
        await prisma.article.create({
          data: {
            url: post.url,
            question: post.question,
            answer: post.answer,
            slug,
            category: post.category,
            platform: post.platform,
            contentType: post.contentType,
            source: post.source,
            author: post.author || 'Unknown',
            language,
            // Store additional metadata
            lastCheckedAt: new Date(),
            crawlMode: 'discovery',
            crawlStatus: 'active',
          }
        });

        console.log(`[REDDIT] Saved: ${post.question.substring(0, 50)}...`);
      } catch (error) {
        console.error(`[REDDIT] Error saving article:`, error);
        this.stats.errors.push(`Failed to save article: ${post.url}`);
      }
    }
  }

  async crawlSubreddit(subreddit: string): Promise<void> {
    console.log(`[REDDIT] 🚀 Starting crawl of r/${subreddit}`);
    
    try {
      // Fetch posts from subreddit
      const posts = await this.fetchSubredditPosts(subreddit);
      this.stats.postsDiscovered += posts.length;

      const articles: RedditPost[] = [];

      for (const post of posts) {
        try {
          // Convert post to article
          const postArticle = await this.convertPostToArticle(post, subreddit);
          articles.push(postArticle);
          this.stats.postsExtracted++;

          // Fetch and convert top comments
          await this.delay(); // Rate limiting
          const comments = await this.fetchPostComments(post.id);
          
          for (const comment of comments) {
            const commentArticle = await this.convertCommentToArticle(comment, post, subreddit);
            articles.push(commentArticle);
            this.stats.commentsExtracted++;
          }

          console.log(`[REDDIT] Processed post: ${post.title.substring(0, 50)}... (${comments.length} comments)`);
        } catch (error) {
          console.error(`[REDDIT] Error processing post ${post.id}:`, error);
          this.stats.errors.push(`Failed to process post: ${post.id}`);
          this.stats.skippedPosts.push(post.id);
        }

        // Rate limiting between posts
        await this.delay();
      }

      // Save all articles for this subreddit
      await this.saveToDatabase(articles);
      this.stats.subredditsProcessed++;

      console.log(`[REDDIT] ✅ Completed r/${subreddit}: ${articles.length} articles saved`);

    } catch (error) {
      console.error(`[REDDIT] ❌ Error crawling r/${subreddit}:`, error);
      this.stats.errors.push(`Failed to crawl subreddit: ${subreddit}`);
    }
  }

  async crawl(): Promise<CrawlStats> {
    console.log('🚀 REDDIT CRAWLER STARTING');
    console.log('==========================');
    console.log(`Target subreddits: ${REDDIT_CONFIG.subreddits.join(', ')}`);
    console.log(`Rate limit: ${REDDIT_CONFIG.rateLimit.requestsPerMinute} requests/minute`);
    console.log(`Time filter: ${REDDIT_CONFIG.timeFilter}`);
    console.log(`Sort by: ${REDDIT_CONFIG.sortBy}`);
    console.log('');

    const startTime = Date.now();

    for (const subreddit of REDDIT_CONFIG.subreddits) {
      await this.crawlSubreddit(subreddit);
      
      // Add extra delay between subreddits
      console.log(`[REDDIT] Waiting 5 seconds before next subreddit...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const duration = Date.now() - startTime;

    console.log('\n📈 REDDIT CRAWL RESULTS');
    console.log('=======================');
    console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Subreddits processed: ${this.stats.subredditsProcessed}`);
    console.log(`Posts discovered: ${this.stats.postsDiscovered}`);
    console.log(`Posts extracted: ${this.stats.postsExtracted}`);
    console.log(`Comments extracted: ${this.stats.commentsExtracted}`);
    console.log(`Total content: ${this.stats.postsExtracted + this.stats.commentsExtracted}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    console.log(`Skipped posts: ${this.stats.skippedPosts.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.slice(0, 10).forEach(error => console.log(`- ${error}`));
    }

    return this.stats;
  }

  // Public method to get stats
  public getStats(): CrawlStats {
    return { ...this.stats };
  }
}

export async function crawlReddit(): Promise<CrawlStats> {
  const crawler = new RedditCrawler();
  
  try {
    const stats = await crawler.crawl();
    return stats;
  } catch (error) {
    console.error('❌ Reddit crawler failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export the crawler class for testing
export { RedditCrawler }; 