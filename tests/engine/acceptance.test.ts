/**
 * Canonical generator acceptance tests (GENERATOR_ACCEPTANCE_TESTS_V0_2.md), run against
 * exact expected values taken from that document's own Appendix A (FX-META, already
 * loaded verbatim by tests/fixtures/loadFixtures.ts — never hand-transcribed, D-119) and
 * Appendix C (observed reference values), read from the project's canonical, unabridged
 * copy of the doc (the local tests/fixtures/ copy is intentionally abridged and omits
 * Appendix B/C).
 *
 * SCOPE, disclosed here and in the final report: this file implements only the subset of
 * the 49 canonical tests answerable with GEN() and direct filter evaluation against a
 * cold or INJECT-built state. The harness verbs COMPLETE / APT / EXPOSE / ALLOY — which
 * simulate a performer logging a workout and Alloy attendance — are NOT implemented here;
 * building them (a P-DEFAULT performer simulator translating a GeneratedItem back into
 * completion.ts's PerformedItemInput, plus an Alloy-log simulator) is real, separate
 * scope, not a short follow-on. That leaves AT-H01, most AT-02 to AT-25, AT-R01 to
 * AT-R05, and the corpus-based AT-P tests (which the spec builds from COMPLETE'd
 * sessions) unimplemented. What's covered here: AT-01, AT-09, AT-21, AT-M08 exactly as
 * specified, plus AT-P02/AT-P05/AT-P06's invariants re-checked over a smaller, GEN-only
 * corpus (explicitly not the spec's own corpus, which requires COMPLETE).
 */
import { describe, expect, it } from 'vitest';
import { loadFxMeta } from '../fixtures/loadFixtures';
import { fxEquipmentBaseline, loadFxConfig } from '../fixtures/fxConfig';
import { loadPool } from '../../src/engine/pool';
import { createEmptyState } from '../../src/engine/state';
import { generate, type GenerateArgs } from '../../src/engine/generate';
import { evaluateFilters, type FilterCtx } from '../../src/engine/filters';
import { effectiveEquipmentMap } from '../../src/engine/equipment';
import { daySeed } from '../../src/domain/seed';
import { toLocalDate } from '../../src/domain/time';
import type { CheckIn, Constraint } from '../../src/contracts';

const TZ = 'America/Los_Angeles';

// HC-01 / HC-02 as defined verbatim in ENGINE_WORKOUT_GENERATOR_V0_2_1.md §D's HF table
// and APP_DATA_CONTRACTS_V0.md §5.5 (FIXED bindings, not user-authored data) — needed by
// AT-09, which depends on HC-02's HF-02 binding. Not itemized in the acceptance-test
// doc's §3 fixture list because they are the engine's own fixed constraint pair, not a
// per-test fixture choice.
const HC01: Constraint = {
  constraint_id: 'HC-01',
  kind: 'HARD',
  status: 'ACTIVE',
  source: 'USER',
  label_in_app: 'No dip-position exercises',
  description_in_app: 'No dip-position exercises.',
  programming_effect_in_app: 'Exercises tagged dip are excluded.',
  review_question: null,
  engine_bindings: [{ filter: 'HF-01', where: { position_tags_any: ['dip'] }, outcome: 'EXCLUDED' }],
};
const HC02: Constraint = {
  constraint_id: 'HC-02',
  kind: 'HARD',
  status: 'ACTIVE_SCOPE_PENDING',
  source: 'USER',
  label_in_app: 'Push-up-position planks pending scope',
  description_in_app: 'Push-up-position planks pending scope.',
  programming_effect_in_app: 'High-plank exercises are excluded; unconfirmed plank positions are held.',
  review_question: 'Can you tolerate a push-up (high-plank) hand position?',
  engine_bindings: [
    { filter: 'HF-01', where: { hand_support_in: ['HIGH_PLANK'] }, outcome: 'EXCLUDED' },
    { filter: 'HF-02', where: { hand_support_in: ['PLANK_POSITION_UNCONFIRMED'] }, outcome: 'HELD_PENDING_SCOPE' },
  ],
};

function buildPool() {
  const rawRows = loadFxMeta();
  const equipmentBaseline = fxEquipmentBaseline();
  const knownEquipmentIds = new Set(equipmentBaseline.map((e) => e.equipment_id));
  return { ...loadPool(rawRows, knownEquipmentIds), equipmentBaseline };
}

function baseCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'checkin_test',
    type: 'check_in',
    created_at: '2026-09-22T18:00:00.000Z',
    updated_at: '2026-09-22T18:00:00.000Z',
    local_date: '2026-09-22',
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

