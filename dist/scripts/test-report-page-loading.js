"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
async function testReportPageLoading() {
    console.log('🔍 TESTING REPORT PAGE LOADING');
    console.log('================================\n');
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        // Enable console logging
        page.on('console', msg => {
            console.log('📱 Console:', msg.text());
        });
        page.on('pageerror', error => {
            console.log('❌ Page Error:', error.message);
        });
        // Navigate to the report page
        const url = 'https://otaanswers.com/reports/airbnb-ranking-algorithm-complete-guide-for-hosts-2025';
        console.log(`🌐 Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait a bit for JavaScript to execute
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Check if content loaded
        const loadingElement = await page.$('div:contains("Loading…")').catch(() => null);
        const contentElement = await page.$('h1:contains("Airbnb Ranking Algorithm")').catch(() => null);
        if (loadingElement) {
            console.log('❌ Page still showing loading state');
        }
        else if (contentElement) {
            console.log('✅ Page loaded successfully with content');
        }
        else {
            console.log('⚠️  Page loaded but content state unclear');
        }
        // Check for any error messages
        const errorElement = await page.$('div:contains("error")').catch(() => null);
        if (errorElement) {
            const errorText = await errorElement.evaluate(el => el.textContent);
            console.log('❌ Error found:', errorText);
        }
        // Check page title
        const title = await page.title();
        console.log('📄 Page title:', title);
        // Check for meta tags
        const metaDescription = await page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => null);
        console.log('📝 Meta description:', metaDescription);
        // Check for noindex
        const robotsMeta = await page.$eval('meta[name="robots"]', el => el.getAttribute('content')).catch(() => null);
        if (robotsMeta && robotsMeta.includes('noindex')) {
            console.log('❌ Page has noindex meta tag');
        }
        else {
            console.log('✅ Page is indexable');
        }
        // Take a screenshot for debugging
        await page.screenshot({ path: 'report-page-test.png', fullPage: true });
        console.log('📸 Screenshot saved as report-page-test.png');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        await browser.close();
    }
}
testReportPageLoading().catch(console.error);
//# sourceMappingURL=test-report-page-loading.js.map