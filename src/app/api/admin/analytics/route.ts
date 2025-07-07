import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enrichReportWithGPT } from '@/utils/openai';
import prisma from '@/lib/prisma';
import { slugify } from '@/utils/slugify';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { reportType } = await request.json();
    
    let command: string;
    let reportName: string;
    
    switch (reportType) {
      case 'demo':
        command = 'npm run analytics:demo';
        reportName = 'Demo Analytics';
        break;
      case 'vendor':
        command = 'npm run analytics:vendor';
        reportName = 'Vendor Analytics Report';
        break;
      case 'customer':
        command = 'npm run analytics:customer';
        reportName = 'Customer Insights Report';
        break;
      case 'competitive':
        command = 'npm run analytics:competitive';
        reportName = 'Competitive Analysis Report';
        break;
      case 'all':
        command = 'npm run analytics:all';
        reportName = 'Complete Analytics Suite';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }
    
    console.log(`Generating ${reportName}...`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Analytics generation stderr:', stderr);
    }

    // Enrich the analytics report using OpenAI GPT-4o
    let enrichedReport = '';
    let shareSuggestions: string[] = [];
    try {
      const { enrichedContent, shareSuggestions: suggestions } = await enrichReportWithGPT(stdout, reportName);
      enrichedReport = enrichedContent;
      shareSuggestions = suggestions;
      
      // Save enriched report to the database
      await prisma.report.upsert({
        where: { type: reportType },
        update: {
          title: reportName,
          slug: slugify(reportName || reportType),
          content: enrichedReport,
        },
        create: {
          type: reportType,
          title: reportName,
          slug: slugify(reportName || reportType),
          content: enrichedReport,
        },
      });
    } catch (enrichErr) {
      console.error('OpenAI enrichment failed:', enrichErr);
      enrichedReport = 'Enrichment failed. Showing raw analytics output.';
    }

    return NextResponse.json({
      success: true,
      message: `${reportName} generated and enriched successfully!`,
      output: stdout,
      enrichedReport,
      shareSuggestions,
      reportType
    });
    
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return available analytics reports
    const reports = [
      {
        id: 'demo',
        name: 'Quick Demo',
        description: 'Quick overview of key insights',
        command: 'npm run analytics:demo'
      },
      {
        id: 'vendor',
        name: 'Vendor Analytics',
        description: 'Comprehensive market analysis and strategic insights',
        command: 'npm run analytics:vendor'
      },
      {
        id: 'customer',
        name: 'Customer Insights',
        description: 'Deep dive into customer behavior and pain points',
        command: 'npm run analytics:customer'
      },
      {
        id: 'competitive',
        name: 'Competitive Analysis',
        description: 'Competitive landscape and market positioning',
        command: 'npm run analytics:competitive'
      },
      {
        id: 'all',
        name: 'Complete Suite',
        description: 'All reports with executive summary',
        command: 'npm run analytics:all'
      }
    ];
    
    return NextResponse.json({ reports });
    
  } catch (error) {
    console.error('Error fetching analytics options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics options' },
      { status: 500 }
    );
  }
} 