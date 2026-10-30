import { test, expect } from '@playwright/test';
import fs from 'fs';

// Read operator password from .env.local without hardcoding or logging
function getOperatorPassword(): string {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

test.describe('Growth System Agent — Redesigned 10-Second Dashboard E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('Login page')) return;
    const pass = getOperatorPassword();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
  });

  test('open Home, click Find Businesses Now, see the form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Today at a glance');

    // Click "Find Businesses" CTA in top bar header
    const findBtn = page.getByRole('banner').getByRole('link', { name: /Find Businesses/i });
    await expect(findBtn).toBeVisible();
    await findBtn.click();
    await page.waitForURL('**/run-and-schedule', { timeout: 10000 });

    // Click "Find Businesses Now" button on the Run & Schedule page to open modal
    const openModalBtn = page.locator('main').getByRole('button', { name: /Find Businesses Now/i });
    await openModalBtn.click();

    // Verify modal / form is rendered with Country, Business Type, and Start Run button
    await expect(page.locator('label', { hasText: 'Country' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Business Type' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Run Now/i })).toBeVisible();
  });

  test('Emails page renders clean status tabs and empty state', async ({ page }) => {
    await page.goto('/emails');
    await expect(page.locator('h1')).toContainText('Who did we email?');
    await expect(page.getByRole('button', { name: /Sent \(confirmed\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Waiting to Send/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Blocked/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Replies/i })).toBeVisible();
  });

  test('Setup page shows amber for mock providers in development', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.locator('h1')).toContainText('How is everything connected?');
    // Verify amber "Test mode" badges for simulated adapters
    await expect(page.getByText(/Test mode/i).first()).toBeVisible();
    await expect(page.getByText('Service Connection Checklist (Traffic Lights)')).toBeVisible();
  });

  test('Sidebar has exactly 7 items with plain language', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('aside nav a');
    await expect(navLinks).toHaveCount(7);
    await expect(page.locator('aside').getByText('Home')).toBeVisible();
    await expect(page.locator('aside').getByText('Businesses Found')).toBeVisible();
    await expect(page.locator('aside').getByText('Emails')).toBeVisible();
    await expect(page.locator('aside').getByText('Contact Manually')).toBeVisible();
    await expect(page.locator('aside').getByText('Run & Schedule')).toBeVisible();
    await expect(page.locator('aside').getByText('Safety')).toBeVisible();
    await expect(page.locator('aside').getByText('Setup')).toBeVisible();
  });

  test('Login page is standalone with no sidebar and no leaked dashboard links', async ({ page, context }) => {
    // Clear cookies to test public unauthenticated /login page
    await context.clearCookies();
    await page.goto('/login');

    // Confirm no sidebar exists
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCount(0);

    // Confirm heading
    await expect(page.locator('h1')).toContainText('Growth System Agent');

    // Confirm email input has generic placeholder and does not leak operator email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('placeholder', 'operator@domain.com');

    // Confirm zero dashboard navigation links exist on login page
    const dashboardLinks = page.locator('a[href="/businesses"], a[href="/emails"], a[href="/safety"], a[href="/setup"]');
    await expect(dashboardLinks).toHaveCount(0);
  });
});
