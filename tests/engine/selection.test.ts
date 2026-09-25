/**
 * Unit tests for exercise selection (§E): sort keys (E.2), the anchor rule (E.1) and
 * its reason codes (E.3), and the seeded limited-variety draw (E.4).
 */
import { describe, expect, it } from 'vitest';
import {
  anchorOrder,
  orderEligible,
  roleUsesAnchors,
  selectForSlot,
  sortByKeys,
  type SelectionSortOpts,
  type SelectSlotArgs,
} from '../../src/engine/selection';
import { createEmptyState } from '../../src/engine/state';
import type { FilterCtx } from '../../src/engine/filters';
import type { PoolExercise } from '../../src/engine/pool';
import type { EffectiveEquipment } from '../../src/engine/equipment';

function exercise(id: string, overrides: Partial<PoolExercise> = {}): PoolExercise {
  return {
    exercise_id: id,
    status: 'ACTIVE',
    display_name: id,
    family: 'HPUSH',
    sub_target: null,
    roles_allowed: ['SECONDARY'],
    laterality: 'BILATERAL',
    per_side_logging: false,
    load_mode: 'EXTERNAL_LOAD',
    equipment_options: [['EQ009']],
    station: 'NONE',
    heavy_lower: false,
    right_triceps_involvement: 'NONE',
    hand_support: 'NONE',
    position_tags: [],
    sore_regions: [],
    capability_prereq: null,
    evidence_basis: 'ALLOY_LIBRARY',
    default_order: 1,
    library_order: 1,
    executed_as: null,
    demo_ref: null,
    authoring_note: null,
    ...overrides,
  };
}

function ctx(overrides: Partial<FilterCtx> = {}): FilterCtx {
  return {
    now: '2026-09-24T18:00:00.000Z',
    todayLocalDate: '2026-09-24',
    tz: 'America/Los_Angeles',
    posture: 'NORMAL',
    constraints: [],
    avoidances: new Set(),
    todaySoreRegions: new Set(),
    equip: new Map<string, EffectiveEquipment>([['EQ009', { availability: 'AVAILABLE', loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 }]]),
    todayEquipmentIssues: [],
    state: createEmptyState(),
    selectedIds: new Set(),
    hoursSinceLower: null,
    repeatExclusionDays: 1,
    heavyLowerRecoveryHours: 24,
    ...overrides,
  };
}

function baseOpts(overrides: Partial<SelectionSortOpts> = {}): SelectionSortOpts {
  return {
    preference: {},
    exerciseLastUsed: {},
    hasLine: () => false,
    anchorOtherRole: null,
    r04Worse: false,
    ...overrides,
  };
}

describe('roleUsesAnchors (§E.1)', () => {
  it('MOBILITY and CONDITIONING do not use anchors', () => {
    expect(roleUsesAnchors('MOBILITY')).toBe(false);
    expect(roleUsesAnchors('CONDITIONING')).toBe(false);
  });

  it('every other role does', () => {
    for (const r of ['PRIMARY', 'SECONDARY', 'CORE', 'CARRY', 'ACCESSORY'] as const) {
      expect(roleUsesAnchors(r)).toBe(true);
    }
  });
});

