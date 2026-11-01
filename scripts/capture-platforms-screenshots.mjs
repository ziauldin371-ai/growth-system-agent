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

const outDir = path.resolve('docs/screenshots/platforms');
const artifactDir = path.resolve('C:/Users/HP/.gemini/antigravity/brain/f2824a3f-5db4-4933-8641-b732bfff7453');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const password = getOperatorPassword();
  const baseUrl = 'http://localhost:3000';

  console.log('Capturing Platforms UI screenshots against', baseUrl);

  // 1. Desktop 1280 dark
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // Login
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    if (await page.$('input[name="password"]')) {
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    // Go to /platforms
    await page.goto(`${baseUrl}/platforms`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Save 1280 dark
    const p1280Dark = path.join(outDir, 'platforms-directory-1280-dark.png');
    await page.screenshot({ path: p1280Dark, fullPage: false });
    fs.copyFileSync(p1280Dark, path.join(artifactDir, 'platforms-directory-1280-dark.png'));
    console.log('Captured:', p1280Dark);

    // Click on "View pitch" on the first card (e.g. Upwork)
    const viewPitchBtn = await page.$('button:has-text("View pitch")');
    if (viewPitchBtn) {
      await viewPitchBtn.click();
      await page.waitForTimeout(600);
      const pDrawerDark = path.join(outDir, 'platform-drawer-1280-dark.png');
      await page.screenshot({ path: pDrawerDark, fullPage: false });
      fs.copyFileSync(pDrawerDark, path.join(artifactDir, 'platform-drawer-1280-dark.png'));
      console.log('Captured:', pDrawerDark);

      // Close drawer with Done button
      const doneBtn = await page.$('button:has-text("Done")');
      if (doneBtn) {
        await doneBtn.click();
      } else {
        const closeBtn = await page.$('button[aria-label="Close drawer"]');
        if (closeBtn) await closeBtn.click();
      }
      await page.waitForTimeout(400);
    }

    // Open Profile modal
    const profileBtn = await page.$('button:has-text("My Profile")');
    if (profileBtn) {
      await profileBtn.click();
      await page.waitForTimeout(600);
      const pProfileDark = path.join(outDir, 'platform-profile-modal-1280-dark.png');
      await page.screenshot({ path: pProfileDark, fullPage: false });
      fs.copyFileSync(pProfileDark, path.join(artifactDir, 'platform-profile-modal-1280-dark.png'));
      console.log('Captured:', pProfileDark);

      // Close modal
      const closeProfile = await page.$('button:has-text("Cancel")');
      if (closeProfile) await closeProfile.click();
      await page.waitForTimeout(400);
    }

    // Toggle to Light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('growth_theme', 'light');
    });
    await page.waitForTimeout(500);
    const p1280Light = path.join(outDir, 'platforms-directory-1280-light.png');
    await page.screenshot({ path: p1280Light, fullPage: false });
    fs.copyFileSync(p1280Light, path.join(artifactDir, 'platforms-directory-1280-light.png'));
    console.log('Captured:', p1280Light);

    await ctx.close();
  }

  // 2. Mobile 390
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();

    // Login
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    if (await page.$('input[name="password"]')) {
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    // Go to /platforms
    await page.goto(`${baseUrl}/platforms`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const p390Dark = path.join(outDir, 'platforms-directory-390-dark.png');
    await page.screenshot({ path: p390Dark, fullPage: false });
    fs.copyFileSync(p390Dark, path.join(artifactDir, 'platforms-directory-390-dark.png'));
    console.log('Captured:', p390Dark);

    // Open Drawer / Bottom Sheet
    const viewPitchBtn = await page.$('button:has-text("View pitch")');
    if (viewPitchBtn) {
      await viewPitchBtn.click();
      await page.waitForTimeout(600);
      const pDrawer390Dark = path.join(outDir, 'platform-drawer-390-dark.png');
      await page.screenshot({ path: pDrawer390Dark, fullPage: false });
      fs.copyFileSync(pDrawer390Dark, path.join(artifactDir, 'platform-drawer-390-dark.png'));
      console.log('Captured:', pDrawer390Dark);
    }

    // Toggle to Light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('growth_theme', 'light');
    });
    await page.waitForTimeout(500);
    const p390Light = path.join(outDir, 'platforms-directory-390-light.png');
    await page.screenshot({ path: p390Light, fullPage: false });
    fs.copyFileSync(p390Light, path.join(artifactDir, 'platforms-directory-390-light.png'));
    console.log('Captured:', p390Light);

    await ctx.close();
  }

  await browser.close();
  console.log('Finished capturing all Platforms UI screenshots.');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
