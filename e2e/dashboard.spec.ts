import { test, expect } from '@playwright/test';

test.describe('GrowthSignal AI Platform E2E Flows', () => {
  test('loads overview dashboard and renders KPI metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('GrowthSignal AI Command Center');
    await expect(page.getByText('Pipeline A — Website Opportunities')).toBeVisible();
    await expect(page.getByText('Pipeline B — AI & Software Opportunities')).toBeVisible();
  });

  test('navigates to Pipeline A (Website Opportunities)', async ({ page }) => {
    await page.goto('/pipeline-a');
    await expect(page.locator('h1')).toContainText('Website Opportunities');
    await expect(page.getByText('Qualification Rule:')).toBeVisible();
  });

  test('navigates to Pipeline B (AI & Software Opportunities)', async ({ page }) => {
    await page.goto('/pipeline-b');
    await expect(page.locator('h1')).toContainText('AI & Software Engineering Opportunities');
  });

  test('navigates to Approval Queue and displays draft-only mode banner', async ({ page }) => {
    await page.goto('/approval-queue');
    await expect(page.locator('h1')).toContainText('AI Outreach & Approval Queue');
    await expect(page.getByText('Statutory Draft-Only Safety Mode Enforced:')).toBeVisible();
  });
});
