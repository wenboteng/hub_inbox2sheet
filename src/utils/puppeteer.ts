import puppeteer from 'puppeteer';

export async function createBrowser() {
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
    return await puppeteer.launch(launchOptions);
  } catch (error) {
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
      product: 'chrome' as const,
    };

    return await puppeteer.launch(fallbackOptions);
  }
} 