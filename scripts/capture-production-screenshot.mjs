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

const prodUrl = 'https://growth-system-agent-brown-orcin.vercel.app';
const artifactDir = 'C:/Users/HP/.gemini/antigravity/brain/f2824a3f-5db4-4933-8641-b732bfff7453';
const docsDir = path.resolve('docs', 'screenshots');

async function main() {
  console.log(`=== CAPTURING LIVE PRODUCTION SCREENSHOTS ===`);
  console.log(`Target: ${prodUrl}\n`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const password = getOperatorPassword();

  console.log('Navigating to live production login page...');
  await page.goto(`${prodUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Filling operator credentials...');
  await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  console.log('Waiting for authentication navigation...');
  await page.waitForURL(`${prodUrl}/`, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  console.log('Taking 1280px desktop production screenshot...');
  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopPathDocs = path.join(docsDir, 'live-production-1280.png');
  const desktopPathArtifact = path.join(artifactDir, 'live-production-1280.png');
  await page.screenshot({ path: desktopPathDocs, fullPage: false });
  fs.copyFileSync(desktopPathDocs, desktopPathArtifact);
  console.log(`✓ Saved desktop screenshot: ${desktopPathDocs}`);

  console.log('Taking 390px mobile production screenshot...');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePathDocs = path.join(docsDir, 'live-production-390.png');
  const mobilePathArtifact = path.join(artifactDir, 'live-production-390.png');
  await page.screenshot({ path: mobilePathDocs, fullPage: false });
  fs.copyFileSync(mobilePathDocs, mobilePathArtifact);
  console.log(`✓ Saved mobile screenshot: ${mobilePathDocs}`);

  await browser.close();
  console.log('\n=== LIVE SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Error capturing live production screenshot:', err);
  process.exit(1);
});
