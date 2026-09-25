/**
 * §C.2 posture, §C.3 size tier, §C.4 family plan (servability, ordering keys,
 * replacement, core-starvation swap), §C.5 finish plan, §C.7 fallback chain. Pure
 * staleness/eligibility computations; exercise selection itself is §E (engine/selection.ts).
 */
import type { CheckIn, EngineConfigValues, Family, FamilyReasonCode, Posture, Role, SoreRegion } from '../contracts';
import type { GeneratorState } from './types';
import type { PoolExercise } from './pool';
import type { FilterCtx } from './filters';
import { candidatesFor, evaluateSlotCandidates } from './filters';
import { CORE_FAMILIES, LOWER_FAMILIES, PULL_FAMILIES, PUSH_FAMILIES } from './families';
import { tsRank } from './state';

// ---------- §C.2 Posture ----------

export function computePosture(checkIn: Pick<CheckIn, 'R02' | 'R06' | 'R06_choice'>): { posture: Posture; reason: string } {
  if (checkIn.R06 === 'yes' && checkIn.R06_choice === 'lighter') {
    return { posture: 'LIGHT', reason: "You said you're unwell/different and chose a lighter session." };
  }
  if ((checkIn.R02 ?? 'normal') === 'low') {
    return { posture: 'LIGHT', reason: 'Your energy today is low.' };
  }
  return { posture: 'NORMAL', reason: 'Normal training day.' };
}

// ---------- §C.3 Size tier ----------

export type Tier = 'NONE' | 'A' | 'AB' | 'ABC' | 'ABCF';

export function computeTier(minutes: number, apartmentSessionsCompleted: number, config: EngineConfigValues): Tier {
  if (minutes < config.MIN_SESSION_MINUTES) return 'NONE';
  let blocks: Tier;
  if (minutes < config.TIER_AB_MINUTES) blocks = 'A';
  else if (minutes < config.TIER_ABC_MINUTES) blocks = 'AB';
  else if (minutes < config.TIER_ABCF_MINUTES) blocks = 'ABC';
  else blocks = 'ABCF';
  if (blocks === 'ABCF' && apartmentSessionsCompleted < config.FIRST_SESSIONS_NO_FINISH) return 'ABC';
  return blocks;
}

export function prepMinutesForTier(tier: Tier, config: EngineConfigValues): number {
  return tier === 'A' ? config.PREP_MINUTES_SHORT : config.PREP_MINUTES;
}

export function blocksIncludedForTier(tier: Tier): ('A' | 'B' | 'C' | 'F')[] {
  switch (tier) {
    case 'A':
      return ['A'];
    case 'AB':
      return ['A', 'B'];
    case 'ABC':
      return ['A', 'B', 'C'];
    case 'ABCF':
      return ['A', 'B', 'C', 'F'];
    default:
      return [];
  }
}

// ---------- §C.4.2 ordering keys ----------

function orderIndex<T extends string>(f: T, order: readonly T[]): number {
  const i = order.indexOf(f);
  return i === -1 ? order.length : i;
}

export interface StalenessResult<T extends string> {
  ordered: T[];
  /** true when the *first* comparator key alone separated the top two (STALEST_*); false = tie, decided by the next key ([M-01] *_ROLE_ALTERNATION). */
  decidedByPrimary: boolean;
}

/** Sorts by (primary asc, secondary asc, tie-break order); null first (oldest). Generic
 * over Family or Parent ('PULL'|'PUSH') strings — both use this identical staleness rule. */
export function sortFamiliesByStaleness<T extends string>(
  items: readonly T[],
  primaryTsOf: (f: T) => string | null,
  secondaryTsOf: (f: T) => string | null,
  tieOrder: readonly T[],
): StalenessResult<T> {
  const rows = items.map((f) => ({ f, p: tsRank(primaryTsOf(f)), s: tsRank(secondaryTsOf(f)), o: orderIndex(f, tieOrder) }));
  rows.sort((a, b) => a.p - b.p || a.s - b.s || a.o - b.o);
  const decidedByPrimary = rows.length < 2 ? true : rows[0].p !== rows[1].p;
  return { ordered: rows.map((r) => r.f), decidedByPrimary };
}

// ---------- servable-family helpers ----------

