import { test, expect } from '@playwright/test';

/**
 * Smoke test for the four screens added this pass — LOG ALLOY SESSION, HISTORY,
 * EQUIPMENT, PROFILE — driven through the real UI in a real browser against real
 * IndexedDB (no mocks). Complements tests/ui/coreLoop.spec.ts, which covers the
 * original TODAY -> Focus loop; this one covers the tab bar and the new screens.
 */
test('log an Alloy session, review it in history, edit equipment and profile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // ---- LOG ALLOY SESSION: a bare summary log (no items) — must be accepted gracefully ----
  await page.getByRole('button', { name: 'Log Alloy' }).click();
  await expect(page.getByRole('heading', { name: 'Log Alloy session' })).toBeVisible();
  await page.getByRole('button', { name: 'Save session' }).click();

  // Saving navigates back to History, where the new record should appear.
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('ALLOY').first()).toBeVisible();
  await expect(page.getByText('Summary only').first()).toBeVisible();

  // ---- edit that same record ----
  await page.locator('.card', { hasText: 'ALLOY' }).first().click();
  await expect(page.getByRole('heading', { name: 'Edit Alloy session' })).toBeVisible();
  await page.getByPlaceholder('How it felt, anything notable…').fill('felt good, light session');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible({ timeout: 10000 });

  // ---- EQUIPMENT: change availability and confirm it's reflected ----
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
  const firstEquipmentRow = page.locator('.list-row').first();
  await firstEquipmentRow.click();
  await page.getByRole('button', { name: 'Not available' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Not available').first()).toBeVisible();

  // ---- PROFILE: add and remove an avoidance ----
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.getByPlaceholder('Search exercises…').fill('Goblet Squat');
  await page.getByRole('button', { name: 'Goblet Squat' }).click();
  await page.getByRole('button', { name: 'Add avoidance' }).click();
  await expect(page.getByText('Goblet Squat').first()).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).first().click();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
