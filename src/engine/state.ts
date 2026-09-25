/**
 * Engine state construction and small pure helpers (§B.1, §B.3, §B.4).
 */
import type { GeneratorState } from './types';

export function createEmptyState(): GeneratorState {
  return {
    family_last_trained: {},
    parent_last_trained: {},
    family_last_primary: {},
    parent_last_primary: {},
    recovery_credits: [],
    exercise_last_used: {},
    anchors: {},
    lines: {},
    review_hold: {},
    uncomfortable_streak: {},
    preference: {},
    apartment_sessions_completed: 0,
    history_start: null,
    alloy_resolved: {},
    equipment_overrides: {},
    capability_confirmed: {},
  };
}

/** null / undefined sorts as the oldest possible value ("never"), per §B.3. */
export function tsRank(ts: string | null | undefined): number {
  return ts ? Date.parse(ts) : -Infinity;
}

/** Latest (max) of a list of timestamps, treating null/undefined as absent. */
export function latestTs(...ts: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const t of ts) {
    if (t && (best === null || Date.parse(t) > Date.parse(best))) best = t;
  }
  return best;
}

/** Deep-ish clone sufficient for engine state (plain JSON-safe data only). */
export function cloneState(state: GeneratorState): GeneratorState {
  return JSON.parse(JSON.stringify(state)) as GeneratorState;
}
