/**
 * Progression (§H). Line creation/seeding/return/re-base (§H.7), evidence qualification
 * (§H.2), the decision table (§H.3), flag actions (§H.4), load increase (§H.5), and the
 * per-side merge policy (§H.6). Pure: no clock, no randomness — `now` is an argument.
 */
import type { DecisionCode, Effort, EngineConfigValues, FlagCode, Role, Side } from '../contracts';
import type { EffectiveEquipment } from './equipment';
import { sameSet } from './equipment';
import { hoursBetween } from '../domain/time';
import type { Line } from './types';
import { lineKey, type GeneratorState } from './types';

export type LineStatus = 'CALIBRATE' | 'SEEDED' | 'RETURN' | 'IMPLEMENT_CHANGED' | 'NORMAL';

export interface LineStatusResult {
  status: LineStatus;
  line: Line | undefined;
  /** only for SEEDED */
  seedFrom?: Line;
}

/** §G.3 / §H.7: which special case applies for (exercise, role, side) right now. */
export function determineLineStatus(
  state: GeneratorState,
  exerciseId: string,
  role: Role,
  side: Side,
  todayImplement: string[],
  now: string,
  config: EngineConfigValues,
  movementPatternLastTrained: string | null,
): LineStatusResult {
  const key = lineKey(exerciseId, role, side);
  const line = state.lines[key];
  if (!line) {
    const otherRole = role === 'PRIMARY' ? 'SECONDARY' : role === 'SECONDARY' ? 'PRIMARY' : null;
    if (otherRole) {
      const otherLine = state.lines[lineKey(exerciseId, otherRole, side)];
      if (otherLine && otherLine.next_load !== null) return { status: 'SEEDED', line: undefined, seedFrom: otherLine };
    }
    return { status: 'CALIBRATE', line: undefined };
  }
  if (!sameSet(todayImplement, line.implement)) return { status: 'IMPLEMENT_CHANGED', line };
  if (line.last_exposure_at) {
    const gapHours = hoursBetween(line.last_exposure_at, now);
    if (gapHours > config.GAP_DAYS * 24) {
      const patternGapHours = movementPatternLastTrained ? hoursBetween(movementPatternLastTrained, now) : Infinity;
      if (patternGapHours > config.GAP_DAYS * 24) return { status: 'RETURN', line };
    }
  }
  return { status: 'NORMAL', line };
}

/** §H.7 CALIBRATE (FIXED): first exposure in a role with no seed available. Created at
 * completion (§K step 5) from the performed sets, not evaluated by §H.2-H.3 (not evidence). */
export function createCalibratedLine(
  role: Role,
  side: Side,
  exerciseId: string,
  todayImplement: string[],
  lastCompletedWorkingSetLoad: number | null,
  minRepsAchievedAcrossSets: number,
  now: string,
  config: EngineConfigValues,
): Line {
  const range = roleTableFor(role, config);
  const target = Math.max(range.range_min, Math.min(range.range_max, minRepsAchievedAcrossSets));
  return {
    exercise_id: exerciseId,
    role,
    side,
    range_min: range.range_min,
    range_max: range.range_max,
    step: range.step,
    unit: range.unit,
    state: 'BUILDING',
    next_load: lastCompletedWorkingSetLoad,
    next_target: target,
    implement: todayImplement,
    top_confirmations: 0,
    extended: false,
    consecutive_holds: 0,
    reduce_locked: false,
    last_exposure_at: now,
    last_decision: { code: 'CALIBRATE', reasons: [] },
  };
}

/**
 * §H.7 RETURN (FIXED): repeats the last load and target; not evidence.
 *
 * AMBIGUITY NOTE: the spec doesn't say explicitly whether `last_exposure_at` advances on
 * a RETURN (or IMPLEMENT_CHANGED, below) exposure. Smallest reasonable reading: the
 * session genuinely happened, so the clock that measures "time since this line was last
 * trained" should move forward (otherwise every RETURN would immediately qualify as
 * another RETURN one session later, compounding); "not evidence" governs only whether
 * the *dose* changes, not whether the exposure is recorded as having occurred.
 */
export function applyReturnExposure(line: Line, now: string): Line {
  return { ...line, last_exposure_at: now, last_decision: { code: 'RETURN', reasons: [] } };
}

/** §G.3/§H.7 IMPLEMENT_CHANGED [M-13, M-20]: shows last load/target as guidance; not
 * evidence; the line's own `implement` is left untouched here — re-basing to a new
 * implement is a distinct, explicit action (see equipment.ts's lineImplementGone), not
 * an automatic effect of one differing exposure. */
