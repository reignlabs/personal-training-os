/**
 * Session logic: the pure, testable bridge between the real engine (src/engine) and the
 * app's persisted documents (Workout, StoredGeneration, GeneratorState), plus the
 * in-session step machine Focus mode walks through.
 *
 * No React, no I/O, no clock reads of its own — every function here takes `now` as an
 * argument and returns new data rather than mutating. That keeps it unit-testable without
 * a browser or IndexedDB (tests/app/sessionLogic.test.ts) and keeps src/app free to import
 * engine internals directly per tests/architecture.test.ts's module boundary map.
 *
 * SCOPE (this file now covers two build passes):
 * (1) TODAY / readiness / warm-up / training blocks / exercise cards / set logging /
 *     rest / effort / discomfort / why / swap / completion (the core workout loop).
 * (2) LOG ALLOY SESSION / HISTORY / EQUIPMENT / PROFILE — externally-logged Alloy
 *     sessions (crediting the same movement/exercise history the generator reads),
 *     equipment availability corrections, and non-medical profile editing. First-run
 *     setup (T-00) is still out of scope.
 */
import type {
  Availability,
  CheckIn,
  Datapack,
  Effort,
  EngineConfigValues,
  ExternalItem,
  ExternalSession,
  Family,
  FlagCode,
  Role,
  Side,
  SlotId,
  SubTarget,
  Unit,
  UserActionEvent,
  UserProfile,
  UtcTs,
  Workout,
  WorkoutExercise,
  SetPerformance,
} from '../contracts';
import { generate as engineGenerate, swapOptions as engineSwapOptions, ENGINE_VERSION, type LoadedPack, type Derived, type SwapOptions } from '../engine/index';
import type { GenerateResult, GeneratedItem } from '../engine/generate';
import type { PoolExercise } from '../engine/pool';
import { determineLineStatus, createCalibratedLine, type LineStatus } from '../engine/progression';
import { computeTargetLoad, computeSets } from '../engine/prescription';
import { effectiveEquipmentMap, type EffectiveEquipment } from '../engine/equipment';
import {
  completeWorkout,
  applyFlags,
  type PerformedItemInput,
  type SideExposureInput,
  type CompleteWorkoutArgs,
  type CompleteWorkoutResult,
  type FlagApplication,
} from '../engine/completion';
import { creditAlloyLog, type AlloyLogForCrediting } from '../engine/alloy';
import type { GeneratorState, Line } from '../engine/types';
import { anchorKey, lineKey } from '../engine/types';
import { newId, alloySessionId } from '../domain/ids';
import { addMinutes } from '../domain/time';
import { movementReasonText, selectionReasonText, progressionReasonText } from '../engine/explain';

// ============================================================================
// 1. Readiness (check-in) building
// ============================================================================

export interface DifferentDayAnswers {
  minutesAvailable: number; // R01
  sleep: 'low' | 'normal' | 'high'; // R02
  sorenessOverall: 'poor' | 'ok' | 'good' | null; // R03 (recorded only, D-034)
  energyVsUsual: 'worse' | 'same' | 'better'; // R04
  energyWorseChoice: 'as_usual' | 'swap' | null; // R04b, only when R04 = worse
  soreRegions: ('upper' | 'lower' | 'trunk')[]; // R05
  symptomToday: 'no' | 'yes'; // R06
  symptomChoice: 'normal' | 'lighter' | 'skip' | null; // R06_choice, required when R06 = yes
  equipmentIssues: string[]; // equipment_ids not available today
}

/** The full readiness form (§ "pre-workout readiness"). */
export function buildCheckIn(args: {
  id: string;
  now: UtcTs;
  localDate: string;
  tz: string;
  answers: DifferentDayAnswers;
}): CheckIn {
  const { answers } = args;
  return {
    id: args.id,
    type: 'check_in',
    created_at: args.now,
    updated_at: args.now,
    local_date: args.localDate,
    tz: args.tz,
    env_id: 'ENV-APT',
    revises_check_in_id: null,
    R01: answers.minutesAvailable,
    R02: answers.sleep,
    R03: answers.sorenessOverall,
    R04: answers.energyVsUsual,
    R04b: answers.energyVsUsual === 'worse' ? answers.energyWorseChoice : null,
    R05: answers.soreRegions,
    R06: answers.symptomToday,
    R06_choice: answers.symptomToday === 'yes' ? answers.symptomChoice : null,
    R07: null,
    equipment_issues: answers.equipmentIssues,
    alloy_answers: [],
    defaulted_fields: [],
    normal_day_shortcut: false,
  };
}

/** D-081's "normal day" shortcut: only minutes and the symptom question are asked;
 * everything else defaults to its normal value. */
export function normalDayCheckIn(args: {
  id: string;
  now: UtcTs;
  localDate: string;
  tz: string;
  minutesAvailable: number;
  symptomToday: 'no' | 'yes';
  symptomChoice: 'normal' | 'lighter' | 'skip' | null;
  equipmentIssues: string[];
}): CheckIn {
  return {
    id: args.id,
    type: 'check_in',
    created_at: args.now,
    updated_at: args.now,
    local_date: args.localDate,
    tz: args.tz,
    env_id: 'ENV-APT',
    revises_check_in_id: null,
    R01: args.minutesAvailable,
    R02: 'normal',
    R03: null,
    R04: 'same',
    R04b: null,
    R05: [],
    R06: args.symptomToday,
    R06_choice: args.symptomToday === 'yes' ? args.symptomChoice : null,
    R07: null,
    equipment_issues: args.equipmentIssues,
    alloy_answers: [],
    defaulted_fields: ['R02', 'R04', 'R04b', 'R05'],
    normal_day_shortcut: true,
  };
}

