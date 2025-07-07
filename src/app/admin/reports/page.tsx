"use client";
import { useState, useEffect } from 'react';

interface Report {
  id: string;
  type: string;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  summary?: string;
  platform?: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();
      if (response.ok) {
        setReports(data.reports || []);
      } else {
        setMessage({
          type: 'error',
          text: `Failed to fetch reports: ${data.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleReportVisibility = async (reportId: string, currentStatus: boolean) => {
    setUpdating(reportId);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/reports/toggle-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reportId, 
          isPublic: !currentStatus 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Report ${!currentStatus ? 'made public' : 'made private'} successfully`
        });
        // Update the local state
        setReports(reports.map(report => 
          report.id === reportId 
            ? { ...report, isPublic: !currentStatus }
            : report
        ));
      } else {
        setMessage({
          type: 'error',
          text: `Failed to update report: ${data.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error occurred'
      });
    } finally {
      setUpdating(null);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'public') return report.isPublic;
    if (filter === 'private') return !report.isPublic;
    return true;
  });

  if (loading) {
    return (
      <div className="text-center text-blue-700 text-xl">Loading reports...</div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          📊 All Reports Management
        </h1>
        <p className="text-gray-600 mb-6">
          Manage all reports - toggle visibility between public and private.
        </p>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'public' | 'private')}
            className="border rounded px-3 py-2 text-base"
          >
            <option value="all">All Reports ({reports.length})</option>
            <option value="public">Public Reports ({reports.filter(r => r.isPublic).length})</option>
            <option value="private">Private Reports ({reports.filter(r => !r.isPublic).length})</option>
          </select>
          <button
            onClick={fetchAllReports}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Reports ({filteredReports.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <div key={report.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.isPublic 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {report.isPublic ? '🌐 Public' : '🔒 Private'}
                    </span>
                    <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Type: {report.type}</span>
                    <span>Slug: {report.slug}</span>
                    <span>Platform: {report.platform || 'N/A'}</span>
                    <span>Updated: {new Date(report.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {report.summary && (
                    <div className="text-gray-600 text-sm mt-2 line-clamp-2">
                      {report.summary}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <a
                    href={`/reports/${report.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    👁️ View
                  </a>
                  <button
                    onClick={() => toggleReportVisibility(report.id, report.isPublic)}
                    disabled={updating === report.id}
                    className={`px-3 py-1 rounded text-sm ${
                      report.isPublic
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updating === report.id 
                      ? '🔄 Updating...' 
                      : report.isPublic 
                        ? '🔒 Make Private' 
                        : '🌐 Make Public'
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No reports found matching the current filter.
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          📋 Report Management Guide
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li>🌐 <strong>Public Reports:</strong> Visible to tour vendors on the public reports page</li>
          <li>🔒 <strong>Private Reports:</strong> Internal reports only visible to admins</li>
          <li>👁️ <strong>View:</strong> Opens the report in a new tab to preview</li>
          <li>🔄 <strong>Toggle:</strong> Switch between public and private visibility</li>
        </ul>
      </div>
    </div>
  );
} 