import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

const prisma = new PrismaClient();

type Props = {
  params: { platform: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const platform = decodeURIComponent(params.platform);
  
  // Get platform stats for better metadata
  const platformArticles = await prisma.article.count({
    where: { platform: platform }
  });

  const title = `${platform} Help & Solutions | Tour Vendor Support | OTA Answers`;
  const description = `Find ${platform} help, solutions, and expert advice for tour vendors. ${platformArticles}+ verified answers for ${platform} issues, policies, and best practices.`;

  return {
    title,
    description,
    keywords: `${platform}, help, solutions, tour vendor, OTA, booking, cancellation, policy, support`,
    openGraph: {
      title: `${platform} Help & Solutions`,
      description,
      type: 'website',
      url: `https://ota-answers.com/platform/${params.platform}`,
      siteName: 'OTA Answers',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${platform} Help & Solutions`,
      description,
    },
    alternates: {
      canonical: `https://ota-answers.com/platform/${params.platform}`,
    },
  };
}

export default async function PlatformPage({ params }: Props) {
  const platform = decodeURIComponent(params.platform);
  
  // Get all articles for this platform
  const articles = await prisma.article.findMany({
    where: { 
      platform: platform,
      crawlStatus: 'active'
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to prevent performance issues
  });

  if (articles.length === 0) {
    notFound();
  }

  // Group articles by category
  const articlesByCategory = articles.reduce((acc, article) => {
    const category = article.category.replace(/\[.*?\]/g, '').trim();
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(article);
    return acc;
  }, {} as Record<string, typeof articles>);

  // Get platform statistics
  const totalArticles = articles.length;
  const categories = Object.keys(articlesByCategory).length;
  const recentArticles = articles.slice(0, 5);

  // Generate structured data for the platform
  const platformSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${platform} Help & Solutions`,
    "description": `Find ${platform} help, solutions, and expert advice for tour vendors`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": totalArticles,
      "itemListElement": recentArticles.map((article, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Article",
          "name": article.question,
          "url": `https://ota-answers.com/answers/${article.slug}`,
          "description": article.answer.substring(0, 150)
        }
      }))
    }
  };

  return (
    <div className="bg-white px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(platformSchema) }}
        />
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            {platform} Help & Solutions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find verified solutions and expert advice for {platform} issues. 
            {totalArticles}+ answers for tour vendors and hosts.
          </p>
          
          {/* Platform Stats */}
          <div className="mt-8 flex justify-center gap-8 text-sm text-gray-500">
            <div>
              <span className="font-semibold text-indigo-600">{totalArticles}</span> articles
            </div>
            <div>
              <span className="font-semibold text-indigo-600">{categories}</span> categories
            </div>
            <div>
              <span className="font-semibold text-indigo-600">24/7</span> updated
            </div>
          </div>
        </div>

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent {platform} Articles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {recentArticles.map((article) => (
              <div key={article.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                <Link href={`/answers/${article.slug}`} className="block">
                  <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors mb-2">
                    {article.question}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {article.category}
                  </p>
                  <p className="text-sm text-gray-500">
                    {article.answer.substring(0, 120)}...
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Articles by Category */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Browse by Category</h2>
          <div className="space-y-8">
            {Object.entries(articlesByCategory).map(([category, categoryArticles]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{category}</h3>
                <div className="space-y-3">
                  {categoryArticles.slice(0, 5).map((article) => (
                    <div key={article.id} className="border-l-4 border-indigo-200 pl-4">
                      <Link href={`/answers/${article.slug}`} className="block">
                        <h4 className="text-base font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                          {article.question}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {article.answer.substring(0, 80)}...
                        </p>
                      </Link>
                    </div>
                  ))}
                  {categoryArticles.length > 5 && (
                    <p className="text-sm text-indigo-600 mt-3">
                      +{categoryArticles.length - 5} more articles in {category}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="bg-gray-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-600 mb-6">
              Submit your own question and get help from our community of {platform} experts.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Submit a Question
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 