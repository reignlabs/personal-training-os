/**
 * Hand-written service worker (D-109; APP_TECH_ARCHITECTURE_V0.md §11-12). Not Workbox /
 * vite-plugin-pwa — D-109 rejected those explicitly since "never update mid-session"
 * needed custom code anyway.
 *
 * Install:  precache every file Vite's build manifest (`/.vite/manifest.json`, emitted by
 *           `build.manifest: true` in vite.config.ts) references, plus index.html and the
 *           static PWA assets under public/ (manifest.webmanifest, icons) — those aren't
 *           in Vite's manifest because public/ files are copied verbatim, never hashed.
 * Activate: delete every other pto-* cache (a previous build's leftovers).
 * Fetch:    cache-first for same-origin GET; navigations fall back to cached index.html
 *           (this is what makes the app open at all with no network).
 *
 * Update flow: a new worker installs and just waits — it never takes over on its own.
 * This file only knows caching; it has no idea whether a workout is in progress. It
 * activates only on an explicit {type:'SKIP_WAITING'} postMessage, which
 * src/platform/serviceWorker.ts only sends when src/app/store.ts has confirmed it's safe
 * (no workout IN_PROGRESS) — see AppStore.applyUpdateIfSafe().
 *
 * This file is plain, unbundled JS served as-is from public/ — it is NOT part of the
 * src/ module graph and the ui/app/engine/platform/domain boundary rules
 * (tests/architecture.test.ts) don't apply to it.
 */

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

// The cache name is a pure function of the asset list, so install() and activate() (which
// can run in different worker instances — an idle waiting worker can be killed and woken
// up later, losing ordinary JS variables) independently agree on it without any state
// stored elsewhere.
async function currentBuild() {
  const assets = new Set(STATIC_ASSETS);
  let manifest = {};
  try {
    const res = await fetch('/.vite/manifest.json', { cache: 'no-store' });
    if (res.ok) manifest = await res.json();
  } catch {
    // Offline on first install (unlikely), or no manifest (dev server) — fall back to
    // STATIC_ASSETS alone rather than failing install outright.
  }
  for (const entry of Object.values(manifest)) {
    if (entry.file) assets.add('/' + entry.file);
    for (const c of entry.css || []) assets.add('/' + c);
    for (const a of entry.assets || []) assets.add('/' + a);
  }
  const list = Array.from(assets).sort();
  let hash = 0;
  for (const ch of list.join(',')) hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0;
  return { assets: list, cacheName: 'pto-' + (hash >>> 0).toString(16) };
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const { assets, cacheName } = await currentBuild();
      const cache = await caches.open(cacheName);
      try {
        await cache.addAll(assets);
      } catch {
        // addAll is all-or-nothing; fall back to best-effort per-file so one blocked or
        // missing asset doesn't sink the whole install.
        await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const { cacheName } = await currentBuild();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('pto-') && k !== cacheName).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Sent by src/platform/serviceWorker.ts only after src/app/store.ts confirms no workout
// is IN_PROGRESS (D-109).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate';
  event.respondWith(
    (async () => {
      // `ignoreVary: true` matters here: some static servers (including Vite's own
      // preview server) send `Vary: Origin` on every response, and a `crossorigin`
      // script/stylesheet request sends an `Origin` header that a plain same-origin
      // `fetch()` (used to populate the cache during install) does not — without this,
      // Vary-aware matching treats every precached script/CSS file as a miss. We already
      // control exactly what gets cached (this build's own assets, nothing content- or
      // origin-negotiated), so ignoring Vary here is safe.
      const cached = await caches.match(isNavigation ? '/index.html' : req, { ignoreVary: true });
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (err) {
        if (isNavigation) {
          const shell = await caches.match('/index.html', { ignoreVary: true });
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
