/**
 * Selection (§E): anchor rule (E.1), sort keys (E.2), reason codes (E.3), limited
 * variety draw (E.4), anchor rotation triggers (E.5, evaluated at completion — see
 * engine/completion.ts), user swap (E.6, app-layer list construction — see swapOptions
 * in engine/index.ts).
 */
import type { CheckIn, DecidedBy, Family, Role, SubTarget } from '../contracts';
import type { PoolExercise } from './pool';
import type { GeneratorState } from './types';
import { anchorKey } from './types';
import { candidatesFor, evaluateSlotCandidates, passesStatic, type FilterCtx, type FilterResult } from './filters';
import { CORE_FAMILIES } from './families';
import { drawIndex } from '../domain/seed';

const TODAY_ONLY_HF = new Set(['HF-05', 'HF-10', 'HF-11', 'HF-12', 'HF-13']);

function isTodayOnlyOutcome(r: FilterResult | null): boolean {
  if (!r) return false;
  if (TODAY_ONLY_HF.has(r.hfId)) return true;
  if (r.hfId === 'HF-06' && r.outcome === 'EXCLUDED_TODAY') return true;
  return false;
}

function involvementRank(v: 'NONE' | 'SECONDARY' | 'PRIMARY'): number {
  return v === 'NONE' ? 0 : v === 'SECONDARY' ? 1 : 2;
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Roles that use anchors at all (§E.1: "MOBILITY and CONDITIONING do not use anchors"). */
export function roleUsesAnchors(role: Role): boolean {
  return role !== 'MOBILITY' && role !== 'CONDITIONING';
}

/** Roles eligible for the E.4 seeded draw. */
function drawEligibleRole(role: Role): boolean {
  return role === 'MOBILITY' || role === 'CORE' || role === 'CARRY' || role === 'ACCESSORY';
}

export type SortKey = 'K0' | 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7';

interface RankCtx {
  anchorOtherRole: string | null; // exercise_id of the same-family anchor in the OTHER main role (K0)
  r04Worse: boolean;
  hasLine: (exerciseId: string) => boolean;
}

/** Only K0, K4, K6, K7 are computable from the exercise + a small context alone;
 * K1/K2/K3/K5 need per-state maps and are special-cased directly in rankTuple(). */
function keyValue(key: 'K0' | 'K4' | 'K6' | 'K7', e: PoolExercise, ctx: RankCtx): number {
  switch (key) {
    case 'K0':
      return ctx.anchorOtherRole !== null && e.exercise_id === ctx.anchorOtherRole ? 1 : 0;
    case 'K4':
      return ctx.hasLine(e.exercise_id) ? 0 : 1;
    case 'K6':
      return e.evidence_basis === 'ALLOY_LIBRARY' ? 0 : e.evidence_basis === 'ALLOY_LIBRARY_ADAPTED' ? 1 : 2;
    case 'K7':
      return e.default_order;
    default:
      return 0;
  }
}

export interface SelectionSortOpts {
  preference: Record<string, 'PREFER' | 'DISLIKE' | null>;
  exerciseLastUsed: Record<string, string>;
  hasLine: (exerciseId: string) => boolean;
  anchorOtherRole: string | null;
  r04Worse: boolean;
}

/** Full rank tuple for keys K0..K6 (K5 needs real ms, so kept as its own lane). */
function rankTuple(keys: SortKey[], e: PoolExercise, opts: SelectionSortOpts): number[] {
  return keys.map((k) => {
    if (k === 'K1') return opts.preference[e.exercise_id] === 'PREFER' ? 0 : 1;
    if (k === 'K2') return opts.preference[e.exercise_id] === 'DISLIKE' ? 1 : 0;
    if (k === 'K3') return opts.r04Worse ? involvementRank(e.right_triceps_involvement) : 0;
    if (k === 'K5') {
      const t = opts.exerciseLastUsed[e.exercise_id];
      return t ? Date.parse(t) : -8640000000000000; // null first
    }
    return keyValue(k as 'K0' | 'K4' | 'K6' | 'K7', e, { anchorOtherRole: opts.anchorOtherRole, r04Worse: opts.r04Worse, hasLine: opts.hasLine });
  });
}

export interface SortResult {
  ordered: PoolExercise[];
  decidedBy: DecidedBy;
}

/** Sorts candidates by the given ordered key list, tie-broken by exercise_id. */
export function sortByKeys(candidates: PoolExercise[], keys: SortKey[], opts: SelectionSortOpts): SortResult {
  const rows = candidates.map((e) => ({ e, tuple: rankTuple(keys, e, opts) }));
  rows.sort((a, b) => {
    for (let i = 0; i < a.tuple.length; i++) {
      if (a.tuple[i] !== b.tuple[i]) return a.tuple[i] - b.tuple[i];
    }
    return cmpStr(a.e.exercise_id, b.e.exercise_id);
  });
  let decidedBy: DecidedBy = keys[0];
  if (rows.length >= 2) {
    for (let i = 0; i < keys.length; i++) {
      if (rows[0].tuple[i] !== rows[1].tuple[i]) {
        decidedBy = keys[i];
        break;
      }
    }
  }
  return { ordered: rows.map((r) => r.e), decidedBy };
}

const FULL_KEYS: SortKey[] = ['K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];
const K3_FIRST_KEYS: SortKey[] = ['K3', 'K0', 'K1', 'K2', 'K4', 'K5', 'K6', 'K7'];
const MAIN_ANCHOR_KEYS: SortKey[] = ['K0', 'K1', 'K2', 'K3', 'K6', 'K7'];
const OTHER_ANCHOR_KEYS: SortKey[] = FULL_KEYS;

/** SORT(eligible, K0..K7) with the E.4 draw applied for MOBILITY/CORE/CARRY/ACCESSORY. */
export function orderEligible(
  candidates: PoolExercise[],
  role: Role,
  opts: SelectionSortOpts,
  enableNovelDraw: boolean,
  seed: number,
  slotKey: string,
): SortResult {
  return orderWithDraw(candidates, FULL_KEYS, role, opts, enableNovelDraw, seed, slotKey);
}

export function orderEligibleK3First(
  candidates: PoolExercise[],
  role: Role,
  opts: SelectionSortOpts,
  enableNovelDraw: boolean,
  seed: number,
  slotKey: string,
): SortResult {
  return orderWithDraw(candidates, K3_FIRST_KEYS, role, opts, enableNovelDraw, seed, slotKey);
}

/** ANCHOR_ORDER(role): main roles skip K4/K5 (history not used for anchor choice, [M-03]). */
export function anchorOrder(
  candidates: PoolExercise[],
  role: Role,
  opts: SelectionSortOpts,
  enableNovelDraw: boolean,
  seed: number,
  slotKey: string,
): SortResult {
  const keys = role === 'PRIMARY' || role === 'SECONDARY' ? MAIN_ANCHOR_KEYS : OTHER_ANCHOR_KEYS;
  return orderWithDraw(candidates, keys, role, opts, enableNovelDraw, seed, slotKey);
}

function orderWithDraw(
  candidates: PoolExercise[],
  keys: SortKey[],
  role: Role,
  opts: SelectionSortOpts,
  enableNovelDraw: boolean,
  seed: number,
  slotKey: string,
): SortResult {
  if (candidates.length === 0) return { ordered: [], decidedBy: keys[0] };
  const keysNoK7 = keys.filter((k) => k !== 'K7');
  const rows = candidates.map((e) => ({ e, tuple: rankTuple(keysNoK7, e, opts) }));
  let best = rows[0].tuple;
  for (const r of rows) {
    for (let i = 0; i < best.length; i++) {
      if (r.tuple[i] !== best[i]) {
        if (r.tuple[i] < best[i]) best = r.tuple;
        break;
      }
    }
  }
  const tieGroup = rows.filter((r) => r.tuple.every((v, i) => v === best[i]));

  if (
    role !== 'PRIMARY' &&
    role !== 'SECONDARY' &&
    drawEligibleRole(role) &&
    enableNovelDraw &&
    tieGroup.length > 1 &&
    tieGroup.every((r) => !opts.exerciseLastUsed[r.e.exercise_id])
  ) {
    const sortedTie = [...tieGroup].sort((a, b) => cmpStr(a.e.exercise_id, b.e.exercise_id));
    const idx = drawIndex(seed, slotKey, sortedTie.length);
    const winner = sortedTie[idx].e;
    const rest = sortByKeys(
      candidates.filter((e) => e.exercise_id !== winner.exercise_id),
      keys,
      opts,
    ).ordered;
    return { ordered: [winner, ...rest], decidedBy: 'DRAW' };
  }

  return sortByKeys(candidates, keys, opts);
}

export interface SelectionOutcome {
  exercise: PoolExercise;
  reasonCode: string; // exact §E.3 string, e.g. "SUBSTITUTE_FOR_ANCHOR(HF-12)"
  decidedBy: DecidedBy | null;
  anchorBefore: string | null;
  anchorCandidateIfSubstitute: string | null;
  note: string | null;
  /** SORT(eligible, K0..K7) for this slot — used by §F.2 station re-selection. */
  orderedEligible: PoolExercise[];
}

export interface SelectSlotArgs {
  family: Family;
  role: Role;
  subTarget: SubTarget | null;
  pool: PoolExercise[];
  state: GeneratorState;
  ctx: FilterCtx;
  checkIn: Pick<CheckIn, 'R04'>;
  enableNovelDraw: boolean;
  seed: number;
  slotKey: string;
}

/** SELECT(slot, ...) — §P pseudocode, §E.1. Returns null when no eligible candidate exists (caller runs §C.7 fallback). */
export function selectForSlot(args: SelectSlotArgs): SelectionOutcome | null {
  const { family, role, subTarget, pool, state, ctx, checkIn, enableNovelDraw, seed, slotKey } = args;
  const candidates = candidatesFor(pool, family, subTarget, role);
  if (candidates.length === 0) return null;
  const outcomeMap = evaluateSlotCandidates(candidates, role, ctx);
  const eligible = candidates.filter((e) => outcomeMap.get(e.exercise_id) === null);

  const opts: SelectionSortOpts = {
    preference: state.preference,
    exerciseLastUsed: state.exercise_last_used,
    hasLine: (id) => Object.keys(state.lines).some((k) => k.startsWith(`${id}|`) && state.lines[k].next_load !== null),
    anchorOtherRole: null,
    r04Worse: checkIn.R04 === 'worse',
  };

  if (eligible.length === 0) return null;

  const anchorK = anchorKey(family, role, subTarget);
  const anchor = roleUsesAnchors(role) ? state.anchors[anchorK] : undefined;

  if (role === 'PRIMARY' || role === 'SECONDARY') {
    const otherRole = role === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY';
    const otherAnchor = state.anchors[anchorKey(family, otherRole, subTarget)];
    opts.anchorOtherRole = otherAnchor?.exercise_id ?? null;
  }

  const ordered = orderEligible(eligible, role, opts, enableNovelDraw, seed, slotKey);

  if (anchor && eligible.some((e) => e.exercise_id === anchor.exercise_id) && !anchor.rotate_due) {
    const anchorExercise = eligible.find((e) => e.exercise_id === anchor.exercise_id)!;
    if (opts.r04Worse) {
      const anchorInvolvement = involvementRank(anchorExercise.right_triceps_involvement);
      const minEligibleInvolvement = Math.min(...eligible.map((e) => involvementRank(e.right_triceps_involvement)));
      if (anchorInvolvement > minEligibleInvolvement) {
        const sorted = orderEligibleK3First(eligible, role, opts, enableNovelDraw, seed, slotKey);
        return {
          exercise: sorted.ordered[0],
          reasonCode: 'SUBSTITUTE_FOR_ANCHOR(R-04)',
          decidedBy: sorted.decidedBy,
          anchorBefore: anchor.exercise_id,
          anchorCandidateIfSubstitute: anchor.exercise_id,
          note: null,
          orderedEligible: ordered.ordered,
        };
      }
    }
    return {
      exercise: anchorExercise,
      reasonCode: 'ANCHOR',
      decidedBy: null,
      anchorBefore: anchor.exercise_id,
      anchorCandidateIfSubstitute: null,
      note: null,
      orderedEligible: ordered.ordered,
    };
  }

  if (anchor && !anchor.rotate_due) {
    const anchorOutcome = outcomeMap.get(anchor.exercise_id);
    if (anchorOutcome !== undefined && isTodayOnlyOutcome(anchorOutcome)) {
      return {
        exercise: ordered.ordered[0],
        reasonCode: `SUBSTITUTE_FOR_ANCHOR(${anchorOutcome!.hfId})`,
        decidedBy: ordered.decidedBy,
        anchorBefore: anchor.exercise_id,
        anchorCandidateIfSubstitute: anchor.exercise_id,
        note: null,
        orderedEligible: ordered.ordered,
      };
    }
  }

  // unfiltered: candidates passing all filters except today-only ones
  let unfiltered = candidates.filter((e) => passesStatic(e, role, ctx));
  if (anchor && anchor.rotate_due && unfiltered.some((e) => e.exercise_id === anchor.exercise_id) && unfiltered.length > 1) {
    unfiltered = unfiltered.filter((e) => e.exercise_id !== anchor.exercise_id);
  }
  if (unfiltered.length === 0) {
    // No statically-eligible candidate at all: fall back to substitute-only behavior.
    return {
      exercise: ordered.ordered[0],
      reasonCode: `SUBSTITUTE_NO_ANCHOR(${outcomeMap.get(ordered.ordered[0].exercise_id)?.hfId ?? 'HF-09'})`,
      decidedBy: ordered.decidedBy,
      anchorBefore: anchor?.exercise_id ?? null,
      anchorCandidateIfSubstitute: null,
      note: null,
      orderedEligible: ordered.ordered,
    };
  }

  const anchorOrdered = anchorOrder(unfiltered, role, opts, enableNovelDraw, seed, slotKey);
  const candidate = anchorOrdered.ordered[0];

  if (outcomeMap.get(candidate.exercise_id) === null) {
    let reasonCode: string;
    if (!anchor) {
      reasonCode = 'NEW_ANCHOR_NONE_PRIOR';
    } else if (anchor.rotate_due) {
      reasonCode = `NEW_ANCHOR_ROTATION(${anchor.rotate_cause})`;
    } else {
      const blockedOutcome = outcomeMap.get(anchor.exercise_id);
      reasonCode = `NEW_ANCHOR_BLOCKED(${blockedOutcome?.hfId ?? 'HF-09'})`;
    }
    return {
      exercise: candidate,
      reasonCode,
      decidedBy: anchorOrdered.decidedBy,
      anchorBefore: anchor?.exercise_id ?? null,
      anchorCandidateIfSubstitute: null,
      note: null,
      orderedEligible: ordered.ordered,
    };
  }

  const blockedHf = outcomeMap.get(candidate.exercise_id)?.hfId ?? 'HF-09';
  return {
    exercise: ordered.ordered[0],
    reasonCode: `SUBSTITUTE_NO_ANCHOR(${blockedHf})`,
    decidedBy: ordered.decidedBy,
    anchorBefore: anchor?.exercise_id ?? null,
    anchorCandidateIfSubstitute: candidate.exercise_id,
    note: null,
    orderedEligible: ordered.ordered,
  };
}

export { CORE_FAMILIES };
