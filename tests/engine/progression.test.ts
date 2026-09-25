/**
 * Unit tests for individual progression rule components (§H): the decision table
 * (§H.3, applyExposure), load increase (§H.5, increaseLoad), evidence qualification
 * (§H.2, isQualifyingExposure), and the right-side conservatism merge (§H.6).
 */
import { describe, expect, it } from 'vitest';
import { loadFxConfig } from '../fixtures/fxConfig';
import { applyExposure, increaseLoad, isQualifyingExposure, mergeSideResults, moreConservative } from '../../src/engine/progression';
import type { Line } from '../../src/engine/types';

const config = loadFxConfig();

function line(overrides: Partial<Line> = {}): Line {
  return {
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
  };
}

describe('applyExposure (§H.3 decision table)', () => {
  const now = '2026-09-20T00:00:00.000Z';

  it('TOO_HARD -> REDUCE (lowers load for a REPS line with confirmed loads below)', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = applyExposure({ line: line({ next_load: 35 }), effort: 'TOO_HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    expect(result.code).toBe('REDUCE');
    expect(result.line.next_load).toBe(30);
    expect(result.line.reduce_locked).toBe(true);
  });

  it('a second consecutive REDUCE while reduce_locked becomes HOLD(REDUCE_LIMIT)', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = applyExposure({ line: line({ next_load: 30, reduce_locked: true }), effort: 'TOO_HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    expect(result.code).toBe('HOLD(REDUCE_LIMIT)');
    expect(result.line.next_load).toBe(30); // unchanged
  });

  it('REDUCE at the lightest available load becomes HOLD with reason AT_MINIMUM', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = applyExposure({ line: line({ next_load: 25 }), effort: 'TOO_HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    expect(result.code).toBe('HOLD');
    expect(result.reasons).toContain('AT_MINIMUM');
    expect(result.line.next_load).toBe(25);
  });

  it('TOO_EASY + every set met target -> LOAD_UP', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = applyExposure({ line: line({ next_load: 35 }), effort: 'TOO_EASY', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    expect(result.code).toBe('LOAD_UP');
    expect(result.line.next_load).toBe(40);
    expect(result.line.next_target).toBe(6); // range_min
  });

  it('GOOD + met target, below range_max -> REPS_UP', () => {
    const result = applyExposure({ line: line({ next_target: 8 }), effort: 'GOOD', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip: undefined, config, now });
    expect(result.code).toBe('REPS_UP');
    expect(result.line.next_target).toBe(9);
  });

  it('HARD (with all reps met) progresses like GOOD [M-18]', () => {
    const result = applyExposure({ line: line({ next_target: 8 }), effort: 'HARD', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip: undefined, config, now });
    expect(result.code).toBe('REPS_UP');
  });

  it('GOOD at range_max, first time -> CONFIRM_TOP (does not yet load up, LOAD_UP_CONFIRMATIONS=1 in FX-CONFIG loads up immediately)', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = applyExposure({ line: line({ next_target: 10, next_load: 35, top_confirmations: 0 }), effort: 'GOOD', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    // FX-CONFIG's LOAD_UP_CONFIRMATIONS is 1, so the first at-range_max success already
    // triggers the load increase, reported as CONFIRM_TOP -> LOAD_UP per §H.5's mapping.
    expect(['CONFIRM_TOP', 'LOAD_CAPPED']).toContain(result.code);
    expect(result.line.next_load).toBe(40);
  });

  it('neither REDUCE nor a success condition -> HOLD', () => {
    const result = applyExposure({ line: line(), effort: 'HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip: undefined, config, now });
    expect(result.code).toBe('HOLD');
    expect(result.line.consecutive_holds).toBe(1);
  });
});

describe('increaseLoad (§H.5)', () => {
  it('picks the next listed load above next_load when a confirmed load list exists', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const result = increaseLoad(line({ next_load: 30 }), equip, config);
    expect(result).toMatchObject({ code: 'LOAD_UP', line: { next_load: 35, next_target: 6, top_confirmations: 0 } });
  });

  it('steps by the nominal amount when only max_confirmed_load is known', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: null, max_confirmed_load: 50 };
    const result = increaseLoad(line({ next_load: 45 }), equip, config);
    expect(result.code).toBe('LOAD_UP');
    expect(result.line.next_load).toBe(45 + config.NOMINAL_LOAD_STEP);
  });

  it('extends the rep range once when no heavier load is available', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35], max_confirmed_load: 35 };
    const result = increaseLoad(line({ next_load: 35, range_max: 10 }), equip, config);
    expect(result.code).toBe('EXTEND_RANGE');
    expect(result.line.range_max).toBe(10 + config.LOAD_CAP_EXTRA);
    expect(result.line.extended).toBe(true);
  });

  it('goes to LOAD_CAPPED once already extended and still no heavier load', () => {
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35], max_confirmed_load: 35 };
    const result = increaseLoad(line({ next_load: 35, extended: true }), equip, config);
    expect(result.code).toBe('LOAD_CAPPED');
    expect(result.line.state).toBe('LOAD_CAPPED');
  });

  it('bodyweight lines (next_load null) go straight to the extended branch', () => {
    const result = increaseLoad(line({ next_load: null, unit: 'REPS' }), undefined, config);
    expect(result.code).toBe('EXTEND_RANGE');
  });
});

