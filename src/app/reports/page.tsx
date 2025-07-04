"use client";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportMeta {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

function TrustBox({ report }: { report: ReportMeta }) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
      <div className="font-semibold text-blue-800 mb-1">Why trust this report?</div>
      <ul className="text-sm text-blue-900 space-y-1">
        <li>🔍 <b>Where the data comes from:</b> We collect and combine information from top online travel agencies (OTAs) like GetYourGuide, Viator, and more.</li>
        <li>🤝 <b>How we create these insights:</b> Our team reviews and updates the data regularly to make sure it's accurate and useful for your business.</li>
        <li>🏢 <b>Who we are:</b> OTA Answers is an independent analytics provider focused on helping tour and activity operators grow.</li>
        <li>📅 <b>Last Updated:</b> {new Date(report.updatedAt).toLocaleDateString()}</li>
      </ul>
    </div>
  );
}

// Custom markdown renderers for better styling
const markdownComponents = {
  h1: (props: any) => <h1 className="text-3xl font-bold mt-6 mb-4 text-blue-900" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-blue-800" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-blue-700" {...props} />,
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

function extractFirstTableFromMarkdown(markdown: string): string[][] | null {
  // Simple regex-based parser for markdown tables
  const lines = markdown.split("\n");
  let tableStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|(.+)\|$/.test(lines[i]) && i + 1 < lines.length && /^\|[\s:-]+\|$/.test(lines[i + 1])) {
      tableStart = i;
      break;
    }
  }
  if (tableStart === -1) return null;
  const tableLines = [];
  for (let i = tableStart; i < lines.length; i++) {
    if (!/^\|(.+)\|$/.test(lines[i])) break;
    tableLines.push(lines[i]);
  }
  if (tableLines.length < 2) return null;
  // Parse rows
  return tableLines.map(line => line.slice(1, -1).split("|").map(cell => cell.trim()));
}

