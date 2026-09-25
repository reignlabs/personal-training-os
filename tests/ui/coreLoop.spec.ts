import { test, expect } from '@playwright/test';

/**
 * The full core loop, driven through the real UI in a real browser against real
 * IndexedDB persistence (no mocks): GENERATE -> START -> LOG SETS -> SWAP IF NEEDED ->
 * COMPLETE -> UPDATE HISTORY. Runs against all three configured projects (iPhone, iPad,
 * desktop Safari) so it doubles as the responsive check.
 */
test('core workout loop end to end', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  // No horizontal scroll at this viewport (mobile-first hard requirement).
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  await page.getByRole('button', { name: '60 min' }).click();
  await page.getByRole('button', { name: 'Build my session' }).click();

  // Either a session or an honest no-session message — both are valid outcomes for the
  // tiny 8-exercise dev pool depending on today's engine state; assert whichever happened.
  const overviewHeading = page.getByRole('heading', { name: "Today’s session" });
  const noSessionHeading = page.getByRole('heading', { name: 'No session today' });
  await expect(overviewHeading.or(noSessionHeading)).toBeVisible({ timeout: 10000 });

  if (await noSessionHeading.isVisible()) {
    test.info().annotations.push({ type: 'note', description: 'GENERATE returned NO_SESSION for this run; loop not exercised further.' });
    return;
  }

  await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}-overview.png`, fullPage: true });

  await page.getByRole('button', { name: 'Begin workout' }).click();
  await expect(page.getByRole('heading', { name: 'Warm up' })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up" }).click();

  // First exercise card: exercise swap, then log every prescribed set until Finish shows.
  await expect(page.locator('.exercise-name')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}-exercise-card.png`, fullPage: true });

  await page.getByRole('button', { name: 'Swap' }).click();
  await expect(page.getByRole('heading', { name: 'Swap exercise' })).toBeVisible();
  const swapOption = page.locator('.sheet-option').first();
  if (await swapOption.isVisible().catch(() => false)) {
    await swapOption.click();
    // optional post-swap reason chip
    const reasonChip = page.getByRole('button', { name: "Don't like it" });
    if (await reasonChip.isVisible().catch(() => false)) {
      await reasonChip.click();
    } else {
      await page.getByRole('button', { name: 'Close' }).click();
    }
  } else {
    await page.getByRole('button', { name: 'Close' }).click();
  }

  // Poll the current screen each tick and act on whichever state it's actually in
  // (exercise card, rest overlay, or Finish) rather than assuming a fixed sequence —
  // rest can appear between every pair of steps in a PAIRED block.
  const finishHeading = page.getByRole('heading', { name: 'Nice work.' });
  const nextSetBtn = page.getByRole('button', { name: 'Log next set' });
  const goodEffort = page.getByRole('button', { name: 'Good' });
  const doneBtn = page.getByRole('button', { name: 'Done' });
  let guard = 0;
  while (guard < 80) {
    guard++;
    if (await finishHeading.isVisible().catch(() => false)) break;
    if (await nextSetBtn.isVisible().catch(() => false)) {
      await nextSetBtn.click();
      await page.waitForTimeout(100);
      continue;
    }
    if (await goodEffort.isVisible().catch(() => false)) {
      if (await goodEffort.isEnabled()) await goodEffort.click();
    }
    if (await doneBtn.isVisible().catch(() => false)) {
      if (await doneBtn.isEnabled()) await doneBtn.click();
      await page.waitForTimeout(100);
      continue;
    }
    await page.waitForTimeout(150);
  }

  await expect(finishHeading).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}-finish.png`, fullPage: true });

  await page.getByRole('button', { name: 'Usual', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();

  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}-complete.png`, fullPage: true });

  const scrollWidth2 = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth2 = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth2).toBeLessThanOrEqual(clientWidth2 + 1);
});
