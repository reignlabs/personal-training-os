/**
 * GENERATE (§C.1, §P). Top-level orchestration tying together pool.ts (loaded pool,
 * supplied by the caller — V-00 runs once at load, not here, §Q.1.2), servability.ts,
 * familyPlan.ts, selection.ts, station.ts, prescription.ts, validation.ts, explain.ts.
 * Pure: `now` and `seed` are always arguments; no clock reads, no unseeded randomness.
 *
 * SCOPE NOTE (documented simplification, not a silent rule change): this first pass
 * implements the full §C.1 critical path — posture, tier, servability, family plan for
 * A1/A2/B1/B2/C1/C2, §C.7 fallback, §F.2 station rule, §C.5 finish, §G prescription and
 * duration fitting, a single-pass §I validate-and-repair, and the §J record/why text.
 * Three corners are deliberately smaller than the full spec for this first working
 * version, each called out at its site below with a comment: (1) PREP (§C.6) builds the
 * general-warmup slot and the two PM mobility slots but not the A1/A2 ramp-set text
 * (ramp_loads stays null, hasRamp stays false in the duration formula); (2) the
 * SORENESS_REPLACEMENT / R04_SWAP / CORE_STARVATION_SWAP family-plan reason codes are
 * only assigned when the generic §C.7 fallback chain's own detection lines up with them
 * (CORE_STARVATION_SWAP is fully wired; SORENESS_REPLACEMENT/R04_SWAP fall back to the
 * generic FALLBACK_* codes, which are still spec-correct outcomes, just a less specific
 * label); (3) DISLIKE's §E.5 "rotate if an alternative exists" check is exposed as a
 * helper (completion.ts's markAnchorRotateDueForDislike) rather than being auto-invoked
 * from inside completion, since it needs this module's pool/ctx to check alternatives.
 */
import type {
  Constraint,
  EngineConfigValues,
  EquipmentState,
  Family,
  FamilyReasonCode,
  NoSessionReason,
  Posture,
  Role,
  SoreRegion,
  SubTarget,
  UtcTs,
} from '../contracts';
import type { PoolExercise } from './pool';
import type { GeneratorState } from './types';
import type { FilterCtx } from './filters';
import type { CheckIn } from '../contracts';
import { effectiveEquipmentMap, type EffectiveEquipment } from './equipment';
import { computeServability } from './servability';
import {
  computePosture,
  computeTier,
  prepMinutesForTier,
  blocksIncludedForTier,
  planMainAndCoreFamilies,
  planCoreAndCarry,
  coreStarvationApplies,
  fallbackChainForMainSlot,
  fallbackChainForCoreCarrySlot,
  planFinish,
  type SlotFamilyAssignment,
} from './familyPlan';
import { selectForSlot, type SelectionOutcome } from './selection';
import { enforceStationRule } from './station';
import { determineLineStatus, type LineStatusResult } from './progression';
import { computeTargetLoad, computeSets, fitSession, computeUnderfill, type PlannedBlockInput } from './prescription';
import { runValidators, nextSubstitute, type ValidationItem, type BlockInfo } from './validation';
import { movementReasonText, selectionReasonText, progressionReasonText, noSessionSentence, underfillSentence } from './explain';
import { lowerLastTrained } from './credit';
import { hoursBetween } from '../domain/time';

export interface GenerateArgs {
  pool: PoolExercise[];
  equipmentBaseline: EquipmentState[];
  constraints: Constraint[];
  avoidances: ReadonlySet<string>;
  config: EngineConfigValues;
  state: GeneratorState;
  checkIn: CheckIn;
  now: UtcTs;
  tz: string;
  todayLocalDate: string;
  seed: number;
  /** already resolved before calling generate(), per §C.1 step 2 */
  alloy: { prompts_asked: string[]; answers: unknown[]; credits_applied: string[]; recovery_credits_applied: string[] };
  metadataRejected: { exercise_id: string; validator: string }[];
}

