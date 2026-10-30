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

const outDir = path.resolve('docs', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const pages = [
  { name: 'home', path: '/' },
  { name: 'businesses', path: '/businesses' },
  { name: 'emails', path: '/emails' },
  { name: 'contact-manually', path: '/contact-manually' },
  { name: 'run-and-schedule', path: '/run-and-schedule' },
  { name: 'safety', path: '/safety' },
  { name: 'setup', path: '/setup' },
];

const viewports = [
  { label: '1280', width: 1280, height: 800 },
  { label: '390', width: 390, height: 844 },
];

const themes = ['dark', 'light'];

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const password = getOperatorPassword();

  // Create context and login
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  console.log('Logging in to obtain session...');
  await page.goto('http://127.0.0.1:3000/login');
  await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/', { timeout: 15000 });
  console.log('Authenticated successfully.');

  let count = 0;
  for (const p of pages) {
    for (const vp of viewports) {
      for (const theme of themes) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`http://127.0.0.1:3000${p.path}`, { waitUntil: 'networkidle' });

        if (theme === 'light') {
          await page.evaluate(() => {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            document.body.style.backgroundColor = '#f1f5f9';
            document.body.style.color = '#0f172a';
            // Adjust card containers for light appearance
            const darkElements = document.querySelectorAll('.bg-slate-900\\/80, .bg-slate-900, .bg-slate-950');
            darkElements.forEach(el => {
              el.setAttribute('data-orig-bg', el.className);
              el.style.backgroundColor = '#ffffff';
              el.style.borderColor = '#e2e8f0';
              el.style.color = '#0f172a';
            });
            const textWhites = document.querySelectorAll('.text-white, .text-slate-100');
            textWhites.forEach(el => {
              el.style.color = '#0f172a';
            });
            const textSlates = document.querySelectorAll('.text-slate-400');
            textSlates.forEach(el => {
              el.style.color = '#475569';
            });
          });
        } else {
          await page.evaluate(() => {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
          });
        }

        // Wait a tick for render stability
        await page.waitForTimeout(300);

        const fileName = `${p.name}-${vp.label}-${theme}.png`;
        const filePath = path.join(outDir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        count++;
        console.log(`[${count}/28] Saved: ${fileName}`);
      }
    }
  }

  await browser.close();
  console.log(`Finished generating all ${count} screenshots in ${outDir}`);
}

run().catch((err) => {
  console.error('Screenshot generation error:', err);
  process.exit(1);
});
