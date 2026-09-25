/**
 * State updates after workout completion (§K) and user action events (§K's closing
 * paragraph, Q.8). Pure: takes a state and a description of what happened, returns a new
 * state (clone-then-mutate, matching credit.ts's convention) — never reads the clock
 * (`now`/`ended_at` are always caller-supplied) and never randomizes.
 */
import type { DecisionCode, Effort, EngineConfigValues, Family, FlagCode, Role, Side, UserActionEvent, UtcTs } from '../contracts';
import type { EffectiveEquipment } from './equipment';
import type { GeneratorState, Line, ReviewHoldCause, RotateCause } from './types';
import { anchorKey as makeAnchorKey, lineKey } from './types';
import { cloneState, latestTs } from './state';
import { creditFamily, creditFamilyPrimary } from './credit';
import {
  applyExposure,
  applyImplementChangedExposure,
  applyNotEvidenceExposure,
  applyReturnExposure,
  createCalibratedLine,
  createSeededLine,
  isQualifyingExposure,
  mergeSideResults,
  type LineStatus,
} from './progression';

// ---------- input shape ----------

export interface SideExposureInput {
  side: Side;
  workingSetsCompleted: number;
  workingSetsPrescribed: number;
  effort: Effort | null;
  everySetLoggedAtPrescribedLoad: boolean;
  everySetMetTarget: boolean;
  atLeastTwoSetsShortByTwoOrMore: boolean;
  lastCompletedWorkingSetLoad: number | null;
  minRepsAchievedAcrossSets: number;
  /** precomputed by generate.ts via progression.determineLineStatus at generation time */
  lineStatus: LineStatus;
  seedFromLine: Line | null; // when lineStatus === 'SEEDED'
  existingLine: Line | null; // when a line already exists for (exercise, role, side)
  rightTricepsInvolvementExcluded: boolean; // R-04 worse today AND involvement != NONE, RIGHT side only [M-09]
}

export interface PerformedItemInput {
  itemKey: string;
  exerciseId: string;
  family: Family | null;
  role: Role;
  /** null when this role has no anchors (MOBILITY, CONDITIONING, §E.1) */
  anchorKeyForRole: string | null;
  selectionReasonCode: string; // SelectionReason string, e.g. "ANCHOR", "SUBSTITUTE_FOR_ANCHOR(HF-12)"
  /** false for MOBILITY/CONDITIONING (§H.8: no lines) */
  hasLine: boolean;
  todayImplement: string[];
  equip: EffectiveEquipment | undefined;
  postureNormal: boolean;
  sessionCapacityBelowUsual: boolean;
  hasDisqualifyingFlag: boolean; // TECHNIQUE_DIFFICULTY | UNCOMFORTABLE | STOPPED_SYMPTOM on this item
  sides: SideExposureInput[]; // one entry (BILATERAL) or two (LEFT, RIGHT)
}

export interface CompleteWorkoutArgs {
  performedAt: UtcTs; // = started_at, recorded only (not used by state updates below)
  endedAt: UtcTs;
  sessionCapacity: 'below_usual' | 'usual' | 'above_usual' | null;
  items: PerformedItemInput[];
  config: EngineConfigValues;
  allowUnevenSideDosing: boolean;
}

export interface CompletionItemResult {
  itemKey: string;
  linesBySide: Partial<Record<Side, Line>>;
  decisionBySide: Partial<Record<Side, DecisionCode>>;
}

export interface CompleteWorkoutResult {
  state: GeneratorState;
  items: CompletionItemResult[];
  /** anchors whose rotate_due newly became true this completion */
  anchorsNowDueForRotation: string[];
}

const CORE_CARRY_ACCESSORY_ROLES: Role[] = ['CORE', 'CARRY', 'ACCESSORY'];

// ---------- §K ----------

/** §K, steps 1-8 (step 1, persisting the workout log itself, is the caller's job —
 * this module only updates GeneratorState). Runs only over "performed" items (>= 1
 * working set completed anywhere in the item); a fully-skipped item is recorded by the
 * caller but changes no state here, per §K step 1. */
