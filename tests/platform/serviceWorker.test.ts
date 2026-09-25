/**
 * D-109. This suite runs under vitest's `node` environment — there is no `navigator` or
 * `window` at all, which is exactly the "unsupported browser" case every guard clause in
 * src/platform/serviceWorker.ts exists for. The real registration/activation behavior
 * (install -> waiting -> skipWaiting -> controllerchange -> reload) can only be exercised
 * by an actual browser, which is what tests/ui/*.spec.ts (Playwright) is for.
 */
import { describe, expect, it } from 'vitest';
import { registerServiceWorker, onUpdateWaiting, applyWaitingUpdate } from '../../src/platform/serviceWorker';

describe('serviceWorker (no-navigator environment)', () => {
  it('registerServiceWorker resolves without throwing when there is no serviceWorker support', async () => {
    // Node 20+ exposes a bare `navigator` global (just userAgent info), but never
    // `navigator.serviceWorker` — exactly the "unsupported" branch this guards.
    expect(typeof navigator === 'undefined' || !('serviceWorker' in navigator)).toBe(true);
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('applyWaitingUpdate returns false when nothing has ever been registered', async () => {
    await expect(applyWaitingUpdate()).resolves.toBe(false);
  });

  it('onUpdateWaiting accepts a callback without throwing (never invoked here)', () => {
    let called = false;
    expect(() => onUpdateWaiting(() => (called = true))).not.toThrow();
    expect(called).toBe(false);
  });
});
