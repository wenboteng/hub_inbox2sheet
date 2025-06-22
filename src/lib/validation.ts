import { PrismaClient } from '@prisma/client';

interface ArticleForValidation {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

export function validateArticle(article: ArticleForValidation): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!article.url || !article.url.startsWith('http')) issues.push('Invalid URL');
  if (!article.question || article.question.length < 5) issues.push('Question too short');
  if (!article.answer || article.answer.length < 20) issues.push('Answer too short');
  if (!article.platform) issues.push('Missing platform');
  if (!article.category) issues.push('Missing category');
  return { isValid: issues.length === 0, issues };
} 