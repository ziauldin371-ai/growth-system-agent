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
const docsDir = path.resolve('docs', 'screenshots', 'production');

async function main() {
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log(`=== CAPTURING LIVE CANONICAL PRODUCTION SCREENSHOTS ===`);
  console.log(`Target: ${prodUrl}\n`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  // 1. Capture Login at 1280px and 390px
  const loginContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${prodUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Capturing Login 1280px...');
  const login1280 = path.join(docsDir, 'login-1280.png');
  await loginPage.screenshot({ path: login1280, fullPage: false });

  console.log('Capturing Login 390px...');
  await loginPage.setViewportSize({ width: 390, height: 844 });
  const login390 = path.join(docsDir, 'login-390.png');
  await loginPage.screenshot({ path: login390, fullPage: false });
  await loginContext.close();

  // 2. Authenticate and Capture Home at 1280px and 390px
  const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await authContext.newPage();
  const password = getOperatorPassword();

  console.log('Navigating to login to authenticate...');
  await page.goto(`${prodUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  console.log('Waiting for authentication navigation to home...');
  await page.waitForURL(`${prodUrl}/`, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  console.log('Capturing Home 1280px...');
  await page.setViewportSize({ width: 1280, height: 800 });
  const home1280 = path.join(docsDir, 'home-1280.png');
  await page.screenshot({ path: home1280, fullPage: false });

  console.log('Capturing Home 390px...');
  await page.setViewportSize({ width: 390, height: 844 });
  const home390 = path.join(docsDir, 'home-390.png');
  await page.screenshot({ path: home390, fullPage: false });

  // Copy to artifacts for easy embedding
  fs.copyFileSync(home1280, path.join(artifactDir, 'canonical-home-1280.png'));
  fs.copyFileSync(home390, path.join(artifactDir, 'canonical-home-390.png'));
  fs.copyFileSync(login1280, path.join(artifactDir, 'canonical-login-1280.png'));
  fs.copyFileSync(login390, path.join(artifactDir, 'canonical-login-390.png'));

  // Also verify whether "Database not connected" banner appears on page
  const pageContent = await page.content();
  const hasDbError = pageContent.includes('Database not connected') || pageContent.includes('Could not find the table');
  console.log('Has database error banner in DOM?:', hasDbError);

  await browser.close();
  console.log('\n=== ALL CANONICAL PRODUCTION SCREENSHOTS SAVED ===');
}

main().catch(err => {
  console.error('Error capturing live production screenshot:', err);
  process.exit(1);
});