// ============================================================================
// 2. Generation (a deliberately simplified persisted wrapper — see document.ts)
// ============================================================================

export interface StoredGeneration {
  id: string;
  type: 'stored_generation';
  created_at: UtcTs;
  updated_at: UtcTs;
  check_in_id: string;
  generated_at: UtcTs;
  result: GenerateResult;
}

export function buildGeneration(args: {
  pack: LoadedPack;
  derived: Derived;
  checkIn: CheckIn;
  now: UtcTs;
  userId: string;
}): StoredGeneration {
  const id = newId('gen');
  const { result } = engineGenerate(args.pack, args.derived, args.checkIn, {
    now: args.now,
    generationId: id,
    userId: args.userId,
  });
  return {
    id,
    type: 'stored_generation',
    created_at: args.now,
    updated_at: args.now,
    check_in_id: args.checkIn.id,
    generated_at: args.now,
    result,
  };
}

export type SessionResult = Extract<GenerateResult, { result: 'SESSION' }>;

export function isSession(result: GenerateResult): result is SessionResult {
  return result.result === 'SESSION';
}

// ============================================================================
// 3. Workout building (a real, WorkoutSchema-conformant document)
// ============================================================================

function subTargetFor(pool: PoolExercise[], exerciseId: string): SubTarget | null {
  return pool.find((e) => e.exercise_id === exerciseId)?.sub_target ?? null;
}

export function buildWorkoutFromSession(args: {
  workoutId: string;
  generationId: string;
  checkInId: string;
  now: UtcTs;
  planLocalDate: string;
  session: SessionResult;
  pool: PoolExercise[];
}): Workout {
  const { session } = args;
  const items: WorkoutExercise[] = [];
  const blockOrder: Array<'A' | 'B' | 'C' | 'F'> = ['A', 'B', 'C', 'F'];
  const blockSlots = new Map<'A' | 'B' | 'C' | 'F', { slots: SlotId[]; mode: 'PAIRED' | 'STRAIGHT_SETS' }>();

  for (const gi of session.items) {
    if (!gi.block) continue; // defensive: generate.ts's actual finalItems always set a block
    const family = gi.family as Family | null;
    if (!family) continue; // defensive: pool exercises always have a family (V-00b)
    const itemKey = `${gi.slot}#1`;
    items.push({
      item_key: itemKey,
      slot: gi.slot as SlotId,
      block_id: gi.block,
      exercise_id: gi.exerciseId,
      exercise_name_snapshot: gi.exerciseName,
      family,
      sub_target: subTargetFor(args.pool, gi.exerciseId),
      role: gi.role,
      anchor_pick_reason: gi.selectionReasonCode as never,
      implement: gi.implement,
      swapped_from: null,
      swapped_from_item_key: null,
      swap_type: null,
      status: 'PLANNED',
      prescription: {
        sets: gi.sets,
        target: gi.target,
        unit: gi.unit,
        load: gi.load,
        line_state: gi.lineState as never,
        per_side: gi.perSide,
        rest_after_pair_s: gi.restAfterPairS,
      },
      effort: { BILATERAL: null, LEFT: null, RIGHT: null },
      flags: [],
      sets: [],
      note: null,
    });
    const entry = blockSlots.get(gi.block) ?? { slots: [], mode: gi.blockMode ?? 'PAIRED' };
    if (!entry.slots.includes(gi.slot as SlotId)) entry.slots.push(gi.slot as SlotId);
    blockSlots.set(gi.block, entry);
  }

  const blocks = blockOrder
    .filter((b) => blockSlots.has(b))
    .map((b) => {
      const entry = blockSlots.get(b)!;
      return { block_id: b, mode: entry.mode, slots: entry.slots, mode_actual: entry.mode };
    });

  return {
    id: args.workoutId,
    type: 'workout',
    created_at: args.now,
    updated_at: args.now,
    generation_id: args.generationId,
    check_in_id: args.checkInId,
    env_id: 'ENV-APT',
    plan_local_date: args.planLocalDate,
    status: 'IN_PROGRESS',
    started_at: args.now,
    ended_at: null,
    session_capacity: null,
    load_unit: 'lb',
    blocks,
    items,
    warmup_completed: false,
    finish_method: null,
    note: null,
  };
}

// ============================================================================
// 4. The flat step sequence (Focus mode's step machine, §8.3)
// ============================================================================

export interface FlatStep {
  itemKey: string;
  slot: SlotId;
  setNo: number;
  side: Side;
  isFinalSetForItem: boolean;
  pairedWithItemKey: string | null;
}

