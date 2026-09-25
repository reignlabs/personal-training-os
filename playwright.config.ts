import { defineConfig, devices } from '@playwright/test';

// APP_TECH_ARCHITECTURE_V0.md §15 calls for WebKit; this sandbox only has Chromium
// installed (no network fetch for browser binaries here), so every project below pins
// browserName: 'chromium' explicitly and borrows only the viewport/UA/touch emulation
// from Playwright's device presets — a deliberate environment substitution, not a spec
// change. Per the current build task: optimize first for iPhone-sized screens (the
// default/primary project), then verify responsive behavior for iPad and desktop (the
// other two projects).
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  },
  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
  },
});