describe('sortByKeys (§E.2 sort keys)', () => {
  it('K1: a PREFER-tagged exercise sorts before a neutral one', () => {
    const a = exercise('EX-A');
    const b = exercise('EX-B');
    const opts = baseOpts({ preference: { 'EX-B': 'PREFER' } });
    const result = sortByKeys([a, b], ['K1'], opts);
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-B', 'EX-A']);
    expect(result.decidedBy).toBe('K1');
  });

  it('K2: a DISLIKE-tagged exercise sorts after a neutral one', () => {
    const a = exercise('EX-A');
    const b = exercise('EX-B');
    const opts = baseOpts({ preference: { 'EX-A': 'DISLIKE' } });
    const result = sortByKeys([a, b], ['K2'], opts);
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-B', 'EX-A']);
  });

  it('K4: an exercise with an existing loaded line sorts before one with none', () => {
    const a = exercise('EX-A');
    const b = exercise('EX-B');
    const opts = baseOpts({ hasLine: (id) => id === 'EX-B' });
    const result = sortByKeys([a, b], ['K4'], opts);
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-B', 'EX-A']);
  });

  it('K5: never-used (null) sorts before a used exercise, oldest-used sorts before newest', () => {
    const a = exercise('EX-A');
    const b = exercise('EX-B');
    const c = exercise('EX-C');
    const opts = baseOpts({ exerciseLastUsed: { 'EX-B': '2026-09-20T00:00:00.000Z', 'EX-C': '2026-09-01T00:00:00.000Z' } });
    const result = sortByKeys([a, b, c], ['K5'], opts);
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-A', 'EX-C', 'EX-B']);
  });

  it('K6: ALLOY_LIBRARY ranks above ALLOY_LIBRARY_ADAPTED, which ranks above other evidence bases', () => {
    const a = exercise('EX-A', { evidence_basis: 'ALLOY_LIBRARY_ADAPTED' });
    const b = exercise('EX-B', { evidence_basis: 'ALLOY_LIBRARY' });
    const result = sortByKeys([a, b], ['K6'], baseOpts());
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-B', 'EX-A']);
  });

  it('K7: lower default_order wins', () => {
    const a = exercise('EX-A', { default_order: 5 });
    const b = exercise('EX-B', { default_order: 2 });
    const result = sortByKeys([a, b], ['K7'], baseOpts());
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-B', 'EX-A']);
  });

  it('a full tie across every key breaks on exercise_id', () => {
    const b = exercise('EX-B');
    const a = exercise('EX-A');
    const result = sortByKeys([b, a], ['K7'], baseOpts());
    expect(result.ordered.map((e) => e.exercise_id)).toEqual(['EX-A', 'EX-B']);
  });
});

describe('orderEligible / anchorOrder seeded draw (§E.4)', () => {
  it('is deterministic: the same seed and slot key always produce the same order', () => {
    const a = exercise('EX-A');
    const b = exercise('EX-B');
    const c = exercise('EX-C');
    const r1 = orderEligible([a, b, c], 'CORE', baseOpts(), true, 12345, 'C1');
    const r2 = orderEligible([a, b, c], 'CORE', baseOpts(), true, 12345, 'C1');
    expect(r1.ordered.map((e) => e.exercise_id)).toEqual(r2.ordered.map((e) => e.exercise_id));
  });

  it('draws among a genuine tie (never-used, novel-draw-eligible role) and reports decidedBy DRAW', () => {
    const a = exercise('EX-A', { family: 'ANTI_EXT' });
    const b = exercise('EX-B', { family: 'ANTI_EXT' });
    const result = orderEligible([a, b], 'CORE', baseOpts(), true, 999, 'C1');
    expect(result.decidedBy).toBe('DRAW');
    expect(['EX-A', 'EX-B']).toContain(result.ordered[0].exercise_id);
  });

  it('never draws for PRIMARY/SECONDARY roles, even on a tie ([M-03])', () => {
    const a = exercise('EX-A', { roles_allowed: ['PRIMARY'] });
    const b = exercise('EX-B', { roles_allowed: ['PRIMARY'] });
    const result = anchorOrder([a, b], 'PRIMARY', baseOpts(), true, 999, 'A1');
    expect(result.decidedBy).not.toBe('DRAW');
  });

  it('does not draw when enableNovelDraw is false, even for a draw-eligible role', () => {
    const a = exercise('EX-A', { family: 'ANTI_EXT' });
    const b = exercise('EX-B', { family: 'ANTI_EXT' });
    const result = orderEligible([a, b], 'CORE', baseOpts(), false, 999, 'C1');
    expect(result.decidedBy).not.toBe('DRAW');
  });
});

