"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper function to setup a page
async function setupPage(page) {
    await page.setViewport({
        width: 1280,
        height: 800
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultTimeout(120000);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
            request.abort();
        }
        else {
            request.continue();
        }
    });
    page.on('dialog', async (dialog) => {
        console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
        await dialog.dismiss();
    });
}
async function testCommunityUrl() {
    console.log('[TEST] Starting test of Airbnb Community URL...');
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../src/utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // Test the specific URL
            const testUrl = 'https://community.withairbnb.com/t5/Advice-on-your-space/Hi-New-Host-Seeking-Advice/td-p/2108405';
            console.log(`[TEST] Testing URL: ${testUrl}`);
            await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            // Wait much longer for dynamic content to load
            console.log('[TEST] Waiting for dynamic content to load...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Try scrolling to trigger lazy loading
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
            // Try clicking "Show more" or similar buttons
            const showMoreButtons = await page.$$eval('button, a', (elements) => {
                return elements
                    .filter(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('show more') ||
                        text.includes('load more') ||
                        text.includes('view all') ||
                        text.includes('expand');
                })
                    .map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim(),
                    id: el.id,
                    className: el.className
                }));
            });
            if (showMoreButtons.length > 0) {
                console.log('[TEST] Found expand buttons:');
                showMoreButtons.forEach(btn => console.log(`  - ${btn.tag}: ${btn.text}`));
                // Try clicking the first one
                try {
                    await page.click(`button:has-text("${showMoreButtons[0].text}"), a:has-text("${showMoreButtons[0].text}")`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    console.log('[TEST] Clicked expand button, waiting for content...');
                }
                catch (e) {
                    console.log('[TEST] Could not click expand button');
                }
            }
            // Check if we need to login - use proper selectors
            const loginElements = await page.$$eval('a, button', (elements) => {
                return elements
                    .filter(el => el.textContent?.includes('Log In') || el.textContent?.includes('Sign In'))
                    .map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim(),
                    href: el.href
                }));
            });
            if (loginElements.length > 0) {
                console.log('[TEST] Login required detected:');
                loginElements.forEach(el => console.log(`  - ${el.tag}: ${el.text}`));
            }
            // Try to extract ALL content with multiple approaches
            const content = await page.evaluate(() => {
                // Try multiple selectors for content
                const selectors = [
                    '.lia-message-body-content',
                    '.lia-message-body',
                    '.lia-message-content',
                    '.post-content',
                    '.message-content',
                    '.content',
                    '.body',
                    'article',
                    'main',
                    '.lia-message',
                    '.lia-message-post',
                    '.lia-message-post-content',
                    '.lia-message-post-body',
                    '.lia-message-post-body-content'
                ];
                let allContent = '';
                const foundSelectors = [];
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((element, index) => {
                        if (element && element.textContent?.trim()) {
                            const text = element.textContent.trim();
                            allContent += `\n--- ${selector} ${index + 1} ---\n${text}\n`;
                            foundSelectors.push(`${selector} ${index + 1}`);
                        }
                    });
                }
                // Also try to get all text content from the page
                const bodyText = document.body.textContent?.trim() || '';
                return {
                    foundSelectors,
                    allContent: allContent || bodyText,
                    bodyText: bodyText,
                    totalLength: allContent.length || bodyText.length
                };
            });
            console.log(`[TEST] Found content with selectors: ${content.foundSelectors.join(', ')}`);
            console.log(`[TEST] Total content length: ${content.totalLength} characters`);
            console.log(`[TEST] First 500 chars: ${content.allContent.substring(0, 500)}`);
            // Check for specific content we know should be there
            if (content.allContent.includes('New Host Seeking Advice')) {
                console.log('[TEST] ✅ Found expected content!');
            }
            else {
                console.log('[TEST] ❌ Expected content not found');
            }
            // Check for replies and community responses
            if (content.allContent.includes('Guy991') || content.allContent.includes('Marie8425')) {
                console.log('[TEST] ✅ Found community replies!');
            }
            else {
                console.log('[TEST] ❌ Community replies not found');
            }
            // Check for login prompts
            if (content.allContent.includes('Log In') || content.allContent.includes('Sign In')) {
                console.log('[TEST] ⚠️ Login prompts detected in content');
            }
            // Check page title
            const title = await page.title();
            console.log(`[TEST] Page title: ${title}`);
            // Check URL after navigation
            const currentUrl = page.url();
            console.log(`[TEST] Current URL: ${currentUrl}`);
            // Check if we were redirected
            if (currentUrl !== testUrl) {
                console.log(`[TEST] ⚠️ Redirected from ${testUrl} to ${currentUrl}`);
            }
            // Check for any error messages or access restrictions
            const errorMessages = await page.$$eval('*', (elements) => {
                return elements
                    .filter(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('access denied') ||
                        text.includes('login required') ||
                        text.includes('please sign in') ||
                        text.includes('authentication required');
                })
                    .map(el => el.textContent?.trim())
                    .filter(Boolean);
            });
            if (errorMessages.length > 0) {
                console.log('[TEST] ⚠️ Access restriction messages found:');
                errorMessages.forEach(msg => console.log(`  - ${msg}`));
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[TEST] Error testing community URL:', error);
    }
}
testCommunityUrl();
//# sourceMappingURL=test-community-url.js.map