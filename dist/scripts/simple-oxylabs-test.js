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
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
async function simpleOxylabsTest() {
    console.log('🧪 Simple Oxylabs API Test...');
    const username = process.env.OXYLABS_USERNAME;
    const password = process.env.OXYLABS_PASSWORD;
    console.log(`Username: ${username}`);
    console.log(`Password: ${password ? '***' + password.slice(-4) : 'NOT SET'}`);
    if (!username || !password) {
        console.error('❌ Missing credentials');
        return;
    }
    try {
        // Test 1: Simple universal scraping
        console.log('\n1️⃣ Testing universal scraping...');
        const requestBody = {
            source: 'universal',
            url: 'https://httpbin.org/html',
            geo_location: 'United States',
            user_agent_type: 'desktop',
            render: 'html',
            parse: false
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        const response = await axios_1.default.post('https://realtime.oxylabs.io/v1/queries', requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            },
            timeout: 30000
        });
        console.log('✅ Success!');
        console.log('Status:', response.status);
        console.log('Response keys:', Object.keys(response.data));
        if (response.data.results && response.data.results[0]) {
            const result = response.data.results[0];
            console.log('Content length:', result.content?.length || 'No content');
            console.log('Title:', result.title || 'No title');
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}
simpleOxylabsTest().catch(console.error);
//# sourceMappingURL=simple-oxylabs-test.js.map