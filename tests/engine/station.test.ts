/**
 * Unit tests for the station rule (§F.2, [M-12]).
 */
import { describe, expect, it } from 'vitest';
import { enforceStationRule, type StationItem } from '../../src/engine/station';
import type { PoolExercise } from '../../src/engine/pool';
import type { SelectionOutcome } from '../../src/engine/selection';

function exercise(id: string, station: string): PoolExercise {
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
    equipment_options: [['EQ010']],
    station,
    heavy_lower: false,
    right_triceps_involvement: 'SECONDARY',
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
  };
}

function outcome(e: PoolExercise, reasonCode: string, orderedEligible: PoolExercise[]): SelectionOutcome {
  return { exercise: e, reasonCode, decidedBy: null, anchorBefore: null, anchorCandidateIfSubstitute: null, note: null, orderedEligible };
}

function item(e: PoolExercise, reasonCode: string, orderedEligible: PoolExercise[]): StationItem {
  return { outcome: outcome(e, reasonCode, orderedEligible), station: e.station };
}

describe('enforceStationRule (§F.2)', () => {
  it('no conflict: both items keep their pick, mode PAIRED', () => {
    const a = exercise('EX-A', 'RACK_AREA');
    const b = exercise('EX-B', 'NONE');
    const result = enforceStationRule(item(a, 'ANCHOR', []), item(b, 'ANCHOR', []));
    expect(result.mode).toBe('PAIRED');
    expect(result.reselectedSlot).toBeNull();
  });

  it('identical non-NONE station groups do not conflict', () => {
    const a = exercise('EX-A', 'RACK_AREA');
    const b = exercise('EX-B', 'RACK_AREA');
    const result = enforceStationRule(item(a, 'ANCHOR', []), item(b, 'ANCHOR', []));
    expect(result.mode).toBe('PAIRED');
  });

  it('anchor + non-anchor conflict: the non-anchor is re-selected from its own ordered list', () => {
    const anchorEx = exercise('EX-ANCHOR', 'RACK_AREA');
    const other = exercise('EX-OTHER', 'BENCH_2');
    const alt = exercise('EX-ALT', 'NONE');
    const result = enforceStationRule(item(anchorEx, 'ANCHOR', []), item(other, 'SUBSTITUTE_NO_ANCHOR(HF-11)', [other, alt]));
    expect(result.mode).toBe('PAIRED');
    expect(result.reselectedSlot).toBe('second');
    expect(result.second.exercise.exercise_id).toBe('EX-ALT');
    expect(result.second.reasonCode).toBe('STATION_RESELECT');
    expect(result.first.exercise.exercise_id).toBe('EX-ANCHOR'); // anchor never moves [M-12]
  });

  it('two conflicting anchors fall back to STRAIGHT_SETS, neither anchor changes', () => {
    const a = exercise('EX-A', 'RACK_AREA');
    const b = exercise('EX-B', 'RACK_AREA');
    const result = enforceStationRule(item(a, 'ANCHOR', []), item(b, 'ANCHOR', []));
    // same station group -> actually no conflict; use different groups to force it
    const c = exercise('EX-C', 'BENCH_2');
    const result2 = enforceStationRule(item(a, 'ANCHOR', []), item(c, 'ANCHOR', []));
    expect(result.mode).toBe('PAIRED');
    expect(result2.mode).toBe('STRAIGHT_SETS');
    expect(result2.first.exercise.exercise_id).toBe('EX-A');
    expect(result2.second.exercise.exercise_id).toBe('EX-C');
  });

  it('neither is an anchor: tries re-selecting the second, then the first, before giving up to STRAIGHT_SETS', () => {
    const a = exercise('EX-A', 'RACK_AREA');
    const b = exercise('EX-B', 'BENCH_2');
    const result = enforceStationRule(item(a, 'SUBSTITUTE_NO_ANCHOR(HF-11)', []), item(b, 'SUBSTITUTE_NO_ANCHOR(HF-11)', []));
    expect(result.mode).toBe('STRAIGHT_SETS');
  });

  it('re-selection skips candidates that themselves conflict, and skips the kept exercise', () => {
    const anchorEx = exercise('EX-ANCHOR', 'RACK_AREA');
    const conflictingAlt = exercise('EX-CONFLICT', 'BENCH_2');
    const okAlt = exercise('EX-OK', 'NONE');
    const other = exercise('EX-OTHER', 'BENCH_2');
    const result = enforceStationRule(item(anchorEx, 'ANCHOR', []), item(other, 'SUBSTITUTE_NO_ANCHOR(HF-11)', [conflictingAlt, okAlt]));
    expect(result.second.exercise.exercise_id).toBe('EX-OK');
  });
});