/** Items still part of the flat step sequence Focus mode walks through. A SWAPPED_OUT
 * item is replaced by its successor; a STOPPED item (D-089 symptom stop) or a SKIPPED
 * item (§8.4: "session ended -> SKIPPED", or a not-yet-started item explicitly skipped)
 * must stop generating further set steps too — otherwise `currentStepIndex` keeps
 * pointing at that item's still-unlogged sets forever, which both traps Focus mode on
 * an exercise the person just said to stop, and makes `skipItem` a no-op. Any sets
 * already logged before the stop/skip remain in `item.sets` and are still picked up by
 * completion (`buildPerformedItems` filters on logged sets, not on status), so nothing
 * already recorded is lost — only the remaining, not-yet-logged steps are dropped. */
function activeItems(workout: Workout): WorkoutExercise[] {
  return workout.items.filter((i) => i.status !== 'SWAPPED_OUT' && i.status !== 'STOPPED' && i.status !== 'SKIPPED');
}

function sidesFor(item: WorkoutExercise): Side[] {
  return item.prescription.per_side ? ['LEFT', 'RIGHT'] : ['BILATERAL'];
}

function stepsForItem(item: WorkoutExercise, pairedWithItemKey: string | null): FlatStep[] {
  const steps: FlatStep[] = [];
  const sides = sidesFor(item);
  for (let setNo = 1; setNo <= item.prescription.sets; setNo++) {
    for (const side of sides) {
      steps.push({
        itemKey: item.item_key,
        slot: item.slot,
        setNo,
        side,
        isFinalSetForItem: setNo === item.prescription.sets,
        pairedWithItemKey,
      });
    }
  }
  return steps;
}

/** Builds the full flat sequence of "do a set" steps for the active (non-swapped-out)
 * items, in block/slot order. PAIRED blocks alternate rounds between the two slot
 * partners (A1 set 1, A2 set 1, A1 set 2, A2 set 2, ...); STRAIGHT_SETS and single-item
 * blocks complete one item's sets before the next. Rest is not a step of its own — the UI
 * shows it between two consecutive steps (PRODUCT_UX_SPEC_V0.md D-086: starts
 * automatically, ends when the next set is logged). */
export function buildFlatSteps(workout: Workout): FlatStep[] {
  const items = activeItems(workout);
  const steps: FlatStep[] = [];
  for (const block of workout.blocks) {
    const blockItems = block.slots
      .map((slot) => items.find((i) => i.slot === slot))
      .filter((i): i is WorkoutExercise => !!i);
    if (blockItems.length === 2 && block.mode_actual === 'PAIRED') {
      const [a, b] = blockItems;
      const aSteps = stepsForItem(a, b.item_key);
      const bSteps = stepsForItem(b, a.item_key);
      const rounds = Math.max(a.prescription.sets, b.prescription.sets);
      let ai = 0;
      let bi = 0;
      for (let r = 1; r <= rounds; r++) {
        while (ai < aSteps.length && aSteps[ai].setNo === r) steps.push(aSteps[ai++]);
        while (bi < bSteps.length && bSteps[bi].setNo === r) steps.push(bSteps[bi++]);
      }
    } else {
      for (const item of blockItems) steps.push(...stepsForItem(item, null));
    }
  }
  return steps;
}

/** The index of the next not-yet-logged step (steps.length once every step is logged). */
export function currentStepIndex(workout: Workout, steps: FlatStep[]): number {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const item = workout.items.find((it) => it.item_key === s.itemKey);
    const logged = item?.sets.some((sp) => sp.set_no === s.setNo && sp.side === s.side && sp.is_working);
    if (!logged) return i;
  }
  return steps.length;
}

// ============================================================================
// 5. Set logging
// ============================================================================

export interface LogSetInput {
  now: UtcTs;
  load: number | null;
  reps: number | null;
  seconds: number | null;
  entry: SetPerformance['entry'];
  /** only set on the item's final set (D-067: 4 effort buttons, no numeric RPE) */
  effort?: Effort | null;
}

/** Appends one logged working set to the item named by `step`, immutably. Marks the item
 * IN_PROGRESS on its first set and DONE once every prescribed (set, side) is logged. */
export function logSet(workout: Workout, step: FlatStep, input: LogSetInput): Workout {
  const items = workout.items.map((it) => {
    if (it.item_key !== step.itemKey) return it;
    const newSet: SetPerformance = {
      set_no: step.setNo,
      side: step.side,
      load: input.load,
      reps: input.reps,
      seconds: input.seconds,
      is_working: true,
      logged_at: input.now,
      entry: input.entry,
    };
    const sets = [...it.sets, newSet];
    const effort = input.effort ? { ...it.effort, [step.side]: input.effort } : it.effort;
    const totalSteps = it.prescription.per_side ? it.prescription.sets * 2 : it.prescription.sets;
    const nowDone = sets.length >= totalSteps;
    const status = nowDone ? 'DONE' : it.status === 'PLANNED' ? 'IN_PROGRESS' : it.status;
    return { ...it, sets, effort, status };
  });
  return { ...workout, items, updated_at: input.now };
}

/** Marks an item skipped without logging any set (its status only changes if it hasn't
 * started yet — a partially-logged item is left as IN_PROGRESS/STOPPED, never SKIPPED). */
export function skipItem(workout: Workout, itemKey: string, now: UtcTs): Workout {
  const items = workout.items.map((it) => (it.item_key === itemKey && it.status === 'PLANNED' ? { ...it, status: 'SKIPPED' as const } : it));
  return { ...workout, items, updated_at: now };
}

