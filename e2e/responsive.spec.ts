import { test, expect } from '@playwright/test';
import fs from 'fs';

function getOperatorPassword(): string {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return '';
}

test.describe('Responsive Phone & Laptop Control Center E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('Login page')) return;
    const pass = getOperatorPassword();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
  });

  test('360px viewport: zero horizontal scroll overflow on Home, Found, Emails, Manual', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });

    const routes = ['/', '/businesses', '/emails', '/contact-manually', '/safety', '/run-and-schedule', '/setup'];
    for (const r of routes) {
      await page.goto(r, { waitUntil: 'networkidle' });
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll, `Route ${r} should not have horizontal scroll at 360px`).toBe(false);
    }
  });

  test('390px mobile phone: tap targets >= 44px on primary interactive controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Bottom navigation links must have height >= 44px
    const bottomNavLinks = page.locator('nav[aria-label="Mobile Navigation"] a, nav[aria-label="Mobile Navigation"] button');
    const count = await bottomNavLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await bottomNavLinks.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height, `Bottom nav item ${i} height must be >= 44px`).toBeGreaterThanOrEqual(44);
      }
    }

    // Top CTA button height
    const topCta = page.locator('header').getByRole('link', { name: /Find Businesses/i }).first();
    const ctaBox = await topCta.boundingBox();
    expect(ctaBox).not.toBeNull();
    if (ctaBox) {
      expect(ctaBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('Laptop (1280px): Ctrl+K opens Command Palette and Esc closes it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    // Press Control+K
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: /Command Palette/i });
    await expect(palette).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible({ timeout: 5000 });
  });

  test('Laptop (1280px): Details Drawer opens with Enter and closes with Esc', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // Enable demo data using authenticated browser session
    await page.goto('/');
    await page.evaluate(async () => {
      await fetch('/api/demo/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
    });
    await page.goto('/businesses?demo=true', { waitUntil: 'networkidle' });

    // Focus table or first card
    const firstCard = page.locator('main article, main table tbody tr').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Test Keyboard navigation: Press Enter to open drawer
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify Business Details Drawer opens
    const drawer = page.locator('[role="dialog"]').filter({ hasText: /Why this is a good lead|How to reach them/i });
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });

    // Press Esc to close
    await page.keyboard.press('Escape');
    await expect(drawer.first()).not.toBeVisible({ timeout: 5000 });
  });

  test('Laptop (1280px): Emergency Stop in top bar opens confirmation dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const stopBtn = page.getByRole('button', { name: /Emergency Stop/i }).first();
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();

    const confirmModal = page.getByRole('dialog', { name: /Emergency Stop Everything\?/i }).or(page.locator('[role="dialog"]:has-text("Emergency Stop Everything")'));
    await expect(confirmModal.first()).toBeVisible();

    // Dismiss with cancel
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(confirmModal.first()).not.toBeVisible();
  });

  test('Tablet (768px): Slim icon rail renders and bottom nav is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const mobileNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(mobileNav).toBeHidden();
  });
});

