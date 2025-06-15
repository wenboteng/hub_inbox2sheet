import { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Question {
  id: string;
  question: string;
  updatedAt: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Get all public questions
  const questions = await prisma.submittedQuestion.findMany({
    where: {
      isPublic: true,
      status: "answered",
    },
    select: {
      id: true,
      question: true,
      updatedAt: true,
    },
  });

  // Create URLs for each question
  const questionUrls = questions.map((question: Question) => ({
    url: `${baseUrl}/hub/questions/${question.id}`,
    lastModified: question.updatedAt,
    changeFrequency: "weekly" as const,
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
      url: `${baseUrl}/hub/questions`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  return [...staticPages, ...questionUrls];
} 