export function applyImplementChangedExposure(line: Line, now: string): Line {
  return { ...line, last_exposure_at: now, last_decision: { code: 'IMPLEMENT_CHANGED', reasons: [] } };
}

/** §H.2 non-qualifying NORMAL exposure: "change nothing, except the flag actions in
 * §H.4" — so, unlike RETURN/IMPLEMENT_CHANGED above, `last_exposure_at` is deliberately
 * left as-is here (there is no special-case display reason to advance it, and the spec's
 * wording for this branch is the most literal of the three: "change nothing"). */
export function applyNotEvidenceExposure(line: Line, reasons: string[]): Line {
  return { ...line, last_decision: { code: 'NOT_EVIDENCE', reasons } };
}

export function createSeededLine(seedFrom: Line, role: Role, side: Side, exerciseId: string, todayImplement: string[], config: EngineConfigValues): Line {
  const range = roleTableFor(role, config);
  return {
    exercise_id: exerciseId,
    role,
    side,
    range_min: range.range_min,
    range_max: range.range_max,
    step: range.step,
    unit: range.unit,
    state: 'BUILDING',
    next_load: seedFrom.next_load,
    next_target: range.range_min,
    implement: todayImplement,
    top_confirmations: 0,
    extended: false,
    consecutive_holds: 0,
    reduce_locked: false,
    last_exposure_at: null,
    last_decision: null,
  };
}

function roleTableFor(role: Role, config: EngineConfigValues) {
  const row = (config.ROLE_TABLE as Record<string, { unit: 'REPS' | 'SECONDS'; range_min: number; range_max: number; step: number }>)[role];
  return row;
}

// ---------- §H.2 evidence ----------

export interface QualifyArgs {
  postureNormal: boolean;
  effortPresent: boolean;
  everySetLoggedAtPrescribedLoad: boolean;
  hasDisqualifyingFlag: boolean; // TECHNIQUE_DIFFICULTY | UNCOMFORTABLE | STOPPED_SYMPTOM on this item
  sessionCapacityBelowUsual: boolean;
  lineStatus: LineStatus; // CALIBRATE / RETURN / IMPLEMENT_CHANGED are never evidence
  rightExcludedByR04: boolean; // RIGHT side, R-04 worse that day, involvement != NONE
  perSideDataPresent: boolean;
}

export function isQualifyingExposure(args: QualifyArgs): { qualifies: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!args.postureNormal) reasons.push('POSTURE_NOT_NORMAL');
  if (!args.effortPresent) reasons.push('EFFORT_MISSING');
  if (!args.everySetLoggedAtPrescribedLoad) reasons.push('SETS_INCOMPLETE');
  if (args.hasDisqualifyingFlag) reasons.push('FLAGGED');
  if (args.sessionCapacityBelowUsual) reasons.push('SESSION_CAPACITY_BELOW_USUAL');
  if (args.lineStatus === 'CALIBRATE' || args.lineStatus === 'RETURN' || args.lineStatus === 'IMPLEMENT_CHANGED') {
    reasons.push(args.lineStatus);
  }
  if (args.rightExcludedByR04) reasons.push('R04_WORSE_INVOLVED');
  if (!args.perSideDataPresent) reasons.push('SIDE_DATA_MISSING');
  return { qualifies: reasons.length === 0, reasons };
}

// ---------- §H.3 decision table ----------
//
// AMBIGUITY NOTE: an earlier draft of this module had a standalone `decideCode()`
// mirroring the §H.3 table in isolation, returning a placeholder 'REPS_UP_OR_CONFIRM'
// value to be "resolved by the caller against range_max." That placeholder is not a
// member of the DecisionCode contract enum, and the real REPS_UP vs CONFIRM_TOP branch
// (which genuinely does depend on range_max / top_confirmations state that a pure
// decideCode(args) signature does not carry) is correctly implemented inline below in
// applyExposure(), which has access to the full Line. decideCode() was therefore removed
// as dead/duplicate logic rather than patched, per "do not invent a major new
// programming rule" — no behavior changes, only the redundant/invalid function is gone.

// ---------- §H.5 load increase ----------

export interface LoadIncreaseResult {
  code: 'LOAD_UP' | 'EXTEND_RANGE' | 'LOAD_CAPPED';
  line: Line;
}

