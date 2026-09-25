/**
 * Unit tests for prescription rule components (§G): role table lookup, sets (§G.2),
 * targets/load display (§G.3), and duration estimate / fitting / underfill (§G.5).
 */
import { describe, expect, it } from 'vitest';
import { loadFxConfig } from '../fixtures/fxConfig';
import { blockMinutes, computeSets, computeTargetLoad, computeUnderfill, estimateSessionMinutes, fitSession, roleTableRow } from '../../src/engine/prescription';
import type { LineStatusResult } from '../../src/engine/progression';
import type { Line } from '../../src/engine/types';

const config = loadFxConfig();

describe('roleTableRow (§G.1)', () => {
  it('returns the PRIMARY row', () => {
    expect(roleTableRow('PRIMARY', 'REPS', config)).toMatchObject({ range_min: 6, range_max: 10, default_sets: 3 });
  });

  it('picks CORE_TIME instead of CORE when the exercise is time-based', () => {
    const timeBased = roleTableRow('CORE', 'SECONDS', config);
    const repBased = roleTableRow('CORE', 'REPS', config);
    expect(timeBased).toMatchObject({ unit: 'SECONDS', range_min: 20, range_max: 40 });
    expect(repBased).toMatchObject({ unit: 'REPS', range_min: 8, range_max: 12 });
  });
});

describe('computeSets (§G.2)', () => {
  it('LIGHT posture gives every item 2 sets regardless of role', () => {
    expect(computeSets({ role: 'PRIMARY', unit: 'REPS', posture: 'LIGHT', isReplacedSlot: false, block: 'A', config })).toBe(2);
  });

  it('a replaced slot in block A or B uses 3 sets', () => {
    expect(computeSets({ role: 'ACCESSORY', unit: 'REPS', posture: 'NORMAL', isReplacedSlot: true, block: 'B', config })).toBe(3);
  });

  it('a replaced slot in block C keeps the role default (replacement bump is A/B only)', () => {
    expect(computeSets({ role: 'CORE', unit: 'REPS', posture: 'NORMAL', isReplacedSlot: true, block: 'C', config })).toBe(2);
  });

  it('falls back to the role table default otherwise', () => {
    expect(computeSets({ role: 'SECONDARY', unit: 'REPS', posture: 'NORMAL', isReplacedSlot: false, block: 'A', config })).toBe(3);
  });
});

describe('computeTargetLoad (§G.3)', () => {
  const line = (overrides: Partial<Line> = {}): Line => ({
    exercise_id: 'EX012',
    role: 'PRIMARY',
    side: 'BILATERAL',
    range_min: 6,
    range_max: 10,
    step: 1,
    unit: 'REPS',
    state: 'BUILDING',
    next_load: 35,
    next_target: 8,
    implement: ['EQ009'],
    top_confirmations: 0,
    extended: false,
    consecutive_holds: 0,
    reduce_locked: false,
    last_exposure_at: '2026-09-01T00:00:00.000Z',
    last_decision: null,
    ...overrides,
  });

  it('CALIBRATE shows target = range_min and no load', () => {
    const status: LineStatusResult = { status: 'CALIBRATE', line: undefined };
    const result = computeTargetLoad(status, 'PRIMARY', 'REPS', config);
    expect(result).toMatchObject({ target: 6, load: null, line_state: 'CALIBRATE' });
  });

  it('SEEDED shows this role\'s range_min at the seed line\'s load', () => {
    const status: LineStatusResult = { status: 'SEEDED', line: undefined, seedFrom: line({ role: 'SECONDARY', next_load: 40 }) };
    const result = computeTargetLoad(status, 'PRIMARY', 'REPS', config);
    expect(result).toMatchObject({ target: 6, load: 40, line_state: 'SEEDED' });
  });

  it('BUILDING/LOAD_CAPPED show the line\'s own next_load x next_target verbatim', () => {
    const status: LineStatusResult = { status: 'NORMAL', line: line({ state: 'LOAD_CAPPED', next_load: 45, next_target: 11 }) };
    const result = computeTargetLoad(status, 'PRIMARY', 'REPS', config);
    expect(result).toMatchObject({ target: 11, load: 45, line_state: 'LOAD_CAPPED' });
  });

  it('RETURN repeats the last load and target', () => {
    const status: LineStatusResult = { status: 'RETURN', line: line({ next_load: 30, next_target: 7 }) };
    const result = computeTargetLoad(status, 'PRIMARY', 'REPS', config);
    expect(result).toMatchObject({ target: 7, load: 30, line_state: 'RETURN' });
  });

  it('IMPLEMENT_CHANGED shows last load/target as guidance', () => {
    const status: LineStatusResult = { status: 'IMPLEMENT_CHANGED', line: line({ next_load: 35, next_target: 8 }) };
    const result = computeTargetLoad(status, 'PRIMARY', 'REPS', config);
    expect(result).toMatchObject({ target: 8, load: 35, line_state: 'IMPLEMENT_CHANGED' });
  });
});