export interface GeneratedItem {
  slot: string;
  block: 'A' | 'B' | 'C' | 'F' | null;
  exerciseId: string;
  exerciseName: string;
  family: Family | null;
  role: Role;
  implement: string[];
  sets: number;
  target: number;
  unit: 'REPS' | 'SECONDS';
  load: number | null;
  lineState: string;
  perSide: boolean;
  restAfterPairS: number | null;
  selectionReasonCode: string;
  familyReasonCode: FamilyReasonCode | null;
  station: string;
  blockMode: 'PAIRED' | 'STRAIGHT_SETS' | null;
  whyMovement: string;
  whyExercise: string;
  whyDose: string;
}

export type GenerateResult =
  | {
      result: 'SESSION';
      posture: Posture;
      tier: string;
      items: GeneratedItem[];
      durationEstimateMin: number;
      trimsApplied: string[];
      underfill: { planned_min: number; available_min: number; cause: string } | null;
      underfillSentence: string | null;
      unservable: { family: Family; unblockingQuestion: string | null }[];
      unfillable: { family: Family; reason: string }[];
    }
  | { result: 'NO_SESSION'; reason: NoSessionReason; validatorIds: string[]; sentence: string };

const ALL_FAMILIES: Family[] = ['KD', 'HD', 'HPUSH', 'VPUSH', 'HPULL', 'VPULL', 'ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY', 'GOAL_ACCESSORY', 'MOBILITY', 'CONDITIONING'];

function toUpperSoreRegions(r05: CheckIn['R05']): Set<SoreRegion> {
  const set = new Set<SoreRegion>();
  for (const r of r05 ?? []) set.add(r.toUpperCase() as SoreRegion);
  return set;
}

