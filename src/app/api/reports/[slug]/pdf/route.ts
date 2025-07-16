import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Find the report by slug
    const report = await prisma.report.findFirst({
      where: { 
        slug: slug,
        isPublic: true 
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content with proper styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${report.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1 {
              color: #1e40af;
              font-size: 2.5rem;
              margin-bottom: 1rem;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 0.5rem;
            }
            h2 {
              color: #1e3a8a;
              font-size: 1.8rem;
              margin-top: 2rem;
              margin-bottom: 1rem;
            }
            h3 {
              color: #1e3a8a;
              font-size: 1.4rem;
              margin-top: 1.5rem;
              margin-bottom: 0.5rem;
            }
            p {
              margin-bottom: 1rem;
            }
            ul, ol {
              margin-bottom: 1rem;
              padding-left: 2rem;
            }
            li {
              margin-bottom: 0.5rem;
            }
            strong {
              font-weight: 600;
              color: #1e40af;
            }
            em {
              font-style: italic;
              color: #1e3a8a;
            }
            blockquote {
              border-left: 4px solid #3b82f6;
              padding-left: 1rem;
              margin: 1.5rem 0;
              font-style: italic;
              background-color: #f8fafc;
              padding: 1rem;
            }
            code {
              background-color: #f1f5f9;
              padding: 0.2rem 0.4rem;
              border-radius: 0.25rem;
              font-family: 'Courier New', monospace;
              font-size: 0.9rem;
            }
            pre {
              background-color: #1e293b;
              color: white;
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x: auto;
              margin: 1rem 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 0.5rem;
              text-align: left;
            }
            th {
              background-color: #e5e7eb;
              font-weight: 600;
            }
            .header {
              text-align: center;
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 2px solid #e5e7eb;
            }
            .footer {
              margin-top: 3rem;
              padding-top: 1rem;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 0.9rem;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .header, .footer { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${report.title}</h1>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Source:</strong> OTA Answers Analytics Platform</p>
          </div>
          
          <div class="content">
            ${report.content.replace(/^# .+\n?/, '')}
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} OTA Answers. All rights reserved.</p>
            <p>For more insights, visit: https://otaanswers.com</p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      },
      printBackground: true
    });

    await browser.close();

    // Return PDF with proper headers
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 