describe('selectForSlot (§P SELECT, §E.1 anchor rule)', () => {
  function args(overrides: Partial<SelectSlotArgs> = {}): SelectSlotArgs {
    return {
      family: 'HPUSH',
      role: 'SECONDARY',
      subTarget: null,
      pool: [],
      state: createEmptyState(),
      ctx: ctx(),
      checkIn: { R04: 'same' },
      enableNovelDraw: true,
      seed: 1,
      slotKey: 'B2',
      ...overrides,
    };
  }

  it('returns null when no candidate exists for the family/role at all', () => {
    expect(selectForSlot(args({ pool: [] }))).toBeNull();
  });

  it('returns null when candidates exist but none pass the hard filters', () => {
    const blocked = exercise('EX-A');
    const result = selectForSlot(args({ pool: [blocked], ctx: ctx({ avoidances: new Set(['EX-A']) }) }));
    expect(result).toBeNull();
  });

  it('with no prior anchor, picks the top-sorted eligible candidate as NEW_ANCHOR_NONE_PRIOR', () => {
    const a = exercise('EX-A', { default_order: 1 });
    const b = exercise('EX-B', { default_order: 5 });
    const result = selectForSlot(args({ pool: [a, b] }));
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-A' }, reasonCode: 'NEW_ANCHOR_NONE_PRIOR', anchorBefore: null });
  });

  it('an eligible, non-rotating anchor is always kept, regardless of sort order (§E.1)', () => {
    const anchorEx = exercise('EX-B', { default_order: 9 }); // would rank worse than EX-A
    const other = exercise('EX-A', { default_order: 1 });
    const state = createEmptyState();
    state.anchors['HPUSH|SECONDARY|'] = { exercise_id: 'EX-B', exposures_as_anchor: 3, rotate_due: false, rotate_cause: null, note: null };
    const result = selectForSlot(args({ pool: [anchorEx, other], state }));
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-B' }, reasonCode: 'ANCHOR', anchorBefore: 'EX-B' });
  });

  it('an anchor blocked only for today (sore) substitutes for today, without rotating the anchor', () => {
    const anchorEx = exercise('EX-B', { sore_regions: ['UPPER'] });
    const alt = exercise('EX-A');
    const state = createEmptyState();
    state.anchors['HPUSH|SECONDARY|'] = { exercise_id: 'EX-B', exposures_as_anchor: 3, rotate_due: false, rotate_cause: null, note: null };
    const result = selectForSlot(
      args({ pool: [anchorEx, alt], state, ctx: ctx({ todaySoreRegions: new Set(['UPPER']) }) }),
    );
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-A' }, reasonCode: 'SUBSTITUTE_FOR_ANCHOR(HF-05)', anchorBefore: 'EX-B' });
  });

  it('a rotate_due anchor is retired: a fresh anchor is chosen and the reason names the rotation cause', () => {
    const anchorEx = exercise('EX-B');
    const alt = exercise('EX-A');
    const state = createEmptyState();
    state.anchors['HPUSH|SECONDARY|'] = { exercise_id: 'EX-B', exposures_as_anchor: 4, rotate_due: true, rotate_cause: 'EXPOSURES', note: null };
    const result = selectForSlot(args({ pool: [anchorEx, alt], state }));
    expect(result).not.toBeNull();
    expect(result!.reasonCode).toBe('NEW_ANCHOR_ROTATION(EXPOSURES)');
    expect(result!.anchorBefore).toBe('EX-B');
  });

  it('an anchor permanently blocked (not today-only) is replaced, reason names the blocking filter', () => {
    const anchorEx = exercise('EX-B');
    const alt = exercise('EX-A');
    const state = createEmptyState();
    state.anchors['HPUSH|SECONDARY|'] = { exercise_id: 'EX-B', exposures_as_anchor: 3, rotate_due: false, rotate_cause: null, note: null };
    const result = selectForSlot(args({ pool: [anchorEx, alt], state, ctx: ctx({ avoidances: new Set(['EX-B']) }) }));
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-A' }, reasonCode: 'NEW_ANCHOR_BLOCKED(HF-04)', anchorBefore: 'EX-B' });
  });

  it('when the statically-best candidate is only blocked for today, falls back to the truly eligible one as SUBSTITUTE_NO_ANCHOR', () => {
    const top = exercise('EX-TOP', { default_order: 1, sore_regions: ['UPPER'] });
    const alt = exercise('EX-ALT', { default_order: 5 });
    const result = selectForSlot(
      args({ pool: [top, alt], ctx: ctx({ todaySoreRegions: new Set(['UPPER']) }) }),
    );
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-ALT' }, reasonCode: 'SUBSTITUTE_NO_ANCHOR(HF-05)' });
  });

  it('R04=worse substitutes away from a right-triceps-heavy anchor toward a lighter-involvement option', () => {
    const anchorEx = exercise('EX-B', { right_triceps_involvement: 'PRIMARY' });
    const alt = exercise('EX-A', { right_triceps_involvement: 'NONE' });
    const state = createEmptyState();
    state.anchors['HPUSH|SECONDARY|'] = { exercise_id: 'EX-B', exposures_as_anchor: 3, rotate_due: false, rotate_cause: null, note: null };
    const result = selectForSlot(args({ pool: [anchorEx, alt], state, checkIn: { R04: 'worse' } }));
    expect(result).toMatchObject({ exercise: { exercise_id: 'EX-A' }, reasonCode: 'SUBSTITUTE_FOR_ANCHOR(R-04)', anchorBefore: 'EX-B' });
  });
});
