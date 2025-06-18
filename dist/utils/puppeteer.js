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
exports.createBrowser = createBrowser;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
async function ensureChromeInstalled() {
    // Determine the appropriate cache directory based on environment
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    const isLinux = process.platform === 'linux';
    const isMac = process.platform === 'darwin';
    let cacheDir;
    let chromePath;
    if (isRender && isLinux) {
        // Render production environment
        cacheDir = '/opt/render/.cache/puppeteer';
        chromePath = '/opt/render/.cache/puppeteer/chrome/linux-137.0.7151.119/chrome-linux64/chrome';
    }
    else if (isMac) {
        // macOS development environment
        cacheDir = path.join(process.env.HOME || '', '.cache', 'puppeteer');
        chromePath = path.join(cacheDir, 'chrome', 'mac-137.0.7151.119', 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    }
    else {
        // Linux development or other environments
        cacheDir = path.join(process.env.HOME || '', '.cache', 'puppeteer');
        chromePath = path.join(cacheDir, 'chrome', 'linux-137.0.7151.119', 'chrome-linux64', 'chrome');
    }
    console.log(`[PUPPETEER] Checking if Chrome is installed at: ${chromePath}`);
    if (fs.existsSync(chromePath)) {
        console.log(`[PUPPETEER] Chrome already installed at: ${chromePath}`);
        return;
    }
    console.log(`[PUPPETEER] Chrome not found, installing...`);
    try {
        // Create cache directory if it doesn't exist
        if (!fs.existsSync(cacheDir)) {
            console.log(`[PUPPETEER] Creating cache directory: ${cacheDir}`);
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        // Install Chrome
        console.log(`[PUPPETEER] Running: npx puppeteer browsers install chrome`);
        (0, child_process_1.execSync)('npx puppeteer browsers install chrome', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        // Verify installation - check if the file exists or if it's a symlink
        if (fs.existsSync(chromePath) || fs.lstatSync(chromePath).isSymbolicLink()) {
            console.log(`[PUPPETEER] Chrome successfully installed at: ${chromePath}`);
        }
        else {
            // For macOS, the actual path might be different, let's check the cache directory
            const chromeDir = path.dirname(chromePath);
            if (fs.existsSync(chromeDir)) {
                const files = fs.readdirSync(chromeDir);
                console.log(`[PUPPETEER] Chrome directory contents: ${files.join(', ')}`);
                // If we can't find the exact path but the directory exists, assume it's installed
                console.log(`[PUPPETEER] Chrome appears to be installed in: ${chromeDir}`);
                return;
            }
            throw new Error('Chrome installation failed - file not found after installation');
        }
    }
    catch (error) {
        console.error(`[PUPPETEER] Failed to install Chrome:`, error);
        throw error;
    }
}
async function createBrowser() {
    console.log('[PUPPETEER] Starting browser creation...');
    // Check if we're in a Render environment
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    const isLinux = process.platform === 'linux';
    const isMac = process.platform === 'darwin';
    console.log(`[PUPPETEER] Environment: ${isRender ? 'Render/Production' : 'Development'}`);
    console.log(`[PUPPETEER] Platform: ${process.platform}`);
    // Debug: Check Puppeteer version and cache path
    console.log(`[PUPPETEER] Node.js version: ${process.version}`);
    console.log(`[PUPPETEER] Architecture: ${process.arch}`);
    // Debug: Check environment variables
    console.log(`[PUPPETEER] PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'not set'}`);
    console.log(`[PUPPETEER] PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || 'not set'}`);
    console.log(`[PUPPETEER] PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: ${process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || 'not set'}`);
    console.log(`[PUPPETEER] PUPPETEER_SKIP_DOWNLOAD: ${process.env.PUPPETEER_SKIP_DOWNLOAD || 'not set'}`);
    // Determine cache directory
    const cacheDir = isRender && isLinux
        ? '/opt/render/.cache/puppeteer'
        : path.join(process.env.HOME || '', '.cache', 'puppeteer');
    console.log(`[PUPPETEER] Cache directory: ${cacheDir}`);
    try {
        if (fs.existsSync(cacheDir)) {
            console.log(`[PUPPETEER] Cache directory exists`);
            const cacheContents = fs.readdirSync(cacheDir);
            console.log(`[PUPPETEER] Cache contents: ${cacheContents.join(', ')}`);
        }
        else {
            console.log(`[PUPPETEER] Cache directory does not exist`);
        }
    }
    catch (error) {
        console.log(`[PUPPETEER] Error checking cache directory: ${error}`);
    }
    // Debug: Check if we can find Chrome in common locations
    const possibleChromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/opt/google/chrome/chrome',
        '/usr/bin/chrome',
        '/snap/bin/chromium',
    ];
    console.log(`[PUPPETEER] Checking for Chrome in system paths...`);
    for (const chromePath of possibleChromePaths) {
        try {
            if (fs.existsSync(chromePath)) {
                console.log(`[PUPPETEER] Found Chrome at: ${chromePath}`);
                // Check if it's executable
                try {
                    fs.accessSync(chromePath, fs.constants.X_OK);
                    console.log(`[PUPPETEER] Chrome is executable at: ${chromePath}`);
                }
                catch (error) {
                    console.log(`[PUPPETEER] Chrome is not executable at: ${chromePath}`);
                }
            }
            else {
                console.log(`[PUPPETEER] Chrome not found at: ${chromePath}`);
            }
        }
        catch (error) {
            console.log(`[PUPPETEER] Error checking ${chromePath}: ${error}`);
        }
    }
    // Debug: Check Puppeteer's executable path
    try {
        const puppeteerExecutablePath = puppeteer_1.default.executablePath();
        console.log(`[PUPPETEER] Puppeteer executable path: ${puppeteerExecutablePath}`);
    }
    catch (error) {
        console.log(`[PUPPETEER] Could not get Puppeteer executable path: ${error}`);
    }
    // Ensure Chrome is installed
    await ensureChromeInstalled();
    // Determine executable path based on environment
    let executablePath;
    if (isRender && isLinux) {
        executablePath = '/opt/render/.cache/puppeteer/chrome/linux-137.0.7151.119/chrome-linux64/chrome';
    }
    else if (isMac) {
        executablePath = path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome', 'mac-137.0.7151.119', 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    }
    else {
        executablePath = path.join(process.env.HOME || '', '.cache', 'puppeteer', 'chrome', 'linux-137.0.7151.119', 'chrome-linux64', 'chrome');
    }
    // Use Puppeteer's bundled Chrome with server-optimized settings
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
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--memory-pressure-off',
            '--max_old_space_size=4096'
        ],
        // Use the determined executable path
        executablePath,
        // Set a reasonable timeout
        timeout: 30000,
    };
    console.log(`[PUPPETEER] Launch options:`, JSON.stringify(launchOptions, null, 2));
    try {
        console.log('[PUPPETEER] Launching Puppeteer with bundled Chrome...');
        const browser = await puppeteer_1.default.launch(launchOptions);
        console.log('[PUPPETEER] Successfully launched browser with bundled Chrome');
        return browser;
    }
    catch (error) {
        console.error('[PUPPETEER] Failed to launch with bundled Chrome:', error.message);
        console.error('[PUPPETEER] Full error:', error);
        // Try with minimal options as fallback
        try {
            console.log('[PUPPETEER] Trying with minimal options...');
            const minimalOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--safebrowsing-disable-auto-update',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--ignore-certificate-errors-spki-list'
                ],
            };
            console.log(`[PUPPETEER] Minimal options:`, JSON.stringify(minimalOptions, null, 2));
            const browser = await puppeteer_1.default.launch(minimalOptions);
            console.log('[PUPPETEER] Successfully launched with minimal options');
            return browser;
        }
        catch (fallbackError) {
            console.error('[PUPPETEER] All launch attempts failed:', fallbackError);
            console.error('[PUPPETEER] Full fallback error:', fallbackError);
            throw new Error(`Failed to launch Chrome: ${fallbackError.message}`);
        }
    }
}
