/**
 * Smoke test for the engine facade (src/engine/index.ts) against the real
 * dev-data/seed-datapack.json — proves the facade wiring (Datapack -> pool -> generate)
 * actually runs end to end, not just compiles. replay() is intentionally excluded (see
 * index.ts's header SCOPE NOTE: not implemented in this pass).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DatapackSchema } from '../../src/contracts';
import { validatePack, generate, servability, equipmentImpact, type LoadedPack, type Derived } from '../../src/engine/index';
import { createEmptyState } from '../../src/engine/state';
import { loadPool } from '../../src/engine/pool';
import type { CheckIn } from '../../src/contracts';

function loadPack() {
  const raw = readFileSync(path.join(__dirname, '..', '..', 'dev-data', 'seed-datapack.json'), 'utf8');
  const parsed = DatapackSchema.parse(JSON.parse(raw));
  return parsed;
}

function baseCheckIn(): CheckIn {
  return {
    id: 'checkin_facade_test',
    type: 'check_in',
    created_at: '2026-09-22T18:00:00.000Z',
    updated_at: '2026-09-22T18:00:00.000Z',
    local_date: '2026-09-22',
    tz: 'America/Los_Angeles',
    env_id: 'ENV-APT',
    revises_check_in_id: null,
    R01: 45,
    R02: 'normal',
    R03: null,
    R04: 'same',
    R04b: null,
    R05: [],
    R06: 'no',
    R06_choice: null,
    R07: null,
    equipment_issues: [],
    alloy_answers: [],
    defaulted_fields: [],
    normal_day_shortcut: false,
  };
}

describe('engine facade (src/engine/index.ts)', () => {
  const pack = loadPack();

  it('validatePack admits the seed pack cleanly', () => {
    const result = validatePack(pack);
    expect(result.pool.length).toBeGreaterThan(0);
  });

  function loadedPack(): LoadedPack {
    const knownEquipmentIds = new Set(pack.equipment_catalog.map((c) => c.equipment_id));
    const { pool } = loadPool(pack.exercise_metadata, knownEquipmentIds);
    return { pack, pool };
  }

  function derived(): Derived {
    return { state: createEmptyState(), decisions: [], exposures: [], recoveryCredits: [], errors: [] };
  }

  it('generate() produces a result without throwing, wired through the real Datapack shape', () => {
    const { result } = generate(loadedPack(), derived(), baseCheckIn(), {
      now: '2026-09-22T18:00:00.000Z',
      generationId: 'gen_facade_test',
      userId: pack.profile.user_id,
    });
    expect(['SESSION', 'NO_SESSION']).toContain(result.result);
  });

  it('servability() reports without throwing and requires an explicit `now`', () => {
    const report = servability(loadedPack(), derived(), '2026-09-22T18:00:00.000Z');
    expect(Array.isArray(report.unservable)).toBe(true);
  });

  it('equipmentImpact() finds lines that reference a given equipment id', () => {
    const d = derived();
    d.state.lines['EX-TEST|PRIMARY|BILATERAL'] = {
      exercise_id: 'EX-TEST',
      role: 'PRIMARY',
      side: 'BILATERAL',
      range_min: 6,
      range_max: 10,
      step: 1,
      unit: 'REPS',
      state: 'BUILDING',
      next_load: 30,
      next_target: 8,
      implement: ['EQ009'],
      top_confirmations: 0,
      extended: false,
      consecutive_holds: 0,
      reduce_locked: false,
      last_exposure_at: '2026-09-01T00:00:00.000Z',
      last_decision: null,
    };
    const refs = equipmentImpact(d, 'EQ009');
    expect(refs).toEqual([{ exercise_id: 'EX-TEST', role: 'PRIMARY', side: 'BILATERAL' }]);
    expect(equipmentImpact(d, 'EQ999')).toEqual([]);
  });
});