export function familyLastTrainedOf(state: GeneratorState, f: Family): string | null {
  return state.family_last_trained[f] ?? null;
}
export function familyLastPrimaryOf(state: GeneratorState, f: Family): string | null {
  return state.family_last_primary[f] ?? null;
}
export function parentLastTrainedOf(state: GeneratorState, p: 'LOWER' | 'PUSH' | 'PULL'): string | null {
  return state.parent_last_trained[p] ?? null;
}
export function parentLastPrimaryOf(state: GeneratorState, p: 'PUSH' | 'PULL'): string | null {
  return state.parent_last_primary[p] ?? null;
}

// ---------- §C.4.3 plan ----------

export interface SlotFamilyAssignment {
  slot: 'A1' | 'A2' | 'B1' | 'B2';
  family: Family;
  role: Role;
  reasonCode: FamilyReasonCode;
}

export interface FamilyPlanResult {
  slots: SlotFamilyAssignment[];
  coreServable: Family[];
}

export function planMainAndCoreFamilies(
  state: GeneratorState,
  servable: ReadonlySet<Family>,
  familyOrder: Family[],
  parentOrder: ('PULL' | 'PUSH')[],
): { A1: SlotFamilyAssignment | null; A2: SlotFamilyAssignment | null; B1: SlotFamilyAssignment | null; B2: SlotFamilyAssignment | null; coreServable: Family[] } {
  const lowerServable = LOWER_FAMILIES.filter((f) => servable.has(f));
  const lowerSort = sortFamiliesByStaleness(
    lowerServable,
    (f) => familyLastTrainedOf(state, f),
    (f) => familyLastPrimaryOf(state, f),
    familyOrder,
  );
  const lowerReason: FamilyReasonCode = lowerSort.decidedByPrimary ? 'STALEST_LOWER' : 'LOWER_ROLE_ALTERNATION';
  const A1 = lowerSort.ordered[0]
    ? { slot: 'A1' as const, family: lowerSort.ordered[0], role: 'PRIMARY' as const, reasonCode: lowerReason }
    : null;
  const B1 = lowerSort.ordered[1]
    ? { slot: 'B1' as const, family: lowerSort.ordered[1], role: 'SECONDARY' as const, reasonCode: lowerReason }
    : null;

  const parentsPresent = (['PULL', 'PUSH'] as const).filter((p) => (p === 'PULL' ? PULL_FAMILIES : PUSH_FAMILIES).some((f) => servable.has(f)));
  const parentSort = sortFamiliesByStaleness<'PULL' | 'PUSH'>(
    parentsPresent,
    (p) => parentLastTrainedOf(state, p),
    (p) => parentLastPrimaryOf(state, p),
    parentOrder,
  );
  const leadParent = parentSort.ordered[0];
  const followParent = parentSort.ordered[1];

  let A2: SlotFamilyAssignment | null = null;
  if (leadParent) {
    const familiesOfLead = (leadParent === 'PULL' ? PULL_FAMILIES : PUSH_FAMILIES).filter((f) => servable.has(f));
    const sort = sortFamiliesByStaleness(
      familiesOfLead,
      (f) => familyLastPrimaryOf(state, f),
      (f) => familyLastTrainedOf(state, f),
      familyOrder,
    );
    if (sort.ordered[0]) {
      A2 = {
        slot: 'A2',
        family: sort.ordered[0],
        role: 'PRIMARY',
        reasonCode: sort.decidedByPrimary ? 'STALEST_UPPER_PARENT' : 'UPPER_ROLE_ALTERNATION',
      };
    }
  }

  let B2: SlotFamilyAssignment | null = null;
  if (followParent) {
    const familiesOfFollow = (followParent === 'PULL' ? PULL_FAMILIES : PUSH_FAMILIES).filter((f) => servable.has(f));
    const sort = sortFamiliesByStaleness(
      familiesOfFollow,
      (f) => familyLastTrainedOf(state, f),
      () => null,
      familyOrder,
    );
    if (sort.ordered[0]) {
      B2 = { slot: 'B2', family: sort.ordered[0], role: 'SECONDARY', reasonCode: 'OTHER_UPPER_PARENT' };
    }
  }

  const coreServable = CORE_FAMILIES.filter((f) => servable.has(f));
  return { A1, A2, B1, B2, coreServable };
}

export function planCoreAndCarry(
  state: GeneratorState,
  coreServable: Family[],
  carryServable: boolean,
  familyOrder: Family[],
): { C1: Family | null; C2: Family | null } {
  const c1Sort = sortFamiliesByStaleness(
    coreServable,
    (f) => familyLastTrainedOf(state, f),
    () => null,
    familyOrder,
  );
  const C1 = c1Sort.ordered[0] ?? null;
  const c2Pool: Family[] = [...(carryServable ? (['CARRY'] as Family[]) : []), ...coreServable.filter((f) => f !== C1)];
  const c2Sort = sortFamiliesByStaleness(
    c2Pool,
    (f) => familyLastTrainedOf(state, f),
    () => null,
    familyOrder,
  );
  const C2 = c2Sort.ordered[0] ?? null;
  return { C1, C2 };
}

