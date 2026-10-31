import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

function getOperatorPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

const outDir = path.resolve('docs/screenshots/responsive');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const password = getOperatorPassword();

  const viewports = [
    { label: '390', width: 390, height: 844 },
    { label: '768', width: 768, height: 1024 },
    { label: '1280', width: 1280, height: 900 },
    { label: '1920', width: 1920, height: 1080 },
  ];

  const screens = [
    { name: 'home', url: '/' },
    { name: 'found-list', url: '/businesses?demo=true' },
    { name: 'emails', url: '/emails?demo=true' },
    { name: 'manual', url: '/contact-manually?demo=true' },
    { name: 'run-and-schedule', url: '/run-and-schedule' },
    { name: 'safety', url: '/safety' },
    { name: 'setup', url: '/setup' },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Capturing viewport ${vp.label}px (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();

    // 1. Capture Login (unauthenticated)
    for (const theme of ['dark', 'light']) {
      await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await page.waitForTimeout(200);
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

    // Enable demo data for preview
    await page.evaluate(async () => {
      await fetch('/api/demo/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
    });

    // 3. Capture authenticated screens
    for (const scr of screens) {
      for (const theme of ['dark', 'light']) {
        await page.goto(`http://127.0.0.1:3000${scr.url}`, { waitUntil: 'networkidle' });
        await page.evaluate((t) => {
          if (t === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);
        await page.waitForTimeout(300);

        const filename = path.join(outDir, `${scr.name}-${vp.label}-${theme}.png`);
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`Saved: ${filename}`);
      }
    }

    // 4. Capture Found Details Drawer specifically
    for (const theme of ['dark', 'light']) {
      await page.goto('http://127.0.0.1:3000/businesses?demo=true', { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await page.waitForTimeout(300);

      const firstLead = page.locator('main article, main table tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();
        await page.waitForTimeout(400);
        const filename = path.join(outDir, `found-drawer-${vp.label}-${theme}.png`);
        await page.screenshot({ path: filename });
        console.log(`Saved: ${filename}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll responsive screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});

