"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function debugReportPage() {
    console.log('🔍 DEBUGGING REPORT PAGE LOADING ISSUE');
    console.log('=====================================\n');
    const reportUrl = 'https://otaanswers.com/reports/airbnb-ranking-algorithm-complete-guide-for-hosts-2025';
    const apiUrl = 'https://otaanswers.com/api/reports/airbnb-ranking-algorithm-complete-guide-for-hosts-2025';
    try {
        // 1. Test API directly
        console.log('1. TESTING API DIRECTLY...');
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        if (apiResponse.ok) {
            console.log('✅ API is working perfectly:');
            console.log(`   Status: ${apiResponse.status}`);
            console.log(`   Title: ${apiData.title}`);
            console.log(`   Content Length: ${apiData.content?.length || 0} characters`);
            console.log(`   Platform: ${apiData.platform}`);
        }
        else {
            console.log('❌ API error:', apiData.error);
            return;
        }
        // 2. Test page with different user agents
        console.log('\n2. TESTING PAGE WITH DIFFERENT USER AGENTS...');
        const userAgents = [
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
        for (const userAgent of userAgents) {
            console.log(`\n   Testing with User-Agent: ${userAgent.substring(0, 50)}...`);
            try {
                const response = await fetch(reportUrl, {
                    headers: {
                        'User-Agent': userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }
                });
                const html = await response.text();
                const hasLoading = html.includes('Loading…');
                const hasContent = html.includes('Airbnb Ranking Algorithm');
                const hasError = html.includes('error') || html.includes('Error');
                console.log(`   Status: ${response.status}`);
                console.log(`   Has Loading: ${hasLoading ? '❌' : '✅'}`);
                console.log(`   Has Content: ${hasContent ? '✅' : '❌'}`);
                console.log(`   Has Error: ${hasError ? '❌' : '✅'}`);
                if (hasContent && !hasLoading) {
                    console.log('   ✅ Page loads correctly with this User-Agent!');
                }
            }
            catch (error) {
                console.log(`   ❌ Error: ${error}`);
            }
        }
        // 3. Check for JavaScript errors
        console.log('\n3. CHECKING FOR JAVASCRIPT ISSUES...');
        console.log('   The issue might be:');
        console.log('   - JavaScript not executing due to CSP (Content Security Policy)');
        console.log('   - Network errors in browser console');
        console.log('   - CORS issues');
        console.log('   - Hydration errors in Next.js');
        console.log('   - Missing environment variables');
        // 4. Test with curl to see if it's a browser-specific issue
        console.log('\n4. TESTING WITH CURL (NO JAVASCRIPT)...');
        try {
            const { execSync } = require('child_process');
            const curlOutput = execSync(`curl -s -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1)" "${reportUrl}"`, { encoding: 'utf8' });
            const hasLoadingCurl = curlOutput.includes('Loading…');
            const hasContentCurl = curlOutput.includes('Airbnb Ranking Algorithm');
            console.log(`   Curl Status: ${hasLoadingCurl ? '❌ Still Loading' : '✅ No Loading'}`);
            console.log(`   Curl Content: ${hasContentCurl ? '✅ Has Content' : '❌ No Content'}`);
            if (hasLoadingCurl) {
                console.log('   ⚠️  The page shows "Loading..." even without JavaScript');
                console.log('   This suggests the issue is server-side rendering, not client-side JavaScript');
            }
        }
        catch (error) {
            console.log('   ❌ Curl test failed:', error);
        }
        // 5. Check environment variables
        console.log('\n5. CHECKING ENVIRONMENT VARIABLES...');
        console.log('   The issue might be missing environment variables:');
        console.log('   - NEXT_PUBLIC_BASE_URL');
        console.log('   - DATABASE_URL');
        console.log('   - Other required env vars');
        // 6. Generate debugging report
        console.log('\n6. GENERATING DEBUGGING REPORT...');
        const debugReport = `
# 🔍 REPORT PAGE DEBUGGING REPORT

**Generated**: ${new Date().toISOString()}
**Report URL**: ${reportUrl}

## Current Status

### API Status
- ✅ API endpoint working: ${apiResponse.status}
- ✅ Data accessible: ${apiData.title}
- ✅ Content length: ${apiData.content?.length || 0} characters

### Page Status
- ⚠️ Page shows "Loading..." instead of content
- ⚠️ JavaScript may not be executing properly
- ⚠️ Could be SSR (Server-Side Rendering) issue

## Possible Causes

1. **JavaScript Execution Issue**
   - CSP (Content Security Policy) blocking scripts
   - Network errors in browser console
   - Hydration errors in Next.js

2. **Server-Side Rendering Issue**
   - Missing environment variables
   - Database connection issues
   - API route not working during SSR

3. **Browser-Specific Issue**
   - CORS problems
   - Cache issues
   - User-Agent detection

## Recommended Actions

1. **Check Browser Console**
   - Open browser developer tools
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Test with Different Browsers**
   - Try Chrome, Firefox, Safari
   - Check if issue is browser-specific

3. **Check Environment Variables**
   - Verify NEXT_PUBLIC_BASE_URL is set
   - Check DATABASE_URL is accessible
   - Ensure all required env vars are present

4. **Test SSR vs CSR**
   - Check if page works with JavaScript disabled
   - Verify server-side rendering is working

## Next Steps

1. **Immediate**: Check browser console for errors
2. **Short-term**: Test with different browsers/devices
3. **Medium-term**: Verify environment variables
4. **Long-term**: Implement proper error handling

---
*This debugging report was generated automatically.*
`;
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(process.cwd(), 'report-debugging.md');
        fs.writeFileSync(reportPath, debugReport, 'utf-8');
        console.log(`✅ Debugging report saved: report-debugging.md`);
        // 7. Final recommendations
        console.log('\n7. FINAL RECOMMENDATIONS...');
        console.log('=====================================');
        console.log('🎯 To resolve the "Loading..." issue:');
        console.log('');
        console.log('1. **Check Browser Console** (Most Important):');
        console.log('   - Open https://otaanswers.com/reports/airbnb-ranking-algorithm-complete-guide-for-hosts-2025');
        console.log('   - Press F12 to open developer tools');
        console.log('   - Look for red error messages in Console tab');
        console.log('   - Check Network tab for failed requests');
        console.log('');
        console.log('2. **Test with JavaScript Disabled**:');
        console.log('   - Disable JavaScript in browser');
        console.log('   - Reload the page');
        console.log('   - If it still shows "Loading...", it\'s a server issue');
        console.log('');
        console.log('3. **Check Environment Variables in Render**:');
        console.log('   - Verify NEXT_PUBLIC_BASE_URL is set correctly');
        console.log('   - Ensure DATABASE_URL is accessible');
        console.log('');
        console.log('4. **Test with Different Browser**:');
        console.log('   - Try Chrome, Firefox, Safari');
        console.log('   - Check if issue is browser-specific');
    }
    catch (error) {
        console.error('❌ Debugging failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
debugReportPage();
//# sourceMappingURL=debug-report-page.js.map