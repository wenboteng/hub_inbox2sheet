import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismaClient } from '@prisma/client';
import ShareButton from './ShareButton';

const prisma = new PrismaClient();

const markdownComponents = {
  h1: (props: any) => <h1 id={slugify(props.children)} className="text-3xl font-bold mt-6 mb-4 text-white scroll-mt-24" {...props} />,
  h2: (props: any) => <h2 id={slugify(props.children)} className="text-2xl font-semibold mt-5 mb-3 text-emerald-300 scroll-mt-24" {...props} />,
  h3: (props: any) => <h3 id={slugify(props.children)} className="text-xl font-semibold mt-4 mb-2 text-blue-300 scroll-mt-24" {...props} />,
  h4: (props: any) => <h4 className="text-lg font-semibold mt-3 mb-2 text-blue-200" {...props} />,
  ul: (props: any) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
  li: (props: any) => <li className="mb-1 text-gray-300" {...props} />,
  p: (props: any) => <p className="mb-3 leading-relaxed text-gray-300" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-white" {...props} />,
  em: (props: any) => <em className="italic text-blue-200" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-emerald-400 pl-4 italic text-emerald-200 bg-emerald-500/10 py-3 my-4 rounded-r-lg" {...props} />,
  code: (props: any) => <code className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-emerald-300" {...props} />,
  pre: (props: any) => <pre className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto my-4 border border-gray-700" {...props} />,
  table: (props: any) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border border-gray-600 text-sm rounded-lg shadow-lg bg-white/5 backdrop-blur-sm">
        {props.children}
      </table>
    </div>
  ),
  thead: (props: any) => <thead className="bg-emerald-500/20 text-emerald-300 sticky top-0 z-10" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-600" {...props} />,
  tr: (props: any) => <tr className="even:bg-white/5 hover:bg-white/10 transition" {...props} />,
  th: (props: any) => <th className="px-4 py-3 border-b border-gray-600 font-semibold text-left whitespace-nowrap" {...props} />,
  td: (props: any) => <td className="px-4 py-3 border-b border-gray-600 whitespace-nowrap text-gray-300" {...props} />,
};