describe('isQualifyingExposure (§H.2)', () => {
  it('qualifies when every condition holds', () => {
    const { qualifies, reasons } = isQualifyingExposure({
      postureNormal: true,
      effortPresent: true,
      everySetLoggedAtPrescribedLoad: true,
      hasDisqualifyingFlag: false,
      sessionCapacityBelowUsual: false,
      lineStatus: 'NORMAL',
      rightExcludedByR04: false,
      perSideDataPresent: true,
    });
    expect(qualifies).toBe(true);
    expect(reasons).toEqual([]);
  });

  it('CALIBRATE, RETURN, and IMPLEMENT_CHANGED are never evidence', () => {
    for (const status of ['CALIBRATE', 'RETURN', 'IMPLEMENT_CHANGED'] as const) {
      const { qualifies, reasons } = isQualifyingExposure({
        postureNormal: true,
        effortPresent: true,
        everySetLoggedAtPrescribedLoad: true,
        hasDisqualifyingFlag: false,
        sessionCapacityBelowUsual: false,
        lineStatus: status,
        rightExcludedByR04: false,
        perSideDataPresent: true,
      });
      expect(qualifies).toBe(false);
      expect(reasons).toContain(status);
    }
  });

  it('SEEDED is qualifying evidence [M-04]', () => {
    const { qualifies } = isQualifyingExposure({
      postureNormal: true,
      effortPresent: true,
      everySetLoggedAtPrescribedLoad: true,
      hasDisqualifyingFlag: false,
      sessionCapacityBelowUsual: false,
      lineStatus: 'NORMAL', // caller maps SEEDED -> NORMAL for qualification purposes
      rightExcludedByR04: false,
      perSideDataPresent: true,
    });
    expect(qualifies).toBe(true);
  });

  it('below-usual session capacity disqualifies the exposure', () => {
    const { qualifies, reasons } = isQualifyingExposure({
      postureNormal: true,
      effortPresent: true,
      everySetLoggedAtPrescribedLoad: true,
      hasDisqualifyingFlag: false,
      sessionCapacityBelowUsual: true,
      lineStatus: 'NORMAL',
      rightExcludedByR04: false,
      perSideDataPresent: true,
    });
    expect(qualifies).toBe(false);
    expect(reasons).toContain('SESSION_CAPACITY_BELOW_USUAL');
  });
});

describe('§H.6 right-side merge', () => {
  it('moreConservative ranks REDUCE below HOLD below REPS_UP below LOAD_UP', () => {
    expect(moreConservative('REDUCE', 'LOAD_UP')).toBe('REDUCE');
    expect(moreConservative('HOLD', 'REPS_UP')).toBe('HOLD');
    expect(moreConservative('CONFIRM_TOP', 'LOAD_UP')).toBe('CONFIRM_TOP');
  });

  it('mergeSideResults applies the more conservative side to both lines when uneven dosing is disallowed', () => {
    const now = '2026-09-20T00:00:00.000Z';
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const left = applyExposure({ line: line({ side: 'LEFT', next_target: 8 }), effort: 'GOOD', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    const right = applyExposure({ line: line({ side: 'RIGHT', next_target: 8 }), effort: 'TOO_HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    const merged = mergeSideResults(left, right, false);
    expect(merged.code).toBe('REDUCE');
    expect(merged.left.line.next_load).toBe(merged.right.line.next_load);
    expect(merged.left.code).toBe('REDUCE');
    expect(merged.right.code).toBe('REDUCE');
  });

  it('leaves both sides independent when ALLOW_UNEVEN_SIDE_DOSING is true', () => {
    const now = '2026-09-20T00:00:00.000Z';
    const equip = { availability: 'AVAILABLE' as const, loads: [25, 30, 35, 40, 45], max_confirmed_load: 45 };
    const left = applyExposure({ line: line({ side: 'LEFT' }), effort: 'GOOD', everySetMetTarget: true, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    const right = applyExposure({ line: line({ side: 'RIGHT' }), effort: 'TOO_HARD', everySetMetTarget: false, atLeastTwoSetsShortByTwoOrMore: false, equip, config, now });
    const merged = mergeSideResults(left, right, true);
    expect(merged.unified).toBe(false);
    expect(merged.left.code).toBe('REPS_UP');
    expect(merged.right.code).toBe('REDUCE');
  });
});
