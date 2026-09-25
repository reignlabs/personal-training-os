/**
 * Hard filters HF-01 to HF-14 (§D). Applied to every candidate for every slot,
 * including PREP and F. The first failing filter is the candidate's outcome.
 */
import { calendarDaysBetween, hoursBetween, toLocalDate } from '../domain/time';
import type { Constraint, FilterOutcome, HfId, Posture, Role, SoreRegion, UtcTs } from '../contracts';
import type { PoolExercise } from './pool';
import type { GeneratorState, Line } from './types';
import { lineKey } from './types';
import { evaluateEquipmentOptions, type EffectiveEquipment } from './equipment';

export interface FilterCtx {
  now: UtcTs;
  todayLocalDate: string;
  tz: string;
  posture: Posture;
  constraints: Constraint[];
  avoidances: ReadonlySet<string>;
  todaySoreRegions: ReadonlySet<SoreRegion>;
  equip: Map<string, EffectiveEquipment>;
  todayEquipmentIssues: readonly string[];
  state: GeneratorState;
  selectedIds: ReadonlySet<string>;
  hoursSinceLower: number | null;
  repeatExclusionDays: number;
  heavyLowerRecoveryHours: number;
}

export interface FilterResult {
  hfId: HfId;
  outcome: FilterOutcome;
}

function constraintBindingMatches(where: { position_tags_any?: string[]; hand_support_in?: string[]; exercise_ids?: string[] }, e: PoolExercise): boolean {
  if (where.position_tags_any && where.position_tags_any.some((t) => e.position_tags.includes(t as never))) return true;
  if (where.hand_support_in && where.hand_support_in.includes(e.hand_support)) return true;
  if (where.exercise_ids && where.exercise_ids.includes(e.exercise_id)) return true;
  return false;
}

function constraintFilter(filterId: 'HF-01' | 'HF-02' | 'HF-03', ctx: FilterCtx, e: PoolExercise): FilterOutcome | null {
  const enforceableStatuses = new Set(['ACTIVE', 'ACTIVE_SCOPE_PENDING', 'ACTIVE_PARAMETERS_PENDING']);
  for (const c of ctx.constraints) {
    if (!enforceableStatuses.has(c.status)) continue;
    for (const b of c.engine_bindings) {
      if (b.filter !== filterId) continue;
      if (constraintBindingMatches(b.where, e)) return b.outcome;
    }
  }
  return null;
}

function findLineForImplementPreference(state: GeneratorState, exerciseId: string, role: Role): Line | undefined {
  const sides: ('BILATERAL' | 'LEFT' | 'RIGHT')[] = ['BILATERAL', 'LEFT', 'RIGHT'];
  for (const s of sides) {
    const l = state.lines[lineKey(exerciseId, role, s)];
    if (l) return l;
  }
  if (role === 'PRIMARY' || role === 'SECONDARY') {
    const other: Role = role === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY';
    for (const s of sides) {
      const l = state.lines[lineKey(exerciseId, other, s)];
      if (l) return l;
    }
  }
  return undefined;
}

export { findLineForImplementPreference };

/**
 * Runs the HF-01..HF-14 chain for one exercise/role. `mode: 'STATIC'` ignores today's
 * issues and skips the today-only filters (HF-05, HF-10, HF-11, HF-12, HF-13) — used by
 * §C.4.1 servability and by the §E.1 anchor-candidate computation.
 * `hasFamiliarEligible` is only consulted for HF-13 under posture LIGHT (§D, [M-...]).
 */
