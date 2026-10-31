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

test.describe('Stitch Design System — Acceptance & Honest Verification', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('Login page')) return;
    const pass = getOperatorPassword();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
  });

  test('Home empty state shows zeros and friendly reassurance', async ({ page }) => {
    await page.goto('/');

    // Check greeting
    await expect(page.getByText('Good morning, Zia!')).toBeVisible();

    // Check 4 number cards
    await expect(page.getByText('Found Today')).toBeVisible();
    await expect(page.getByText('Sent Safely')).toBeVisible();
    await expect(page.getByText('Hot Replies')).toBeVisible();
    await expect(page.getByText('Direct Contact')).toBeVisible();

    // With no real sent records, verify safe zero counts
    const sentCard = page.locator('div', { hasText: 'Sent Safely' }).first();
    await expect(sentCard).toContainText('0');

    // Pipeline section
    await expect(page.getByText("Today's Pipeline")).toBeVisible();
  });

  test('Demo toggle shows DEMO badges and explicit warning banner', async ({ page }) => {
    await page.goto('/?demo=true');

    // Banner is visible
    await expect(page.getByText('Demo data is shown; these are not real businesses')).toBeVisible();

    // DEMO badge is visible
    await expect(page.locator('span', { hasText: 'DEMO' }).first()).toBeVisible();
  });

  test('Emergency Stop switches system state cleanly', async ({ page }) => {
    await page.goto('/safety');

    // Verify Emergency Stop button exists
    const emergencyBtn = page.getByRole('button', { name: /Emergency Stop Everything/i });
    await expect(emergencyBtn).toBeVisible();

    // Click to pause
    await emergencyBtn.click();
    await expect(page.getByText('All automated sequences paused immediately')).toBeVisible();
    await expect(page.getByRole('button', { name: /Resume Automated Sequences/i })).toBeVisible();

    // Click to resume
    const resumeBtn = page.getByRole('button', { name: /Resume Automated Sequences/i });
    await resumeBtn.click();
    await expect(page.getByRole('button', { name: /Emergency Stop Everything/i })).toBeVisible();
  });

  test('Contact Manually: Copy Script copies and shows toast feedback', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/contact-manually');

    const copyBtn = page.getByRole('button', { name: /Copy Script to Clipboard/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Toast appears
    await expect(page.getByText('Script copied to clipboard!')).toBeVisible();
  });

  test('Responsive shell: Sidebar on desktop (1280px) and Bottom Nav on mobile (390px)', async ({ page }) => {
    // 1. Desktop Viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toBeVisible();
    await expect(desktopSidebar.locator('nav a')).toHaveCount(7);

    const mobileNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(mobileNav).toBeHidden();

    // 2. Mobile Viewport (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(desktopSidebar).toBeHidden();
    await expect(mobileNav).toBeVisible();

    // Mobile nav has 4 main links + 1 more button = 5 items
    await expect(mobileNav.locator('a, button')).toHaveCount(5);
    await expect(mobileNav.getByRole('link', { name: /Today/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Found/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Emails/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Manual/i })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /More/i })).toBeVisible();
  });
});

