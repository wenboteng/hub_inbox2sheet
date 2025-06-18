import puppeteer from 'puppeteer';

export async function createBrowser() {
  console.log('[PUPPETEER] Starting browser creation...');
  
  // Check if we're in a Render environment
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  console.log(`[PUPPETEER] Environment: ${isRender ? 'Render/Production' : 'Development'}`);
  
  // Try to find Chrome in common locations
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/opt/google/chrome/chrome',
    '/usr/bin/chrome',
  ].filter(Boolean);

  console.log(`[PUPPETEER] Possible Chrome paths: ${possiblePaths.join(', ')}`);

  const baseLaunchOptions = {
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
      '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
  };

  // Try launching with different configurations
  for (const path of possiblePaths) {
    try {
      console.log(`[PUPPETEER] Trying to launch Chrome from: ${path}`);
      const browser = await puppeteer.launch({
        ...baseLaunchOptions,
        executablePath: path,
      });
      console.log(`[PUPPETEER] Successfully launched Chrome from: ${path}`);
      return browser;
    } catch (error) {
      console.log(`[PUPPETEER] Failed to launch from ${path}:`, (error as Error).message);
    }
  }

  // Try without specifying executable path (let Puppeteer find it)
  try {
    console.log('[PUPPETEER] Trying to launch Chrome without specifying path...');
    const browser = await puppeteer.launch(baseLaunchOptions);
    console.log('[PUPPETEER] Successfully launched Chrome without specifying path');
    return browser;
  } catch (error) {
    console.log('[PUPPETEER] Failed to launch without path:', (error as Error).message);
  }

  // Try with Puppeteer's bundled Chromium
  try {
    console.log('[PUPPETEER] Trying with Puppeteer bundled Chromium...');
    const browser = await puppeteer.launch({
      ...baseLaunchOptions,
    });
    console.log('[PUPPETEER] Successfully launched with bundled Chromium');
    return browser;
  } catch (error) {
    console.log('[PUPPETEER] Failed to launch with bundled Chromium:', (error as Error).message);
  }

  // Final fallback with minimal options
  try {
    console.log('[PUPPETEER] Trying final fallback configuration...');
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
    console.log('[PUPPETEER] Successfully launched with fallback configuration');
    return browser;
  } catch (error) {
    console.error('[PUPPETEER] All launch attempts failed. Error details:', error);
    throw new Error(`Failed to launch Chrome after trying all configurations: ${(error as Error).message}. For (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.`);
  }
} 