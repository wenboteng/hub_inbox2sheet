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

  // Create URLs for each article
  const articleUrls = articles
    .filter((article) => article.slug)
    .map((article) => ({
      url: `${baseUrl}/answers/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
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
    }
  ];

  return [...staticPages, ...articleUrls];
} 