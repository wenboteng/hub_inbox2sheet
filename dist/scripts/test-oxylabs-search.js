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
const oxylabs_1 = require("../lib/oxylabs");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function testOxylabsSearch() {
    console.log('🔍 Testing Oxylabs Search Functionality...');
    try {
        // Test 1: Google Search
        console.log('\n1️⃣ Testing Google Search...');
        const googleResults = await oxylabs_1.oxylabsScraper.searchContent('tour operator pricing strategies', 'google', 3);
        console.log(`   Google results: ${googleResults.length}`);
        if (googleResults.length > 0) {
            console.log('   First result:');
            console.log(`   - Title: ${googleResults[0].title}`);
            console.log(`   - URL: ${googleResults[0].url}`);
            console.log(`   - Content length: ${googleResults[0].content.length}`);
        }
        // Test 2: Bing Search
        console.log('\n2️⃣ Testing Bing Search...');
        const bingResults = await oxylabs_1.oxylabsScraper.searchContent('tour operator pricing strategies', 'bing', 3);
        console.log(`   Bing results: ${bingResults.length}`);
        if (bingResults.length > 0) {
            console.log('   First result:');
            console.log(`   - Title: ${bingResults[0].title}`);
            console.log(`   - URL: ${bingResults[0].url}`);
            console.log(`   - Content length: ${bingResults[0].content.length}`);
        }
        // Test 3: Different query
        console.log('\n3️⃣ Testing different query...');
        const differentResults = await oxylabs_1.oxylabsScraper.searchContent('airbnb host tips', 'google', 2);
        console.log(`   Different query results: ${differentResults.length}`);
        if (differentResults.length > 0) {
            console.log('   First result:');
            console.log(`   - Title: ${differentResults[0].title}`);
            console.log(`   - URL: ${differentResults[0].url}`);
            console.log(`   - Content length: ${differentResults[0].content.length}`);
        }
        console.log('\n✅ Search testing completed!');
    }
    catch (error) {
        console.error('❌ Search test failed:', error.message);
        console.error('Error details:', error.response?.data || error);
    }
}
// Run the test
testOxylabsSearch().catch(console.error);
//# sourceMappingURL=test-oxylabs-search.js.map