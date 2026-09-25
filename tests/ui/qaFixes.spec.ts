import { test, expect } from '@playwright/test';

/**
 * Regression coverage for defects found and fixed during the V0 QA pass (see
 * docs/project-knowledge — QA report). Each test targets one fix directly, through the
 * real UI against real IndexedDB persistence, the same way tests/ui/coreLoop.spec.ts
 * does.
 */

async function buildSessionOrSkip(page: import('@playwright/test').Page, minutesLabel: string, testInfo: { skip: (c: boolean, m?: string) => void }) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: minutesLabel }).click();
  await page.getByRole('button', { name: 'Build my session' }).click();
  const overviewHeading = page.getByRole('heading', { name: "Today’s session" });
  const noSessionHeading = page.getByRole('heading', { name: 'No session today' });
  await expect(overviewHeading.or(noSessionHeading)).toBeVisible({ timeout: 10000 });
  testInfo.skip(await noSessionHeading.isVisible().catch(() => false), 'GENERATE returned NO_SESSION for this run; nothing to exercise.');
}

test('Today offers a 20-minute option (Bug fix: no way to request a short session existed before)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('button', { name: '20 min' })).toBeVisible();
});

test('Bug fix: STOPPED_SYMPTOM actually ends the exercise instead of trapping Focus mode on it', async ({ page }, testInfo) => {
  await buildSessionOrSkip(page, '60 min', testInfo);
  await page.getByRole('button', { name: 'Begin workout' }).click();
  await expect(page.getByRole('heading', { name: 'Warm up' })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up" }).click();
  await expect(page.locator('.exercise-name')).toBeVisible({ timeout: 10000 });

  const stoppedExercise = await page.locator('.exercise-name').innerText();
  await page.getByRole('button', { name: 'Something wrong?' }).click();
  await expect(page.getByRole('heading', { name: 'Something wrong?' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop — symptom' }).click();

  // Give the store a moment to persist + re-render, then assert we've moved on: either a
  // different exercise, the rest screen, or Finish — never the exact same exercise card.
  await page.waitForTimeout(300);
  const sameExerciseStillShown = (await page.locator('.exercise-name').innerText().catch(() => '(not an exercise card)')) === stoppedExercise;
  expect(sameExerciseStillShown).toBe(false);
});

test('Bug fix: a completed workout shows up in History immediately, without a reload', async ({ page }, testInfo) => {
  await buildSessionOrSkip(page, '45 min', testInfo);
  await page.getByRole('button', { name: 'Begin workout' }).click();
  await expect(page.getByRole('heading', { name: 'Warm up' })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up" }).click();
  await expect(page.locator('.exercise-name')).toBeVisible({ timeout: 10000 });

  const finishHeading = page.getByRole('heading', { name: 'Nice work.' });
  const nextSetBtn = page.getByRole('button', { name: 'Log next set' });
  const goodEffort = page.getByRole('button', { name: 'Good' });
  const doneBtn = page.getByRole('button', { name: /^Done/ });
  let guard = 0;
  while (guard < 100 && !(await finishHeading.isVisible().catch(() => false))) {
    guard++;
    if (await nextSetBtn.isVisible().catch(() => false)) {
      await nextSetBtn.click();
    } else if (await goodEffort.isVisible().catch(() => false)) {
      if (await goodEffort.isEnabled()) await goodEffort.click();
    } else if (await doneBtn.isVisible().catch(() => false)) {
      if (await doneBtn.isEnabled()) await doneBtn.click();
    }
    await page.waitForTimeout(100);
  }
  await expect(finishHeading).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Usual', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Back to Today' }).click();

  // Today itself should now acknowledge completion instead of showing the readiness form.
  await expect(page.getByRole('heading', { name: 'Done today' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Train again today' })).toBeVisible();

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByText('Nothing completed yet.')).not.toBeVisible();
  await expect(page.getByText('COMPLETED')).toBeVisible();
});

test('Bug fix: reloading mid-workout resumes Focus mode directly instead of dropping back to the plan Overview', async ({ page }, testInfo) => {
  await buildSessionOrSkip(page, '45 min', testInfo);
  await page.getByRole('button', { name: 'Begin workout' }).click();
  await expect(page.getByRole('heading', { name: 'Warm up' })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up" }).click();
  await expect(page.locator('.exercise-name')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.waitForTimeout(300);

  await page.reload();
  await expect(page.getByRole('heading', { name: "Today’s session" })).not.toBeVisible({ timeout: 3000 });
  const resumedIntoExerciseOrRest = page.locator('.exercise-name').or(page.locator('.rest-timer-number'));
  await expect(resumedIntoExerciseOrRest).toBeVisible({ timeout: 8000 });
});

test('Bug fix: "End workout" lets you leave Focus mode early and safely saves what was logged', async ({ page }, testInfo) => {
  await buildSessionOrSkip(page, '60 min', testInfo);
  await page.getByRole('button', { name: 'Begin workout' }).click();
  await expect(page.getByRole('heading', { name: 'Warm up' })).toBeVisible();
  // The escape hatch must exist even before warm-up is done.
  await expect(page.getByRole('button', { name: 'End workout' })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up" }).click();
  await expect(page.locator('.exercise-name')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByRole('heading', { name: 'End this workout now?' })).toBeVisible();
  await page.locator('.sheet').getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByRole('heading', { name: 'Ending here.' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Back to Today' }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('COMPLETED')).toBeVisible();

  // Not stuck: the tab bar and other tabs must work normally now.
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
});
