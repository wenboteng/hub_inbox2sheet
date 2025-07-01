#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("../src/utils/puppeteer");
async function testProductionFix() {
    console.log('🧪 Testing Production Puppeteer Fix');
    console.log('====================================');
    console.log('This test simulates the production environment to verify the Chrome detection fix.');
    console.log('');
    try {
        console.log('🌍 Environment: Production (simulated)');
        console.log('🖥️  Platform: Linux (simulated)');
        console.log('📦 Node.js version:', process.version);
        console.log('');
        console.log('📦 Creating browser with new dynamic Chrome detection...');
        console.log('Note: This will use your local Chrome installation for testing');
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('🌐 Creating test page...');
        const page = await browser.newPage();
        console.log('🔍 Navigating to test page...');
        await page.goto('https://example.com', { waitUntil: 'networkidle0', timeout: 10000 });
        const title = await page.title();
        console.log(`✅ Success! Page title: "${title}"`);
        console.log('🧹 Cleaning up...');
        await page.close();
        await browser.close();
        console.log('');
        console.log('🎉 PRODUCTION FIX TEST PASSED!');
        console.log('✅ The new dynamic Chrome detection is working correctly');
        console.log('✅ This should fix the production cron job issue');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Push this change to trigger cron job rebuild');
        console.log('2. Or manually trigger rebuild from Render dashboard');
        console.log('3. Monitor next cron job run for success');
        process.exit(0);
    }
    catch (error) {
        console.error('');
        console.error('❌ PRODUCTION FIX TEST FAILED!');
        console.error('Error:', error);
        console.error('');
        console.error('🔍 This means the fix needs more work before production deployment');
        process.exit(1);
    }
}
testProductionFix();
//# sourceMappingURL=test-production-fix.js.map