export function completeWorkout(state: GeneratorState, args: CompleteWorkoutArgs): CompleteWorkoutResult {
  const next = cloneState(state);
  const results: CompletionItemResult[] = [];

  const performedItems = args.items.filter((it) => it.sides.some((s) => s.workingSetsCompleted >= 1));
  const anyWorkingSetAnywhere = performedItems.length > 0;

  // step 2
  if (anyWorkingSetAnywhere) {
    next.apartment_sessions_completed += 1;
    if (!next.history_start) next.history_start = args.endedAt;
  }

  // step 3
  for (const item of performedItems) {
    next.exercise_last_used[item.exerciseId] = latestTs(next.exercise_last_used[item.exerciseId], args.endedAt) ?? args.endedAt;
  }

  // step 4: family credit, gated by MIN_SETS_FOR_CREDIT summed per family across the item's sides
  const familyWorkingSets = new Map<Family, number>();
  for (const item of performedItems) {
    if (!item.family) continue;
    const sets = item.sides.reduce((sum, s) => sum + s.workingSetsCompleted, 0);
    familyWorkingSets.set(item.family, (familyWorkingSets.get(item.family) ?? 0) + sets);
  }
  for (const [family, sets] of familyWorkingSets) {
    if (sets >= args.config.MIN_SETS_FOR_CREDIT) creditFamily(next, family, args.endedAt);
  }
  for (const item of performedItems) {
    if (!item.family || item.role !== 'PRIMARY') continue;
    const sets = item.sides.reduce((sum, s) => sum + s.workingSetsCompleted, 0);
    if (sets >= args.config.MIN_SETS_FOR_CREDIT) creditFamilyPrimary(next, item.family, args.endedAt);
  }

  // step 5: progression per performed item with a line role
  for (const item of performedItems) {
    if (!item.hasLine) {
      results.push({ itemKey: item.itemKey, linesBySide: {}, decisionBySide: {} });
      continue;
    }
    const sideOutcomes = item.sides
      .filter((s) => s.workingSetsCompleted >= 1)
      .map((s) => ({ side: s.side, exposure: resolveSideExposure(item, s, args, next) }));

    if (sideOutcomes.length === 2 && !args.allowUnevenSideDosing) {
      const [a, b] = sideOutcomes;
      if (a.exposure.kind === 'EVALUATED' && b.exposure.kind === 'EVALUATED') {
        const merged = mergeSideResults(a.exposure.result, b.exposure.result, false);
        writeLine(next, item.exerciseId, item.role, a.side, merged.left.line);
        writeLine(next, item.exerciseId, item.role, b.side, merged.right.line);
        results.push({
          itemKey: item.itemKey,
          linesBySide: { [a.side]: merged.left.line, [b.side]: merged.right.line },
          decisionBySide: { [a.side]: merged.code, [b.side]: merged.code },
        });
        continue;
      }
    }

    const linesBySide: Partial<Record<Side, Line>> = {};
    const decisionBySide: Partial<Record<Side, DecisionCode>> = {};
    for (const { side, exposure } of sideOutcomes) {
      const line = exposure.kind === 'EVALUATED' ? exposure.result.line : exposure.line;
      writeLine(next, item.exerciseId, item.role, side, line);
      linesBySide[side] = line;
      decisionBySide[side] = line.last_decision?.code ?? 'NOT_EVIDENCE';
    }
    results.push({ itemKey: item.itemKey, linesBySide, decisionBySide });
  }

  // step 6: flag actions (TECHNIQUE_DIFFICULTY next-exposure step-down is applied at the
  // *next* generation/selection time via the line's own state, so nothing to do here
  // beyond what step 5 already recorded; review holds / uncomfortable streaks / DISLIKE
  // preference are all recorded as flags on the workout item itself by the caller and
  // applied through applyFlags(), called separately below for clarity)

  // step 7: anchors
  const anchorsNowDue: string[] = [];
  for (const item of performedItems) {
    if (!item.anchorKeyForRole) continue;
    const key = item.anchorKeyForRole;
    const existing = next.anchors[key];
    const reason = item.selectionReasonCode;
    if (reason === 'ANCHOR') {
      if (existing) existing.exposures_as_anchor += 1;
    } else if (reason.startsWith('NEW_ANCHOR_')) {
      next.anchors[key] = { exercise_id: item.exerciseId, exposures_as_anchor: 1, rotate_due: false, rotate_cause: null, note: null };
    } else if (reason === 'USER_REPLACE') {
      next.anchors[key] = { exercise_id: item.exerciseId, exposures_as_anchor: 1, rotate_due: false, rotate_cause: null, note: null };
    }
    // SUBSTITUTE_*, STATION_RESELECT, USER_SWAP: no anchor change [M-03, M-12]

    // §E.5 LOAD_CAPPED trigger (PRIMARY/SECONDARY only): any side's decision this
    // completion reached LOAD_CAPPED.
    if ((item.role === 'PRIMARY' || item.role === 'SECONDARY') && next.anchors[key]) {
      const result = results.find((r) => r.itemKey === item.itemKey);
      const capped = result && Object.values(result.decisionBySide).some((c) => c === 'LOAD_CAPPED');
      if (capped) setRotateDue(next.anchors[key], 'LOAD_CAPPED');
    }
    if (CORE_CARRY_ACCESSORY_ROLES.includes(item.role) && next.anchors[key]) {
      const anchor = next.anchors[key];
      if (anchor.exercise_id === item.exerciseId && anchor.exposures_as_anchor >= args.config.ACCESSORY_ROTATION_EXPOSURES) {
        setRotateDue(anchor, 'EXPOSURES');
      }
    }
    if (next.anchors[key]?.rotate_due && !anchorsNowDue.includes(key)) anchorsNowDue.push(key);
  }

  return { state: next, items: results, anchorsNowDueForRotation: anchorsNowDue };
}

