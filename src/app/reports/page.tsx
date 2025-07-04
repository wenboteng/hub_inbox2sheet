"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface ReportMeta {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function TrustBox({ report }: { report: ReportMeta }) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
      <div className="font-semibold text-blue-800 mb-1">Why trust this report?</div>
      <ul className="text-sm text-blue-900 space-y-1">
        <li>🔍 <b>Data Source:</b> GetYourGuide, imported & cleaned by OTA Answers</li>
        <li>🛠️ <b>Methodology:</b> Automated parsing, deduplication, and regular updates</li>
        <li>📅 <b>Last Updated:</b> {new Date(report.updatedAt).toLocaleDateString()}</li>
        <li>🏢 <b>Publisher:</b> OTA Answers (independent analytics for tour vendors)</li>
      </ul>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportMeta | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-6 text-blue-900">📊 OTA Analytics & Insights Reports</h1>
      {/* Featured Report */}
      {reports.length > 0 && !selectedReport && (
        <div className="mb-8 p-6 bg-white border rounded shadow">
          <div className="text-lg font-semibold text-blue-800 mb-2">{reports[0].title}</div>
          <div className="text-gray-700 mb-2">Latest report, updated {new Date(reports[0].updatedAt).toLocaleDateString()}</div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => loadReport(reports[0])}
          >
            Read Full Report
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Report List */}
        <div className="md:w-1/3">
          <h2 className="text-lg font-semibold mb-4">All Reports</h2>
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  className={`w-full text-left px-4 py-2 rounded border ${selectedReport?.id === report.id ? "bg-blue-100 border-blue-400" : "bg-white border-gray-200 hover:bg-blue-50"}`}
                  onClick={() => loadReport(report)}
                  disabled={loading && selectedReport?.id === report.id}
                >
                  <div className="font-medium text-blue-900">{report.title}</div>
                  <div className="text-xs text-gray-500">Updated {new Date(report.updatedAt).toLocaleDateString()}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Report Detail */}
        <div className="md:w-2/3">
          {selectedReport ? (
            <div>
              <h2 className="text-2xl font-bold mb-2 text-blue-800">{selectedReport.title}</h2>
              <TrustBox report={selectedReport} />
              {loading ? (
                <div className="text-blue-600">Loading...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <div className="bg-white border rounded p-4 prose prose-blue max-w-none text-gray-900 max-h-[70vh] overflow-y-auto">
                  <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Select a report to view its content.</div>
          )}
        </div>
      </div>
    </div>
  );
} 