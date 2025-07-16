"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams } from "next/navigation";

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

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [report, setReport] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Fetching report for slug:', slug);
        const res = await fetch(`/api/reports/${slug}`);
        console.log('🔍 API response status:', res.status);
        
        const data = await res.json();
        console.log('🔍 API response data:', { title: data.title, contentLength: data.content?.length });
        
        if (res.ok) {
          setReport(data);
          // Fetch related reports
          const allRes = await fetch("/api/reports");
          const allData = await allRes.json();
          if (allRes.ok) {
            const related = allData.reports.filter((r: any) =>
              r.slug !== slug &&
              (r.platform === data.platform || r.type === data.type)
            ).slice(0, 3);
            setRelated(related);
          }
        } else {
          console.error('API Error:', data);
          setError(data.error || "Report not found");
        }
      } catch (err) {
        console.error('Fetch Error:', err);
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchReport();
  }, [slug]);

  // Enhanced SEO meta tags
  useEffect(() => {
    if (report) {
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

      document.title = `${report.title} | Analytics & Insights Reports | OTA Answers`;
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }

      // Keywords
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'keywords';
        meta.content = keywords;
        document.head.appendChild(meta);
      }

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', `https://otaanswers.com/reports/${report.slug}`);
      } else {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = `https://otaanswers.com/reports/${report.slug}`;
        document.head.appendChild(link);
      }

      // Open Graph
      const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', report.title);
      document.head.appendChild(ogTitle);
      
      const ogDesc = document.querySelector('meta[property="og:description"]') || document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      ogDesc.setAttribute('content', description);
      document.head.appendChild(ogDesc);
      
      const ogUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.setAttribute('content', `https://otaanswers.com/reports/${report.slug}`);
      document.head.appendChild(ogUrl);
      
      const ogType = document.querySelector('meta[property="og:type"]') || document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      ogType.setAttribute('content', 'article');
      document.head.appendChild(ogType);

      // Twitter
      const twTitle = document.querySelector('meta[name="twitter:title"]') || document.createElement('meta');
      twTitle.setAttribute('name', 'twitter:title');
      twTitle.setAttribute('content', report.title);
      document.head.appendChild(twTitle);
      
      const twDesc = document.querySelector('meta[name="twitter:description"]') || document.createElement('meta');
      twDesc.setAttribute('name', 'twitter:description');
      twDesc.setAttribute('content', description);
      document.head.appendChild(twDesc);
      
      const twCard = document.querySelector('meta[name="twitter:card"]') || document.createElement('meta');
      twCard.setAttribute('name', 'twitter:card');
      twCard.setAttribute('content', 'summary_large_image');
      document.head.appendChild(twCard);

      // Enhanced JSON-LD structured data
      const scriptId = 'report-jsonld';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (script) script.remove();
      script = document.createElement('script') as HTMLScriptElement;
      script.type = 'application/ld+json';
      script.id = scriptId;
      script.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Report",
        "name": report.title,
        "description": description,
        "datePublished": report.createdAt || new Date().toISOString(),
        "dateModified": report.updatedAt || new Date().toISOString(),
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
        "keywords": keywords,
        "articleSection": "Analytics & Insights",
        "wordCount": report.content ? report.content.split(' ').length : 0
      });
      document.head.appendChild(script);
    }
  }, [report]);

  const handleShare = () => {
    if (report) {
      const url = window.location.origin + `/reports/${report.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        setShareFeedback("Link copied!");
        setTimeout(() => setShareFeedback(""), 1500);
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    
    try {
      // Show loading state
      const downloadButton = document.querySelector('[title="Download full report as PDF"]') as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.textContent = '🔄 Generating PDF...';
        downloadButton.disabled = true;
      }

      // Call server-side PDF generation endpoint
      const response = await fetch(`/api/reports/${report.slug || report.id}/pdf`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);

      // Show success message
      setShareFeedback("PDF downloaded successfully!");
      setTimeout(() => setShareFeedback(""), 3000);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again or contact support.');
    } finally {
      // Restore button state
      const downloadButton = document.querySelector('[title="Download full report as PDF"]') as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.textContent = 'Download PDF';
        downloadButton.disabled = false;
      }
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto py-16 text-blue-700 text-xl">
      <div>Loading…</div>
      <div className="text-sm text-gray-500 mt-2">If this takes too long, please refresh the page.</div>
    </div>
  );
  if (error) return (
    <div className="max-w-3xl mx-auto py-16 text-red-600 text-xl">
      <div>{error}</div>
      <div className="text-sm text-gray-500 mt-2">Please try refreshing the page or contact support.</div>
    </div>
  );
  if (!report) return (
    <div className="max-w-3xl mx-auto py-16 text-red-600 text-xl">
      <div>Report not found</div>
      <div className="text-sm text-gray-500 mt-2">The requested report could not be loaded.</div>
    </div>
  );

  // Extract headings for sidebar navigation
  const headings = Array.from(report.content.matchAll(/^##?\s+(.+)$/gm))
    .map(m => (m as RegExpMatchArray)[1])
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
      <button className="mb-6 text-blue-700 hover:underline" onClick={() => router.push("/reports")}>← Back to Reports</button>
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
              onClick={handleShare}
              title="Copy link to this report"
            >
              Share
            </button>
            <button
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
              onClick={handleDownloadPDF}
              title="Download full report as PDF"
            >
              Download PDF
            </button>
            {shareFeedback && <span className="text-blue-700 ml-2 text-sm">{shareFeedback}</span>}
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
                    <div className="text-gray-600 text-sm line-clamp-2">{r.summary}</div>
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