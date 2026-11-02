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

const prodUrl = 'https://growth-system-agent-brown.vercel.app';
const artifactDir = 'C:/Users/HP/.gemini/antigravity/brain/f2824a3f-5db4-4933-8641-b732bfff7453';

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const password = getOperatorPassword();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Logging in on production...');
  await page.goto(`${prodUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${prodUrl}/`, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('Logged in successfully!');

  // Navigate to /emails
  console.log('Navigating to /emails...');
  await page.goto(`${prodUrl}/emails`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Desktop 1280px screenshot
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(1000);
  const desktopPath = path.join(artifactDir, 'ui-emails-1280.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log(`Saved desktop screenshot to ${desktopPath}`);

  // Mobile 390px screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  const mobilePath = path.join(artifactDir, 'ui-emails-390.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`Saved mobile screenshot to ${mobilePath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
