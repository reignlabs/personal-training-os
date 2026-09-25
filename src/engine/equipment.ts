/**
 * Effective equipment state and implement (equipment_options) resolution (§Q.3, §D
 * HF-06, [M-13, M-20]). Pure: baseline + persisted overrides (CONFIRM_EQUIPMENT events)
 * + today's check-in equipment issues (a per-generation input, never persisted).
 */
import type { EquipmentState } from '../contracts';
import type { EquipmentOverride, Line } from './types';

export interface EffectiveEquipment {
  availability: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN';
  loads: number[] | null;
  max_confirmed_load: number | null;
}

/** Merges the pack's equipment baseline with any state-level overrides. */
export function effectiveEquipmentMap(
  baseline: EquipmentState[],
  overrides: Record<string, EquipmentOverride>,
): Map<string, EffectiveEquipment> {
  const map = new Map<string, EffectiveEquipment>();
  for (const b of baseline) {
    const o = overrides[b.equipment_id];
    map.set(b.equipment_id, {
      availability: o?.availability ?? b.availability,
      loads: o?.loads !== undefined ? o.loads : b.loads,
      max_confirmed_load: o?.max_confirmed_load !== undefined ? o.max_confirmed_load : b.max_confirmed_load,
    });
  }
  return map;
}

function availabilityOf(id: string, equip: Map<string, EffectiveEquipment>): 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN' {
  return equip.get(id)?.availability ?? 'UNKNOWN';
}

export type OptionSetStatus = 'AVAILABLE_TODAY' | 'BLOCKED_TODAY_ONLY' | 'UNKNOWN' | 'NOT_AVAILABLE';

/**
 * Status of one equipment_options set. `todayIssues` is ignored when empty, which is
 * exactly the "ignoring today's issues" mode C.4.1 servability needs for HF-06.
 */
export function optionSetStatus(
  optionSet: string[],
  equip: Map<string, EffectiveEquipment>,
  todayIssues: readonly string[],
): OptionSetStatus {
  if (optionSet.length === 0) return 'AVAILABLE_TODAY'; // bodyweight, [[]]
  let sawUnknown = false;
  for (const id of optionSet) {
    const a = availabilityOf(id, equip);
    if (a === 'NOT_AVAILABLE') return 'NOT_AVAILABLE';
    if (a === 'UNKNOWN') sawUnknown = true;
  }
  if (sawUnknown) return 'UNKNOWN';
  if (optionSet.some((id) => todayIssues.includes(id))) return 'BLOCKED_TODAY_ONLY';
  return 'AVAILABLE_TODAY';
}

const SEVERITY: Record<OptionSetStatus, number> = {
  AVAILABLE_TODAY: 0,
  BLOCKED_TODAY_ONLY: 1,
  UNKNOWN: 2,
  NOT_AVAILABLE: 3,
};

export interface Hf06Result {
  outcome: 'PASS' | 'EXCLUDED_TODAY' | 'HELD_EQUIPMENT_UNKNOWN' | 'EXCLUDED';
  /** The chosen option set (today's implement), only when outcome = PASS. */
  implement: string[] | null;
  /** True when a line exists and today's implement differs from it (needs a re-check by the caller for M-20 re-base logic). */
  implementIndex: number | null;
}

/**
 * Evaluates HF-06 for one exercise's equipment_options list. `line`, when given, makes
 * the line's implement the preferred choice while it is itself available today [M-20].
 */
export function evaluateEquipmentOptions(
  optionSets: string[][],
  equip: Map<string, EffectiveEquipment>,
  todayIssues: readonly string[],
  line: Line | undefined,
): Hf06Result {
  const statuses = optionSets.map((set) => optionSetStatus(set, equip, todayIssues));

  const availableIndexes = statuses
    .map((s, i) => (s === 'AVAILABLE_TODAY' ? i : -1))
    .filter((i) => i >= 0);

  if (availableIndexes.length > 0) {
    let chosen = availableIndexes[0];
    if (line) {
      const lineIdx = optionSets.findIndex((set) => sameSet(set, line.implement));
      if (lineIdx >= 0 && availableIndexes.includes(lineIdx)) chosen = lineIdx;
    }
    return { outcome: 'PASS', implement: optionSets[chosen], implementIndex: chosen };
  }

  let worst: OptionSetStatus = 'AVAILABLE_TODAY';
  for (const s of statuses) {
    if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  // best (least severe) failing status decides the outcome
  let best: OptionSetStatus = 'NOT_AVAILABLE';
  for (const s of statuses) {
    if (SEVERITY[s] < SEVERITY[best]) best = s;
  }
  const outcome =
    best === 'BLOCKED_TODAY_ONLY' ? 'EXCLUDED_TODAY' : best === 'UNKNOWN' ? 'HELD_EQUIPMENT_UNKNOWN' : 'EXCLUDED';
  return { outcome, implement: null, implementIndex: null };
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

/** True when the line's own implement is no longer AVAILABLE at all (not merely today's issue) — [M-20] re-base trigger. */
export function lineImplementGone(line: Line, equip: Map<string, EffectiveEquipment>): boolean {
  if (line.implement.length === 0) return false; // bodyweight never "leaves"
  return line.implement.some((id) => availabilityOf(id, equip) === 'NOT_AVAILABLE');
}
