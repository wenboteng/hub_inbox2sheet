"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHtml = fetchHtml;
const axios_1 = __importDefault(require("axios"));
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};
async function fetchHtml(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios_1.default.get(url, {
                headers: BROWSER_HEADERS,
                timeout: 10000,
            });
            if (response.status === 200) {
                return response.data;
            }
            console.log(`[FETCH] Attempt ${i + 1}: Non-200 status code (${response.status}) for ${url}`);
        }
        catch (error) {
            console.log(`[FETCH] Attempt ${i + 1} failed for ${url}:`, error.message);
            if (i === retries - 1) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}
