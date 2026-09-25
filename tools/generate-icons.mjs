#!/usr/bin/env node
/**
 * One-off placeholder app icon generator (task: "app icons / metadata placeholders").
 * No image-generation dependency is added to the app itself — this script uses the
 * Playwright Chromium already installed for tests/ui/*.spec.ts to screenshot a tiny
 * inline HTML "icon" at each required size. Run with `node tools/generate-icons.mjs`
 * whenever the placeholder mark needs regenerating; the output PNGs are committed to
 * `public/icons/` like any other static asset (nothing regenerates them at build time).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const ACCENT = '#4f8cff';

/** `letterScale` controls how large the "P" mark sits relative to the canvas — smaller
 * for maskable icons so the mark survives an OS's circular/squircle mask (the "safe
 * zone" is roughly the center 80% of a maskable icon). */
function iconHtml(size, { maskable = false } = {}) {
  const letterScale = maskable ? 0.42 : 0.58;
  const radius = maskable ? 0 : Math.round(size * 0.22);
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;}
    .icon{
      width:${size}px;height:${size}px;
      background:${ACCENT};
      border-radius:${radius}px;
      display:flex;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    }
    .letter{
      color:white;font-weight:800;font-size:${Math.round(size * letterScale)}px;
      line-height:1;
    }
  </style></head><body>
    <div class="icon"><div class="letter">P</div></div>
  </body></html>`;
}

async function shoot(page, size, filename, opts) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(iconHtml(size, opts));
  const el = await page.$('.icon');
  await el.screenshot({ path: path.join(OUT_DIR, filename) });
  console.log('wrote', filename);
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();

  await shoot(page, 192, 'icon-192.png');
  await shoot(page, 512, 'icon-512.png');
  await shoot(page, 512, 'icon-512-maskable.png', { maskable: true });
  await shoot(page, 180, 'apple-touch-icon.png'); // iOS ignores manifest icons; needs its own <link>
  await shoot(page, 32, 'favicon-32.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
