import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createBrowser } from '@/utils/puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

// Helper to sanitize headings and remove invisible/unsupported characters
function sanitizeHeadings(markdown: string): string {
  // Remove all non-printable/control Unicode chars at start of lines and before headings
  return markdown
    .replace(/^[^\w#\-\*\d]*#+\s*/gm, match => match.replace(/^[^#]+/, '')) // Remove any non-heading chars before #
    .replace(/^(#+)\s*[\u200B\u00A0\uFEFF\uFFFD\u202A-\u202E\u2060-\u206F\u0000-\u001F]?/gm, '$1 ')
    .replace(/^[\u200B\u00A0\uFEFF\uFFFD\u202A-\u202E\u2060-\u206F\u0000-\u001F]+/gm, '');
}

// Helper to get SVG as data URI
function getLogoDataUri() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.svg');
  const svg = fs.readFileSync(logoPath, 'utf8');
  // Remove newlines and quotes for embedding
  const svgClean = svg.replace(/\r?\n|\r/g, '').replace(/"/g, "'");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgClean)}`;
}

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params;
    
    // Find the report
    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { id: filename },
          { type: filename },
          { slug: filename },
        ],
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Sanitize headings in Markdown
    const cleanMarkdown = sanitizeHeadings(report.content || '');
    // Convert Markdown to HTML
    const reportHtml = marked.parse(cleanMarkdown);

    // Branding
    const logoDataUri = getLogoDataUri();
    const website = 'www.otaanswers.com';
    const slogan = 'Built to Help Tour Vendors Succeed';
    const brandName = 'OTAanswers';

    // PDF HTML template with branding and improved layout
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${brandName} Report</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #222;
              margin: 0;
              padding: 0 0 60px 0;
              background: #fff;
            }
            .pdf-header {
              display: flex;
              align-items: center;
              border-bottom: 2px solid #eaeaea;
              padding: 24px 40px 16px 40px;
              background: #f8fafc;
            }
            .pdf-header-logo {
              height: 48px;
              width: 48px;
              margin-right: 24px;
              display: block;
            }
            .pdf-header-brand {
              font-size: 2.1rem;
              font-weight: 700;
              letter-spacing: 1px;
              color: #0a2540;
            }
            .pdf-header-meta {
              margin-left: auto;
              text-align: right;
            }
            .pdf-header-slogan {
              font-size: 1.1rem;
              color: #3b82f6;
              font-weight: 500;
              margin-top: 2px;
            }
            .pdf-content {
              padding: 32px 40px 100px 40px; /* extra bottom padding for footer */
              max-width: 900px;
              margin: 0 auto;
              box-sizing: border-box;
              /* Avoid page break inside content blocks */
              page-break-inside: auto;
            }
            .pdf-content > * {
              page-break-inside: avoid;
            }
            @media print {
              .pdf-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
              }
              .pdf-content {
                padding-bottom: 120px;
              }
            }
            h1, h2, h3, h4, h5, h6 {
              color: #0a2540;
              margin-top: 2.2em;
              margin-bottom: 0.7em;
              font-weight: 700;
              line-height: 1.2;
            }
            h1 { font-size: 2.2rem; }
            h2 { font-size: 1.6rem; }
            h3 { font-size: 1.2rem; }
            h4, h5, h6 { font-size: 1rem; }
            p, ul, ol, table {
              font-size: 1.05rem;
              line-height: 1.7;
              margin-bottom: 1.1em;
            }
            ul, ol {
              padding-left: 2em;
            }
            li {
              margin-bottom: 0.3em;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1.5em 0;
              background: #f9fafb;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background: #e5e7eb;
              font-weight: 600;
            }
            code, pre {
              font-family: 'Fira Mono', 'Consolas', monospace;
              background: #f3f4f6;
              border-radius: 4px;
              padding: 2px 6px;
              font-size: 0.98em;
            }
            .pdf-footer {
              position: fixed;
              left: 0; right: 0; bottom: 0;
              width: 100%;
              background: #f8fafc;
              border-top: 1.5px solid #e5e7eb;
              color: #64748b;
              font-size: 1rem;
              text-align: center;
              padding: 12px 0 10px 0;
              z-index: 100;
            }
            .pdf-footer a {
              color: #3b82f6;
              text-decoration: none;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <img src="${logoDataUri}" class="pdf-header-logo" alt="${brandName} logo" />
            <div>
              <div class="pdf-header-brand">${brandName}</div>
              <div class="pdf-header-slogan">${slogan}</div>
            </div>
            <div class="pdf-header-meta">
              <div><a href="https://${website}">${website}</a></div>
            </div>
          </div>
          <div class="pdf-content">
            ${reportHtml}
          </div>
          <div class="pdf-footer">
            <span>${brandName} &mdash; <a href="https://${website}">${website}</a> &mdash; ${slogan}</span>
          </div>
        </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await createBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '40px', bottom: '60px', left: '32px', right: '32px' },
      displayHeaderFooter: false,
    });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${brandName}-report.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed', details: String(error) }, { status: 500 });
  }
} 