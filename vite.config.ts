import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// APP_TECH_ARCHITECTURE_V0.md §3: Vite + @vitejs/plugin-react, minimal configuration.
//
// `build.manifest: true` (D-109) emits `.vite/manifest.json` into the build output,
// mapping every entry/chunk/CSS/asset to its hashed filename. The hand-written service
// worker (public/sw.js) fetches that file at runtime to know exactly which files this
// build needs precached — no separate build step or plugin (e.g. Workbox/vite-plugin-pwa)
// needed, matching D-109's "hand-written, not Workbox" decision.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    manifest: true,
  },
});
