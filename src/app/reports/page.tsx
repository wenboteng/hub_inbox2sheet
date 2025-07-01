"use client";
import { useEffect, useState } from "react";

interface ReportMeta {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-blue-900">📊 Analytics & Insights Reports</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
          <ul className="space-y-2">
            {reports.length === 0 && <li className="text-gray-500">No reports available yet.</li>}
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  className={`w-full text-left px-4 py-2 rounded border ${selectedReport?.id === report.id ? "bg-blue-100 border-blue-400" : "bg-white border-gray-200 hover:bg-blue-50"}`}
                  onClick={() => loadReport(report)}
                  disabled={loading && selectedReport?.id === report.id}
                >
                  <span className="font-medium text-blue-900">{report.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:w-2/3">
          {selectedReport ? (
            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-800">{selectedReport.title}</h3>
              {loading ? (
                <div className="text-blue-600">Loading...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <div className="bg-white border rounded p-4 whitespace-pre-wrap text-sm text-gray-900 max-h-[70vh] overflow-y-auto">
                  {reportContent}
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