// ============================================================================
// 6. Discomfort / flags (§ "discomfort input", D-089 symptom stop)
// ============================================================================

export function addFlag(workout: Workout, args: { itemKey: string; side: Side | null; code: FlagCode; now: UtcTs; text?: string | null }): Workout {
  const items = workout.items.map((it) => {
    if (it.item_key !== args.itemKey) return it;
    const flags = [...it.flags, { code: args.code, side: args.side, rep: null, text: args.text ?? null, flagged_at: args.now }];
    // D-089: STOPPED_SYMPTOM is a 2-tap stop, no dialog — the item ends right there.
    const status = args.code === 'STOPPED_SYMPTOM' ? ('STOPPED' as const) : it.status;
    return { ...it, flags, status };
  });
  return { ...workout, items, updated_at: args.now };
}

/** D-088: swap reasons are optional post-swap chips, not a blocking dialog — this just
 * records the chosen chip text on the item, the same free-text `note` field every
 * WorkoutExercise already carries. */
export function setItemNote(workout: Workout, itemKey: string, note: string | null, now: UtcTs): Workout {
  const items = workout.items.map((it) => (it.item_key === itemKey ? { ...it, note } : it));
  return { ...workout, items, updated_at: now };
}

// ============================================================================
// 7. Swap (§ "exercise swap")
// ============================================================================

function resolveEquipForImplement(implement: string[], equip: Map<string, EffectiveEquipment>): EffectiveEquipment | undefined {
  if (implement.length === 0) return undefined;
  // SYSTEM_DESIGN: neither generate.ts nor completion.ts resolves a single
  // EffectiveEquipment from a multi-id implement set (increaseLoad/lowerAvailableLoad take
  // one EffectiveEquipment | undefined, but the engine's own generate/facade code never
  // calls them — completion is the first real caller). Prefer the load-bearing piece (the
  // one with known loads/max_confirmed_load, e.g. the dumbbell in a dumbbell+bench pair);
  // fall back to the implement's first id.
  for (const id of implement) {
    const e = equip.get(id);
    if (e && (e.loads !== null || e.max_confirmed_load !== null)) return e;
  }
  return equip.get(implement[0]);
}

export function computeSwapOptions(args: {
  pack: LoadedPack;
  derived: Derived;
  session: SessionResult;
  generationId: string;
  slot: SlotId;
  todayIssues: string[];
  busyStations: string[];
  now: UtcTs;
}): SwapOptions {
  // swapOptions() takes the full canonical `Generation` document type, but only ever
  // reads `generation.session.{posture,items}` — building the full record (state_digest,
  // config_hash, family_plan[], etc.) is out of scope here (see document.ts's
  // 'stored_generation' comment). This constructs just enough of the shape for that one
  // read and casts, rather than fabricating a whole GenerationRecord no one will read.
  const generationForSwap = {
    session: {
      posture: args.session.posture,
      items: args.session.items.map((i) => ({ slot: i.slot, family: i.family, sub_target: null, role: i.role, exercise_id: i.exerciseId })),
    },
  } as unknown as Parameters<typeof engineSwapOptions>[2];
  return engineSwapOptions(args.pack, args.derived, generationForSwap, {
    slot: args.slot,
    todayIssues: args.todayIssues,
    busyStations: args.busyStations,
    now: args.now,
  });
}

export function applySwap(args: {
  workout: Workout;
  slotItem: WorkoutExercise;
  newExerciseId: string;
  pool: PoolExercise[];
  state: GeneratorState;
  equip: Map<string, EffectiveEquipment>;
  config: EngineConfigValues;
  posture: 'NORMAL' | 'LIGHT';
  now: UtcTs;
  swapType: 'USER_SWAP' | 'USER_REPLACE';
}): Workout {
  const newExercise = args.pool.find((e) => e.exercise_id === args.newExerciseId);
  if (!newExercise) throw new Error(`applySwap: exercise ${args.newExerciseId} not found in pool`);

  const role = args.slotItem.role;
  const unit: Unit = newExercise.load_mode === 'TIME' || newExercise.load_mode === 'TIME_WITH_LOAD' ? 'SECONDS' : 'REPS';
  const todayImplement = newExercise.equipment_options[0] ?? [];
  const hasLineRole = role !== 'MOBILITY' && role !== 'CONDITIONING';
  const block = args.slotItem.block_id;

  let target: number;
  let load: number | null;
  let lineState: string;
  if (hasLineRole) {
    const movementPatternLastTrainedTs = newExercise.family ? args.state.family_last_trained[newExercise.family] ?? null : null;
    const status = determineLineStatus(args.state, args.newExerciseId, role, 'BILATERAL', todayImplement, args.now, args.config, movementPatternLastTrainedTs);
    const tl = computeTargetLoad(status, role, unit, args.config);
    target = tl.target;
    load = tl.load;
    lineState = tl.line_state;
  } else {
    target = unit === 'SECONDS' ? 35 : 7;
    load = null;
    lineState = 'NONE';
  }
  // A user swap fills the slot with something other than the plan's own pick — treated
  // like the §C.7 fallback chain's "replaced slot" for the A/B 3-set rule (SYSTEM_DESIGN
  // extension of §G.2, not an Alloy-documented rule).
  const sets = computeSets({ role, unit, posture: args.posture, isReplacedSlot: true, block: block === 'F' ? 'C' : block, config: args.config });

  const priorVersions = args.workout.items.filter((i) => i.slot === args.slotItem.slot).length;
  const newItemKey = `${args.slotItem.slot}#${priorVersions + 1}`;

  const items = args.workout.items.map((it) => (it.item_key === args.slotItem.item_key ? { ...it, status: 'SWAPPED_OUT' as const } : it));
  const newItem: WorkoutExercise = {
    item_key: newItemKey,
    slot: args.slotItem.slot,
    block_id: block,
    exercise_id: args.newExerciseId,
    exercise_name_snapshot: newExercise.display_name,
    family: newExercise.family,
    sub_target: newExercise.sub_target,
    role,
    anchor_pick_reason: args.swapType as never,
    implement: todayImplement,
    swapped_from: args.slotItem.exercise_id,
    swapped_from_item_key: args.slotItem.item_key,
    swap_type: args.swapType,
    status: 'PLANNED',
    prescription: {
      sets,
      target,
      unit,
      load,
      line_state: lineState as never,
      per_side: newExercise.per_side_logging,
      rest_after_pair_s: args.slotItem.prescription.rest_after_pair_s,
    },
    effort: { BILATERAL: null, LEFT: null, RIGHT: null },
    flags: [],
    sets: [],
    note: null,
  };
  items.push(newItem);
  return { ...args.workout, items, updated_at: args.now };
}