function tableToCSV(table: string[][]): string {
  return table.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(",")).join("\n");
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportMeta | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [downloadFeedback, setDownloadFeedback] = useState("");
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []));
  }, []);

  const loadReport = async (report: ReportMeta) => {
    setSelectedReport(report);
    setReportContent("");
    setError(null);
    setLoading(true);
    setSidebarOpen(false); // close sidebar on mobile
    try {
      const res = await fetch(`/api/reports/${report.id}`);
      const data = await res.json();
      if (res.ok) {
        setReportContent(data.content);
      } else {
        setError(data.error || "Failed to load report");
      }
    } catch (err) {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // SEO: Set meta tags and JSON-LD for the selected report
  useEffect(() => {
    if (selectedReport) {
      document.title = `${selectedReport.title} | Analytics & Insights Reports | OTA Answers`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Read the latest analytics and insights: ${selectedReport.title}`);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = `Read the latest analytics and insights: ${selectedReport.title}`;
        document.head.appendChild(meta);
      }
      // Add JSON-LD structured data
      const scriptId = 'report-jsonld';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (script) script.remove();
      script = document.createElement('script') as HTMLScriptElement;
      script.type = 'application/ld+json';
      script.id = scriptId;
      script.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Report",
        "name": selectedReport.title,
        "description": `Analytics and insights report: ${selectedReport.title}`,
        "datePublished": selectedReport.createdAt,
        "dateModified": selectedReport.updatedAt,
        "headline": selectedReport.title,
        "inLanguage": "en",
        "publisher": {
          "@type": "Organization",
          "name": "OTA Answers"
        }
      });
      document.head.appendChild(script);
    }
  }, [selectedReport]);

  // Breadcrumbs
  function Breadcrumbs() {
    return (
      <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
        <ol className="list-reset flex">
          <li><a href="/" className="hover:underline">Home</a></li>
          <li><span className="mx-2">/</span></li>
          <li><a href="/reports" className="hover:underline">Reports</a></li>
          {selectedReport && <><li><span className="mx-2">/</span></li><li className="text-blue-800 font-semibold">{selectedReport.title}</li></>}
        </ol>
      </nav>
    );
  }

  // Filtered reports by search and isPublic
  const filteredReports = reports.filter(r => r.isPublic && r.title.toLowerCase().includes(search.toLowerCase()));

  // Share button handler
  const handleShare = () => {
    if (selectedReport) {
      const url = window.location.origin + `/reports?report=${selectedReport.id}`;
      navigator.clipboard.writeText(url).then(() => {
        setShareFeedback("Link copied!");
        setTimeout(() => setShareFeedback(""), 1500);
      });
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (!selectedReport) return;
    setDownloadFeedback("Generating PDF...");
    // Find the main report content div
    const contentDiv = document.querySelector(".report-pdf-content");
    if (!contentDiv) {
      setDownloadFeedback("Could not find report content");
      setTimeout(() => setDownloadFeedback(""), 1500);
      return;
    }
    // Render the content to canvas
    const canvas = await html2canvas(contentDiv as HTMLElement, { scale: 2, backgroundColor: '#f8fbff' });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    // Add logo
    const logoImg = new Image();
    logoImg.src = "/logo.svg";
    await new Promise((resolve) => { logoImg.onload = resolve; });
    pdf.addImage(logoImg, "SVG", 40, 30, 60, 60);
    // Add website and tagline
    pdf.setFontSize(18);
    pdf.setTextColor("#1e3a8a");
    pdf.text("OTA Answers", 110, 55);
    pdf.setFontSize(12);
    pdf.setTextColor("#2563eb");
    pdf.text("Independent Analytics for Tour & Activity Vendors", 110, 75);
    pdf.setFontSize(10);
    pdf.setTextColor("#2563eb");
    pdf.text("www.otaanswers.com", 110, 95);
    // Add trust message
    pdf.setFontSize(12);
    pdf.setTextColor("#1e3a8a");
    pdf.text("Why trust this report?", 40, 120);
    pdf.setFontSize(10);
    pdf.setTextColor("#1e40af");
    pdf.text("- Where the data comes from: We collect and combine information from top online travel agencies (OTAs) like GetYourGuide, Viator, and more.", 40, 140, { maxWidth: 500 });
    pdf.text("- How we create these insights: Our team reviews and updates the data regularly to make sure it's accurate and useful for your business.", 40, 160, { maxWidth: 500 });
    pdf.text("- Who we are: OTA Answers is an independent analytics provider focused on helping tour and activity operators grow.", 40, 180, { maxWidth: 500 });
    // Add the report image (below trust message)
    pdf.addImage(imgData, "PNG", 40, 200, 515, 0);
    pdf.save(`${selectedReport.title.replace(/[^a-z0-9]/gi, "_") || "report"}.pdf`);
    setDownloadFeedback("PDF downloaded!");
    setTimeout(() => setDownloadFeedback(""), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-8">
      <h1 className="text-4xl font-bold mb-4 text-blue-900">📊 OTA Analytics & Insights Reports</h1>
      <Breadcrumbs />
      <div className="flex gap-6">
        {/* Sticky Sidebar */}
        <aside className="hidden md:block md:w-1/4 lg:w-1/5 sticky top-8 self-start h-fit bg-white border rounded shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">All Reports</h2>
          <input
            type="text"
            placeholder="Search reports..."
            className="w-full border rounded px-3 py-2 mb-3 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <ul className="space-y-2">
            {filteredReports.map((report) => (
              <li key={report.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${selectedReport?.id === report.id ? "bg-blue-100 border-blue-400 font-bold" : "bg-white border-gray-200 hover:bg-blue-50"}`}
                  onClick={() => loadReport(report)}
                  disabled={loading && selectedReport?.id === report.id}
                >
                  <div className="font-medium text-blue-900 truncate">{report.title}</div>
                  <div className="text-xs text-gray-500">Updated {new Date(report.updatedAt).toLocaleDateString()}</div>
                </button>
              </li>
            ))}
            {filteredReports.length === 0 && <li className="text-gray-400 text-sm">No reports found.</li>}
          </ul>
        </aside>
        {/* Mobile Sidebar Toggle */}
        <button className="md:hidden fixed top-4 left-4 z-20 bg-blue-600 text-white px-3 py-2 rounded shadow" onClick={() => setSidebarOpen(true)} aria-label="Open report navigation">
          ☰ Reports
        </button>
        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black bg-opacity-30 flex">
            <aside className="w-3/4 max-w-xs bg-white h-full p-4 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">All Reports</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-2xl font-bold">×</button>
              </div>
              <input
                type="text"
                placeholder="Search reports..."
                className="w-full border rounded px-3 py-2 mb-3 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <ul className="space-y-2">
                {filteredReports.map((report) => (
                  <li key={report.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded border transition-colors ${selectedReport?.id === report.id ? "bg-blue-100 border-blue-400 font-bold" : "bg-white border-gray-200 hover:bg-blue-50"}`}
                      onClick={() => loadReport(report)}
                      disabled={loading && selectedReport?.id === report.id}
                    >
                      <div className="font-medium text-blue-900 truncate">{report.title}</div>
                      <div className="text-xs text-gray-500">Updated {new Date(report.updatedAt).toLocaleDateString()}</div>
                    </button>
                  </li>
                ))}
                {filteredReports.length === 0 && <li className="text-gray-400 text-sm">No reports found.</li>}
              </ul>
            </aside>
            <div className="flex-1" onClick={() => setSidebarOpen(false)} />
          </div>
        )}
        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {selectedReport ? (
            <div>
              <h2 className="text-2xl font-bold mb-2 text-blue-800">{selectedReport.title}</h2>
              <div className="flex flex-wrap gap-2 mb-2">
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
                <a ref={downloadRef} style={{ display: "none" }} />
                {shareFeedback && <span className="text-blue-700 ml-2 text-sm">{shareFeedback}</span>}
                {downloadFeedback && <span className="text-green-700 ml-2 text-sm">{downloadFeedback}</span>}
              </div>
              <TrustBox report={selectedReport} />
              {loading ? (
                <div className="text-blue-600">Loading...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <div className="bg-white border rounded p-4 max-w-none text-gray-900 max-h-[70vh] overflow-y-auto report-pdf-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >{reportContent}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-lg mt-12 text-center">Select a report from the left to view its content.</div>
          )}
        </main>
      </div>
    </div>
  );
} 