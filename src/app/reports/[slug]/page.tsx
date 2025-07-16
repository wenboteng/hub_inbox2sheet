import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const prisma = new PrismaClient();

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const report = await prisma.report.findFirst({
    where: { 
      slug: params.slug,
      isPublic: true 
    }
  });

  if (!report) {
    return {
      title: 'Report Not Found | OTA Answers',
      description: 'The requested report could not be found.'
    };
  }

  const description = report.content 
    ? report.content.replace(/[#*`]/g, '').substring(0, 160) + '...'
    : `Read the latest analytics and insights: ${report.title}`;

  return {
    title: `${report.title} | Analytics & Insights Reports | OTA Answers`,
    description,
    keywords: [
      'airbnb ranking algorithm',
      'airbnb host tips',
      'airbnb optimization',
      'airbnb search ranking',
      'airbnb superhost',
      'airbnb hosting guide',
      'tour vendor analytics',
      'OTA insights'
    ].join(', '),
    openGraph: {
      title: report.title,
      description,
      url: `https://otaanswers.com/reports/${report.slug}`,
      type: 'article',
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
}

const markdownComponents = {
  h1: (props: any) => <h1 id={slugify(props.children)} className="text-3xl font-bold mt-6 mb-4 text-blue-900 scroll-mt-24" {...props} />,
  h2: (props: any) => <h2 id={slugify(props.children)} className="text-2xl font-semibold mt-5 mb-3 text-blue-800 scroll-mt-24" {...props} />,
  h3: (props: any) => <h3 id={slugify(props.children)} className="text-xl font-semibold mt-4 mb-2 text-blue-700 scroll-mt-24" {...props} />,
  h4: (props: any) => <h4 className="text-lg font-semibold mt-3 mb-2 text-blue-600" {...props} />,
  ul: (props: any) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  p: (props: any) => <p className="mb-3 leading-relaxed" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-blue-900" {...props} />,
  em: (props: any) => <em className="italic text-blue-700" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-blue-700 bg-blue-50 py-2 my-3" {...props} />,
  code: (props: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-blue-800" {...props} />,
  pre: (props: any) => <pre className="bg-gray-900 text-white rounded p-3 overflow-x-auto my-3" {...props} />,
  table: (props: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-300 text-sm rounded-lg shadow-sm">
        {props.children}
      </table>
    </div>
  ),
  thead: (props: any) => <thead className="bg-blue-100 text-blue-900 sticky top-0 z-10" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-200" {...props} />,
  tr: (props: any) => <tr className="even:bg-gray-50 hover:bg-blue-50 transition" {...props} />,
  th: (props: any) => <th className="px-4 py-2 border-b border-gray-300 font-semibold text-left whitespace-nowrap" {...props} />,
  td: (props: any) => <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap" {...props} />,
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

// Server-side data fetching
async function getReport(slug: string) {
  try {
    const report = await prisma.report.findFirst({
      where: { 
        slug: slug,
        isPublic: true 
      }
    });

    if (!report) {
      return null;
    }

    // Get related reports
    const related = await prisma.report.findMany({
      where: { 
        isPublic: true,
        slug: { not: slug },
        OR: [
          { type: report.type },
          { title: { contains: report.type.split('-')[0] } }
        ]
      },
      take: 3,
      orderBy: { updatedAt: 'desc' }
    });

    return { report, related };
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
}

export default async function ReportDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  const data = await getReport(slug);
  
  if (!data) {
    notFound();
  }

  const { report, related } = data;

  // Derive platform from type or title
  let platform = '';
  const lower = (report.type + ' ' + report.title).toLowerCase();
  if (lower.includes('airbnb')) platform = 'Airbnb';
  else if (lower.includes('viator')) platform = 'Viator';
  else if (lower.includes('getyourguide') || lower.includes('gyg')) platform = 'GetYourGuide';
  else if (lower.includes('booking')) platform = 'Booking.com';
  else if (lower.includes('expedia')) platform = 'Expedia';
  else if (lower.includes('tripadvisor')) platform = 'Tripadvisor';
  else platform = 'Other';

  // Extract headings for sidebar navigation
  const headings = Array.from(report.content.matchAll(/^##?\s+(.+)$/gm))
    .map(m => (m as RegExpMatchArray)[1])
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
      <a href="/reports" className="mb-6 text-blue-700 hover:underline inline-block">← Back to Reports</a>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sticky sidebar for jump-to-section */}
        {headings.length > 0 && (
          <aside className="hidden md:block md:w-1/4 sticky top-24 self-start h-fit bg-white border rounded shadow-sm p-4">
            <div className="font-semibold text-blue-900 mb-2">Jump to Section</div>
            <ul className="space-y-2">
              {headings.map(h => (
                <li key={h}>
                  <a href={`#${slugify(h)}`} className="text-blue-700 hover:underline text-sm">{h}</a>
                </li>
              ))}
            </ul>
          </aside>
        )}
        {/* Main content */}
        <main className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2 text-blue-900">{report.title}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                }
              }}
              title="Copy link to this report"
            >
              Share
            </button>
            <a
              href={`/api/reports/${report.slug}/pdf`}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
              title="Download full report as PDF"
            >
              Download PDF
            </a>
          </div>
          {/* Only show date if valid */}
          {report.updatedAt && !isNaN(new Date(report.updatedAt).getTime()) && (
            <div className="text-xs text-gray-500 mb-4">Last updated: {new Date(report.updatedAt).toLocaleDateString()}</div>
          )}
          <div className="bg-white border rounded p-4 max-w-none text-gray-900 report-pdf-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >{stripFirstH1(report.content)}</ReactMarkdown>
          </div>
          {/* Related Reports */}
          {related.length > 0 && (
            <div className="mt-12">
              <div className="text-lg font-semibold mb-3 text-blue-800">Related Reports</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map(r => (
                  <a
                    key={r.id}
                    href={`/reports/${r.slug}`}
                    className="block bg-blue-50 border rounded-lg shadow hover:shadow-md transition p-4 h-full group"
                  >
                    <div className="font-semibold text-blue-900 group-hover:underline">{r.title}</div>
                    <div className="text-xs text-gray-500 mb-1">Last updated: {new Date(r.updatedAt).toLocaleDateString()}</div>
                    <div className="text-gray-600 text-sm line-clamp-2">{r.content.replace(/[#*`]/g, '').substring(0, 200)}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 