// ============================================================================
// 8. Completion (§ "workout completion" -> real completeWorkout())
// ============================================================================

const LINE_ROLES: Role[] = ['PRIMARY', 'SECONDARY', 'CORE', 'CARRY', 'ACCESSORY'];
const DISQUALIFYING_FLAGS: FlagCode[] = ['TECHNIQUE_DIFFICULTY', 'UNCOMFORTABLE', 'STOPPED_SYMPTOM'];

function setsForSide(item: WorkoutExercise, side: Side): SetPerformance[] {
  return item.sets.filter((s) => s.side === side && s.is_working);
}

function amountOf(s: SetPerformance): number | null {
  return s.reps ?? s.seconds ?? null;
}

function buildSideInput(args: {
  item: WorkoutExercise;
  side: Side;
  state: GeneratorState;
  now: UtcTs;
  checkIn: CheckIn;
  poolExercise: PoolExercise | undefined;
  config: EngineConfigValues;
}): SideExposureInput {
  const { item, side } = args;
  const sets = setsForSide(item, side);
  const workingSetsCompleted = sets.length;
  const target = item.prescription.target;
  const everySetMetTarget = sets.length > 0 && sets.every((s) => (amountOf(s) ?? 0) >= target);
  const shortfalls = sets.filter((s) => target - (amountOf(s) ?? 0) >= 2).length;
  const atLeastTwoSetsShortByTwoOrMore = shortfalls >= 2;
  const everySetLoggedAtPrescribedLoad = sets.every((s) => s.load === item.prescription.load);
  const lastSet = [...sets].sort((a, b) => b.set_no - a.set_no)[0];
  const lastCompletedWorkingSetLoad = lastSet?.load ?? null;
  const minRepsAchievedAcrossSets = sets.length > 0 ? Math.min(...sets.map((s) => amountOf(s) ?? 0)) : 0;

  const movementPatternLastTrainedTs = item.family ? args.state.family_last_trained[item.family] ?? null : null;
  const statusResult = determineLineStatus(args.state, item.exercise_id, item.role, side, item.implement, args.now, args.config, movementPatternLastTrainedTs);
  const effort = (side === 'BILATERAL' ? item.effort.BILATERAL : side === 'LEFT' ? item.effort.LEFT : item.effort.RIGHT) ?? null;
  const rightTricepsInvolvementExcluded = side === 'RIGHT' && args.checkIn.R04 === 'worse' && (args.poolExercise?.right_triceps_involvement ?? 'NONE') !== 'NONE';

  return {
    side,
    workingSetsCompleted,
    workingSetsPrescribed: item.prescription.sets,
    effort,
    everySetLoggedAtPrescribedLoad,
    everySetMetTarget,
    atLeastTwoSetsShortByTwoOrMore,
    lastCompletedWorkingSetLoad,
    minRepsAchievedAcrossSets,
    lineStatus: statusResult.status,
    seedFromLine: statusResult.seedFrom ?? null,
    existingLine: statusResult.line ?? null,
    rightTricepsInvolvementExcluded,
  };
}

