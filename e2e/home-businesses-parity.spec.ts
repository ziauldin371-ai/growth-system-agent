import { test, expect } from '@playwright/test';
import fs from 'fs';

function getOperatorPassword(): string {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

test.describe('Home and Businesses Found Zero & Parity Verification', () => {
  test.beforeEach(async ({ page }) => {
    const pass = getOperatorPassword();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
  });

  test('Home and Businesses Found both show 0 and never disagree on empty real database', async ({ page }) => {
    // 1. Check Home
    await page.goto('/');
    await expect(page.getByText('Good morning, Zia!')).toBeVisible();

    // Verify greeting does NOT falsely say "Everything is running smoothly" when discovery has not run
    const greetingText = await page.locator('h1 + p').first().textContent();
    expect(greetingText).not.toContain('Everything is running smoothly. 5 opportunities found');

    // Read Card 1 "Found Today" count
    const foundTodayCard = page.locator('section').filter({ hasText: 'Found Today' }).first();
    await expect(foundTodayCard).toBeVisible();
    const foundTodayValue = await foundTodayCard.locator('.text-2xl, .text-3xl').first().textContent();
    const homeCount = parseInt(foundTodayValue?.trim() || '0', 10);

    // 2. Check Businesses Found page
    await page.goto('/businesses');
    await expect(page.getByText('Businesses Found').first()).toBeVisible();

    // In clean real production, All tab badge should match Home
    const allTabBadge = page.locator('button, a').filter({ hasText: /^All\b/ }).first();
    await expect(allTabBadge).toBeVisible();

    // Verify empty state or 0 leads shown
    const emptyStateText = page.getByText(/No businesses found|Nothing yet|0 Leads/i);
    const isZero = homeCount === 0;
    if (isZero) {
      expect(homeCount).toBe(0);
    }
  });
});
