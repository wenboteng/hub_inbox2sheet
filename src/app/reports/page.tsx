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
    <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 p-6 mb-6 rounded-xl">
      <div className="font-semibold text-blue-300 mb-3">Why trust this report?</div>
      <ul className="text-sm text-blue-200 space-y-2">
        <li>🔍 <b>Where the data comes from:</b> We analyze publicly available information from top online travel agencies (OTAs) like GetYourGuide, Viator, and more.</li>
        <li>🤝 <b>How we create these insights:</b> Our team monitors changes and updates our insights regularly to keep you ahead of the competition.</li>
        <li>🏢 <b>Who we are:</b> OTA Answers is an independent analytics provider focused on helping tour and activity operators grow.</li>
        <li>📅 <b>Last Updated:</b> {new Date(report.updatedAt).toLocaleDateString()}</li>
      </ul>
    </div>
  );
}

// Custom markdown renderers for better styling
const markdownComponents = {
  h1: (props: any) => <h1 className="text-3xl font-bold mt-6 mb-4 text-white" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-emerald-300" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-blue-300" {...props} />,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching reports:", error);
        setIsLoading(false);
      });
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

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'Airbnb': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Viator': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'GetYourGuide': 'bg-green-500/20 text-green-400 border-green-500/30',
      'TripAdvisor': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Booking.com': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Reddit': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'StackOverflow': 'bg-red-500/20 text-red-400 border-red-500/30',
      'google': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[platform] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-6">
            📊 Analytics & Insights Reports
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
            Data-driven intelligence reports to help tour vendors optimize their business strategies and stay ahead of the competition
          </p>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Search reports, e.g., Airbnb ranking, pricing by city…"
                  className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all outline-none"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <select
                className="px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all outline-none min-w-[200px]"
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
              >
                <option value="all" className="bg-gray-800">All Platforms</option>
                {platforms.map(p => <option key={p} value={p} className="bg-gray-800">{p}</option>)}
              </select>
              <select
                className="px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all outline-none min-w-[200px]"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all" className="bg-gray-800">All Report Types</option>
                {types.map(t => <option key={t} value={t} className="bg-gray-800">{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent align-[-0.125em]" />
              <p className="mt-4 text-lg text-gray-300">Loading intelligence reports...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredReports.map(report => (
                <a
                  key={report.id}
                  href={`/reports/${report.slug}`}
                  className="group block bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 hover:bg-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105 h-full"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors mb-2 line-clamp-2">
                        {report.title}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                        {report.summary}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPlatformColor(report.platform)}`}>
                        {report.platform}
                      </span>
                      <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                        {report.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        Updated {new Date(report.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-emerald-400 text-sm font-medium group-hover:text-emerald-300 transition-colors">
                      Read Report →
                    </span>
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
              
              {filteredReports.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-20">
                  <div className="text-gray-400 text-6xl mb-4">📊</div>
                  <h3 className="text-xl text-gray-300 mb-2">No reports found</h3>
                  <p className="text-gray-400 mb-6">Try adjusting your search terms or filters</p>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 max-w-md mx-auto">
                    <h4 className="text-lg font-semibold text-white mb-3">Available Report Types:</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                      <li>• Pricing Intelligence & Market Analysis</li>
                      <li>• Cancellation Reasons & Prevention Strategies</li>
                      <li>• Platform-Specific Insights (Airbnb, Viator, GetYourGuide)</li>
                      <li>• Seasonal Demand & Revenue Optimization</li>
                      <li>• Digital Transformation & Technology Trends</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Stats Section */}
          {filteredReports.length > 0 && (
            <div className="mt-16 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Report Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{filteredReports.length}</div>
                  <div className="text-gray-400">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{platforms.length}</div>
                  <div className="text-gray-400">Platforms Covered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">{types.length}</div>
                  <div className="text-gray-400">Report Types</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {Math.max(...filteredReports.map(r => new Date(r.updatedAt).getTime())) > 0 
                      ? new Date(Math.max(...filteredReports.map(r => new Date(r.updatedAt).getTime()))).toLocaleDateString()
                      : 'N/A'
                    }
                  </div>
                  <div className="text-gray-400">Last Updated</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
} 