export function buildPerformedItems(args: {
  workout: Workout;
  state: GeneratorState;
  checkIn: CheckIn;
  equip: Map<string, EffectiveEquipment>;
  pool: PoolExercise[];
  config: EngineConfigValues;
  now: UtcTs;
  /** engine/familyPlan.ts's computePosture(checkIn) result, carried from the StoredGeneration
   * that produced this workout (posture doesn't change mid-session, so the caller passes it
   * through rather than this module re-deriving it — computePosture isn't facade-exported). */
  posture: 'NORMAL' | 'LIGHT';
}): PerformedItemInput[] {
  const postureNormal = args.posture === 'NORMAL';
  return args.workout.items
    .filter((it) => it.sets.some((s) => s.is_working))
    .map((it) => {
      const hasLine = LINE_ROLES.includes(it.role);
      const poolExercise = args.pool.find((e) => e.exercise_id === it.exercise_id);
      const sides = sidesFor(it).map((side) =>
        buildSideInput({ item: it, side, state: args.state, now: args.now, checkIn: args.checkIn, poolExercise, config: args.config }),
      );
      return {
        itemKey: it.item_key,
        exerciseId: it.exercise_id,
        family: it.family,
        role: it.role,
        anchorKeyForRole: hasLine ? anchorKey(it.family, it.role, it.sub_target) : null,
        selectionReasonCode: it.anchor_pick_reason,
        hasLine,
        todayImplement: it.implement,
        equip: resolveEquipForImplement(it.implement, args.equip),
        postureNormal,
        sessionCapacityBelowUsual: args.workout.session_capacity === 'below_usual',
        hasDisqualifyingFlag: it.flags.some((f) => DISQUALIFYING_FLAGS.includes(f.code)),
        sides,
      } satisfies PerformedItemInput;
    });
}

export interface FinishWorkoutResult {
  workout: Workout;
  state: GeneratorState;
  completion: CompleteWorkoutResult;
}

/** Runs the real completeWorkout()/applyFlags() against the logged workout and returns
 * the COMPLETED workout plus the updated GeneratorState to persist as 'engine_state'. */
export function finishWorkout(args: {
  workout: Workout;
  state: GeneratorState;
  checkIn: CheckIn;
  equip: Map<string, EffectiveEquipment>;
  pool: PoolExercise[];
  config: EngineConfigValues;
  now: UtcTs;
  sessionCapacity: 'below_usual' | 'usual' | 'above_usual';
  finishMethod: 'FINISH_STEP' | 'END_SESSION' | 'FINISHED_LATER';
  posture: 'NORMAL' | 'LIGHT';
}): FinishWorkoutResult {
  const workoutWithCapacity: Workout = { ...args.workout, session_capacity: args.sessionCapacity };
  const performedItems = buildPerformedItems({
    workout: workoutWithCapacity,
    state: args.state,
    checkIn: args.checkIn,
    equip: args.equip,
    pool: args.pool,
    config: args.config,
    now: args.now,
    posture: args.posture,
  });

  const completeArgs: CompleteWorkoutArgs = {
    performedAt: workoutWithCapacity.started_at,
    endedAt: args.now,
    sessionCapacity: args.sessionCapacity,
    items: performedItems,
    config: args.config,
    allowUnevenSideDosing: args.config.ALLOW_UNEVEN_SIDE_DOSING,
  };
  const completion = completeWorkout(args.state, completeArgs);

  const flags: FlagApplication[] = [];
  for (const it of workoutWithCapacity.items) {
    for (const f of it.flags) {
      if (DISQUALIFYING_FLAGS.includes(f.code)) flags.push({ itemKey: it.item_key, exerciseId: it.exercise_id, side: f.side, code: f.code });
    }
  }
  const roleAndSideByItemKey = new Map(workoutWithCapacity.items.map((it) => [it.item_key, it] as const));
  const finalState = applyFlags(
    completion.state,
    flags,
    (f) => {
      const item = roleAndSideByItemKey.get(f.itemKey);
      if (!item) return null;
      const key = lineKey(f.exerciseId, item.role, f.side ?? 'BILATERAL');
      return completion.state.lines[key] ?? null;
    },
    args.now,
  );

  const finishedWorkout: Workout = {
    ...workoutWithCapacity,
    status: 'COMPLETED',
    ended_at: args.now,
    finish_method: args.finishMethod,
    updated_at: args.now,
  };

  return { workout: finishedWorkout, state: finalState, completion };
}

export type { PoolExercise, SwapOptions };

// ============================================================================
// 9. "WHY THIS EXERCISE" text
// ============================================================================

export interface WhyText {
  whyMovement: string;
  whyExercise: string;
  whyDose: string;
}

/** For an original (never-swapped) item, the engine already rendered §J.3 text at
 * generation time (GeneratedItem.why*) — this just looks it up. A swapped-in item has no
 * such text (a user swap isn't a generation-time decision), so this synthesizes it from
 * the same §J.3 templates (engine/explain.ts) using what the swap itself decided: the
 * movement slot didn't change, only the exercise and (possibly) the dose. */
export function explainWorkoutItem(item: WorkoutExercise, generation: StoredGeneration): WhyText {
  if (isSession(generation.result)) {
    const original = generation.result.items.find((gi) => gi.slot === item.slot && gi.exerciseId === item.exercise_id);
    if (original) return { whyMovement: original.whyMovement, whyExercise: original.whyExercise, whyDose: original.whyDose };
  }
  const original = isSession(generation.result) ? generation.result.items.find((gi) => gi.slot === item.slot) : undefined;
  const whyMovement = original ? movementReasonText(original.familyReasonCode ?? 'FALLBACK_NEXT_IN_POOL', { family: item.family ?? undefined }) : 'Chosen for today’s session.';
  const whyExercise = selectionReasonText(item.anchor_pick_reason as never, {});
  const whyDose = progressionReasonText(item.prescription.line_state as never, { target: item.prescription.target, load: item.prescription.load, unit: item.prescription.unit });
  return { whyMovement, whyExercise, whyDose };
}

