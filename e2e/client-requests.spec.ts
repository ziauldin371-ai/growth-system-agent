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

test.describe('Client Requests (Opportunity Radar) E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('Quick Capture standalone')) return;
    const pass = getOperatorPassword();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('ziauldin371@gmail.com');
    await page.locator('input[type="password"]').fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 15000 });
  });

  test('navigate to /client-requests and verify radar layout and actions', async ({ page }) => {
    await page.goto('/client-requests');
    await expect(page.getByText('Client Requests (Opportunity Radar)')).toBeVisible();
    await expect(page.getByText('New Today').first()).toBeVisible();
    await expect(page.getByText('Strong Matches').first()).toBeVisible();
    await expect(page.getByText('With Public Email').first()).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /Run Live Scan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Paste a Post/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Screenshot to Lead/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quick Capture/i })).toBeVisible();
  });

  test('paste a post, extract lead, and inspect pitch popup', async ({ page }) => {
    await page.goto('/client-requests');

    // Click Paste a Post
    await page.getByRole('button', { name: /Paste a Post/i }).click();
    await expect(page.getByText('Paste a Client Post')).toBeVisible();

    // Fill paste form
    await page.locator('input[placeholder*="Upwork"]').fill('Upwork');
    await page.locator('input[type="url"]').fill('https://www.upwork.com/jobs/~01example');
    await page.locator('textarea').fill(
      'We at CloudSync need a developer to build an automated n8n webhook listener that connects Shopify orders to PostgreSQL. Reach out to founder@cloudsync.io.'
    );

    // Submit
    await page.getByRole('button', { name: /Extract & Generate Pitch/i }).click();

    // Verify pitch modal opens
    await expect(page.getByText('CloudSync')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Email Pitch')).toBeVisible();
    await expect(page.getByText('Platform Message')).toBeVisible();
    await expect(page.getByText('Follow-Up (Day 4)')).toBeVisible();
    await expect(page.getByText('Read-aloud verified')).toBeVisible();

    // Click Copy Pitch button
    await page.getByRole('button', { name: /Copy Pitch/i }).click();

    // Close modal
    await page.getByRole('button', { name: /Close/i }).first().click();
  });

  test('Quick Capture standalone page operates cleanly', async ({ page }) => {
    await page.goto(
      '/capture?url=https%3A%2F%2Fnews.ycombinator.com%2Fitem%3Fid%3D999&title=Ask%20HN&text=Looking%20for%20an%20n8n%20workflow%20specialist'
    );
    await expect(page.getByText('Quick Capture')).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue(/Looking for an n8n workflow specialist/);
  });
});