function genArgs(now: string, overrides: Partial<GenerateArgs> = {}): GenerateArgs {
  const { pool, equipmentBaseline } = buildPool();
  const config = loadFxConfig();
  const state = createEmptyState();
  const todayLocalDate = toLocalDate(now, TZ);
  return {
    pool,
    equipmentBaseline,
    constraints: [],
    avoidances: new Set(),
    config,
    state,
    checkIn: baseCheckIn({ local_date: todayLocalDate, created_at: now, updated_at: now }),
    now,
    tz: TZ,
    todayLocalDate,
    seed: daySeed('nelson', todayLocalDate, state.apartment_sessions_completed),
    alloy: { prompts_asked: [], answers: [], credits_applied: [], recovery_credits_applied: [] },
    metadataRejected: [],
    ...overrides,
  };
}

describe('AT-01 · Cold start: anchors come from default_order, not the seed [M-05]', () => {
  const dates = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29'];

  it('the (A1, A2, B1, B2) tuple is identical on all eight dates and equals (EX012, EX066, EX011, EX054)', () => {
    for (const d of dates) {
      const now = `${d}T18:00:00.000Z`;
      const result = generate(genArgs(now, { checkIn: baseCheckIn({ local_date: d, R01: 45 }) }));
      if (result.result !== 'SESSION') throw new Error(`expected SESSION on ${d}`);
      const bySlot = (slot: string) => result.items.find((i) => i.slot === slot)?.exerciseId;
      expect([bySlot('A1'), bySlot('A2'), bySlot('B1'), bySlot('B2')]).toEqual(['EX012', 'EX066', 'EX011', 'EX054']);
    }
  });

  it('on 2026-09-22: block F is excluded from the plan, and the underfill cause is FIRST_SESSIONS', () => {
    const now = '2026-09-22T18:00:00.000Z';
    const result = generate(genArgs(now, { checkIn: baseCheckIn({ local_date: '2026-09-22', R01: 45 }) }));
    if (result.result !== 'SESSION') throw new Error('expected SESSION');
    expect(result.tier).not.toBe('ABCF'); // FIRST_SESSIONS_NO_FINISH keeps F out of a cold-start tier that would otherwise include it
    expect(result.items.some((i) => i.block === 'F')).toBe(false);
    expect(result.underfill?.cause).toBe('FIRST_SESSIONS');
  });
});

describe('AT-09 · Undocumented plank positions are HELD and never selected [M-08]', () => {
  it('EX003, EX075, EX085, EX092 each evaluate to HF-02 (HELD_PENDING_SCOPE)', () => {
    const { pool, equipmentBaseline } = buildPool();
    const equip = effectiveEquipmentMap(equipmentBaseline, {});
    const state = createEmptyState();
    const ctx: FilterCtx = {
      now: '2026-09-22T18:00:00.000Z',
      todayLocalDate: '2026-09-22',
      tz: TZ,
      posture: 'NORMAL',
      constraints: [HC01, HC02],
      avoidances: new Set(),
      todaySoreRegions: new Set(),
      equip,
      todayEquipmentIssues: [],
      state,
      selectedIds: new Set(),
      hoursSinceLower: null,
      repeatExclusionDays: 1,
      heavyLowerRecoveryHours: 24,
    };
    for (const id of ['EX003', 'EX075', 'EX085', 'EX092']) {
      const e = pool.find((p) => p.exercise_id === id);
      expect(e, `${id} missing from FX-META pool`).toBeDefined();
      const role = e!.roles_allowed[0];
      const result = evaluateFilters(e!, role, ctx, 'FULL');
      expect(result, `${id} expected HF-02 HELD_PENDING_SCOPE`).toEqual({ hfId: 'HF-02', outcome: 'HELD_PENDING_SCOPE' });
    }
  });

  it('none of the four ever appears in a generated session across a spread of check-ins', () => {
    const heldIds = new Set(['EX003', 'EX075', 'EX085', 'EX092']);
    const checkIns: Partial<CheckIn>[] = [
      { R01: 45 },
      { R01: 60 },
      { R01: 25, R02: 'low' },
      { R01: 45, R05: ['upper'] },
      { R01: 45, R05: ['lower'] },
    ];
    for (const ci of checkIns) {
      const now = '2026-09-22T18:00:00.000Z';
      const result = generate(genArgs(now, { constraints: [HC01, HC02], checkIn: baseCheckIn({ local_date: '2026-09-22', ...ci }) }));
      if (result.result !== 'SESSION') continue;
      for (const item of result.items) {
        expect(heldIds.has(item.exerciseId)).toBe(false);
      }
    }
  });
});