export function evaluateFilters(
  e: PoolExercise,
  role: Role,
  ctx: FilterCtx,
  mode: 'STATIC' | 'FULL',
  hasFamiliarEligible = false,
): FilterResult | null {
  // HF-01
  {
    const outcome = constraintFilter('HF-01', ctx, e);
    if (outcome) return { hfId: 'HF-01', outcome };
  }
  // HF-02
  {
    const outcome = constraintFilter('HF-02', ctx, e);
    if (outcome) return { hfId: 'HF-02', outcome };
  }
  // HF-03
  {
    const outcome = constraintFilter('HF-03', ctx, e);
    if (outcome) return { hfId: 'HF-03', outcome };
  }
  // HF-04
  if (ctx.avoidances.has(e.exercise_id)) return { hfId: 'HF-04', outcome: 'EXCLUDED' };

  // HF-05 (today-only)
  if (mode === 'FULL') {
    if (e.sore_regions.some((r) => ctx.todaySoreRegions.has(r))) return { hfId: 'HF-05', outcome: 'EXCLUDED_TODAY' };
  }

  // HF-06
  {
    const todayIssues = mode === 'STATIC' ? [] : ctx.todayEquipmentIssues;
    const line = findLineForImplementPreference(ctx.state, e.exercise_id, role);
    const res = evaluateEquipmentOptions(e.equipment_options, ctx.equip, todayIssues, line);
    if (res.outcome !== 'PASS') {
      const outcome: FilterOutcome =
        res.outcome === 'EXCLUDED_TODAY' ? 'EXCLUDED_TODAY' : res.outcome === 'HELD_EQUIPMENT_UNKNOWN' ? 'HELD_EQUIPMENT_UNKNOWN' : 'EXCLUDED';
      return { hfId: 'HF-06', outcome };
    }
  }
  // HF-07
  if (ctx.state.review_hold[e.exercise_id]?.held) return { hfId: 'HF-07', outcome: 'HELD_PENDING_REVIEW' };

  // HF-08
  if (e.capability_prereq !== null) {
    const satisfied = Boolean(ctx.state.capability_confirmed[e.capability_prereq]) || Boolean(ctx.state.exercise_last_used[e.exercise_id]);
    if (!satisfied) return { hfId: 'HF-08', outcome: 'HELD_CAPABILITY_UNKNOWN' };
  }

  // HF-09
  if (!e.roles_allowed.includes(role)) return { hfId: 'HF-09', outcome: 'NOT_CANDIDATE' };

  if (mode === 'FULL') {
    // HF-10
    if (ctx.selectedIds.has(e.exercise_id)) return { hfId: 'HF-10', outcome: 'EXCLUDED_TODAY' };

    // HF-11
    if (role !== 'MOBILITY') {
      const lastUsed = ctx.state.exercise_last_used[e.exercise_id];
      if (lastUsed) {
        const lastUsedLocalDate = toLocalDate(lastUsed, ctx.tz);
        const daysSince = calendarDaysBetween(lastUsedLocalDate, ctx.todayLocalDate);
        if (daysSince <= ctx.repeatExclusionDays) return { hfId: 'HF-11', outcome: 'EXCLUDED_TODAY' };
      }
    }

    // HF-12
    if (e.heavy_lower && ctx.hoursSinceLower !== null && ctx.hoursSinceLower < ctx.heavyLowerRecoveryHours) {
      return { hfId: 'HF-12', outcome: 'EXCLUDED_TODAY' };
    }

    // HF-13
    if (ctx.posture === 'LIGHT') {
      if (e.position_tags.includes('ballistic')) return { hfId: 'HF-13', outcome: 'EXCLUDED_TODAY' };
      const usedBefore = Boolean(ctx.state.exercise_last_used[e.exercise_id]);
      if (!usedBefore && hasFamiliarEligible) return { hfId: 'HF-13', outcome: 'EXCLUDED_TODAY' };
    }
  }

  // HF-14
  if (e.position_tags.includes('impact')) return { hfId: 'HF-14', outcome: 'HELD_PREFERENCE_UNKNOWN' };

  return null;
}

/** Builds candidates for a slot: family + sub_target + role match (§D HF-09 as candidate construction). */
export function candidatesFor(pool: PoolExercise[], family: string, subTarget: string | null, role: Role): PoolExercise[] {
  return pool.filter((e) => e.family === family && (subTarget === null ? e.sub_target === null : e.sub_target === subTarget) && e.roles_allowed.includes(role));
}

/**
 * Full two-pass evaluation of a slot's candidates (handles HF-13's cross-candidate
 * "another familiar option exists" test). Returns a Map from exercise_id to its outcome
 * (undefined key => PASS / eligible).
 */
export function evaluateSlotCandidates(
  candidates: PoolExercise[],
  role: Role,
  ctx: FilterCtx,
): Map<string, FilterResult | null> {
  const pass1 = new Map<string, FilterResult | null>();
  for (const c of candidates) {
    pass1.set(c.exercise_id, evaluateFilters(c, role, ctx, 'FULL', false));
  }
  const hasFamiliarEligible =
    ctx.posture === 'LIGHT' &&
    candidates.some((c) => pass1.get(c.exercise_id) === null && Boolean(ctx.state.exercise_last_used[c.exercise_id]));
  const final = new Map<string, FilterResult | null>();
  for (const c of candidates) {
    const p1 = pass1.get(c.exercise_id) ?? null;
    if (p1 !== null) {
      final.set(c.exercise_id, p1);
      continue;
    }
    final.set(c.exercise_id, evaluateFilters(c, role, ctx, 'FULL', hasFamiliarEligible));
  }
  return final;
}

/** Static-only pass/fail (servability, §C.4.1; anchor-candidate unfiltered set, §E.1). */
export function passesStatic(e: PoolExercise, role: Role, ctx: FilterCtx): boolean {
  return evaluateFilters(e, role, ctx, 'STATIC') === null;
}