// ============================================================================
// 10. LOG ALLOY SESSION — must accept incomplete historical information gracefully
// ============================================================================

/** One entered item before it's resolved into a real ExternalItem. Deliberately looser
 * than ExternalItemSchema: sets/reps/load/doseText are all optional (a coach-led class is
 * often remembered as "did some rows, not sure how heavy"), and either an exercise_id
 * (from lookup) or free text (manual fallback, e.g. an exercise not in the library yet) is
 * accepted — never both, and the caller doesn't have to know which up front. */
export interface AlloyItemInput {
  slotLabel: string | null;
  exerciseId: string | null;
  freeText: string | null;
  /** only used when exerciseId is null and the user tags a family by hand */
  manualFamilyTag: Family | null;
  sets: number | null;
  reps: number | null;
  load: number | null;
  doseText: string | null;
  isFinisher: boolean;
  coachModified: boolean;
  coachNote: string | null;
}

/** Exercise lookup: searches the loaded pool by display name or id. Manual entry is the
 * fallback when nothing matches (or the exercise isn't in this dev pool at all yet). */
export function lookupExercise(pool: PoolExercise[], query: string): PoolExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return pool.filter((e) => e.display_name.toLowerCase().includes(q) || e.exercise_id.toLowerCase() === q);
}

function buildExternalItem(input: AlloyItemInput, itemNo: number, pool: PoolExercise[]): ExternalItem {
  const matched = input.exerciseId ? pool.find((e) => e.exercise_id === input.exerciseId) : undefined;
  const hasExerciseId = !!input.exerciseId;
  return {
    item_no: itemNo,
    slot_label: input.slotLabel,
    exercise_id: hasExerciseId ? input.exerciseId : null,
    exercise_name_snapshot: matched ? matched.display_name : hasExerciseId ? input.exerciseId : null,
    // exactly one of exercise_id / free_text (ExternalItemSchema's own rule) — a manual
    // entry with nothing typed still needs *something* in free_text, so it falls back to
    // a placeholder rather than silently dropping the item.
    free_text: hasExerciseId ? null : input.freeText && input.freeText.trim() ? input.freeText.trim() : 'Unnamed exercise',
    family_tag: matched ? matched.family : input.manualFamilyTag,
    family_tag_source: matched ? 'METADATA' : input.manualFamilyTag ? 'USER_CHIP' : 'NONE',
    sets: input.sets,
    reps: input.reps,
    load: input.load,
    dose_text: input.doseText,
    is_finisher: input.isFinisher,
    coach_modified: input.coachModified,
    coach_note: input.coachNote,
    coach_note_reviewed: false,
  };
}

export interface AlloySessionInput {
  /** present only when editing an existing session */
  id?: string;
  /** present only when editing — the original doc's created_at is preserved */
  createdAt?: UtcTs;
  localDate: string;
  performedAt: UtcTs;
  durationKnown: boolean;
  /** required when durationKnown; ignored (schema defaults to +55 min) otherwise */
  durationMin: number | null;
  focus: 'full' | 'upper' | 'lower';
  items: AlloyItemInput[];
  notes: string | null;
  coachNotes: string | null;
  perceivedEffort: Effort | null;
  program: 'DailyArms' | 'DailyAbs' | 'Walking' | 'Manual' | null;
  entryMode: 'CHIPS' | 'TYPED' | 'DICTATED' | 'PROMPT' | 'IMPORT';
  now: UtcTs;
}

/** Builds a real ExternalSession(kind=ALLOY) document. SUMMARY (no items) and FULL (any
 * items) are both first-class — log_mode is derived from whether anything was itemized,
 * never required up front, so "I went to Alloy but don't remember the exercises" is a
 * complete, valid log. */
export function buildAlloySession(input: AlloySessionInput, pool: PoolExercise[]): ExternalSession {
  const endedAt = input.durationKnown && input.durationMin !== null ? addMinutes(input.performedAt, input.durationMin) : addMinutes(input.performedAt, 55);
  const items = input.items.map((it, idx) => buildExternalItem(it, idx + 1, pool));
  const logMode: 'SUMMARY' | 'FULL' = items.length > 0 ? 'FULL' : 'SUMMARY';
  const id = input.id ?? alloySessionId(input.localDate);
  return {
    id,
    type: 'external_session',
    created_at: input.createdAt ?? input.now,
    updated_at: input.now,
    kind: 'ALLOY',
    env_id: 'ENV-ALLOY',
    local_date: input.localDate,
    performed_at: input.performedAt,
    ended_at: endedAt,
    duration_known: input.durationKnown,
    source: 'USER_ENTRY',
    import_batch_id: null,
    log_mode: logMode,
    focus: input.focus,
    perceived_effort: input.perceivedEffort,
    coach_notes: input.coachNotes,
    coach_notes_reviewed_at: null,
    program: input.program,
    focus_tags: [],
    duration_min: input.durationKnown ? input.durationMin : null,
    notes: input.notes,
    entry_mode: input.entryMode,
    items,
  };
}

