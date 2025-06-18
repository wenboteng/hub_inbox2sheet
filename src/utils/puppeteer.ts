import puppeteer from 'puppeteer';

export async function createBrowser() {
  console.log('[PUPPETEER] Starting browser creation...');
  
  // Check if we're in a Render environment
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  console.log(`[PUPPETEER] Environment: ${isRender ? 'Render/Production' : 'Development'}`);
  
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

  try {
    console.log('[PUPPETEER] Launching Puppeteer with bundled Chrome...');
    const browser = await puppeteer.launch(launchOptions);
    console.log('[PUPPETEER] Successfully launched browser with bundled Chrome');
    return browser;
  } catch (error) {
    console.error('[PUPPETEER] Failed to launch with bundled Chrome:', (error as Error).message);
    
    // Try with minimal options as fallback
    try {
      console.log('[PUPPETEER] Trying with minimal options...');
      const browser = await puppeteer.launch({
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
      });
      console.log('[PUPPETEER] Successfully launched with minimal options');
      return browser;
    } catch (fallbackError) {
      console.error('[PUPPETEER] All launch attempts failed:', fallbackError);
      throw new Error(`Failed to launch Chrome: ${(fallbackError as Error).message}`);
    }
  }
} 