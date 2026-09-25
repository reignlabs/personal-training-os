/**
 * Station rule (§F.2, [M-12]). A block may contain at most one item with a non-NONE
 * station, unless both items share the identical station group. Enforced once both
 * slots of a block are selected.
 */
import type { SelectionOutcome } from './selection';

export interface StationItem {
  outcome: SelectionOutcome;
  station: string;
}

export interface StationResult {
  first: SelectionOutcome;
  second: SelectionOutcome;
  mode: 'PAIRED' | 'STRAIGHT_SETS';
  /** set on whichever item was re-selected, if any */
  reselectedSlot: 'first' | 'second' | null;
}

function conflicts(a: string, b: string): boolean {
  return a !== 'NONE' && b !== 'NONE' && a !== b;
}

function isAnchor(o: SelectionOutcome): boolean {
  return o.reasonCode === 'ANCHOR';
}

/** Re-selects `toReselect` from its own ordered-eligible list, skipping the kept item's
 * exercise and anything whose station conflicts with `keepStation`. Returns null if no
 * candidate qualifies. */
function reselect(toReselect: StationItem, keepExerciseId: string, keepStation: string): SelectionOutcome | null {
  for (const candidate of toReselect.outcome.orderedEligible) {
    if (candidate.exercise_id === keepExerciseId) continue;
    if (candidate.exercise_id === toReselect.outcome.exercise.exercise_id) continue;
    if (conflicts(candidate.station, keepStation)) continue;
    return {
      exercise: candidate,
      reasonCode: 'STATION_RESELECT',
      decidedBy: toReselect.outcome.decidedBy,
      anchorBefore: toReselect.outcome.anchorBefore,
      anchorCandidateIfSubstitute: toReselect.outcome.exercise.exercise_id,
      note: `conflicts with ${keepExerciseId} on station`,
      orderedEligible: toReselect.outcome.orderedEligible,
    };
  }
  return null;
}

/** §F.2 enforcement for one block once both of its slots are filled. */
export function enforceStationRule(first: StationItem, second: StationItem): StationResult {
  if (!conflicts(first.station, second.station)) {
    return { first: first.outcome, second: second.outcome, mode: 'PAIRED', reselectedSlot: null };
  }

  const firstIsAnchor = isAnchor(first.outcome);
  const secondIsAnchor = isAnchor(second.outcome);

  if (firstIsAnchor && !secondIsAnchor) {
    const reselected = reselect(second, first.outcome.exercise.exercise_id, first.station);
    if (reselected) return { first: first.outcome, second: reselected, mode: 'PAIRED', reselectedSlot: 'second' };
  } else if (secondIsAnchor && !firstIsAnchor) {
    const reselected = reselect(first, second.outcome.exercise.exercise_id, second.station);
    if (reselected) return { first: reselected, second: second.outcome, mode: 'PAIRED', reselectedSlot: 'first' };
  } else if (firstIsAnchor && secondIsAnchor) {
    return { first: first.outcome, second: second.outcome, mode: 'STRAIGHT_SETS', reselectedSlot: null };
  } else {
    const reselectedSecond = reselect(second, first.outcome.exercise.exercise_id, first.station);
    if (reselectedSecond) return { first: first.outcome, second: reselectedSecond, mode: 'PAIRED', reselectedSlot: 'second' };
    const reselectedFirst = reselect(first, second.outcome.exercise.exercise_id, second.station);
    if (reselectedFirst) return { first: reselectedFirst, second: second.outcome, mode: 'PAIRED', reselectedSlot: 'first' };
  }

  return { first: first.outcome, second: second.outcome, mode: 'STRAIGHT_SETS', reselectedSlot: null };
}
