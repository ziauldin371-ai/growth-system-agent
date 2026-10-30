import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Read operator password from .env.local without hardcoding or logging
function getOperatorPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

const outDir = path.resolve('docs/screenshots/stitch');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const password = getOperatorPassword();

  const screens = [
    { name: 'home', url: '/' },
    { name: 'home-demo', url: '/?demo=true' },
    { name: 'found', url: '/businesses' },
    { name: 'found-demo', url: '/businesses?demo=true' },
    { name: 'emails', url: '/emails' },
    { name: 'emails-demo', url: '/emails?demo=true' },
    { name: 'manual', url: '/contact-manually' },
    { name: 'manual-demo', url: '/contact-manually?demo=true' },
    { name: 'safety', url: '/safety' },
    { name: 'run-and-schedule', url: '/run-and-schedule' },
    { name: 'setup', url: '/setup' },
  ];

  const viewports = [
    { label: '1280', width: 1280, height: 900 },
    { label: '390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // 1. Capture Login (unauthenticated)
    for (const theme of ['dark', 'light']) {
      await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await page.waitForTimeout(300);
      const filename = path.join(outDir, `login-${vp.label}-${theme}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved: ${filename}`);
    }

    // 2. Perform Login
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });

    // 3. Capture authenticated screens
    for (const scr of screens) {
      for (const theme of ['dark', 'light']) {
        await page.goto(`http://127.0.0.1:3000${scr.url}`, { waitUntil: 'networkidle' });
        await page.evaluate((t) => {
          if (t === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);
        await page.waitForTimeout(400);

        const filename = path.join(outDir, `${scr.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`Saved: ${filename}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('All stitch screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});

