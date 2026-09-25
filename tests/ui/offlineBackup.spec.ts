import { test, expect } from '@playwright/test';

/**
 * V0 infrastructure verification, driven through the real UI against the real production
 * build (Playwright's webServer runs `npm run preview` over `dist/`, not the dev server —
 * the service worker only makes sense against built, hashed assets; see vite.config.ts's
 * `build.manifest: true` and public/sw.js).
 *
 * 1. Service worker precache + offline reload (D-109, APP_TECH_ARCHITECTURE_V0.md §11-12):
 *    first load is online, then the app must still open with the network fully cut.
 * 2. Backup export/import round trip (D-107) through the actual Profile screen controls,
 *    not just the store-level unit tests in tests/app/backupStore.test.ts.
 */
test('service worker precaches the app so it still opens fully offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // Wait for this tab to actually be controlled by an active service worker — clients.claim()
  // in sw.js's activate handler runs only after install's cache.addAll() has finished, so by
  // the time the controller shows up the precache is populated.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 10000 });
  // The tab bar (a real interactive screen, not just a static shell) still renders and
  // still navigates entirely offline.
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

  await context.setOffline(false);
});

test('backup export / import round trip through the Profile screen', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

  // A distinctive, checkable change: add a goal, then export a backup that must include it.
  const goalText = `E2E backup check ${Date.now()}`;
  await page.getByPlaceholder('Add a goal…').fill(goalText);
  await page.getByRole('button', { name: 'Add goal' }).click();
  await expect(page.getByText(goalText)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  await expect(page.getByText(/Backup (shared|downloaded)\./)).toBeVisible();
  await expect(page.getByText(/^Last export: (?!never)/)).toBeVisible();

  // Import the same file back: the confirmation sheet should show real counts (not zero)
  // before anything is actually replaced.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import backup…' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(backupPath!);

  await expect(page.getByText('Replace all data with this backup?')).toBeVisible();
  await expect(page.getByText(/\d+ meta/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace everything' }).click();

  await expect(page.getByText('Backup restored.')).toBeVisible();
  // The goal added before export survived the full export -> restore round trip.
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText(goalText)).toBeVisible();
});
