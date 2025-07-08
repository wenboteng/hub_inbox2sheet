#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("../src/utils/puppeteer");
async function testPdfGeneration() {
    console.log('🧪 Testing PDF Generation');
    console.log('==========================');
    try {
        console.log('📦 Creating browser with proper Chrome installation...');
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('🌐 Creating test page...');
        const page = await browser.newPage();
        console.log('📄 Setting test content...');
        const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test PDF Generation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1 {
              color: #1a365d;
              border-bottom: 3px solid #3182ce;
              padding-bottom: 10px;
            }
            .test-content {
              background-color: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>Test PDF Generation</h1>
          <div class="test-content">
            <p>This is a test document to verify that PDF generation is working correctly.</p>
            <p>The browser should be able to render this content and generate a PDF.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
        await page.setContent(testHtml);
        console.log('📄 Setting viewport...');
        await page.setViewport({ width: 1200, height: 800 });
        console.log('🖨️ Generating PDF...');
        const pdf = await page.pdf({
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            printBackground: true,
            displayHeaderFooter: false
        });
        console.log('💾 Saving PDF to test-output.pdf...');
        const fs = require('fs');
        fs.writeFileSync('test-output.pdf', pdf);
        console.log('🧹 Cleaning up...');
        await page.close();
        await browser.close();
        console.log('');
        console.log('✅ PDF Generation Test PASSED!');
        console.log('📄 PDF saved as: test-output.pdf');
        console.log('📊 PDF size:', pdf.length, 'bytes');
        console.log('');
        console.log('🎉 The PDF generation should now work correctly in production!');
        process.exit(0);
    }
    catch (error) {
        console.error('');
        console.error('❌ PDF Generation Test FAILED!');
        console.error('Error:', error);
        console.error('');
        console.error('🔍 This indicates the Chrome installation fix needs more work');
        process.exit(1);
    }
}
testPdfGeneration()
    .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-pdf-generation.js.map