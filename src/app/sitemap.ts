import { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ArticleSitemapData {
    slug: string | null;
    updatedAt: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Get all articles with content length filter
  const articles: { slug: string | null; updatedAt: Date; answer: string }[] = await prisma.article.findMany({
    select: {
      slug: true,
      updatedAt: true,
      answer: true,
    },
  });

  // Get unique platforms for platform pages
  const platforms = await prisma.article.groupBy({
    by: ['platform'],
    _count: {
      id: true
    },
    where: {
      crawlStatus: 'active'
    }
  });

  // Get public reports for sitemap
  const reports = await prisma.report.findMany({
    where: { isPublic: true },
    select: {
      slug: true,
      updatedAt: true,
      title: true,
    },
  });

  // Filter articles for SEO quality - only include articles with substantial content
  const seoQualityArticles = articles
    .filter((article) => {
      if (!article.slug) return false;
      
      // Calculate word count
      const wordCount = article.answer.split(' ').length;
      const charCount = article.answer.length;
      
      // SEO quality criteria:
      // 1. At least 100 words OR 500 characters
      // 2. Not just a code snippet or very short comment
      const hasSubstantialContent = wordCount >= 100 || charCount >= 500;
      const isNotCodeSnippet = !article.answer.includes('```') && !article.answer.includes('function(');
      const isNotVeryShort = wordCount >= 50;
      
      return hasSubstantialContent && isNotCodeSnippet && isNotVeryShort;
    })
    .map((article) => ({
      url: `${baseUrl}/answers/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Create URLs for platform pages
  const platformUrls = platforms.map((platform) => ({
    url: `${baseUrl}/platform/${encodeURIComponent(platform.platform)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Create URLs for reports
  const reportUrls = reports
    .filter((report) => report.slug)
    .map((report) => ({
      url: `${baseUrl}/reports/${report.slug}`,
      lastModified: report.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // Add static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
        url: `${baseUrl}/submit`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
    },
    {
        url: `${baseUrl}/reports`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    },
    {
        url: `${baseUrl}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
    },
    {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
    }
  ];

  console.log(`🔍 Sitemap generation: ${articles.length} total articles, ${seoQualityArticles.length} SEO-quality articles included`);

  return [...staticPages, ...platformUrls, ...seoQualityArticles, ...reportUrls];
} 