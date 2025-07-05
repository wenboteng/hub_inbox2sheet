"use client";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportMeta {
  id: string;
  type: string;
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  summary: string;
  platform: string;
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
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []));
  }, []);

  // Unique platforms and types for filters
  const platforms = Array.from(new Set(reports.map(r => r.platform))).filter(p => p && p !== "Other");
  const types = Array.from(new Set(reports.map(r => r.type)));

  // Filtered reports
  const filteredReports = reports.filter(r =>
    r.isPublic &&
    (platformFilter === "all" || r.platform === platformFilter) &&
    (typeFilter === "all" || r.type === typeFilter) &&
    (r.title.toLowerCase().includes(search.toLowerCase()) || r.summary.toLowerCase().includes(search.toLowerCase()))
  );

  // Platform icon map
  const platformIcons: Record<string, string> = {
    Airbnb: "/logo.svg", // Replace with actual icons
    Viator: "/globe.svg",
    GetYourGuide: "/globe.svg",
    "Booking.com": "/globe.svg",
    Expedia: "/globe.svg",
    Tripadvisor: "/globe.svg",
    Other: "/globe.svg",
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-blue-900">📊 OTA Analytics & Insights Reports</h1>
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search reports, e.g., Airbnb ranking, pricing by city…"
          className="w-full md:w-1/2 border rounded px-4 py-2 text-lg shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 text-base"
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
        >
          <option value="all">All Platforms</option>
          {platforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          className="border rounded px-3 py-2 text-base"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Report Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <a
            key={report.id}
            href={`/reports/${report.slug}`}
            className="block bg-white border rounded-lg shadow hover:shadow-lg transition p-6 h-full group"
          >
            <div className="flex items-center gap-3 mb-2">
              <img src={platformIcons[report.platform] || "/globe.svg"} alt={report.platform} className="w-8 h-8" />
              <span className="text-lg font-semibold text-blue-900 group-hover:underline">{report.title}</span>
            </div>
            <div className="text-gray-600 text-sm mb-2 line-clamp-3">{report.summary}</div>
            <div className="flex justify-between items-end mt-4">
              <span className="text-xs text-gray-400">Last updated: {new Date(report.updatedAt).toLocaleDateString()}</span>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{report.platform}</span>
            </div>
          </a>
        ))}
        {filteredReports.length === 0 && (
          <div className="col-span-full text-gray-400 text-center text-lg py-12">No reports found.</div>
        )}
      </div>
    </div>
  );
} 