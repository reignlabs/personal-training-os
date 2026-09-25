import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DatapackSchema } from '../../src/contracts';

describe('dev-data/seed-datapack.json', () => {
  it('validates against DatapackSchema end to end', () => {
    const raw = readFileSync(path.join(__dirname, '..', '..', 'dev-data', 'seed-datapack.json'), 'utf8');
    const json = JSON.parse(raw);
    const result = DatapackSchema.safeParse(json);
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues, null, 2)).toBe(true);
  });
});