export function increaseLoad(line: Line, equip: EffectiveEquipment | undefined, config: EngineConfigValues): LoadIncreaseResult {
  const next = { ...line };
  let heavier: number | null = null;
  if (equip?.loads && equip.loads.length > 0) {
    const list = equip.loads;
    const above = list.filter((l) => next.next_load === null || l > next.next_load);
    heavier = above.length > 0 ? above[0] : null;
  } else if (equip?.max_confirmed_load != null) {
    const candidate = (next.next_load ?? 0) + config.NOMINAL_LOAD_STEP;
    heavier = candidate <= equip.max_confirmed_load ? candidate : null;
  } else if (next.next_load !== null) {
    // unknown increments, no confirmed max: "next heavier available" always exists
    heavier = next.next_load + config.NOMINAL_LOAD_STEP;
  } else {
    heavier = null; // bodyweight / no load concept
  }

  if (heavier !== null) {
    next.next_load = heavier;
    next.next_target = next.range_min;
    next.top_confirmations = 0;
    return { code: 'LOAD_UP', line: next };
  }
  if (!next.extended) {
    next.range_max = next.range_max + config.LOAD_CAP_EXTRA;
    next.extended = true;
    next.next_target = next.next_target + next.step;
    return { code: 'EXTEND_RANGE', line: next };
  }
  next.state = 'LOAD_CAPPED';
  return { code: 'LOAD_CAPPED', line: next };
}

// ---------- full per-side application ----------

export interface ApplyExposureArgs {
  line: Line;
  effort: Effort;
  everySetMetTarget: boolean;
  atLeastTwoSetsShortByTwoOrMore: boolean;
  equip: EffectiveEquipment | undefined;
  config: EngineConfigValues;
  now: string;
}

export interface ApplyExposureResult {
  code: DecisionCode;
  reasons: string[];
  line: Line;
  /** true when this decision should set the anchor's rotate_due (LOAD_CAPPED). */
  triggersLoadCappedRotation: boolean;
}

/** Applies §H.3–§H.5 to one qualifying exposure. */
export function applyExposure(args: ApplyExposureArgs): ApplyExposureResult {
  const { config, now } = args;
  let line: Line = { ...args.line, last_exposure_at: now };
  const tooHardOrShort2 = args.effort === 'TOO_HARD' || args.atLeastTwoSetsShortByTwoOrMore;

  if (tooHardOrShort2 && !line.reduce_locked) {
    // REDUCE
    let reduced: Line;
    if (line.unit === 'REPS' && line.next_load !== null) {
      const lighter = lowerAvailableLoad(line, args.equip, config);
      if (lighter === null) {
        reduced = { ...line, last_decision: { code: 'HOLD', reasons: ['AT_MINIMUM'] }, consecutive_holds: line.consecutive_holds + 1 };
        return { code: 'HOLD', reasons: ['AT_MINIMUM'], line: reduced, triggersLoadCappedRotation: false };
      }
      reduced = { ...line, next_load: lighter, top_confirmations: 0, reduce_locked: true };
    } else {
      reduced = {
        ...line,
        next_target: Math.max(line.range_min, line.next_target - 2 * line.step),
        top_confirmations: 0,
        reduce_locked: true,
      };
    }
    reduced.last_decision = { code: 'REDUCE', reasons: [] };
    reduced.consecutive_holds = 0;
    return { code: 'REDUCE', reasons: [], line: reduced, triggersLoadCappedRotation: false };
  }

  if (tooHardOrShort2 && line.reduce_locked) {
    const held: Line = { ...line, consecutive_holds: line.consecutive_holds + 1, last_decision: { code: 'HOLD(REDUCE_LIMIT)', reasons: [] } };
    return { code: 'HOLD(REDUCE_LIMIT)', reasons: [], line: held, triggersLoadCappedRotation: false };
  }

  if (args.effort === 'TOO_EASY' && args.everySetMetTarget) {
    const inc = increaseLoad(line, args.equip, config);
    const result: Line = { ...inc.line, reduce_locked: false, consecutive_holds: 0, last_decision: { code: inc.code, reasons: [] } };
    return { code: inc.code, reasons: [], line: result, triggersLoadCappedRotation: inc.code === 'LOAD_CAPPED' };
  }

  if ((args.effort === 'GOOD' || args.effort === 'HARD') && args.everySetMetTarget) {
    if (line.next_target < line.range_max) {
      const result: Line = { ...line, next_target: line.next_target + line.step, reduce_locked: false, consecutive_holds: 0, last_decision: { code: 'REPS_UP', reasons: [] } };
      return { code: 'REPS_UP', reasons: [], line: result, triggersLoadCappedRotation: false };
    }
    const confirmations = line.top_confirmations + 1;
    if (confirmations >= config.LOAD_UP_CONFIRMATIONS) {
      const inc = increaseLoad({ ...line, top_confirmations: confirmations }, args.equip, config);
      const result: Line = { ...inc.line, reduce_locked: false, consecutive_holds: 0, last_decision: { code: inc.code === 'LOAD_UP' || inc.code === 'EXTEND_RANGE' ? 'CONFIRM_TOP' : inc.code, reasons: [] } };
      return { code: inc.code === 'LOAD_CAPPED' ? 'LOAD_CAPPED' : 'CONFIRM_TOP', reasons: [], line: result, triggersLoadCappedRotation: inc.code === 'LOAD_CAPPED' };
    }
    const result: Line = { ...line, top_confirmations: confirmations, reduce_locked: false, consecutive_holds: 0, last_decision: { code: 'CONFIRM_TOP', reasons: [] } };
    return { code: 'CONFIRM_TOP', reasons: [], line: result, triggersLoadCappedRotation: false };
  }

  const held: Line = { ...line, consecutive_holds: line.consecutive_holds + 1, last_decision: { code: 'HOLD', reasons: [] } };
  return { code: 'HOLD', reasons: [], line: held, triggersLoadCappedRotation: false };
}

