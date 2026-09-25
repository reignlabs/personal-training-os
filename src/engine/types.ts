/**
 * Engine-internal types (ENGINE_WORKOUT_GENERATOR_V0_2_1.md §B.1). GeneratorState is a
 * rebuildable cache, never a stored contract of its own (Q.9: rebuilt by replaying Q.5,
 * Q.6, Q.8 and resolved check-in Alloy answers) — these types live in src/engine, not
 * src/contracts. Pure data only: no functions here read the clock or randomness.
 */
import type {
  DecisionCode,
  Family,
  Parent,
  Role,
  Side,
  SubTarget,
  Unit,
  UtcTs,
} from '../contracts';

/** §H.1 */
export interface Line {
  exercise_id: string;
  role: Role;
  side: Side;
  range_min: number;
  range_max: number;
  step: number;
  unit: Unit;
  state: 'BUILDING' | 'LOAD_CAPPED';
  next_load: number | null;
  next_target: number;
  /** the equipment option set (list of equipment_ids) the line was created/last rebased on [M-13, M-20] */
  implement: string[];
  top_confirmations: number;
  extended: boolean;
  consecutive_holds: number;
  reduce_locked: boolean;
  last_exposure_at: UtcTs | null;
  last_decision: { code: DecisionCode; reasons: string[] } | null;
}

/** key = `${exercise_id}|${role}|${side}` */
export type LineKey = string;

export type RotateCause = 'LOAD_CAPPED' | 'EXPOSURES' | 'DISLIKE' | 'USER_REPLACE';

/** §B.1 anchors[(family, role, sub_target)] */
export interface AnchorState {
  exercise_id: string;
  exposures_as_anchor: number;
  rotate_due: boolean;
  rotate_cause: RotateCause | null;
  /** e.g. NO_ALTERNATIVE_FOR_DISLIKE (§E.5) */
  note: string | null;
}

/** key = `${family}|${role}|${sub_target ?? ''}` */
export type AnchorKey = string;

export type ReviewHoldCause = 'STOPPED_SYMPTOM' | 'UNCOMFORTABLE_X2';

export interface EquipmentOverride {
  availability?: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN';
  loads?: number[] | null;
  max_confirmed_load?: number | null;
  station_group?: string | null;
}

/** §B.1 */
export interface GeneratorState {
  family_last_trained: Partial<Record<Family, UtcTs>>;
  parent_last_trained: Partial<Record<Parent, UtcTs>>;
  /** [M-01] */
  family_last_primary: Partial<Record<Family, UtcTs>>;
  /** [M-01] PUSH | PULL only */
  parent_last_primary: Partial<Record<'PUSH' | 'PULL', UtcTs>>;
  /** [M-15] recovery only, never staleness */
  recovery_credits: UtcTs[];
  exercise_last_used: Record<string, UtcTs>;
  anchors: Record<AnchorKey, AnchorState>;
  lines: Record<LineKey, Line>;
  review_hold: Record<string, { held: boolean; cause: ReviewHoldCause }>;
  uncomfortable_streak: Record<string, number>;
  preference: Record<string, 'PREFER' | 'DISLIKE' | null>;
  apartment_sessions_completed: number;
  history_start: UtcTs | null;
  /** keyed by scheduled slot key (e.g. `${local_date}` of the Alloy class) [M-15] */
  alloy_resolved: Record<string, 'LOGGED' | 'SKIPPED' | 'UNKNOWN'>;
  equipment_overrides: Record<string, EquipmentOverride>;
  /** capability_prereq strings satisfied by a CONFIRM_CAPABILITY event (§D HF-08) */
  capability_confirmed: Record<string, true>;
}

/** §B.4 values derived at generation time, never persisted. */
export interface DerivedAtGeneration {
  recovery_lower_at: UtcTs | null;
  hours_since_lower: number | null;
  history_days: number | null;
  seed: number;
}

export function anchorKey(family: Family, role: Role, subTarget: SubTarget | null): AnchorKey {
  return `${family}|${role}|${subTarget ?? ''}`;
}

export function lineKey(exerciseId: string, role: Role, side: Side): LineKey {
  return `${exerciseId}|${role}|${side}`;
}

export function parseAnchorKey(key: AnchorKey): { family: Family; role: Role; subTarget: SubTarget | null } {
  const [family, role, subTarget] = key.split('|');
  return { family: family as Family, role: role as Role, subTarget: subTarget === '' ? null : (subTarget as SubTarget) };
}
