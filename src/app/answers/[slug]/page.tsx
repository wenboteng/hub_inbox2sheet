import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import EmailSignup from '@/app/components/EmailSignup';

const prisma = new PrismaClient();

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
  });

  if (!article) {
    return {
      title: 'Answer not found - OTA Answers',
      description: 'The requested answer could not be found.',
    };
  }

  // Extract platform and category for better SEO
  const platform = article.platform;
  const category = article.category.replace(/\[.*?\]/g, '').trim(); // Remove priority tags
  const question = article.question;
  const description = article.answer.substring(0, 150) + '...';
  
  // Generate SEO-friendly keywords
  const keywords = [
    platform,
    category,
    'help',
    'solutions',
    'tour vendor',
    'OTA',
    'booking',
    'cancellation',
    'policy'
  ].filter(Boolean).join(', ');

  return {
    title: `${question} | ${platform} Help & Solutions | OTA Answers`,
    description: `${description} Get expert help with ${platform} issues. Find solutions for tour vendors and hosts.`,
    keywords: keywords,
    openGraph: {
      title: `${question} - ${platform} Help`,
      description: description,
      type: 'article',
      url: `https://ota-answers.com/answers/${article.slug}`,
      siteName: 'OTA Answers',
      locale: 'en_US',
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${question} - ${platform} Help`,
      description: description,
      site: '@otaanswers', // Replace with actual Twitter handle
    },
    alternates: {
      canonical: `https://ota-answers.com/answers/${article.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function AnswerPage({ params }: Props) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
  });

  if (!article) {
    notFound();
  }

  // Get related articles for better internal linking
  const relatedArticles = await prisma.article.findMany({
    where: {
      OR: [
        { platform: article.platform },
        { category: { contains: article.category.split(' ')[0] } }, // Match first word of category
      ],
      id: { not: article.id },
      crawlStatus: 'active',
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": article.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": article.answer
      }
    }]
  };

  // Add breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://ota-answers.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": article.platform,
        "item": `https://ota-answers.com/platform/${encodeURIComponent(article.platform)}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.question.length > 50 ? article.question.substring(0, 50) + '...' : article.question,
        "item": `https://ota-answers.com/answers/${article.slug}`
      }
    ]
  };

  return (
    <div className="bg-white px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-indigo-600 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li>
              <Link href={`/platform/${encodeURIComponent(article.platform)}`} className="hover:text-indigo-600 transition-colors">
                {article.platform}
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-900 font-medium">
              {article.question.length > 50 ? article.question.substring(0, 50) + '...' : article.question}
            </li>
          </ol>
        </nav>
        
        <p className="text-base font-semibold leading-7 text-indigo-600">{article.platform} - {article.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {article.question}
        </h1>
        <div className="mt-6 prose lg:prose-xl" dangerouslySetInnerHTML={{ __html: article.answer }} />

        <div className="mt-10 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-600">Was this helpful?</p>
          <div className="mt-2 flex items-center gap-x-4">
            <button className="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200">
              👍 Yes
            </button>
            <button className="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200">
              👎 No
            </button>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Articles</h2>
            <div className="space-y-4">
              {relatedArticles.map((relatedArticle) => (
                <div key={relatedArticle.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <Link href={`/answers/${relatedArticle.slug}`} className="block">
                    <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                      {relatedArticle.question}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {relatedArticle.platform} • {relatedArticle.category}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {relatedArticle.answer.substring(0, 120)}...
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
            <p className="text-sm text-gray-600 mb-2">Share this answer:</p>
            <div className="flex space-x-2">
                <Link href={`https://www.linkedin.com/sharing/share-offsite/?url=https://ota-answers.com/answers/${article.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700">LinkedIn</Link>
                <Link href={`https://twitter.com/intent/tweet?url=https://ota-answers.com/answers/${article.slug}&text=${encodeURIComponent(article.question)}`} target="_blank" className="text-gray-500 hover:text-gray-700">Twitter</Link>
                <Link href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.question + " " + "https://ota-answers.com/answers/" + article.slug)}`} target="_blank" className="text-gray-500 hover:text-gray-700">WhatsApp</Link>
                <Link href={`mailto:?subject=${encodeURIComponent(article.question)}&body=${encodeURIComponent("Check out this answer: https://ota-answers.com/answers/" + article.slug)}`} className="text-gray-500 hover:text-gray-700">Email</Link>
            </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-x-6 rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
            <div className="text-center">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Have a different question?</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">Can't find the answer you're looking for? Submit your own question to our community.</p>
                <div className="mt-6">
                    <Link href="/submit" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        Submit a Question
                    </Link>
                </div>
            </div>
        </div>

        <EmailSignup />
      </div>
    </div>
  );
} 