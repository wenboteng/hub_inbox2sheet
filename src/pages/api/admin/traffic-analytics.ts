import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join(process.cwd(), 'google-analytics-report.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(REPORT_PATH, 'utf-8');
      const report = JSON.parse(data);
      // Serve only the relevant fields for the dashboard
      res.status(200).json({
        trafficOverview: report.analyticsData?.overview || {},
        topPages: report.analyticsData?.topPages || [],
        trafficSources: report.analyticsData?.trafficSources || [],
        conversions: report.analyticsData?.conversions || {},
        intelligentInsights: report.intelligentInsights || report.intelligentInsights || [],
      });
    } catch (e) {
      res.status(404).json({ error: 'Analytics report not found.' });
    }
  } else if (req.method === 'POST') {
    // Simulate a refresh (in production, trigger the analytics script)
    try {
      const data = fs.readFileSync(REPORT_PATH, 'utf-8');
      const report = JSON.parse(data);
      res.status(200).json({
        trafficOverview: report.analyticsData?.overview || {},
        topPages: report.analyticsData?.topPages || [],
        trafficSources: report.analyticsData?.trafficSources || [],
        conversions: report.analyticsData?.conversions || {},
        intelligentInsights: report.intelligentInsights || report.intelligentInsights || [],
      });
    } catch (e) {
      res.status(404).json({ error: 'Analytics report not found.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 