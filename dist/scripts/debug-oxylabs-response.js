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
async function debugOxylabsResponse() {
    console.log('🔍 Debugging Oxylabs Response Structure...');
    try {
        const scraper = new oxylabs_1.OxylabsScraper();
        const result = await scraper.scrapeUrl('https://httpbin.org/html', 'universal');
        if (result) {
            console.log('✅ Got response!');
            console.log('Title:', result.title);
            console.log('Content length:', result.content.length);
            console.log('First 200 chars:', result.content.substring(0, 200));
        }
        else {
            console.log('❌ No response');
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
    }
}
debugOxylabsResponse().catch(console.error);
//# sourceMappingURL=debug-oxylabs-response.js.map