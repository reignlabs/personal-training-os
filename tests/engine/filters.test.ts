/**
 * Unit tests for the hard filter chain (§D, HF-01 to HF-14). Each test isolates one
 * filter by holding every other input at a passing value.
 */
import { describe, expect, it } from 'vitest';
import { evaluateFilters, passesStatic, type FilterCtx } from '../../src/engine/filters';
import { createEmptyState } from '../../src/engine/state';
import type { PoolExercise } from '../../src/engine/pool';
import type { EffectiveEquipment } from '../../src/engine/equipment';
import type { Constraint } from '../../src/contracts';

function exercise(overrides: Partial<PoolExercise> = {}): PoolExercise {
  return {
    exercise_id: 'EX012',
    status: 'ACTIVE',
    display_name: 'Goblet Squat',
    family: 'KD',
    sub_target: null,
    roles_allowed: ['PRIMARY', 'SECONDARY'],
    laterality: 'BILATERAL',
    per_side_logging: false,
    load_mode: 'EXTERNAL_LOAD',
    equipment_options: [['EQ009']],
    station: 'NONE',
    heavy_lower: true,
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

describe('hard filters (§D)', () => {
  it('a fully-eligible exercise passes with no filter firing', () => {
    expect(evaluateFilters(exercise(), 'PRIMARY', ctx(), 'FULL')).toBeNull();
  });

  it('HF-04: exercise on the avoid list is EXCLUDED', () => {
    const result = evaluateFilters(exercise(), 'PRIMARY', ctx({ avoidances: new Set(['EX012']) }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-04', outcome: 'EXCLUDED' });
  });

  it('HF-05 (today-only): sore region match excludes for today, skipped in STATIC mode', () => {
    const e = exercise({ sore_regions: ['LOWER'] });
    const full = evaluateFilters(e, 'PRIMARY', ctx({ todaySoreRegions: new Set(['LOWER']) }), 'FULL');
    expect(full).toEqual({ hfId: 'HF-05', outcome: 'EXCLUDED_TODAY' });
    const staticResult = evaluateFilters(e, 'PRIMARY', ctx({ todaySoreRegions: new Set(['LOWER']) }), 'STATIC');
    expect(staticResult).toBeNull();
  });

  it('HF-06: no available equipment option -> EXCLUDED', () => {
    const e = exercise({ equipment_options: [['EQ099']] });
    const result = evaluateFilters(e, 'PRIMARY', ctx({ equip: new Map([['EQ099', { availability: 'NOT_AVAILABLE', loads: null, max_confirmed_load: null }]]) }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-06', outcome: 'EXCLUDED' });
  });

  it('HF-06: unknown equipment availability -> HELD_EQUIPMENT_UNKNOWN', () => {
    const e = exercise({ equipment_options: [['EQ099']] });
    const result = evaluateFilters(e, 'PRIMARY', ctx({ equip: new Map([['EQ099', { availability: 'UNKNOWN', loads: null, max_confirmed_load: null }]]) }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-06', outcome: 'HELD_EQUIPMENT_UNKNOWN' });
  });

  it('HF-06: today-only equipment issue -> EXCLUDED_TODAY in FULL mode, ignored in STATIC mode', () => {
    const e = exercise();
    const full = evaluateFilters(e, 'PRIMARY', ctx({ todayEquipmentIssues: ['EQ009'] }), 'FULL');
    expect(full).toEqual({ hfId: 'HF-06', outcome: 'EXCLUDED_TODAY' });
    const staticResult = evaluateFilters(e, 'PRIMARY', ctx({ todayEquipmentIssues: ['EQ009'] }), 'STATIC');
    expect(staticResult).toBeNull();
  });

  it('HF-07: review hold excludes the exercise', () => {
    const state = createEmptyState();
    state.review_hold['EX012'] = { held: true, cause: 'STOPPED_SYMPTOM' };
    const result = evaluateFilters(exercise(), 'PRIMARY', ctx({ state }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-07', outcome: 'HELD_PENDING_REVIEW' });
  });

  it('HF-08: unconfirmed capability prereq holds the exercise', () => {
    const e = exercise({ capability_prereq: 'chin-up capability' });
    const result = evaluateFilters(e, 'PRIMARY', ctx(), 'FULL');
    expect(result).toEqual({ hfId: 'HF-08', outcome: 'HELD_CAPABILITY_UNKNOWN' });
  });

  it('HF-08: a confirmed capability passes', () => {
    const e = exercise({ capability_prereq: 'chin-up capability' });
    const state = createEmptyState();
    state.capability_confirmed['chin-up capability'] = true;
    expect(evaluateFilters(e, 'PRIMARY', ctx({ state }), 'FULL')).toBeNull();
  });

  it('HF-09: role not in roles_allowed -> NOT_CANDIDATE', () => {
    const e = exercise({ roles_allowed: ['SECONDARY'] });
    const result = evaluateFilters(e, 'PRIMARY', ctx(), 'FULL');
    expect(result).toEqual({ hfId: 'HF-09', outcome: 'NOT_CANDIDATE' });
  });

  it('HF-10 (today-only): already selected today -> EXCLUDED_TODAY, skipped in STATIC mode', () => {
    const result = evaluateFilters(exercise(), 'PRIMARY', ctx({ selectedIds: new Set(['EX012']) }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-10', outcome: 'EXCLUDED_TODAY' });
    expect(evaluateFilters(exercise(), 'PRIMARY', ctx({ selectedIds: new Set(['EX012']) }), 'STATIC')).toBeNull();
  });

  it('HF-11 [M-02]: used on the same calendar day, or yesterday, excludes for today', () => {
    const state = createEmptyState();
    state.exercise_last_used['EX012'] = '2026-09-24T10:00:00.000Z'; // today
    const result = evaluateFilters(exercise(), 'PRIMARY', ctx({ state }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-11', outcome: 'EXCLUDED_TODAY' });
  });

  it('HF-11: used two calendar days ago passes (repeatExclusionDays = 1)', () => {
    const state = createEmptyState();
    state.exercise_last_used['EX012'] = '2026-09-22T10:00:00.000Z';
    expect(evaluateFilters(exercise(), 'PRIMARY', ctx({ state }), 'FULL')).toBeNull();
  });

  it('HF-12: heavy_lower exercise within the recovery window is excluded for today', () => {
    const e = exercise({ heavy_lower: true });
    const result = evaluateFilters(e, 'PRIMARY', ctx({ hoursSinceLower: 5, heavyLowerRecoveryHours: 24 }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-12', outcome: 'EXCLUDED_TODAY' });
  });

  it('HF-12: past the recovery window passes', () => {
    const e = exercise({ heavy_lower: true });
    expect(evaluateFilters(e, 'PRIMARY', ctx({ hoursSinceLower: 30, heavyLowerRecoveryHours: 24 }), 'FULL')).toBeNull();
  });

  it('HF-13: LIGHT posture excludes ballistic exercises', () => {
    const e = exercise({ position_tags: ['ballistic'] });
    const result = evaluateFilters(e, 'PRIMARY', ctx({ posture: 'LIGHT' }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-13', outcome: 'EXCLUDED_TODAY' });
  });

  it('HF-14: impact exercises are held pending a preference', () => {
    const e = exercise({ position_tags: ['impact'] });
    const result = evaluateFilters(e, 'PRIMARY', ctx(), 'FULL');
    expect(result).toEqual({ hfId: 'HF-14', outcome: 'HELD_PREFERENCE_UNKNOWN' });
  });

  it('constraint bindings (HF-01) exclude a matching exercise', () => {
    const constraint: Constraint = {
      constraint_id: 'HC-01',
      kind: 'HARD',
      status: 'ACTIVE',
      source: 'USER',
      label_in_app: 'No overhead pressing',
      description_in_app: 'No overhead pressing.',
      programming_effect_in_app: 'Overhead-press exercises are excluded.',
      review_question: null,
      engine_bindings: [{ filter: 'HF-01', where: { position_tags_any: ['overhead_press'] }, outcome: 'EXCLUDED' }],
    };
    const e = exercise({ position_tags: ['overhead_press'] });
    const result = evaluateFilters(e, 'PRIMARY', ctx({ constraints: [constraint] }), 'FULL');
    expect(result).toEqual({ hfId: 'HF-01', outcome: 'EXCLUDED' });
  });

  it('passesStatic mirrors evaluateFilters(..., "STATIC") === null', () => {
    expect(passesStatic(exercise(), 'PRIMARY', ctx())).toBe(true);
    expect(passesStatic(exercise({ roles_allowed: ['SECONDARY'] }), 'PRIMARY', ctx())).toBe(false);
  });
});