function setRotateDue(anchor: { rotate_due: boolean; rotate_cause: RotateCause | null }, cause: RotateCause): void {
  if (anchor.rotate_due) return; // first cause wins; don't clobber
  anchor.rotate_due = true;
  anchor.rotate_cause = cause;
}

type SideExposureOutcome = { kind: 'EVALUATED'; result: ReturnType<typeof applyExposure> } | { kind: 'FIXED'; line: Line };

function resolveSideExposure(item: PerformedItemInput, s: SideExposureInput, args: CompleteWorkoutArgs, state: GeneratorState): SideExposureOutcome {
  const now = args.endedAt;

  if (s.lineStatus === 'CALIBRATE') {
    const line = createCalibratedLine(item.role, s.side, item.exerciseId, item.todayImplement, s.lastCompletedWorkingSetLoad, s.minRepsAchievedAcrossSets, now, args.config);
    return { kind: 'FIXED', line };
  }
  if (s.lineStatus === 'RETURN') {
    const base = s.existingLine ?? mustHaveLine(item, s);
    return { kind: 'FIXED', line: applyReturnExposure(base, now) };
  }
  if (s.lineStatus === 'IMPLEMENT_CHANGED') {
    const base = s.existingLine ?? mustHaveLine(item, s);
    return { kind: 'FIXED', line: applyImplementChangedExposure(base, now) };
  }

  // SEEDED or NORMAL: create the line if SEEDED, then evaluate §H.2-H.3 like any other.
  const line: Line = s.lineStatus === 'SEEDED' && s.seedFromLine ? createSeededLine(s.seedFromLine, item.role, s.side, item.exerciseId, item.todayImplement, args.config) : (s.existingLine ?? mustHaveLine(item, s));

  const qualify = isQualifyingExposure({
    postureNormal: item.postureNormal,
    effortPresent: s.effort !== null,
    everySetLoggedAtPrescribedLoad: s.everySetLoggedAtPrescribedLoad,
    hasDisqualifyingFlag: item.hasDisqualifyingFlag,
    sessionCapacityBelowUsual: args.sessionCapacity === 'below_usual',
    lineStatus: s.lineStatus === 'SEEDED' ? 'NORMAL' : s.lineStatus, // SEEDED is qualifying evidence [M-04]
    rightExcludedByR04: s.side === 'RIGHT' && s.rightTricepsInvolvementExcluded,
    perSideDataPresent: s.effort !== null,
  });

  if (!qualify.qualifies) {
    return { kind: 'FIXED', line: applyNotEvidenceExposure(line, qualify.reasons) };
  }

  const result = applyExposure({
    line,
    effort: s.effort as Effort,
    everySetMetTarget: s.everySetMetTarget,
    atLeastTwoSetsShortByTwoOrMore: s.atLeastTwoSetsShortByTwoOrMore,
    equip: item.equip,
    config: args.config,
    now,
  });
  return { kind: 'EVALUATED', result };
}

function mustHaveLine(item: PerformedItemInput, s: SideExposureInput): Line {
  if (s.existingLine) return s.existingLine;
  throw new Error(`completion.ts: no line for ${item.exerciseId}/${item.role}/${s.side} but lineStatus=${s.lineStatus} requires one`);
}

function writeLine(state: GeneratorState, exerciseId: string, role: Role, side: Side, line: Line): void {
  state.lines[lineKey(exerciseId, role, side)] = line;
}

// ---------- flags (§H.4) ----------

export interface FlagApplication {
  itemKey: string;
  exerciseId: string;
  side: Side | null;
  code: FlagCode;
}

/** §H.4: TECHNIQUE_DIFFICULTY / UNCOMFORTABLE / STOPPED_SYMPTOM / DISLIKE|PREFER. Applied
 * once per flagged item, independent of whether the exposure qualified as evidence.
 * TECHNIQUE_DIFFICULTY's "next exposure: REDUCE one load step" is realized by setting
 * `reduce_locked` false and pre-emptively stepping the line down here (so the *next*
 * generation shows the reduced dose immediately, matching "next exposure" rather than
 * requiring a second REDUCE decision cycle). */