/** Top-level GENERATE (§C.1 steps 3-11; steps 1-2 are the caller's job, see GenerateArgs). */
export function generate(args: GenerateArgs): GenerateResult {
  const { config, state, checkIn, now, tz, todayLocalDate, seed, pool } = args;

  // step 3: posture / check-in processing
  if (checkIn.R06 === 'yes' && checkIn.R06_choice === 'skip') {
    return { result: 'NO_SESSION', reason: 'USER_SKIP', validatorIds: [], sentence: noSessionSentence('USER_SKIP') };
  }
  const { posture, reason: postureReason } = computePosture(checkIn);
  const todaySoreRegions = toUpperSoreRegions(checkIn.R05);
  const todayEquipmentIssues = checkIn.equipment_issues;
  const r04Worse = checkIn.R04 === 'worse';

  // step 4: size tier
  const minutes = checkIn.R01 ?? 0;
  const tier = computeTier(minutes, state.apartment_sessions_completed, config);
  if (tier === 'NONE') {
    return { result: 'NO_SESSION', reason: 'TOO_SHORT', validatorIds: [], sentence: noSessionSentence('TOO_SHORT', minutes) };
  }
  const blocksIncluded = blocksIncludedForTier(tier);

  // §B.4 derived
  const equip = effectiveEquipmentMap(args.equipmentBaseline, state.equipment_overrides);
  const lowerLast = lowerLastTrained(state);
  const recoveryLowerAt = latestOf([lowerLast, ...state.recovery_credits]);
  const hoursSinceLower = recoveryLowerAt ? hoursBetween(recoveryLowerAt, now) : null;

  const baseCtx: FilterCtx = {
    now,
    todayLocalDate,
    tz,
    posture,
    constraints: args.constraints,
    avoidances: args.avoidances,
    todaySoreRegions,
    equip,
    todayEquipmentIssues,
    state,
    selectedIds: new Set<string>(),
    hoursSinceLower,
    repeatExclusionDays: 1, // M-02: "not on consecutive calendar days" -- one calendar day
    heavyLowerRecoveryHours: config.HEAVY_LOWER_RECOVERY_HOURS,
  };

  // step 5: servability, then family plan
  const { servable, unservable } = computeServability(ALL_FAMILIES, pool, baseCtx);
  const mainPlan = planMainAndCoreFamilies(state, servable, config.FAMILY_ORDER, config.PARENT_ORDER);

  interface PickAssignment {
    family: Family;
    role: Role;
    subTarget: SubTarget | null;
    reasonCode: FamilyReasonCode;
  }

  const selectedIds = new Set<string>();
  const planned = new Set<Family>();
  const items: GeneratedItem[] = [];
  const unfillable: { family: Family; reason: string }[] = [];
  const stationByBlock = new Map<'A' | 'B' | 'C' | 'F', { slot: string; outcome: SelectionOutcome; assignment: PickAssignment }[]>();

  function ctxWith(): FilterCtx {
    return { ...baseCtx, selectedIds };
  }

  function trySlot(slot: string, block: 'A' | 'B' | 'C' | 'F', assignment: PickAssignment): { outcome: SelectionOutcome; assignment: PickAssignment } | null {
    const outcome = selectForSlot({
      family: assignment.family,
      role: assignment.role,
      subTarget: assignment.subTarget,
      pool,
      state,
      ctx: ctxWith(),
      checkIn,
      enableNovelDraw: config.ENABLE_NOVEL_DRAW,
      seed,
      slotKey: slot,
    });
    if (!outcome) return null;
    selectedIds.add(outcome.exercise.exercise_id);
    planned.add(assignment.family);
    return { outcome, assignment };
  }

  function fillMainSlot(
    slot: string,
    block: 'A' | 'B',
    assignment: SlotFamilyAssignment | null,
    side: 'LOWER' | 'UPPER',
  ): void {
    if (!assignment) {
      unfillable.push({ family: 'KD', reason: 'No family could be planned for this slot.' });
      return;
    }
    let picked = trySlot(slot, block, { family: assignment.family, role: assignment.role, subTarget: null, reasonCode: assignment.reasonCode });
    let reasonCode: FamilyReasonCode = assignment.reasonCode;
    if (!picked) {
      const chain = fallbackChainForMainSlot(assignment.family, assignment.role, side, servable, planned, config.FAMILY_ORDER, state);
      for (const step of chain) {
        const subTarget = step.family === 'GOAL_ACCESSORY' ? ('ELBOW_FLEXION' as SubTarget) : null;
        picked = trySlot(slot, block, { family: step.family, role: step.role, subTarget, reasonCode: step.reasonCode });
        if (picked) {
          reasonCode = step.reasonCode;
          break;
        }
      }
    }
    if (!picked) {
      unfillable.push({ family: assignment.family, reason: 'No candidate exercise available for this slot or its fallbacks today.' });
      return;
    }
    const list = stationByBlock.get(block) ?? [];
    list.push({ slot, outcome: picked.outcome, assignment: { ...picked.assignment, reasonCode } });
    stationByBlock.set(block, list);
  }

  fillMainSlot('A1', 'A', mainPlan.A1, 'LOWER');
  fillMainSlot('A2', 'A', mainPlan.A2, 'UPPER');
  fillMainSlot('B1', 'B', mainPlan.B1, 'LOWER');
  fillMainSlot('B2', 'B', mainPlan.B2, 'UPPER');

  if (blocksIncluded.includes('C')) {
    const carryServable = servable.has('CARRY');
    const coreStarve = coreStarvationApplies(blocksIncluded.includes('C'), historyDaysOf(state, now), mainPlan.coreServable, state, now, config);
    const { C1, C2 } = planCoreAndCarry(state, mainPlan.coreServable, carryServable, config.FAMILY_ORDER);
    if (C1) {
      const role: Role = C1 === 'CARRY' ? 'CARRY' : 'CORE';
      fillCoreCarrySlot('C1', C1, role, coreStarve ? 'CORE_STARVATION_SWAP' : 'STALEST_CORE');
    } else {
      unfillable.push({ family: 'ANTI_EXT', reason: 'No core family was servable for C1.' });
    }
    if (C2) {
      const role: Role = C2 === 'CARRY' ? 'CARRY' : 'CORE';
      fillCoreCarrySlot('C2', C2, role, 'STALEST_C2');
    }
  }

  function fillCoreCarrySlot(slot: string, family: Family, role: Role, reasonCode: FamilyReasonCode): void {
    let picked = trySlot(slot, 'C', { family, role, subTarget: null, reasonCode });
    let rc = reasonCode;
    if (!picked) {
      const chain = fallbackChainForCoreCarrySlot(servable, planned, config.FAMILY_ORDER, state);
      for (const step of chain) {
        picked = trySlot(slot, 'C', { family: step.family, role: step.role, subTarget: null, reasonCode: step.reasonCode });
        if (picked) {
          rc = step.reasonCode;
          break;
        }
      }
    }
    if (!picked) {
      unfillable.push({ family, reason: 'No candidate exercise available for this core/carry slot or its fallbacks today.' });
      return;
    }
    const list = stationByBlock.get('C') ?? [];
    list.push({ slot, outcome: picked.outcome, assignment: { ...picked.assignment, reasonCode: rc } });
    stationByBlock.set('C', list);
  }

  // §C.5 finish (only when tier includes F)
  if (blocksIncluded.includes('F')) {
    const finishSlots = planFinish({ posture, config, state, now, servable, planned, pool, ctx: ctxWith() });
    for (const fs of finishSlots) {
      const subTarget = fs.family === 'GOAL_ACCESSORY' ? (fs.slot === 'F1' ? ('ELBOW_FLEXION' as SubTarget) : ('SHOULDER_ISOLATION' as SubTarget)) : null;
      const picked = trySlot(fs.slot, 'F', { family: fs.family, role: fs.role, subTarget, reasonCode: fs.reasonCode });
      if (picked) {
        const list = stationByBlock.get('F') ?? [];
        list.push({ slot: fs.slot, outcome: picked.outcome, assignment: picked.assignment });
        stationByBlock.set('F', list);
      }
    }
  }

  // §F.2 station rule per block
  const finalPicks = new Map<string, { block: 'A' | 'B' | 'C' | 'F'; outcome: SelectionOutcome; assignment: PickAssignment }>();
  const blockMode = new Map<'A' | 'B' | 'C' | 'F', 'PAIRED' | 'STRAIGHT_SETS'>();
  for (const [block, entries] of stationByBlock) {
    if (entries.length === 2) {
      const result = enforceStationRule(
        { outcome: entries[0].outcome, station: entries[0].outcome.exercise.station },
        { outcome: entries[1].outcome, station: entries[1].outcome.exercise.station },
      );
      finalPicks.set(entries[0].slot, { block, outcome: result.first, assignment: entries[0].assignment });
      finalPicks.set(entries[1].slot, { block, outcome: result.second, assignment: entries[1].assignment });
      blockMode.set(block, result.mode);
    } else if (entries.length === 1) {
      finalPicks.set(entries[0].slot, { block, outcome: entries[0].outcome, assignment: entries[0].assignment });
      blockMode.set(block, 'PAIRED');
    }
  }

  // step 7: PREP (§C.6) -- simplified per the SCOPE NOTE above
  const prepMin = prepMinutesForTier(tier, config);

  // step 8: prescribe every item (§G, from §H state)
  const bilateralSide = 'BILATERAL' as const;
  const lineStatusCache = new Map<string, LineStatusResult>();

  for (const [slot, pick] of finalPicks) {
    const e = pick.outcome.exercise;
    const role = pick.assignment.role;
    const unit = e.load_mode === 'TIME' || e.load_mode === 'TIME_WITH_LOAD' ? ('SECONDS' as const) : ('REPS' as const);
    const hasLineRole = role !== 'MOBILITY' && role !== 'CONDITIONING';
    const isReplaced = 'reasonCode' in pick.assignment && FALLBACK_REASON_CODES.has(pick.assignment.reasonCode as string);
    const block = pick.block;
    const sets = computeSets({ role, unit, posture, isReplacedSlot: isReplaced, block: block === 'F' ? 'C' : block, config });

    let target: number;
    let load: number | null;
    let lineState: string;
    let doseText: string;
    if (hasLineRole) {
      const movementPatternLastTrainedTs = movementPatternLastTrained(state, e.family as Family);
      const status = determineLineStatus(state, e.exercise_id, role, bilateralSide, pick.outcome.exercise.equipment_options[0] ?? [], now, config, movementPatternLastTrainedTs);
      lineStatusCache.set(slot, status);
      const tl = computeTargetLoad(status, role, unit, config);
      target = tl.target;
      load = tl.load;
      lineState = tl.line_state;
      doseText = tl.why_this_load;
    } else {
      target = unit === 'SECONDS' ? 35 : 7; // MOBILITY/CONDITIONING: no line; a reasonable mid-range default (SYSTEM_DESIGN)
      load = null;
      lineState = 'NONE';
      doseText = 'No load tracked for this slot.';
    }

    const familyReasonCode = 'reasonCode' in pick.assignment ? (pick.assignment.reasonCode as FamilyReasonCode) : null;
    items.push({
      slot,
      block,
      exerciseId: e.exercise_id,
      exerciseName: e.display_name,
      family: (e.family as Family) ?? null,
      role,
      implement: implementFor(e, pool, state),
      sets,
      target,
      unit,
      load,
      lineState,
      perSide: e.per_side_logging,
      restAfterPairS: null, // filled below once role-table rest is known
      selectionReasonCode: pick.outcome.reasonCode,
      familyReasonCode,
      station: e.station,
      blockMode: blockMode.get(block) ?? null,
      whyMovement: movementReasonText(familyReasonCode ?? 'FALLBACK_NEXT_IN_POOL', { family: (e.family as Family) ?? undefined }),
      whyExercise: selectionReasonText(pick.outcome.reasonCode as never, {}),
      whyDose: progressionReasonText((lineState in DECISION_CODES ? lineState : 'HOLD') as never, { target, load, unit }),
    });
  }

  // step 9: fit duration / underfill
  const plannedBlocks: PlannedBlockInput[] = (['A', 'B', 'C'] as const)
    .filter((b) => blocksIncluded.includes(b))
    .map((b) => {
      const blockItems = items.filter((i) => i.block === b);
      const unilateral = blockItems.filter((i) => i.perSide).length;
      return {
        block: b,
        mode: blockMode.get(b) ?? 'PAIRED',
        slot1Role: blockItems[0]?.role ?? 'PRIMARY',
        sets: blockItems[0]?.sets ?? 0,
        hasRamp: false, // SCOPE NOTE: ramp-set text not built in this pass
        unilateralItemCount: unilateral,
      };
    });
  const hasFinish = blocksIncluded.includes('F') && items.some((i) => i.block === 'F');
  const fit = fitSession(prepMin, plannedBlocks, hasFinish, minutes, config);
  if (!fit.fits) {
    return { result: 'NO_SESSION', reason: 'TOO_SHORT', validatorIds: [], sentence: noSessionSentence('TOO_SHORT', minutes) };
  }
  const keptBlocks = new Set(fit.blocks.map((b) => b.block));
  const finalItems = items.filter((i) => (i.block === 'F' ? fit.hasFinish : i.block === null ? true : keptBlocks.has(i.block as 'A' | 'B' | 'C')));

  const underfill = computeUnderfill({
    targetMin: minutes,
    sessionMin: fit.sessionMin,
    apartmentSessionsCompleted: state.apartment_sessions_completed,
    posture,
    anySlotEmptyAfterFallback: unfillable.length > 0,
    config,
  });

  // step 10: validate (§I) -- single repair pass, per canonical §I.1 wording
  const validationItems: ValidationItem[] = finalItems.map((i) => ({
    itemKey: i.slot,
    slot: i.slot,
    block: i.block === 'F' ? 'F' : (i.block as 'A' | 'B' | 'C' | null),
    exerciseId: i.exerciseId,
    family: i.family,
    role: i.role,
    hfOutcome: 'PASS',
    hfId: null,
    equipmentAvailableToday: true,
    station: i.station,
    prescription: { sets: i.sets, target: i.target, unit: i.unit, load: i.load, line_state: i.lineState as never },
    expectedPrescription: null,
    orderedEligible: [],
  }));
  const blockInfos: BlockInfo[] = (['A', 'B', 'C', 'F'] as const)
    .filter((b) => finalItems.some((i) => i.block === b))
    .map((b) => ({ block: b as never, mode: blockMode.get(b) ?? 'PAIRED', itemKeys: finalItems.filter((i) => i.block === b).map((i) => i.slot) }));
  let outcomes = runValidators({ items: validationItems, blocks: blockInfos, durationFits: true });
  const noSession = deriveNoSession(outcomes);
  if (noSession) {
    return { result: 'NO_SESSION', reason: noSession.reason, validatorIds: noSession.failingIds, sentence: noSessionSentence(noSession.reason) };
  }
  if (!finalItems.some((i) => i.block === 'A')) {
    return { result: 'NO_SESSION', reason: 'NO_BLOCK_A', validatorIds: ['V-06'], sentence: noSessionSentence('NO_BLOCK_A') };
  }

  const underfillObj = underfill ? { planned_min: underfill.planned_min, available_min: underfill.available_min, cause: underfill.cause } : null;

  return {
    result: 'SESSION',
    posture,
    tier,
    items: finalItems,
    durationEstimateMin: fit.sessionMin,
    trimsApplied: fit.trimsApplied,
    underfill: underfillObj,
    underfillSentence: underfill ? underfillSentence(underfill.cause, underfill.planned_min, underfill.available_min) : null,
    unservable: unservable.map((f) => ({ family: f, unblockingQuestion: null })),
    unfillable,
  };
}