// ---------- §C.4.3 core-starvation swap ----------

export function coreStarvationApplies(
  tierIncludesC: boolean,
  historyDays: number | null,
  coreServable: Family[],
  state: GeneratorState,
  now: string,
  config: EngineConfigValues,
): boolean {
  if (tierIncludesC) return false;
  if (historyDays === null || historyDays < config.CORE_STARVATION_DAYS) return false;
  if (coreServable.length === 0) return false;
  return coreServable.every((f) => {
    const t = familyLastTrainedOf(state, f);
    if (!t) return true;
    const days = (Date.parse(now) - Date.parse(t)) / (1000 * 60 * 60 * 24);
    return days > config.CORE_STARVATION_DAYS;
  });
}

// ---------- §C.7 fallback chain ----------

function siblingFamily(f: Family): Family | null {
  if (f === 'KD') return 'HD';
  if (f === 'HD') return 'KD';
  if (f === 'HPUSH') return 'VPUSH';
  if (f === 'VPUSH') return 'HPUSH';
  if (f === 'HPULL') return 'VPULL';
  if (f === 'VPULL') return 'HPULL';
  return null;
}

export type FallbackReason = 'FALLBACK_SIBLING' | 'FALLBACK_SAME_SIDE' | 'FALLBACK_CORE' | 'FALLBACK_NEXT_IN_POOL' | 'SLOT_EMPTY';

export interface FallbackStep {
  family: Family;
  role: Role;
  reasonCode: FallbackReason;
}

/** §C.7, main slots A1/A2/B1/B2. */
export function fallbackChainForMainSlot(
  originalFamily: Family,
  originalRole: Role,
  side: 'LOWER' | 'UPPER',
  servable: ReadonlySet<Family>,
  planned: ReadonlySet<Family>,
  familyOrder: Family[],
  state: GeneratorState,
): FallbackStep[] {
  const steps: FallbackStep[] = [];
  const sibling = siblingFamily(originalFamily);
  if (sibling && servable.has(sibling) && !planned.has(sibling)) {
    steps.push({ family: sibling, role: originalRole, reasonCode: 'FALLBACK_SIBLING' });
  }
  const sameSide = side === 'LOWER' ? LOWER_FAMILIES : [...PUSH_FAMILIES, ...PULL_FAMILIES];
  const sameSideCandidates = sameSide.filter((f) => f !== originalFamily && servable.has(f) && !planned.has(f) && !steps.some((s) => s.family === f));
  if (sameSideCandidates.length > 0) {
    const sort = sortFamiliesByStaleness(
      sameSideCandidates,
      (f) => familyLastTrainedOf(state, f),
      () => null,
      familyOrder,
    );
    steps.push({ family: sort.ordered[0], role: originalRole, reasonCode: 'FALLBACK_SAME_SIDE' });
  }
  const coreCandidates = CORE_FAMILIES.filter((f) => servable.has(f) && !planned.has(f));
  if (coreCandidates.length > 0) {
    const sort = sortFamiliesByStaleness(
      coreCandidates,
      (f) => familyLastTrainedOf(state, f),
      () => null,
      familyOrder,
    );
    steps.push({ family: sort.ordered[0], role: 'CORE', reasonCode: 'FALLBACK_CORE' });
  }
  return steps;
}

/** §C.7, C/F slots. */
export function fallbackChainForCoreCarrySlot(
  servable: ReadonlySet<Family>,
  planned: ReadonlySet<Family>,
  familyOrder: Family[],
  state: GeneratorState,
): FallbackStep[] {
  const pool: Family[] = ['ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY'].filter((f) => servable.has(f as Family) && !planned.has(f as Family)) as Family[];
  if (pool.length === 0) return [];
  const sort = sortFamiliesByStaleness(
    pool,
    (f) => familyLastTrainedOf(state, f),
    () => null,
    familyOrder,
  );
  const role: Role = sort.ordered[0] === 'CARRY' ? 'CARRY' : 'CORE';
  return [{ family: sort.ordered[0], role, reasonCode: 'FALLBACK_NEXT_IN_POOL' }];
}

