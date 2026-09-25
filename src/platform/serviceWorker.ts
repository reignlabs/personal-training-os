/**
 * Service worker registration + update primitives (D-109; APP_TECH_ARCHITECTURE_V0.md
 * §11-12). Pure browser-API wrapper — `platform -> domain` only, no knowledge of workouts
 * or app state. src/app/store.ts decides WHEN it's safe to apply a waiting update (no
 * workout IN_PROGRESS) and calls `applyWaitingUpdate()` then; this module just exposes the
 * mechanics: register, learn that an update is waiting, tell it to activate, reload once
 * it does.
 */

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let waitingCallback: (() => void) | null = null;
let reloadedOnce = false;
// `controllerchange` fires on the very first activation too (clients.claim() during a
// brand-new install claims the already-open page) — not just on a real update taking
// over. Reloading then would be a spurious, disruptive reload right after first load, so
// the reload only happens for a controllerchange this module itself asked for by calling
// applyWaitingUpdate() below.
let expectingReload = false;

function notifyIfWaiting(registration: ServiceWorkerRegistration): void {
  if (registration.waiting && navigator.serviceWorker.controller) {
    waitingCallback?.();
  }
}

function attach(registration: ServiceWorkerRegistration): void {
  notifyIfWaiting(registration);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      // "installed" while there's already a controller means this is an *update*
      // (not the very first install) waiting to take over.
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        waitingCallback?.();
      }
    });
  });
}

/** Registers `/sw.js` (a no-op, resolved promise on browsers without service worker
 * support, e.g. some in-app browsers). Safe to call more than once — subsequent calls
 * reuse the same registration. */
export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        attach(reg);
        return reg;
      },
      () => null,
    );

    // Fires once the new worker's skipWaiting() takes effect and it becomes the
    // controller — reload exactly once so the page picks up the new assets. Guarded by
    // `expectingReload` (see above) so this doesn't also fire on first-ever install.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!expectingReload || reloadedOnce) return;
      reloadedOnce = true;
      window.location.reload();
    });
  }

  await registrationPromise;
}

/** Registers a callback for "a new version has installed and is waiting to activate."
 * May fire more than once is not expected in practice (one waiting worker at a time), but
 * callers should treat it as idempotent. */
export function onUpdateWaiting(callback: () => void): void {
  waitingCallback = callback;
}

/** Tells the waiting worker to activate now. Returns false if there's nothing waiting
 * (nothing to do) — callers should only invoke this after `onUpdateWaiting` has fired and
 * they've confirmed it's safe to reload (D-109: not mid-workout). */
export async function applyWaitingUpdate(): Promise<boolean> {
  const registration = await (registrationPromise ?? Promise.resolve(null));
  const worker = registration?.waiting;
  if (!worker) return false;
  expectingReload = true;
  worker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
