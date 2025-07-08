"use client";
import { useEffect, useState } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function AdminTrafficPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/traffic-analytics")
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!analytics) return <div className="text-center py-8">No analytics data found.</div>;

  // Prepare chart data
  const trafficOverview = analytics.trafficOverview || {};
  const topPages = analytics.topPages || [];
  const trafficSources = analytics.trafficSources || [];
  const conversions = analytics.conversions || {};
  const insights = analytics.intelligentInsights || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">📈 Traffic & Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Traffic Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Traffic Overview</h2>
          <ul className="space-y-2 text-lg">
            <li>👥 <b>Total Users:</b> {trafficOverview.totalUsers?.toLocaleString()}</li>
            <li>🆕 <b>New Users:</b> {trafficOverview.newUsers?.toLocaleString()}</li>
            <li>🔄 <b>Sessions:</b> {trafficOverview.sessions?.toLocaleString()}</li>
            <li>📄 <b>Page Views:</b> {trafficOverview.pageViews?.toLocaleString()}</li>
            <li>⏱️ <b>Avg Session Duration:</b> {Math.floor((trafficOverview.avgSessionDuration || 0) / 60)}m {(trafficOverview.avgSessionDuration || 0) % 60}s</li>
            <li>📉 <b>Bounce Rate:</b> {(trafficOverview.bounceRate * 100).toFixed(1)}%</li>
            <li>🎯 <b>Conversion Rate:</b> {(trafficOverview.conversionRate * 100).toFixed(2)}%</li>
          </ul>
        </div>
        {/* Top Pages Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Pages</h2>
          <Bar
            data={{
              labels: topPages.map((p: any) => p.pagePath),
              datasets: [
                {
                  label: "Page Views",
                  data: topPages.map((p: any) => p.pageViews),
                  backgroundColor: "#3b82f6",
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Traffic Sources Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Traffic Sources</h2>
          <Pie
            data={{
              labels: trafficSources.map((s: any) => `${s.source} (${s.medium})`),
              datasets: [
                {
                  label: "Sessions",
                  data: trafficSources.map((s: any) => s.sessions),
                  backgroundColor: [
                    "#3b82f6",
                    "#10b981",
                    "#f59e42",
                    "#ef4444",
                    "#6366f1",
                  ],
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { position: "bottom" } },
            }}
          />
        </div>
        {/* Conversion Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Conversion Analysis</h2>
          <ul className="space-y-2 text-lg">
            <li><b>Total Conversions:</b> {conversions.total}</li>
            {conversions.byGoal?.map((goal: any) => (
              <li key={goal.goal}>
                <b>{goal.goal.replace(/_/g, ' ')}:</b> {goal.conversions} conversions
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Intelligent Insights */}
      <div className="bg-blue-50 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">🧠 Intelligent Insights & Recommendations</h2>
        <ul className="list-disc pl-6 space-y-2 text-blue-900">
          {insights.map((insight: string, idx: number) => (
            <li key={idx}>{insight}</li>
          ))}
        </ul>
      </div>
      {/* Trigger Analytics Fetch */}
      <div className="mt-8 flex justify-end">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/admin/traffic-analytics", { method: "POST" });
              const data = await res.json();
              setAnalytics(data);
            } catch (e) {
              setError("Failed to refresh analytics");
            } finally {
              setLoading(false);
            }
          }}
        >
          🔄 Refresh Analytics
        </button>
      </div>
    </div>
  );
} 