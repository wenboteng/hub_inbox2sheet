"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrowser = createBrowser;
const puppeteer_1 = __importDefault(require("puppeteer"));
async function createBrowser() {
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    };
    try {
        return await puppeteer_1.default.launch(launchOptions);
    }
    catch (error) {
        console.warn('Failed to launch with default options, trying alternative configuration...');
        // Fallback configuration for environments where Chrome is not available
        const fallbackOptions = {
            ...launchOptions,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
            product: 'chrome',
        };
        return await puppeteer_1.default.launch(fallbackOptions);
    }
}
