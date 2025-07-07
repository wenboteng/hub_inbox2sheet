"use client";
import { useState, useEffect } from 'react';

interface Report {
  id: string;
  type: string;
  title: string;
  slug: string;
  updatedAt: string;
  isPublic: boolean;
}

export default function EnrichReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichReport = async (reportId: string, reportType: string) => {
    setEnriching(reportId);
    setMessage(null);

    try {
      const response = await fetch('/api/reports/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId, reportType }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${data.message} Share suggestions: ${data.shareSuggestions?.length || 0}`
        });
        // Refresh reports list
        fetchReports();
      } else {
        setMessage({
          type: 'error',
          text: `❌ ${data.error || 'Failed to enrich report'}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Network error occurred'
      });
    } finally {
      setEnriching(null);
    }
  };

  const enrichAllReports = async () => {
    setEnriching('all');
    setMessage(null);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const report of reports) {
        try {
          const response = await fetch('/api/reports/enrich', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reportId: report.id, reportType: report.type }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      setMessage({
        type: successCount > 0 ? 'success' : 'error',
        text: `✅ ${successCount} reports enriched successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });

      // Refresh reports list
      fetchReports();
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Error enriching all reports'
      });
    } finally {
      setEnriching(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-blue-700 text-xl">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          🎯 GPT-4o Report Enrichment
        </h1>
        <p className="text-gray-600 mb-6">
          Enhance your reports with GPT-4o to make them more engaging, emotionally resonant, and actionable.
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
          <button
            onClick={enrichAllReports}
            disabled={enriching === 'all'}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enriching === 'all' ? '🔄 Enriching All...' : '🚀 Enrich All Reports'}
          </button>
          <button
            onClick={fetchReports}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh List
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Available Reports ({reports.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {reports.map((report) => (
            <div key={report.id} className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Type: {report.type}</span>
                  <span>Slug: {report.slug}</span>
                  <span>Public: {report.isPublic ? 'Yes' : 'No'}</span>
                  <span>Updated: {new Date(report.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <button
                onClick={() => enrichReport(report.id, report.type)}
                disabled={enriching === report.id}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enriching === report.id ? '🔄 Enriching...' : '✨ Enrich'}
              </button>
            </div>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No reports found. Create some reports first!
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          🎯 What GPT-4o Enrichment Does
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li>✅ <strong>Emotional Framing:</strong> Rewrites titles and introductions to be more engaging and curiosity-driven</li>
          <li>✅ <strong>Summary Boxes:</strong> Adds "What This Means for You" sections with actionable insights</li>
          <li>✅ <strong>Share Suggestions:</strong> Generates tweet-style quotes for social media sharing</li>
          <li>✅ <strong>Enhanced Readability:</strong> Makes reports more conversational and motivating</li>
        </ul>
      </div>
    </div>
  );
} 