export function applyFlags(state: GeneratorState, flags: FlagApplication[], lineForFlag: (f: FlagApplication) => Line | null, now: UtcTs): GeneratorState {
  const next = cloneState(state);
  for (const f of flags) {
    if (f.code === 'TECHNIQUE_DIFFICULTY') {
      const line = lineForFlag(f);
      if (line) {
        const stepped = stepDownOneLoad(line);
        writeLine(next, f.exerciseId, line.role, line.side, stepped);
      }
    } else if (f.code === 'UNCOMFORTABLE') {
      const key = f.exerciseId;
      const streak = (next.uncomfortable_streak[key] ?? 0) + 1;
      next.uncomfortable_streak[key] = streak;
      if (streak >= 2) setReviewHold(next, key, 'UNCOMFORTABLE_X2');
    } else if (f.code === 'STOPPED_SYMPTOM') {
      setReviewHold(next, f.exerciseId, 'STOPPED_SYMPTOM');
    }
    // RIGHT_ARM_FADE, EQUIPMENT_ISSUE: monitoring only, no state change here (already
    // reflected in evidence qualification / equipment overrides elsewhere)
  }
  return next;
}

function setReviewHold(state: GeneratorState, exerciseId: string, cause: ReviewHoldCause): void {
  state.review_hold[exerciseId] = { held: true, cause };
}

function stepDownOneLoad(line: Line): Line {
  if (line.next_load === null) return line; // bodyweight: nothing to step down
  return { ...line, next_load: Math.max(0, line.next_load - 1) };
}

// ---------- user action events (Q.8) ----------

export function applyUserActionEvent(state: GeneratorState, event: UserActionEvent): GeneratorState {
  const next = cloneState(state);
  switch (event.event_type) {
    case 'CLEAR_HOLD': {
      delete next.review_hold[event.payload.exercise_id];
      return next;
    }
    case 'CLEAR_REVIEW': {
      // [M-10]: clears reduce_locked on the line(s) matching exercise (+ optional role/side)
      for (const [key, line] of Object.entries(next.lines)) {
        if (line.exercise_id !== event.payload.exercise_id) continue;
        if (event.payload.role && line.role !== event.payload.role) continue;
        if (event.payload.side && line.side !== event.payload.side) continue;
        next.lines[key] = { ...line, reduce_locked: false, consecutive_holds: 0 };
      }
      delete next.review_hold[event.payload.exercise_id];
      return next;
    }
    case 'SET_PREFERENCE': {
      next.preference[event.payload.exercise_id] = event.payload.value;
      // DISLIKE's rotate_due-if-alternative-exists effect (§E.5 [M-11]) needs the pool/
      // servability context to check "at least one other statically eligible exercise
      // exists," which this state-only module doesn't have — generate.ts's caller
      // resolves that and calls markAnchorRotateDue() below when it applies.
      return next;
    }
    case 'USER_REPLACE': {
      const key = makeAnchorKey(event.payload.family, event.payload.role, event.payload.sub_target);
      next.anchors[key] = { exercise_id: event.payload.exercise_id, exposures_as_anchor: 1, rotate_due: false, rotate_cause: null, note: null };
      return next;
    }
    case 'CONFIRM_CAPABILITY': {
      next.capability_confirmed[event.payload.capability_prereq] = true;
      return next;
    }
    case 'CONFIRM_EQUIPMENT': {
      const existing = next.equipment_overrides[event.payload.equipment_id] ?? {};
      next.equipment_overrides[event.payload.equipment_id] = {
        ...existing,
        availability: event.payload.availability,
        loads: event.payload.loads,
        max_confirmed_load: event.payload.max_confirmed_load,
        station_group: event.payload.station_group,
      };
      return next;
    }
    case 'ALLOY_SKIPPED': {
      next.alloy_resolved[event.payload.slot_key] = 'SKIPPED';
      return next;
    }
    default:
      return next;
  }
}

/** §E.5 DISLIKE trigger, applied by generate.ts once it has confirmed a statically
 * eligible alternative exists in the family (pool + filters context this module doesn't
 * have). If none exists, the anchor is kept and `note = NO_ALTERNATIVE_FOR_DISLIKE`. */
export function markAnchorRotateDueForDislike(state: GeneratorState, anchorKeyStr: string, alternativeExists: boolean): GeneratorState {
  const next = cloneState(state);
  const anchor = next.anchors[anchorKeyStr];
  if (!anchor) return next;
  if (alternativeExists) {
    setRotateDue(anchor, 'DISLIKE');
  } else {
    anchor.note = 'NO_ALTERNATIVE_FOR_DISLIKE';
  }
  return next;
}
