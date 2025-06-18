import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export async function createBrowser() {
  console.log('[PUPPETEER] Starting browser creation...');
  
  // Check if we're in a Render environment
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  console.log(`[PUPPETEER] Environment: ${isRender ? 'Render/Production' : 'Development'}`);
  
  // Debug: Check Puppeteer version and cache path
  console.log(`[PUPPETEER] Node.js version: ${process.version}`);
  console.log(`[PUPPETEER] Platform: ${process.platform}`);
  console.log(`[PUPPETEER] Architecture: ${process.arch}`);
  
  // Debug: Check environment variables
  console.log(`[PUPPETEER] PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'not set'}`);
  console.log(`[PUPPETEER] PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || 'not set'}`);
  console.log(`[PUPPETEER] PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: ${process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || 'not set'}`);
  console.log(`[PUPPETEER] PUPPETEER_SKIP_DOWNLOAD: ${process.env.PUPPETEER_SKIP_DOWNLOAD || 'not set'}`);
  
  // Debug: Check cache directory
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
  console.log(`[PUPPETEER] Cache directory: ${cacheDir}`);
  
  try {
    if (fs.existsSync(cacheDir)) {
      console.log(`[PUPPETEER] Cache directory exists`);
      const cacheContents = fs.readdirSync(cacheDir);
      console.log(`[PUPPETEER] Cache contents: ${cacheContents.join(', ')}`);
    } else {
      console.log(`[PUPPETEER] Cache directory does not exist`);
    }
  } catch (error) {
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
        } catch (error) {
          console.log(`[PUPPETEER] Chrome is not executable at: ${chromePath}`);
        }
      } else {
        console.log(`[PUPPETEER] Chrome not found at: ${chromePath}`);
      }
    } catch (error) {
      console.log(`[PUPPETEER] Error checking ${chromePath}: ${error}`);
    }
  }
  
  // Debug: Check Puppeteer's executable path
  try {
    const puppeteerExecutablePath = (puppeteer as any).executablePath();
    console.log(`[PUPPETEER] Puppeteer executable path: ${puppeteerExecutablePath}`);
  } catch (error) {
    console.log(`[PUPPETEER] Could not get Puppeteer executable path: ${error}`);
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
    // Force Puppeteer to use its bundled Chrome
    executablePath: undefined,
    // Set a reasonable timeout
    timeout: 30000,
  };

  console.log(`[PUPPETEER] Launch options:`, JSON.stringify(launchOptions, null, 2));

  try {
    console.log('[PUPPETEER] Launching Puppeteer with bundled Chrome...');
    const browser = await puppeteer.launch(launchOptions);
    console.log('[PUPPETEER] Successfully launched browser with bundled Chrome');
    return browser;
  } catch (error) {
    console.error('[PUPPETEER] Failed to launch with bundled Chrome:', (error as Error).message);
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
      
      const browser = await puppeteer.launch(minimalOptions);
      console.log('[PUPPETEER] Successfully launched with minimal options');
      return browser;
    } catch (fallbackError) {
      console.error('[PUPPETEER] All launch attempts failed:', fallbackError);
      console.error('[PUPPETEER] Full fallback error:', fallbackError);
      throw new Error(`Failed to launch Chrome: ${(fallbackError as Error).message}`);
    }
  }
} 