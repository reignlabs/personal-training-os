/**
 * Integration smoke test: GENERATE (§C.1) wired end-to-end against the FX-META/FX-EQUIP/
 * FX-CONFIG fixtures, proving the engine runs independently of any UI. This is not a
 * canonical acceptance test (AT-H01's exact Appendix B/C values live only in the
 * project's full canonical copy of GENERATOR_ACCEPTANCE_TESTS_V0_2.md, not in this
 * repo's abridged loader copy — see loadFixtures.ts's own header comment) — it instead
 * checks the invariants every valid session must satisfy.
 */
import { describe, expect, it } from 'vitest';
import { loadFxMeta } from '../fixtures/loadFixtures';
import { fxEquipmentBaseline, loadFxConfig } from '../fixtures/fxConfig';
import { loadPool } from '../../src/engine/pool';
import { createEmptyState } from '../../src/engine/state';
import { generate, type GenerateArgs } from '../../src/engine/generate';
import { daySeed } from '../../src/domain/seed';
import { toLocalDate } from '../../src/domain/time';
import type { CheckIn } from '../../src/contracts';

const NOW = '2026-09-24T18:00:00.000Z';
const TZ = 'America/Los_Angeles';

function baseCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'checkin_test',
    type: 'check_in',
    created_at: NOW,
    updated_at: NOW,
    local_date: toLocalDate(NOW, TZ),
    tz: TZ,
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
    ...overrides,
  };
}

function buildArgs(overrides: Partial<GenerateArgs> = {}): GenerateArgs {
  const rawRows = loadFxMeta();
  const equipmentBaseline = fxEquipmentBaseline();
  const knownEquipmentIds = new Set(equipmentBaseline.map((e) => e.equipment_id));
  const { pool } = loadPool(rawRows, knownEquipmentIds);
  const config = loadFxConfig();
  const state = createEmptyState();
  const todayLocalDate = toLocalDate(NOW, TZ);
  return {
    pool,
    equipmentBaseline,
    constraints: [],
    avoidances: new Set(),
    config,
    state,
    checkIn: baseCheckIn(),
    now: NOW,
    tz: TZ,
    todayLocalDate,
    seed: daySeed('nelson', todayLocalDate, state.apartment_sessions_completed),
    alloy: { prompts_asked: [], answers: [], credits_applied: [], recovery_credits_applied: [] },
    metadataRejected: [],
    ...overrides,
  };
}

describe('generate() cold start (H-COLD)', () => {
  it('loads the fixture pool cleanly (V-00 rejects nothing unexpected)', () => {
    const rawRows = loadFxMeta();
    const equipmentBaseline = fxEquipmentBaseline();
    const knownEquipmentIds = new Set(equipmentBaseline.map((e) => e.equipment_id));
    const { pool, rejected } = loadPool(rawRows, knownEquipmentIds);
    expect(rejected).toEqual([]);
    expect(pool.length).toBe(81);
  });

  it('returns a SESSION, not NO_SESSION, for a 45-minute cold-start apartment session', () => {
    const result = generate(buildArgs());
    expect(result.result).toBe('SESSION');
  });

  it('block A always has at least one item (V-06)', () => {
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    expect(result.items.some((i) => i.block === 'A')).toBe(true);
  });

  it('every item is a distinct exercise (V-04)', () => {
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    const ids = result.items.map((i) => i.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cold start: every main-role item is CALIBRATE (no prior lines)', () => {
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    const mainItems = result.items.filter((i) => i.role === 'PRIMARY' || i.role === 'SECONDARY');
    expect(mainItems.length).toBeGreaterThan(0);
    for (const item of mainItems) {
      expect(item.lineState).toBe('CALIBRATE');
      expect(item.load).toBeNull();
    }
  });

  it('cold start: A1 leads with a LOWER family exercise (KD or HD)', () => {
    // §C.4.2/[M-01]: family_last_trained AND family_last_primary are both null (tied)
    // for every family at cold start, so the tie-break is LOWER_ROLE_ALTERNATION with
    // the "First session: squatting leads by default" text (§J.3), not STALEST_LOWER —
    // STALEST_LOWER only fires once the two lower families' *_last_trained differ.
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    const a1 = result.items.find((i) => i.slot === 'A1');
    expect(a1).toBeDefined();
    expect(['KD', 'HD']).toContain(a1!.family);
    expect(a1!.familyReasonCode).toBe('LOWER_ROLE_ALTERNATION');
    expect(a1!.role).toBe('PRIMARY');
  });

  it('duration estimate is within the requested 45 minutes plus tolerance', () => {
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    expect(result.durationEstimateMin).toBeLessThanOrEqual(45 + 3);
  });

  it('VPULL is reported unservable (capability not confirmed, §3.3)', () => {
    const result = generate(buildArgs());
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    expect(result.unservable.some((u) => u.family === 'VPULL')).toBe(true);
  });

  it('R06=yes/skip returns NO_SESSION(USER_SKIP)', () => {
    const result = generate(buildArgs({ checkIn: baseCheckIn({ R06: 'yes', R06_choice: 'skip' }) }));
    expect(result).toMatchObject({ result: 'NO_SESSION', reason: 'USER_SKIP' });
  });

  it('R01 below MIN_SESSION_MINUTES returns NO_SESSION(TOO_SHORT)', () => {
    const result = generate(buildArgs({ checkIn: baseCheckIn({ R01: 10 }) }));
    expect(result).toMatchObject({ result: 'NO_SESSION', reason: 'TOO_SHORT' });
  });

  it('is deterministic: identical inputs produce an identical item list', () => {
    const a = generate(buildArgs());
    const b = generate(buildArgs());
    expect(a).toEqual(b);
  });

  it('LIGHT posture (R02=low) gives every item 2 sets and never adds/removes/reorders blocks A-C', () => {
    const normal = generate(buildArgs());
    const light = generate(buildArgs({ checkIn: baseCheckIn({ R02: 'low' }) }));
    if (normal.result !== 'SESSION' || light.result !== 'SESSION') throw new Error('expected SESSION');
    expect(light.posture).toBe('LIGHT');
    const lightBlocks = new Set(light.items.map((i) => i.block).filter((b) => b !== 'F'));
    const normalBlocks = new Set(normal.items.map((i) => i.block).filter((b) => b !== 'F'));
    expect(lightBlocks).toEqual(normalBlocks);
    for (const item of light.items) {
      if (item.block === 'F') continue;
      expect(item.sets).toBe(2);
    }
  });
});
