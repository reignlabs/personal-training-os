/**
 * Validation (§I). §I.1's seven validators (V-01 to V-07; V-00a-g are pool.ts's load-time
 * checks, run once at load per §Q.1.2, not here) plus the small, local repair primitives
 * (§I.1's repair column) that don't require re-entering the full selection pipeline.
 *
 * ARCHITECTURE NOTE: the repair loop itself ("apply the first repair that fixes a failing
 * validator, then re-run all validators, per validator order") is an orchestration concern
 * that spans selection.ts, station.ts, and prescription.ts, so it is owned by generate.ts,
 * not this module — consistent with the project's modular-architecture requirement to keep
 * "generator" and "programming rules" separable. This module exposes: (a) pure checks
 * (checkV01..checkV07) that generate.ts's repair loop calls before and after each repair
 * attempt, and (b) small repair *primitives* that don't need the full pipeline context
 * (nextSubstitute for V-01/V-04, station conflict detection for V-02, expected-prescription
 * diffing for V-05) so generate.ts's loop stays thin.
 */
import type { BlockId, Family, HfId, LoadState, NoSessionReason, Role, Unit } from '../contracts';
import type { PoolExercise } from './pool';
import { CORE_FAMILIES } from './families';

export const CORE_CARRY_FAMILIES: Family[] = [...CORE_FAMILIES, 'CARRY'];

export interface ValidationItem {
  itemKey: string;
  /** SlotId ('A1'..'F2') or PrepId ('PG','PM1','PM2','RAMP_A1','RAMP_A2') */
  slot: string;
  block: BlockId | null;
  exerciseId: string;
  family: Family | null;
  role: Role;
  /** the item's own filter status as last evaluated (should be PASS by the time it
   * reaches assembly; V-01 is the final defensive check) */
  hfOutcome: 'PASS' | 'NOT_PASS';
  hfId: HfId | null;
  equipmentAvailableToday: boolean;
  station: string;
  prescription: { sets: number; target: number; unit: Unit; load: number | null; line_state: LoadState };
  /** recomputed from the line by prescription.ts; null when the role has no line
   * (MOBILITY, CONDITIONING — §H.8) so V-05 does not apply */
  expectedPrescription: { target: number; load: number | null; line_state: LoadState } | null;
  /** for substitution repair (V-01, V-04); same shape selection.ts hands station.ts */
  orderedEligible: PoolExercise[];
}

export interface BlockInfo {
  block: BlockId;
  mode: 'PAIRED' | 'STRAIGHT_SETS';
  itemKeys: string[];
}

// ---------- V-01: hard filters (HF-01..08, HF-14 scope) ----------

const V01_HF_SCOPE: ReadonlySet<HfId> = new Set(['HF-01', 'HF-02', 'HF-03', 'HF-04', 'HF-05', 'HF-06', 'HF-07', 'HF-08', 'HF-14']);

export function checkV01(items: ValidationItem[]): { failing: ValidationItem[] } {
  const failing = items.filter((it) => it.hfOutcome !== 'PASS' && it.hfId !== null && V01_HF_SCOPE.has(it.hfId));
  return { failing };
}

// ---------- V-02: equipment + station rule ----------

function stationConflicts(a: string, b: string): boolean {
  return a !== 'NONE' && b !== 'NONE' && a !== b;
}

export function checkV02(items: ValidationItem[], blocks: BlockInfo[]): { unavailable: ValidationItem[]; stationViolations: BlockInfo[] } {
  const unavailable = items.filter((it) => !it.equipmentAvailableToday);
  const byKey = new Map(items.map((it) => [it.itemKey, it]));
  const stationViolations: BlockInfo[] = [];
  for (const b of blocks) {
    if (b.mode === 'STRAIGHT_SETS') continue; // §F.2 fallback already accepted
    if (b.itemKeys.length < 2) continue;
    const [a1, a2] = b.itemKeys.map((k) => byKey.get(k));
    if (a1 && a2 && stationConflicts(a1.station, a2.station)) stationViolations.push(b);
  }
  return { unavailable, stationViolations };
}

// ---------- V-03: session_min <= R-01, after §G.5 ----------

export function checkV03(fits: boolean): boolean {
  return fits;
}

// ---------- V-04: no duplicate exercise; no repeated core/carry family [M-07] ----------

export function checkV04(items: ValidationItem[]): { duplicateExercise: string[]; duplicateCoreCarryFamily: Family[] } {
  const exCount = new Map<string, number>();
  const famCount = new Map<Family, number>();
  for (const it of items) {
    exCount.set(it.exerciseId, (exCount.get(it.exerciseId) ?? 0) + 1);
    if (it.family && CORE_CARRY_FAMILIES.includes(it.family)) {
      famCount.set(it.family, (famCount.get(it.family) ?? 0) + 1);
    }
  }
  return {
    duplicateExercise: [...exCount.entries()].filter(([, c]) => c > 1).map(([id]) => id),
    duplicateCoreCarryFamily: [...famCount.entries()].filter(([, c]) => c > 1).map(([f]) => f),
  };
}

// ---------- V-05: load prescription follows §G.3/§H ----------

export function checkV05(items: ValidationItem[]): { failing: ValidationItem[] } {
  const failing = items.filter((it) => {
    const exp = it.expectedPrescription;
    if (!exp) return false;
    return it.prescription.line_state !== exp.line_state || it.prescription.load !== exp.load || it.prescription.target !== exp.target;
  });
  return { failing };
}