describe('AT-21 · Available only as another library row -> NOT_AVAILABLE [M-13]', () => {
  it('EX050 (Trap Bar Deadlift, needs EQ_TRAPBAR) evaluates to HF-06 EXCLUDED', () => {
    const { pool, equipmentBaseline } = buildPool();
    const equip = effectiveEquipmentMap(equipmentBaseline, {});
    const state = createEmptyState();
    const ctx: FilterCtx = {
      now: '2026-09-22T18:00:00.000Z',
      todayLocalDate: '2026-09-22',
      tz: TZ,
      posture: 'NORMAL',
      constraints: [],
      avoidances: new Set(),
      todaySoreRegions: new Set(),
      equip,
      todayEquipmentIssues: [],
      state,
      selectedIds: new Set(),
      hoursSinceLower: null,
      repeatExclusionDays: 1,
      heavyLowerRecoveryHours: 24,
    };
    const e = pool.find((p) => p.exercise_id === 'EX050');
    expect(e).toBeDefined();
    const result = evaluateFilters(e!, 'PRIMARY', ctx, 'FULL');
    expect(result).toEqual({ hfId: 'HF-06', outcome: 'EXCLUDED' });
  });
});

describe('AT-M08 · FX-META loads with zero rejections', () => {
  it('all 81 fixture rows load; nothing is rejected', () => {
    const rawRows = loadFxMeta();
    const equipmentBaseline = fxEquipmentBaseline();
    const knownEquipmentIds = new Set(equipmentBaseline.map((e) => e.equipment_id));
    const { pool, rejected } = loadPool(rawRows, knownEquipmentIds);
    expect(pool.length).toBe(81);
    expect(rejected).toEqual([]);
  });
});

describe('AT-P02 / AT-P05 / AT-P06 invariants (reduced GEN-only corpus, not the spec corpus)', () => {
  const checkIns: Partial<CheckIn>[] = [
    { R01: 45 },
    { R01: 60 },
    { R01: 25, R02: 'low' },
    { R01: 45, R05: ['upper'] },
    { R01: 45, R05: ['lower'] },
    { R01: 45, R04: 'worse', R04b: 'as_usual' },
  ];

  function corpus() {
    const now = '2026-09-22T18:00:00.000Z';
    return checkIns
      .map((ci) => generate(genArgs(now, { checkIn: baseCheckIn({ local_date: '2026-09-22', ...ci }) })))
      .filter((r): r is Extract<typeof r, { result: 'SESSION' }> => r.result === 'SESSION');
  }

  it('AT-P02: no item in any session is a HELD or EXCLUDED exercise (static filters all pass)', () => {
    const { equipmentBaseline } = buildPool();
    const equip = effectiveEquipmentMap(equipmentBaseline, {});
    for (const session of corpus()) {
      for (const item of session.items) {
        const e = buildPool().pool.find((p) => p.exercise_id === item.exerciseId)!;
        const ctx: FilterCtx = {
          now: '2026-09-22T18:00:00.000Z',
          todayLocalDate: '2026-09-22',
          tz: TZ,
          posture: session.posture,
          constraints: [],
          avoidances: new Set(),
          todaySoreRegions: new Set(),
          equip,
          todayEquipmentIssues: [],
          state: createEmptyState(),
          selectedIds: new Set(),
          hoursSinceLower: null,
          repeatExclusionDays: 1,
          heavyLowerRecoveryHours: 24,
        };
        const staticResult = evaluateFilters(e, item.role, ctx, 'STATIC');
        expect(staticResult, `${item.exerciseId} in slot ${item.slot} failed a static filter`).toBeNull();
      }
    }
  });

  it('AT-P05: main-role picks (A1/A2/B1/B2) are never decided by a draw', () => {
    for (const session of corpus()) {
      for (const slot of ['A1', 'A2', 'B1', 'B2']) {
        const item = session.items.find((i) => i.slot === slot);
        if (!item) continue;
        expect(item.selectionReasonCode.startsWith('DRAW')).toBe(false);
      }
    }
  });

  it('AT-P06: unservable families (VPULL, ANTI_LAT) are never planned', () => {
    for (const session of corpus()) {
      for (const item of session.items) {
        expect(['VPULL', 'ANTI_LAT']).not.toContain(item.family);
      }
      expect(session.unservable.some((u) => u.family === 'VPULL')).toBe(true);
      expect(session.unservable.some((u) => u.family === 'ANTI_LAT')).toBe(true);
    }
  });
});
