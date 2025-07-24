"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function debugRedditOAuth() {
    console.log('🔍 DEBUGGING REDDIT OAUTH AUTHENTICATION');
    console.log('========================================\n');
    // Check environment variables
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    console.log('📋 ENVIRONMENT VARIABLES:');
    console.log('=========================');
    console.log(`REDDIT_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`REDDIT_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
    if (clientId) {
        console.log(`Client ID length: ${clientId.length} characters`);
        console.log(`Client ID format: ${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}`);
    }
    if (clientSecret) {
        console.log(`Client Secret length: ${clientSecret.length} characters`);
        console.log(`Client Secret format: ${clientSecret.substring(0, 4)}...${clientSecret.substring(clientSecret.length - 4)}`);
    }
    console.log('');
    if (!clientId || !clientSecret) {
        console.log('❌ Missing required environment variables');
        return;
    }
    // Test authentication step by step
    console.log('🔐 TESTING OAUTH AUTHENTICATION:');
    console.log('=================================');
    try {
        // Step 1: Create Basic Auth header
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        console.log('✅ Basic Auth header created');
        console.log(`Auth header length: ${basicAuth.length} characters`);
        console.log(`Auth header format: ${basicAuth.substring(0, 10)}...`);
        console.log('');
        // Step 2: Test the token endpoint
        console.log('🌐 Testing Reddit token endpoint...');
        const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
        const userAgent = 'OTAAnswersCrawler/1.0 (by /u/your_username)';
        console.log(`Token URL: ${tokenUrl}`);
        console.log(`User Agent: ${userAgent}`);
        console.log('Request body: grant_type=client_credentials');
        console.log('');
        const authResponse = await axios_1.default.post(tokenUrl, 'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
        });
        console.log('✅ Authentication successful!');
        console.log('Response status:', authResponse.status);
        console.log('Response headers:', Object.keys(authResponse.headers));
        if (authResponse.data) {
            console.log('Response data keys:', Object.keys(authResponse.data));
            if (authResponse.data.access_token) {
                console.log('Access token received:', authResponse.data.access_token.substring(0, 20) + '...');
                console.log('Token type:', authResponse.data.token_type);
                console.log('Expires in:', authResponse.data.expires_in, 'seconds');
            }
        }
        // Step 3: Test API access
        console.log('\n🔍 TESTING API ACCESS:');
        console.log('=====================');
        const accessToken = authResponse.data.access_token;
        const apiUrl = 'https://oauth.reddit.com/r/travel/hot.json?limit=1';
        console.log(`Testing API endpoint: ${apiUrl}`);
        const apiResponse = await axios_1.default.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent,
                'Accept': 'application/json',
            },
            timeout: 30000,
        });
        console.log('✅ API access successful!');
        console.log('API Response status:', apiResponse.status);
        console.log('API Response data keys:', Object.keys(apiResponse.data));
        if (apiResponse.data && apiResponse.data.data) {
            console.log('Posts found:', apiResponse.data.data.children?.length || 0);
        }
    }
    catch (error) {
        console.log('❌ Authentication failed!');
        console.log('Error type:', error.constructor.name);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response status text:', error.response.statusText);
            console.log('Response headers:', error.response.headers);
            console.log('Response data:', error.response.data);
        }
        else if (error.request) {
            console.log('Request error - no response received');
            console.log('Request details:', error.request);
        }
        else {
            console.log('Error message:', error.message);
        }
        // Provide troubleshooting tips
        console.log('\n🔧 TROUBLESHOOTING TIPS:');
        console.log('=========================');
        console.log('1. Verify your Reddit app is configured as a "script" app');
        console.log('2. Check that the app is not in development mode');
        console.log('3. Ensure the app has the correct permissions');
        console.log('4. Verify the client ID and secret are correct');
        console.log('5. Check if your Reddit account has the necessary permissions');
    }
}
// Run the debug function if this file is executed directly
if (require.main === module) {
    debugRedditOAuth()
        .then(() => {
        console.log('\n✅ Debug completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Debug failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=debug-reddit-oauth.js.map