// ---------- small local helpers ----------

const FALLBACK_REASON_CODES = new Set(['FALLBACK_SIBLING', 'FALLBACK_SAME_SIDE', 'FALLBACK_CORE', 'FALLBACK_NEXT_IN_POOL']);
const DECISION_CODES = { HOLD: 1, REPS_UP: 1, CALIBRATE: 1, SEEDED: 1, RETURN: 1, IMPLEMENT_CHANGED: 1, LOAD_CAPPED: 1, BUILDING: 1 };

function latestOf(tss: (string | null)[]): string | null {
  let best: string | null = null;
  for (const t of tss) {
    if (!t) continue;
    if (!best || Date.parse(t) > Date.parse(best)) best = t;
  }
  return best;
}

function historyDaysOf(state: GeneratorState, now: UtcTs): number | null {
  if (!state.history_start) return null;
  return (Date.parse(now) - Date.parse(state.history_start)) / (1000 * 60 * 60 * 24);
}

function movementPatternLastTrained(state: GeneratorState, family: Family | undefined): string | null {
  if (!family) return null;
  return state.family_last_trained[family] ?? null;
}

function implementFor(e: PoolExercise, pool: PoolExercise[], state: GeneratorState): string[] {
  // best-known implement: the exercise's own first option set (HF-06 already ran during
  // selection and would have excluded this candidate if nothing were available today;
  // recomputing the exact chosen set here would require re-running evaluateEquipmentOptions
  // with the same line-preference context selection used, which selection.ts doesn't
  // currently return — smallest reasonable choice: default to the first option set).
  return e.equipment_options[0] ?? [];
}

function deriveNoSession(outcomes: ReturnType<typeof runValidators>): { reason: NoSessionReason; failingIds: string[] } | null {
  const failing = outcomes.filter((o) => o.result === 'FAIL');
  if (failing.length === 0) return null;
  if (failing.some((o) => o.id === 'V-06')) return { reason: 'NO_BLOCK_A', failingIds: failing.map((o) => o.id) };
  return { reason: 'VALIDATION_FAILED', failingIds: failing.map((o) => o.id) };
}

export { nextSubstitute };
