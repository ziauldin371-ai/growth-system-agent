import { test, expect } from '@playwright/test';

test.describe('Growth System Agent — Redesigned 10-Second Dashboard E2E', () => {
  test('open Home, click Find Businesses Now, see the form', async ({ page }) => {
    await page.goto('/');
    // Check Home page header
    await expect(page.locator('h1')).toContainText('Today at a glance');
    
    // Click "Find Businesses Now" CTA
    const findBtn = page.getByRole('button', { name: /Find Businesses Now/i }).or(
      page.getByRole('link', { name: /Find Businesses Now/i })
    );
    await expect(findBtn.first()).toBeVisible();
    await findBtn.first().click();

    // Verify modal / form is rendered with Country, Business Type, and Start Run button
    await expect(page.getByText('Find Businesses Now')).toBeVisible();
    await expect(page.getByText('Business Type')).toBeVisible();
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
    await expect(page.getByText('Today at a glance')).toBeVisible();
    await expect(page.getByText('Businesses Found')).toBeVisible();
    await expect(page.getByText('Emails')).toBeVisible();
    await expect(page.getByText('Contact Manually')).toBeVisible();
    await expect(page.getByText('Run & Schedule')).toBeVisible();
    await expect(page.getByText('Safety')).toBeVisible();
    await expect(page.getByText('Setup')).toBeVisible();
  });
});
