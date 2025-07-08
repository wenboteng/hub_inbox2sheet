import { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ArticleSitemapData {
    slug: string | null;
    updatedAt: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Get all articles
  const articles: { slug: string | null; updatedAt: Date }[] = await prisma.article.findMany({
    select: {
      slug: true,
      updatedAt: true,
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

  // Create URLs for each article
  const articleUrls = articles
    .filter((article) => article.slug)
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

  return [...staticPages, ...platformUrls, ...articleUrls, ...reportUrls];
} 