function slugify(text: any) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Remove first H1 from markdown content if present
function stripFirstH1(markdown: string) {
  return markdown.replace(/^# .+\n?/, '');
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const report = await prisma.report.findUnique({
      where: { slug: params.slug, isPublic: true }
    });

    if (!report) {
      return {
        title: 'Report Not Found | OTA Answers',
        description: 'The requested report could not be found.',
      };
    }

    // Generate SEO-friendly description
    const description = report.content 
      ? report.content.replace(/[#*`]/g, '').substring(0, 160) + '...'
      : `Read the latest analytics and insights: ${report.title}`;

    // Generate keywords based on title and content
    const keywords = [
      'airbnb ranking algorithm',
      'airbnb host tips',
      'airbnb optimization',
      'airbnb search ranking',
      'airbnb superhost',
      'airbnb hosting guide',
      'tour vendor analytics',
      'OTA insights'
    ].join(', ');

    return {
      title: `${report.title} | Analytics & Insights Reports | OTA Answers`,
      description,
      keywords,
      openGraph: {
        title: report.title,
        description,
        url: `https://otaanswers.com/reports/${report.slug}`,
        type: 'article',
        siteName: 'OTA Answers',
      },
      twitter: {
        card: 'summary_large_image',
        title: report.title,
        description,
      },
      alternates: {
        canonical: `https://otaanswers.com/reports/${report.slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Report | OTA Answers',
      description: 'Analytics and insights for tour vendors.',
    };
  }
}

// Generate static params for all public reports
export async function generateStaticParams() {
  try {
    const reports = await prisma.report.findMany({
      where: { isPublic: true },
      select: { slug: true }
    });

    return reports.map((report) => ({
      slug: report.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ReportDetailPage({ params }: { params: { slug: string } }) {
  try {
    const report = await prisma.report.findUnique({
      where: { slug: params.slug, isPublic: true }
    });

    if (!report) {
      notFound();
    }

    // Fetch related reports
    const related = await prisma.report.findMany({
      where: {
        isPublic: true,
        slug: { not: params.slug },
        type: { not: report.type } // Get reports with different types
      },
      take: 3,
      orderBy: { updatedAt: 'desc' }
    });

    // Extract headings for sidebar navigation
    const headings = Array.from(report.content.matchAll(/^##?\s+(.+)$/gm))
      .map(m => (m as RegExpMatchArray)[1])
      .filter(Boolean);

    const getReportTypeIcon = (type: string) => {
      const icons: { [key: string]: string } = {
        'pricing': '💰',
        'cancellation': '❌',
        'ranking': '📈',
        'analytics': '📊',
        'intelligence': '🧠',
        'vendor': '🏢',
        'gyg': '🌍',
        'airbnb': '🏠',
        'viator': '🎯',
        'seasonal': '🌤️',
        'digital': '💻'
      };
      
      for (const [key, icon] of Object.entries(icons)) {
        if (type.toLowerCase().includes(key)) {
          return icon;
        }
      }
      return '📄';
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Hero Section */}
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <a 
                href="/reports" 
                className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </a>
            </nav>

            {/* Report Header */}
            <div className="flex items-start gap-6 mb-8">
              <div className="text-4xl">
                {getReportTypeIcon(report.type)}
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-4">
                  {report.title}
                </h1>
                <p className="text-xl text-gray-300 mb-6">
                  Data-driven insights and strategic recommendations for tour vendors
                </p>
                
                {/* Report Meta */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 text-sm font-medium">
                    {report.type}
                  </span>
                  {report.updatedAt && !isNaN(new Date(report.updatedAt).getTime()) && (
                    <span className="text-gray-400 text-sm">
                      Last updated: {new Date(report.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  <ShareButton url={`https://otaanswers.com/reports/${report.slug}`} />
                  <a
                    href={`/api/reports/${report.slug}/pdf`}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                    title="Download full report as PDF"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Sticky sidebar for jump-to-section */}
              {headings.length > 0 && (
                <aside className="hidden lg:block lg:w-1/4 sticky top-24 self-start h-fit">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="font-semibold text-white mb-4 text-lg">Jump to Section</div>
                    <nav className="space-y-2">
                      {headings.map(h => (
                        <a 
                          key={h}
                          href={`#${slugify(h)}`} 
                          className="block text-gray-300 hover:text-emerald-300 transition-colors text-sm py-2 px-3 rounded-lg hover:bg-white/10"
                        >
                          {h}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              {/* Main content */}
              <main className="flex-1 min-w-0">
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >{stripFirstH1(report.content)}</ReactMarkdown>
                </div>

                {/* Related Reports */}
                {related.length > 0 && (
                  <div className="mt-16">
                    <h2 className="text-2xl font-bold text-white mb-8">Related Reports</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {related.map(r => (
                        <a
                          key={r.id}
                          href={`/reports/${r.slug}`}
                          className="group block bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105 h-full"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="text-2xl">
                              {getReportTypeIcon(r.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2 line-clamp-2">
                                {r.title}
                              </h3>
                              <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                                {r.content.substring(0, 150)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                              {r.type}
                            </span>
                            <div className="text-xs text-gray-400">
                              {new Date(r.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-emerald-400 text-sm font-medium group-hover:text-emerald-300 transition-colors">
                              Read Report →
                            </span>
                            <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </section>
        
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Report",
              "name": report.title,
              "description": report.content.replace(/[#*`]/g, '').substring(0, 160) + '...',
              "datePublished": report.createdAt,
              "dateModified": report.updatedAt,
              "headline": report.title,
              "inLanguage": "en",
              "url": `https://otaanswers.com/reports/${report.slug}`,
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://otaanswers.com/reports/${report.slug}`
              },
              "publisher": {
                "@type": "Organization",
                "name": "OTA Answers",
                "url": "https://otaanswers.com"
              },
              "author": {
                "@type": "Organization",
                "name": "OTA Answers"
              },
              "keywords": [
                'airbnb ranking algorithm',
                'airbnb host tips',
                'airbnb optimization',
                'tour vendor analytics',
                'OTA insights'
              ].join(', '),
              "articleSection": "Analytics & Insights",
              "wordCount": report.content ? report.content.split(' ').length : 0
            })
          }}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading report:', error);
    notFound();
  }
} 