describe('§G.5 duration estimate and fitting', () => {
  it('estimateSessionMinutes matches the documented formula for one paired block', () => {
    const block = { block: 'A' as const, mode: 'PAIRED' as const, slot1Role: 'PRIMARY' as const, sets: 3, hasRamp: false, unilateralItemCount: 0 };
    const min = estimateSessionMinutes(6, [block], false, config);
    // prep 6 + block_min(1 + 3*3.0) = 6 + 10 = 16
    expect(min).toBeCloseTo(6 + (config.BLOCK_SETUP_MINUTES + 3 * config.PAIR_SET_MINUTES.PRIMARY), 5);
  });

  it('straight-sets blocks add STRAIGHT_SETS_ADD_MINUTES', () => {
    const paired = blockMinutes({ block: 'A', mode: 'PAIRED', slot1Role: 'PRIMARY', sets: 3, hasRamp: false, unilateralItemCount: 0 }, config);
    const straight = blockMinutes({ block: 'A', mode: 'STRAIGHT_SETS', slot1Role: 'PRIMARY', sets: 3, hasRamp: false, unilateralItemCount: 0 }, config);
    expect(straight - paired).toBeCloseTo(config.STRAIGHT_SETS_ADD_MINUTES, 5);
  });

  it('fitSession drops F, then trims sets C->B->A, then drops C, then B, in that order', () => {
    const blocks = [
      { block: 'A' as const, mode: 'PAIRED' as const, slot1Role: 'PRIMARY' as const, sets: 3, hasRamp: false, unilateralItemCount: 0 },
      { block: 'B' as const, mode: 'PAIRED' as const, slot1Role: 'PRIMARY' as const, sets: 3, hasRamp: false, unilateralItemCount: 0 },
      { block: 'C' as const, mode: 'PAIRED' as const, slot1Role: 'CORE' as const, sets: 2, hasRamp: false, unilateralItemCount: 0 },
    ];
    // A very small target forces every trim step.
    const result = fitSession(1, blocks, true, 10, config);
    expect(result.hasFinish).toBe(false);
    expect(result.trimsApplied[0]).toBe('DROP_F');
    expect(result.blocks.find((b) => b.block === 'A')?.sets).toBe(2); // never dropped, floors at 2
    expect(result.sessionMin).toBeLessThanOrEqual(10 + config.DURATION_TOLERANCE_MINUTES);
  });

  it('fitSession does nothing when the session already fits', () => {
    const blocks = [{ block: 'A' as const, mode: 'PAIRED' as const, slot1Role: 'PRIMARY' as const, sets: 2, hasRamp: false, unilateralItemCount: 0 }];
    const result = fitSession(4, blocks, false, 60, config);
    expect(result.trimsApplied).toEqual([]);
    expect(result.fits).toBe(true);
  });

  it('reports fits=false when even the minimal session exceeds target + tolerance', () => {
    const blocks = [
      { block: 'A' as const, mode: 'PAIRED' as const, slot1Role: 'PRIMARY' as const, sets: 2, hasRamp: false, unilateralItemCount: 0 },
    ];
    const result = fitSession(30, blocks, false, 5, config);
    expect(result.fits).toBe(false);
  });
});

describe('computeUnderfill (§G.5, [M-16])', () => {
  it('returns null when the gap does not exceed UNDERFILL_NOTICE_MINUTES', () => {
    const result = computeUnderfill({ targetMin: 45, sessionMin: 40, apartmentSessionsCompleted: 10, posture: 'NORMAL', anySlotEmptyAfterFallback: false, config });
    expect(result).toBeNull();
  });

  it('FIRST_SESSIONS takes priority when apartment_sessions_completed is low and the tier is maximal', () => {
    const result = computeUnderfill({ targetMin: 60, sessionMin: 30, apartmentSessionsCompleted: 0, posture: 'NORMAL', anySlotEmptyAfterFallback: false, config });
    expect(result?.cause).toBe('FIRST_SESSIONS');
  });

  it('LIGHT_POSTURE applies once past the first-sessions window', () => {
    const result = computeUnderfill({ targetMin: 45, sessionMin: 20, apartmentSessionsCompleted: 10, posture: 'LIGHT', anySlotEmptyAfterFallback: false, config });
    expect(result?.cause).toBe('LIGHT_POSTURE');
  });

  it('SLOTS_EMPTY applies when a slot could not be filled', () => {
    const result = computeUnderfill({ targetMin: 45, sessionMin: 20, apartmentSessionsCompleted: 10, posture: 'NORMAL', anySlotEmptyAfterFallback: true, config });
    expect(result?.cause).toBe('SLOTS_EMPTY');
  });

  it('TIER_BOUNDARY is the fallback cause', () => {
    const result = computeUnderfill({ targetMin: 30, sessionMin: 15, apartmentSessionsCompleted: 10, posture: 'NORMAL', anySlotEmptyAfterFallback: false, config });
    expect(result?.cause).toBe('TIER_BOUNDARY');
  });
});
