#!/usr/bin/env tsx
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const TEST_URL = 'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/184758';
// Browser headers to avoid being blocked
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};
async function testAirbnbCommunityUrl() {
    console.log('🔍 Testing Airbnb Community URL:', TEST_URL);
    console.log('=====================================');
    try {
        const response = await axios_1.default.get(TEST_URL, {
            headers: BROWSER_HEADERS,
            timeout: 15000,
        });
        console.log(`✅ Response status: ${response.status}`);
        console.log(`✅ Content length: ${response.data.length} characters`);
        const $ = cheerio.load(response.data);
        // Test current selectors
        console.log('\n📋 Testing Current Selectors:');
        console.log('-------------------------------');
        // Title selectors
        const titleSelectors = [
            '.lia-message-subject',
            '.page-title',
            '.topic-title',
            'h1',
            '.lia-message-subject a',
            '.page-title a',
            '.topic-title a'
        ];
        console.log('🔍 Title selectors:');
        titleSelectors.forEach(selector => {
            const element = $(selector);
            if (element.length > 0) {
                const text = element.first().text().trim();
                console.log(`  ${selector}: "${text.substring(0, 100)}..." (${element.length} found)`);
            }
            else {
                console.log(`  ${selector}: Not found`);
            }
        });
        // Content selectors
        const contentSelectors = [
            '.lia-message-body-content',
            '.message-content',
            '.post-content',
            '.topic-content',
            '.content',
            '.lia-message-body',
            'article.lia-message-body'
        ];
        console.log('\n🔍 Content selectors:');
        contentSelectors.forEach(selector => {
            const element = $(selector);
            if (element.length > 0) {
                const text = element.first().text().trim();
                console.log(`  ${selector}: ${text.length} chars (${element.length} found)`);
                if (text.length > 0) {
                    console.log(`    Preview: "${text.substring(0, 100)}..."`);
                }
            }
            else {
                console.log(`  ${selector}: Not found`);
            }
        });
        // Author selectors
        const authorSelectors = [
            '.lia-user-name',
            '.author-name',
            '.user-name',
            '.author',
            '.username',
            '.post-author',
            '.message-author'
        ];
        console.log('\n🔍 Author selectors:');
        authorSelectors.forEach(selector => {
            const element = $(selector);
            if (element.length > 0) {
                const text = element.first().text().trim();
                console.log(`  ${selector}: "${text}" (${element.length} found)`);
            }
            else {
                console.log(`  ${selector}: Not found`);
            }
        });
        // Post/reply selectors
        const postSelectors = [
            '.lia-message',
            'article.lia-message-body',
            '.message',
            '.post',
            '.reply',
            '.comment'
        ];
        console.log('\n🔍 Post/Reply selectors:');
        postSelectors.forEach(selector => {
            const element = $(selector);
            console.log(`  ${selector}: ${element.length} found`);
        });
        // Look for any script tags with JSON data
        console.log('\n🔍 Script tags with potential JSON data:');
        $('script').each((index, script) => {
            const $script = $(script);
            const content = $script.html() || '';
            const type = $script.attr('type') || '';
            const id = $script.attr('id') || '';
            if (content.includes('"title"') || content.includes('"content"') || content.includes('"author"')) {
                console.log(`  Script ${index}: type="${type}", id="${id}", content length: ${content.length}`);
                console.log(`    Preview: "${content.substring(0, 200)}..."`);
            }
        });
        // Look for meta tags that might contain title
        console.log('\n🔍 Meta tags:');
        $('meta[property="og:title"], meta[name="title"], meta[property="twitter:title"]').each((index, meta) => {
            const $meta = $(meta);
            const content = $meta.attr('content') || '';
            const property = $meta.attr('property') || $meta.attr('name') || '';
            console.log(`  ${property}: "${content}"`);
        });
        // Check for redirects or iframes
        console.log('\n🔍 Redirects/iframes:');
        const redirectMeta = $('meta[http-equiv="refresh"]');
        if (redirectMeta.length > 0) {
            console.log(`  Found redirect meta: ${redirectMeta.attr('content')}`);
        }
        const iframes = $('iframe');
        if (iframes.length > 0) {
            console.log(`  Found ${iframes.length} iframes`);
            iframes.each((index, iframe) => {
                const src = $(iframe).attr('src');
                console.log(`    iframe ${index}: src="${src}"`);
            });
        }
        // Save HTML for manual inspection
        console.log('\n💾 Saving HTML for manual inspection...');
        const fs = require('fs');
        fs.writeFileSync('airbnb-community-debug.html', response.data);
        console.log('✅ HTML saved to airbnb-community-debug.html');
    }
    catch (error) {
        console.error('❌ Error testing URL:', error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers:`, error.response.headers);
        }
    }
}
testAirbnbCommunityUrl();
//# sourceMappingURL=test-airbnb-community.js.map