// ---------- V-06: block A has >= 1 item ----------

export function checkV06(items: ValidationItem[]): boolean {
  return items.some((it) => it.block === 'A');
}

// ---------- V-07: record complete ----------

export function checkV07RecordComplete(records: Record<string, unknown>[], requiredFields: string[]): { missing: { index: number; fields: string[] }[] } {
  const missing: { index: number; fields: string[] }[] = [];
  records.forEach((rec, index) => {
    const nullableFields = new Set(['load', 'rest']);
    const gone = requiredFields.filter((f) => rec[f] === undefined || (rec[f] === null && !nullableFields.has(f)));
    if (gone.length > 0) missing.push({ index, fields: gone });
  });
  return { missing };
}

// ---------- repair primitives ----------

/** V-01/V-04 repair: "replace item with next candidate" — walk the item's own
 * ordered-eligible list (as computed at selection time), skipping exercises already
 * used elsewhere in the session. Returns null if no candidate qualifies (§C.7: slot
 * goes empty). */
export function nextSubstitute(item: ValidationItem, usedExerciseIds: ReadonlySet<string>): PoolExercise | null {
  for (const candidate of item.orderedEligible) {
    if (candidate.exercise_id === item.exerciseId) continue;
    if (usedExerciseIds.has(candidate.exercise_id)) continue;
    return candidate;
  }
  return null;
}

// ---------- orchestration surface ----------

export type ValidatorId = 'V-01' | 'V-02' | 'V-03' | 'V-04' | 'V-05' | 'V-06' | 'V-07';
export type ValidatorResultKind = 'PASS' | 'FAIL';

export interface ValidatorOutcome {
  id: ValidatorId;
  result: ValidatorResultKind;
  failingItemKeys: string[];
}

export interface RunValidatorsArgs {
  items: ValidationItem[];
  blocks: BlockInfo[];
  durationFits: boolean;
  recordRows?: Record<string, unknown>[];
  recordRequiredFields?: string[];
}

/** Runs V-01 through V-07 once, in order, against the current assembled session. Does
 * not repair — generate.ts's loop repairs and calls this again, per §I.1: "Repairs are
 * applied in validator order, then validators V-01 to V-06 run once more." */
export function runValidators(args: RunValidatorsArgs): ValidatorOutcome[] {
  const outcomes: ValidatorOutcome[] = [];

  const v01 = checkV01(args.items);
  outcomes.push({ id: 'V-01', result: v01.failing.length === 0 ? 'PASS' : 'FAIL', failingItemKeys: v01.failing.map((i) => i.itemKey) });

  const v02 = checkV02(args.items, args.blocks);
  const v02Failing = [...v02.unavailable.map((i) => i.itemKey), ...v02.stationViolations.flatMap((b) => b.itemKeys)];
  outcomes.push({ id: 'V-02', result: v02Failing.length === 0 ? 'PASS' : 'FAIL', failingItemKeys: [...new Set(v02Failing)] });

  outcomes.push({ id: 'V-03', result: checkV03(args.durationFits) ? 'PASS' : 'FAIL', failingItemKeys: [] });

  const v04 = checkV04(args.items);
  const v04Failing = args.items
    .filter((i) => v04.duplicateExercise.includes(i.exerciseId) || (i.family && v04.duplicateCoreCarryFamily.includes(i.family)))
    .map((i) => i.itemKey);
  outcomes.push({ id: 'V-04', result: v04Failing.length === 0 ? 'PASS' : 'FAIL', failingItemKeys: v04Failing });

  const v05 = checkV05(args.items);
  outcomes.push({ id: 'V-05', result: v05.failing.length === 0 ? 'PASS' : 'FAIL', failingItemKeys: v05.failing.map((i) => i.itemKey) });

  outcomes.push({ id: 'V-06', result: checkV06(args.items) ? 'PASS' : 'FAIL', failingItemKeys: [] });

  if (args.recordRows && args.recordRequiredFields) {
    const v07 = checkV07RecordComplete(args.recordRows, args.recordRequiredFields);
    outcomes.push({ id: 'V-07', result: v07.missing.length === 0 ? 'PASS' : 'FAIL', failingItemKeys: v07.missing.map((m) => String(m.index)) });
  } else {
    outcomes.push({ id: 'V-07', result: 'PASS', failingItemKeys: [] });
  }

  return outcomes;
}

/** §I.2: NO_SESSION reason from a final (post-repair) validator run. V-06 failing is
 * NO_BLOCK_A regardless of other results (§I.1: "the engine never returns a session
 * that fails V-01, V-02, or V-04" — those, like V-06, must be repaired or the session
 * is refused); anything else still failing is VALIDATION_FAILED(ids). */
export function deriveNoSessionReason(outcomes: ValidatorOutcome[]): { reason: NoSessionReason; failingIds: ValidatorId[] } | null {
  const failing = outcomes.filter((o) => o.result === 'FAIL');
  if (failing.length === 0) return null;
  if (failing.some((o) => o.id === 'V-06')) return { reason: 'NO_BLOCK_A', failingIds: failing.map((o) => o.id) };
  return { reason: 'VALIDATION_FAILED', failingIds: failing.map((o) => o.id) };
}