// ---------- §C.5 finish plan ----------

export interface FinishSlot {
  slot: 'F1' | 'F2';
  family: Family;
  role: Role;
  reasonCode: FamilyReasonCode;
}

export function familyHasEligible(pool: PoolExercise[], family: Family, subTarget: string | null, role: Role, ctx: FilterCtx): boolean {
  const candidates = candidatesFor(pool, family, subTarget, role);
  if (candidates.length === 0) return false;
  const outcomes = evaluateSlotCandidates(candidates, role, ctx);
  return candidates.some((c) => outcomes.get(c.exercise_id) === null);
}

export interface FinishPlanArgs {
  posture: Posture;
  config: EngineConfigValues;
  state: GeneratorState;
  now: string;
  servable: ReadonlySet<Family>;
  planned: ReadonlySet<Family>;
  pool: PoolExercise[];
  ctx: FilterCtx;
}

/** §C.5. Only call when the tier includes F. */
export function planFinish(args: FinishPlanArgs): FinishSlot[] {
  const { posture, config, state, now, servable, planned, pool, ctx } = args;
  if (posture === 'LIGHT') {
    if (familyHasEligible(pool, 'MOBILITY', null, 'MOBILITY', ctx)) {
      return [
        { slot: 'F1', family: 'MOBILITY', role: 'MOBILITY', reasonCode: 'FINISH_MOBILITY' },
        { slot: 'F2', family: 'MOBILITY', role: 'MOBILITY', reasonCode: 'FINISH_MOBILITY' },
      ];
    }
    return [];
  }
  for (const priority of config.FINISH_PRIORITY) {
    if (priority === 'GOAL_ACCESSORY') {
      if (!config.GOAL_ACCESSORY_ENABLED) continue;
      const last = familyLastTrainedOf(state, 'GOAL_ACCESSORY');
      const staleEnough = last === null || (Date.parse(now) - Date.parse(last)) / (1000 * 60 * 60) >= config.GOAL_ACCESSORY_MIN_HOURS;
      if (!staleEnough) continue;
      const f1ok = familyHasEligible(pool, 'GOAL_ACCESSORY', 'ELBOW_FLEXION', 'ACCESSORY', ctx);
      if (!f1ok) continue;
      const slots: FinishSlot[] = [{ slot: 'F1', family: 'GOAL_ACCESSORY', role: 'ACCESSORY', reasonCode: 'FINISH_GOAL_ACCESSORY' }];
      if (familyHasEligible(pool, 'GOAL_ACCESSORY', 'SHOULDER_ISOLATION', 'ACCESSORY', ctx)) {
        slots.push({ slot: 'F2', family: 'GOAL_ACCESSORY', role: 'ACCESSORY', reasonCode: 'FINISH_GOAL_ACCESSORY' });
      }
      return slots;
    }
    if (priority === 'CORE_OR_CARRY') {
      const candidates: Family[] = ['CARRY', 'ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT'].filter(
        (f) => servable.has(f as Family) && !planned.has(f as Family),
      ) as Family[];
      const eligible = candidates.filter((f) => familyHasEligible(pool, f, null, f === 'CARRY' ? 'CARRY' : 'CORE', ctx));
      if (eligible.length === 0) continue;
      const sort = sortFamiliesByStaleness(
        eligible,
        (f) => familyLastTrainedOf(state, f),
        () => null,
        config.FAMILY_ORDER,
      );
      const family = sort.ordered[0];
      return [{ slot: 'F1', family, role: family === 'CARRY' ? 'CARRY' : 'CORE', reasonCode: 'FINISH_CORE_OR_CARRY' }];
    }
    if (priority === 'CONDITIONING') {
      if (!config.CONDITIONING_OPT_IN) continue;
      if (!familyHasEligible(pool, 'CONDITIONING', null, 'CONDITIONING', ctx)) continue;
      return [{ slot: 'F1', family: 'CONDITIONING', role: 'CONDITIONING', reasonCode: 'FINISH_CONDITIONING' }];
    }
    if (priority === 'MOBILITY') {
      if (!familyHasEligible(pool, 'MOBILITY', null, 'MOBILITY', ctx)) continue;
      return [
        { slot: 'F1', family: 'MOBILITY', role: 'MOBILITY', reasonCode: 'FINISH_MOBILITY' },
        { slot: 'F2', family: 'MOBILITY', role: 'MOBILITY', reasonCode: 'FINISH_MOBILITY' },
      ];
    }
  }
  return [];
}

export type { SoreRegion };