function lowerAvailableLoad(line: Line, equip: EffectiveEquipment | undefined, config: EngineConfigValues): number | null {
  if (line.next_load === null) return null;
  if (equip?.loads && equip.loads.length > 0) {
    const below = equip.loads.filter((l) => l < line.next_load!);
    return below.length > 0 ? below[below.length - 1] : null;
  }
  const candidate = line.next_load - config.NOMINAL_LOAD_STEP;
  return candidate > 0 ? candidate : null;
}

// ---------- §H.6 right side merge ----------

/** §H.6 (FIXED): "REDUCE < HOLD(REDUCE_LIMIT) < HOLD / NOT_EVIDENCE < REPS_UP < CONFIRM_TOP < LOAD_UP."
 * HOLD and NOT_EVIDENCE are an explicit tie; EXTEND_RANGE/LOAD_CAPPED aren't named by H.6
 * (LOAD_UP always resolves to one of EXTEND_RANGE/LOAD_CAPPED via increaseLoad when the
 * line is capped, so this module treats them as slightly more advanced than LOAD_UP,
 * consistent with §H.5's own escalation order) — smallest reasonable extension, not a new rule. */
const CONSERVATISM_RANK: Partial<Record<DecisionCode, number>> = {
  REDUCE: 0,
  'HOLD(REDUCE_LIMIT)': 1,
  HOLD: 2,
  NOT_EVIDENCE: 2,
  AT_MINIMUM: 2,
  REPS_UP: 3,
  CONFIRM_TOP: 4,
  LOAD_UP: 5,
  EXTEND_RANGE: 6,
  LOAD_CAPPED: 7,
};

/** §H.6: when ALLOW_UNEVEN_SIDE_DOSING is false, both sides get the more conservative decision. */
export function moreConservative(a: DecisionCode, b: DecisionCode): DecisionCode {
  const ra = CONSERVATISM_RANK[a] ?? 2;
  const rb = CONSERVATISM_RANK[b] ?? 2;
  return ra <= rb ? a : b;
}

export interface SideExposureResult {
  side: Side;
  result: ApplyExposureResult;
}

export interface MergedSidesResult {
  left: ApplyExposureResult;
  right: ApplyExposureResult;
  code: DecisionCode;
  unified: boolean;
}

/** §H.6 full merge: picks the more conservative of the two independently-computed
 * per-side results and, when ALLOW_UNEVEN_SIDE_DOSING is false, applies that side's
 * numeric outcome (load/target/state/counters) to both lines, preserving each line's own
 * identity fields (exercise_id, role, side, range, implement, last_exposure_at). */
export function mergeSideResults(left: ApplyExposureResult, right: ApplyExposureResult, allowUnevenSideDosing: boolean): MergedSidesResult {
  if (allowUnevenSideDosing) {
    return { left, right, code: left.code, unified: false };
  }
  const chosenCode = moreConservative(left.code, right.code);
  const chosen = chosenCode === left.code ? left : right;
  const applyChosenNumerics = (target: Line): Line => ({
    ...target,
    state: chosen.line.state,
    next_load: chosen.line.next_load,
    next_target: chosen.line.next_target,
    top_confirmations: chosen.line.top_confirmations,
    extended: chosen.line.extended,
    consecutive_holds: chosen.line.consecutive_holds,
    reduce_locked: chosen.line.reduce_locked,
    range_max: chosen.line.range_max,
    last_decision: { code: chosenCode, reasons: chosen.reasons },
  });
  const mergedLeft: ApplyExposureResult = { ...left, code: chosenCode, line: applyChosenNumerics(left.line) };
  const mergedRight: ApplyExposureResult = { ...right, code: chosenCode, line: applyChosenNumerics(right.line) };
  return { left: mergedLeft, right: mergedRight, code: chosenCode, unified: true };
}

export type { FlagCode };
