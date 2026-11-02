import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/^ADMIN_PASSWORD=(.+)$/m);
  if (match) return match[1].trim();
  throw new Error('ADMIN_PASSWORD not found');
}

const ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity/brain/ec9c5b03-f47b-489b-b5c2-f83b881dd709';
const BASE_URL = 'https://growth-system-agent-brown.vercel.app';

async function capture() {
  const password = getAdminPassword();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
  console.log('2. Logged in successfully. Current URL:', page.url());

  // Wait for Home content
  await page.waitForSelector('h1:has-text("Good morning, Zia!")');

  const greetingSubtitle = await page.locator('h1 + p').first().textContent();
  console.log('Home Greeting Subtitle:', greetingSubtitle?.trim());

  const foundTodayCard = page.locator('section').filter({ hasText: 'Found Today' }).first();
  const foundTodayCount = await foundTodayCard.locator('.text-2xl, .text-3xl').first().textContent();
  const foundTodaySubtitle = await foundTodayCard.locator('.text-xs').first().textContent();
  console.log('Found Today Card Count:', foundTodayCount?.trim(), '| Subtitle:', foundTodaySubtitle?.trim());

  // Capture Home screenshot
  const homeScreenshotPath = path.join(ARTIFACT_DIR, 'home-production-zero.png');
  await page.screenshot({ path: homeScreenshotPath, fullPage: true });
  console.log('Saved Home screenshot to:', homeScreenshotPath);

  // 3. Navigate to Businesses Found page
  console.log('3. Navigating to Businesses Found (/businesses)...');
  await page.goto(`${BASE_URL}/businesses`, { waitUntil: 'networkidle' });

  // Read tab counts
  const allTab = await page.locator('button:has-text("All")').first().textContent();
  const noWebTab = await page.locator('button:has-text("No Website")').first().textContent();
  console.log('Businesses Tabs:', allTab?.trim(), '|', noWebTab?.trim());

  // Capture Businesses screenshot
  const businessesScreenshotPath = path.join(ARTIFACT_DIR, 'businesses-production-zero.png');
  await page.screenshot({ path: businessesScreenshotPath, fullPage: true });
  console.log('Saved Businesses screenshot to:', businessesScreenshotPath);

  await browser.close();
  console.log('Capture completed successfully!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
