#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("../src/utils/puppeteer");
async function testPuppeteerSetup() {
    console.log('🧪 Testing Puppeteer setup...');
    try {
        console.log('📦 Creating browser...');
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('🌐 Creating page...');
        const page = await browser.newPage();
        console.log('🔍 Navigating to test page...');
        await page.goto('https://example.com', { waitUntil: 'networkidle0', timeout: 10000 });
        const title = await page.title();
        console.log(`✅ Success! Page title: "${title}"`);
        console.log('🧹 Cleaning up...');
        await page.close();
        await browser.close();
        console.log('🎉 Puppeteer setup test completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Puppeteer setup test failed:', error);
        process.exit(1);
    }
}
testPuppeteerSetup();
//# sourceMappingURL=test-puppeteer-setup.js.map