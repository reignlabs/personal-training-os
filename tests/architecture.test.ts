/**
 * Module boundaries and engine purity (APP_TECH_ARCHITECTURE_V0.md §6.3):
 *
 *   ui        -> app, contracts (types), domain
 *   app       -> engine, pack, store, platform, contracts, domain
 *   engine    -> contracts (types), domain
 *   pack      -> contracts, domain
 *   store     -> contracts, domain
 *   platform  -> domain
 *   domain    -> nothing
 *
 * The engine is also checked for purity: no Date.now, new Date() with no argument,
 * Math.random, localeCompare, window, indexedDB, or navigator anywhere under src/engine.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', 'src');

const ALLOWED: Record<string, string[]> = {
  ui: ['app', 'contracts', 'domain'],
  app: ['engine', 'pack', 'store', 'platform', 'contracts', 'domain'],
  engine: ['contracts', 'domain'],
  pack: ['contracts', 'domain'],
  store: ['contracts', 'domain'],
  platform: ['domain'],
  domain: [],
};

const MODULES = Object.keys(ALLOWED);

function listFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const IMPORT_RE = /import(?:[^'"]*from)?\s*['"]([^'"]+)['"]/g;

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const specs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(text))) specs.push(m[1]);
  return specs;
}

describe('module boundaries', () => {
  for (const mod of MODULES) {
    const files = listFiles(path.join(SRC, mod));
    for (const file of files) {
      const rel = path.relative(SRC, file);
      it(`${rel} only imports from its allowed modules`, () => {
        for (const spec of importsOf(file)) {
          if (!spec.startsWith('.')) continue; // package import — not a cross-module boundary
          const resolved = path.resolve(path.dirname(file), spec);
          const relFromSrc = path.relative(SRC, resolved);
          const targetModule = relFromSrc.split(path.sep)[0];
          if (!MODULES.includes(targetModule)) continue; // outside src/<module> (e.g. dev-data)
          if (targetModule === mod) continue; // same-module import always allowed
          expect(
            ALLOWED[mod].includes(targetModule),
            `${rel} imports "${spec}" (module "${targetModule}"), not allowed from "${mod}". Allowed: [${ALLOWED[mod].join(', ')}]`,
          ).toBe(true);
        }
      });
    }
  }
});

describe('engine purity', () => {
  const forbidden: [RegExp, string][] = [
    [/\bDate\.now\s*\(/, 'Date.now()'],
    [/\bnew Date\s*\(\s*\)/, 'new Date() with no argument'],
    [/\bMath\.random\s*\(/, 'Math.random()'],
    [/\.localeCompare\s*\(/, '.localeCompare('],
    [/\bwindow\b/, 'window'],
    [/\bindexedDB\b/, 'indexedDB'],
    [/\bnavigator\b/, 'navigator'],
  ];

  const files = listFiles(path.join(SRC, 'engine'));
  if (files.length === 0) {
    it('has files to check', () => {
      expect(files.length).toBeGreaterThan(0);
    });
  }
  // Strip comments before matching: this test guards against *code* using these
  // identifiers, not documentation that names them (as the file-header comments in
  // src/engine do, quoting this very rule).
  function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  }

  for (const file of files) {
    const rel = path.relative(SRC, file);
    it(`${rel} contains none of the forbidden engine identifiers`, () => {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const [re, label] of forbidden) {
        expect(re.test(code), `${rel} references ${label}, which is forbidden in src/engine`).toBe(false);
      }
    });
  }
});
