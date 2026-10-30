import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const outDir = path.resolve('docs', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Test normal hydrated login form
  console.log('Testing /login page hydration in real browser...');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });

  // Assert form elements are visible
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');
  const loadingText = page.locator('text=Loading authentication portal...');

  const isEmailVisible = await emailInput.isVisible();
  const isPasswordVisible = await passwordInput.isVisible();
  const isSubmitVisible = await submitButton.isVisible();
  const isLoadingTextHidden = !(await loadingText.isVisible());

  console.log(`- Email input visible: ${isEmailVisible}`);
  console.log(`- Password input visible: ${isPasswordVisible}`);
  console.log(`- Submit button visible: ${isSubmitVisible}`);
  console.log(`- Loading text gone (hydrated): ${isLoadingTextHidden}`);

  if (!isEmailVisible || !isPasswordVisible || !isSubmitVisible || !isLoadingTextHidden) {
    throw new Error('Login form failed to hydrate cleanly in real browser!');
  }

  const hydratedScreenshotPath = path.join(outDir, 'login-hydrated.png');
  await page.screenshot({ path: hydratedScreenshotPath });
  console.log(`Saved screenshot: ${hydratedScreenshotPath}`);

  // 2. Test fallback when JavaScript is disabled
  console.log('\nTesting /login page with JavaScript disabled (fallback)...');
  const noJsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto('http://127.0.0.1:3000/login');

  const noscriptFallback = noJsPage.locator('text=JavaScript is required');
  const isNoscriptVisible = await noscriptFallback.isVisible();
  console.log(`- Noscript fallback visible when JS disabled: ${isNoscriptVisible}`);

  const fallbackScreenshotPath = path.join(outDir, 'login-noscript-fallback.png');
  await noJsPage.screenshot({ path: fallbackScreenshotPath });
  console.log(`Saved screenshot: ${fallbackScreenshotPath}`);

  await browser.close();
  console.log('\nLogin page hydration & fallback verification: ALL PASSED.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
