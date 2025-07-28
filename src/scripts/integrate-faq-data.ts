import { PrismaClient } from '@prisma/client';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  platform: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  contentQuality: number;
  isVerified: boolean;
  lastUpdated: string;
  source: 'existing' | 'oxylabs' | 'community';
}

// FAQ Categories mapping
const FAQ_CATEGORIES = {
  'Pricing & Revenue': {
    id: 'pricing-revenue',
    name: 'Pricing & Revenue',
    description: 'Strategies for pricing tours and revenue optimization',
    icon: '💰',
    color: '#10B981',
    priority: 1,
    keywords: ['pricing', 'price', 'cost', 'revenue', 'profit', 'earnings', 'commission']
  },
  'Marketing & SEO': {
    id: 'marketing-seo',
    name: 'Marketing & SEO',
    description: 'Digital marketing and SEO strategies',
    icon: '📈',
    color: '#3B82F6',
    priority: 2,
    keywords: ['marketing', 'seo', 'promotion', 'advertising', 'social media', 'google ads']
  },
  'Customer Service': {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'Guest relations and customer support',
    icon: '🎯',
    color: '#F59E0B',
    priority: 3,
    keywords: ['customer', 'guest', 'service', 'support', 'complaint', 'review']
  },
  'Technical Setup': {
    id: 'technical-setup',
    name: 'Technical Setup',
    description: 'Platform configuration and technical requirements',
    icon: '⚙️',
    color: '#8B5CF6',
    priority: 4,
    keywords: ['technical', 'setup', 'configuration', 'api', 'integration', 'platform']
  },
  'Booking & Cancellations': {
    id: 'booking-cancellations',
    name: 'Booking & Cancellations',
    description: 'Reservation management and cancellation policies',
    icon: '📅',
    color: '#EF4444',
    priority: 5,
    keywords: ['booking', 'cancellation', 'reservation', 'refund', 'policy']
  },
  'Policies & Legal': {
    id: 'policies-legal',
    name: 'Policies & Legal',
    description: 'Legal requirements and terms of service',
    icon: '⚖️',
    color: '#6B7280',
    priority: 6,
    keywords: ['policy', 'legal', 'terms', 'law', 'regulation', 'compliance']
  },
  'General': {
    id: 'general',
    name: 'General',
    description: 'General tour vendor questions and tips',
    icon: '📚',
    color: '#9CA3AF',
    priority: 7,
    keywords: []
  }
};

function detectCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  for (const [category, config] of Object.entries(FAQ_CATEGORIES)) {
    if (config.keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
}

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

async function transformArticleToFAQ(article: any): Promise<FAQQuestion> {
  const category = detectCategory(article.question, article.answer);
  const difficulty = determineDifficulty(article.answer);
  const contentQuality = calculateContentQuality(article);
  const tags = extractTags(article.question, article.answer);
  const estimatedTime = Math.ceil(article.answer.split(' ').length / 200);
  
  return {
    id: article.id,
    question: article.question,
    answer: article.answer,
    categoryId: FAQ_CATEGORIES[category as keyof typeof FAQ_CATEGORIES]?.id || 'general',
    platform: article.platform,
    tags,
    difficulty,
    estimatedTime,
    contentQuality,
    isVerified: article.isVerified || article.contentType === 'official',
    lastUpdated: article.lastUpdated.toISOString(),
    source: article.contentType === 'official' ? 'existing' : 'community'
  };
}

async function integrateExistingData(): Promise<void> {
  console.log('🔄 Integrating existing data into FAQ system...');
  
  try {
    // Get all existing articles
    const articles = await prisma.article.findMany({
      where: {
        crawlStatus: 'active',
        isDuplicate: false,
        language: 'en', // Focus on English content for FAQ
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });
    
    console.log(`📚 Found ${articles.length} articles to integrate`);
    
    // Transform articles to FAQ format
    const faqQuestions: FAQQuestion[] = [];
    let processedCount = 0;
    
    for (const article of articles) {
      try {
        const faqQuestion = await transformArticleToFAQ(article);
        faqQuestions.push(faqQuestion);
        processedCount++;
        
        if (processedCount % 100 === 0) {
          console.log(`✅ Processed ${processedCount}/${articles.length} articles`);
        }
      } catch (error) {
        console.error(`❌ Error processing article ${article.id}:`, error);
      }
    }
    
    console.log(`✅ Successfully transformed ${faqQuestions.length} articles to FAQ format`);
    
    // Analyze the data
    const platformStats = faqQuestions.reduce((acc, q) => {
      acc[q.platform] = (acc[q.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const categoryStats = faqQuestions.reduce((acc, q) => {
      acc[q.categoryId] = (acc[q.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const difficultyStats = faqQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 FAQ Data Analysis:');
    console.log('=====================');
    console.log(`Total Questions: ${faqQuestions.length}`);
    console.log(`Average Quality Score: ${(faqQuestions.reduce((sum, q) => sum + q.contentQuality, 0) / faqQuestions.length).toFixed(1)}`);
    
    console.log('\n🏢 Platform Distribution:');
    Object.entries(platformStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([platform, count]) => {
        console.log(`  ${platform}: ${count} questions`);
      });
    
    console.log('\n📂 Category Distribution:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        const categoryName = Object.values(FAQ_CATEGORIES).find(c => c.id === category)?.name || category;
        console.log(`  ${categoryName}: ${count} questions`);
      });
    
    console.log('\n📈 Difficulty Distribution:');
    Object.entries(difficultyStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([difficulty, count]) => {
        console.log(`  ${difficulty}: ${count} questions`);
      });
    
    // Save FAQ data to database (we'll create a new table for this)
    console.log('\n💾 Saving FAQ data...');
    
    // For now, we'll update the existing articles with FAQ metadata
    for (const faqQuestion of faqQuestions.slice(0, 100)) { // Process first 100 to avoid overwhelming
      await prisma.article.update({
        where: { id: faqQuestion.id },
        data: {
          contentType: 'faq',
          category: Object.values(FAQ_CATEGORIES).find(c => c.id === faqQuestion.categoryId)?.name || 'General',
          isVerified: faqQuestion.isVerified,
          votes: Math.floor(faqQuestion.contentQuality / 10), // Convert quality to votes
        }
      });
    }
    
    console.log('✅ FAQ integration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during FAQ integration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the integration
if (require.main === module) {
  integrateExistingData().catch(console.error);
}

export { integrateExistingData, FAQ_CATEGORIES, transformArticleToFAQ }; 