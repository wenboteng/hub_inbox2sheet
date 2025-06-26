"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("../utils/puppeteer");
async function testPuppeteer() {
    console.log('[TEST] Starting Puppeteer test...');
    try {
        // Test browser creation
        console.log('[TEST] Creating browser...');
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('[TEST] Browser created successfully!');
        // Test page creation
        console.log('[TEST] Creating page...');
        const page = await browser.newPage();
        console.log('[TEST] Page created successfully!');
        // Test navigation
        console.log('[TEST] Navigating to test page...');
        await page.goto('https://example.com', { waitUntil: 'networkidle0', timeout: 10000 });
        console.log('[TEST] Navigation successful!');
        // Test content extraction
        const title = await page.title();
        console.log(`[TEST] Page title: ${title}`);
        // Close browser
        await browser.close();
        console.log('[TEST] Browser closed successfully!');
        console.log('[TEST] All tests passed! Puppeteer is working correctly.');
        process.exit(0);
    }
    catch (error) {
        console.error('[TEST] Test failed:', error);
        process.exit(1);
    }
}
testPuppeteer();
//# sourceMappingURL=test-puppeteer.js.map