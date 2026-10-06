import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const outputDir = path.resolve('public/demo-assets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching browser with Chrome executable...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  console.log('Navigating to https://unifyhubz.vercel.app/ ...');
  await page.goto('https://unifyhubz.vercel.app/', { waitUntil: 'networkidle' });

  // Ensure dark mode is set in localStorage and document
  await page.evaluate(() => {
    localStorage.setItem('unifyhub_theme', 'dark');
    document.documentElement.classList.remove('light', 'aesthetic');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1000);

  // 1. Landing Hero
  console.log('Capturing Slide 1: Hero Landing');
  await page.screenshot({ path: path.join(outputDir, 'slide-01-hero.png') });

  // 2. Scroll into Command Station preview / features
  console.log('Capturing Slide 2: Command Station Concept');
  const demoContainer = await page.$('[data-slipstream-demo]');
  if (demoContainer) {
    await demoContainer.evaluate(el => el.scrollBy({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(800);
  } else {
    await page.evaluate(() => window.scrollBy(0, 500));
  }
  await page.screenshot({ path: path.join(outputDir, 'slide-02-features.png') });

  // 3. Navigate to Dashboard (Try Demo / Open Command Station / /dashboard)
  console.log('Navigating to /dashboard ...');
  await page.goto('https://unifyhubz.vercel.app/dashboard', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('unifyhub_theme', 'dark');
    document.documentElement.classList.remove('light', 'aesthetic');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1500);

  console.log('Capturing Slide 3: Dashboard Overview');
  await page.screenshot({ path: path.join(outputDir, 'slide-03-dashboard.png') });

  // 4. Click Integrations / Add Provider modal
  console.log('Navigating to Integrations or Providers modal...');
  // Check if Integrations link is present or navigate to /integrations
  await page.goto('https://unifyhubz.vercel.app/integrations', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('unifyhub_theme', 'dark');
    document.documentElement.classList.remove('light', 'aesthetic');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1000);

  console.log('Capturing Slide 4: Integrations Catalog');
  await page.screenshot({ path: path.join(outputDir, 'slide-04-integrations.png') });

  // 5. Highlight / hover or click Connect Google Provider
  console.log('Connecting Google Provider simulation...');
  // Find Google button or card
  const googleBtn = await page.locator('button:has-text("Connect Google"), div:has-text("Google Workspace")').first();
  if (await googleBtn.isVisible()) {
    await googleBtn.scrollIntoViewIfNeeded();
    await googleBtn.hover();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outputDir, 'slide-05-google-select.png') });

  // Click on Google connect to see state or modal
  try {
    const connectBtn = await page.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Note on click:', e);
  }
  await page.screenshot({ path: path.join(outputDir, 'slide-06-google-connected.png') });

  // 6. Return to Dashboard / Calendar with synced streams
  console.log('Navigating to Calendar / Synced Stream...');
  await page.goto('https://unifyhubz.vercel.app/calendar', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('unifyhub_theme', 'dark');
    document.documentElement.classList.remove('light', 'aesthetic');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outputDir, 'slide-07-calendar-sync.png') });

  // 7. Command Palette (Cmd+K / Ctrl+K) or Quick Actions
  console.log('Triggering Quick Action / Command Station...');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outputDir, 'slide-08-command-palette.png') });

  await browser.close();
  console.log('Visual scan & screenshot capture complete!');
}

run().catch(err => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
