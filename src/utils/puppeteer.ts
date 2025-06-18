import puppeteer from 'puppeteer';

export async function createBrowser() {
  // Try to find Chrome in common locations
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/opt/google/chrome/chrome',
  ].filter(Boolean);

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

  // Try launching with different configurations
  for (const path of possiblePaths) {
    try {
      console.log(`Trying to launch Chrome from: ${path}`);
      const browser = await puppeteer.launch({
        ...launchOptions,
        executablePath: path,
      });
      console.log(`Successfully launched Chrome from: ${path}`);
      return browser;
    } catch (error) {
      console.log(`Failed to launch from ${path}:`, (error as Error).message);
    }
  }

  // Try without specifying executable path (let Puppeteer find it)
  try {
    console.log('Trying to launch Chrome without specifying path...');
    const browser = await puppeteer.launch(launchOptions);
    console.log('Successfully launched Chrome without specifying path');
    return browser;
  } catch (error) {
    console.log('Failed to launch without path:', (error as Error).message);
  }

  // Final fallback with minimal options
  try {
    console.log('Trying final fallback configuration...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    console.log('Successfully launched with fallback configuration');
    return browser;
  } catch (error) {
    throw new Error(`Failed to launch Chrome after trying all configurations: ${(error as Error).message}`);
  }
} 