/** §L.3: what an Alloy log credits toward the same staleness ordering the generator
 * reads (family_last_trained / parent_last_trained / exercise_last_used) — only from
 * FULL logs' tagged items; a SUMMARY log still credits the parent pattern(s) implied by
 * `focus` (§L.3's `creditAlloyLog` already does that half). */
export function deriveAlloyCreditInput(session: ExternalSession): AlloyLogForCrediting {
  const familiesTagged =
    session.log_mode === 'FULL' ? [...new Set(session.items.map((i) => i.family_tag).filter((f): f is Family => f !== null))] : [];
  const exerciseIdsUsed =
    session.log_mode === 'FULL' ? [...new Set(session.items.map((i) => i.exercise_id).filter((id): id is string => id !== null))] : [];
  return { ended_at: session.ended_at, log_mode: session.log_mode ?? 'SUMMARY', focus: session.focus ?? 'full', familiesTagged, exerciseIdsUsed };
}

/** Applies an Alloy session's credit to GeneratorState. Safe to call again after an edit
 * that adds or corrects tags (crediting is a max-of-timestamps operation — see credit.ts
 * — so re-applying with the same or earlier data is a no-op, and applying corrected data
 * only adds credit that was missing). KNOWN, DOCUMENTED GAP: it cannot *retract* credit
 * that a now-deleted or now-corrected item previously granted — that requires rebuilding
 * GeneratorState from the full document history (engine/index.ts's `replay()`, not yet
 * implemented — see claude/B5_GENERATOR_BUILD_STATUS.md). Editing or deleting a
 * mis-tagged log therefore fixes the record but may leave already-applied staleness
 * credit in place until replay() exists; the UI says so rather than claiming otherwise. */
export function creditFromAlloySession(state: GeneratorState, session: ExternalSession): GeneratorState {
  if (session.kind !== 'ALLOY') return state; // OTHER sessions: stored, not read by the engine (D-106)
  return creditAlloyLog(state, deriveAlloyCreditInput(session));
}

// ============================================================================
// 11. EQUIPMENT availability management
// ============================================================================

/** A CONFIRM_EQUIPMENT user-action event (engine contract Q.8) — the engine's own,
 * already-built mechanism for correcting equipment state without touching the pack's
 * authored baseline. `applyUserActionEvent` (engine/completion.ts) folds it into
 * GeneratorState.equipment_overrides, which `effectiveEquipmentMap()` layers over
 * `Datapack.equipment_baseline` for every filter/prescription/progression read. */
export function buildConfirmEquipmentEvent(args: {
  id: string;
  now: UtcTs;
  envId: string;
  equipmentId: string;
  availability: Availability;
  loads: number[] | null;
  maxConfirmedLoad: number | null;
  stationGroup: string | null;
}): UserActionEvent {
  return {
    id: args.id,
    type: 'event',
    created_at: args.now,
    updated_at: args.now,
    event_at: args.now,
    event_type: 'CONFIRM_EQUIPMENT',
    payload: {
      env_id: args.envId,
      equipment_id: args.equipmentId,
      availability: args.availability,
      loads: args.loads,
      max_confirmed_load: args.maxConfirmedLoad,
      station_group: args.stationGroup,
    },
    context: null,
  };
}

// ============================================================================
// 12. PROFILE editing — appropriate non-medical fields only
// ============================================================================

/** UserProfileSchema is already the sanitized, non-medical projection (its own header
 * comment: "no diagnoses, medications, recovery factors, ... clinical grades, body
 * metrics, performance baselines, monitoring variables, or CONTEXT content") — so
 * "appropriate fields" is simply "the fields this schema has," minus the structural ones
 * that must never change from the app (user_id, units, generation_env_id) or that belong
 * to a future authoring tool (profile_version/constraints_version, pending_questions,
 * context_item_ids — B2/B6 concerns, not user-facing edits here). */
export type EditableProfileFields = Pick<UserProfile, 'display_name' | 'alloy_schedule_default' | 'avoidances' | 'goals_display' | 'presentation_preferences'>;

export function applyProfilePatch(pack: Datapack, patch: Partial<EditableProfileFields>, now: UtcTs): Datapack {
  return { ...pack, updated_at: now, profile: { ...pack.profile, ...patch } };
}

/** HF-04 (filters.ts): an avoidance excludes the exercise from generation entirely — a
 * hard movement exclusion, always an explicit user constraint (HEALTH/CONSTRAINT rule),
 * never a diagnosis this app infers on its own. */
export function addAvoidance(pack: Datapack, exerciseId: string, label: string, now: UtcTs): Datapack {
  if (pack.profile.avoidances.some((a) => a.exercise_id === exerciseId)) return pack;
  return applyProfilePatch(pack, { avoidances: [...pack.profile.avoidances, { exercise_id: exerciseId, label }] }, now);
}

export function removeAvoidance(pack: Datapack, exerciseId: string, now: UtcTs): Datapack {
  return applyProfilePatch(pack, { avoidances: pack.profile.avoidances.filter((a) => a.exercise_id !== exerciseId) }, now);
}

export { effectiveEquipmentMap, ENGINE_VERSION };
export type { EffectiveEquipment, LineStatus, Line, GeneratorState };
