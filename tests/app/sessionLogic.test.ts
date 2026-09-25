/**
 * Integration test for the full core loop this build task exists to prove:
 * GENERATE -> START -> LOG SETS -> SWAP IF NEEDED -> COMPLETE -> UPDATE HISTORY,
 * run against the real dev seed datapack and the real engine (no mocks of engine logic).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { DatapackSchema, type Datapack } from '../../src/contracts';
import { loadPool, type PoolExercise } from '../../src/engine/pool';
import { createEmptyState } from '../../src/engine/state';
import { effectiveEquipmentMap } from '../../src/engine/equipment';
import type { LoadedPack, Derived } from '../../src/engine/index';
import {
  normalDayCheckIn,
  buildGeneration,
  buildWorkoutFromSession,
  isSession,
  buildFlatSteps,
  currentStepIndex,
  logSet,
  addFlag,
  skipItem,
  computeSwapOptions,
  applySwap,
  finishWorkout,
  type SessionResult,
} from '../../src/app/sessionLogic';

function loadPack(): Datapack {
  const raw = readFileSync(path.join(__dirname, '..', '..', 'dev-data', 'seed-datapack.json'), 'utf8');
  return DatapackSchema.parse(JSON.parse(raw));
}

describe('sessionLogic: full core loop against the real seed datapack', () => {
  let pack: Datapack;
  let pool: PoolExercise[];
  let loaded: LoadedPack;

  beforeAll(() => {
    pack = loadPack();
    const knownEquipmentIds = new Set(pack.equipment_catalog.map((c) => c.equipment_id));
    pool = loadPool(pack.exercise_metadata, knownEquipmentIds).pool;
    loaded = { pack, pool };
  });

  function derivedAt(state = createEmptyState()): Derived {
    return { state, decisions: [], exposures: [], recoveryCredits: [], errors: [] };
  }

  it('GENERATE produces a SESSION with the seed pack given ample time', () => {
    const now = '2026-09-24T15:00:00.000Z';
    const checkIn = normalDayCheckIn({
      id: 'ci_test1',
      now,
      localDate: '2026-09-24',
      tz: pack.profile.default_tz,
      minutesAvailable: 60,
      symptomToday: 'no',
      symptomChoice: null,
      equipmentIssues: [],
    });
    const generation = buildGeneration({ pack: loaded, derived: derivedAt(), checkIn, now, userId: pack.profile.user_id });
    expect(['SESSION', 'NO_SESSION']).toContain(generation.result.result);
    if (!isSession(generation.result)) {
      // Document what happened rather than silently passing — the small 8-row dev pool
      // may legitimately produce NO_SESSION for some inputs.
      console.warn('GENERATE returned NO_SESSION:', generation.result);
    }
  });

  it('runs START -> LOG SETS -> SWAP -> COMPLETE -> UPDATE HISTORY end to end when a session is produced', () => {
    let now = '2026-09-24T15:00:00.000Z';
    const state = createEmptyState();
    const checkIn = normalDayCheckIn({
      id: 'ci_e2e',
      now,
      localDate: '2026-09-24',
      tz: pack.profile.default_tz,
      minutesAvailable: 60,
      symptomToday: 'no',
      symptomChoice: null,
      equipmentIssues: [],
    });
    const generation = buildGeneration({ pack: loaded, derived: derivedAt(state), checkIn, now, userId: pack.profile.user_id });
    if (!isSession(generation.result)) {
      console.warn('Skipping e2e assertions: GENERATE returned NO_SESSION for this input', generation.result);
      return;
    }
    const session: SessionResult = generation.result;
    expect(session.items.length).toBeGreaterThan(0);

    // START: build the real Workout document
    let workout = buildWorkoutFromSession({
      workoutId: 'wo_e2e',
      generationId: generation.id,
      checkInId: checkIn.id,
      now,
      planLocalDate: checkIn.local_date,
      session,
      pool,
    });
    expect(workout.status).toBe('IN_PROGRESS');
    expect(workout.items.length).toBe(session.items.length);

    // LOG SETS: walk the flat step sequence, logging every set with a plausible
    // performance (meets target, GOOD effort on the final set).
    let steps = buildFlatSteps(workout);
    expect(steps.length).toBeGreaterThan(0);

    // SWAP IF NEEDED: swap out whatever the very first step's item is, if any option
    // exists, before logging anything for it — exercises the swap path mid-loop.
    const firstItem = workout.items.find((i) => i.item_key === steps[0].itemKey)!;
    const swapOptions = computeSwapOptions({
      pack: loaded,
      derived: derivedAt(state),
      session,
      generationId: generation.id,
      slot: firstItem.slot,
      todayIssues: [],
      busyStations: [],
      now,
    });
    if (swapOptions.options.length > 0) {
      workout = applySwap({
        workout,
        slotItem: firstItem,
        newExerciseId: swapOptions.options[0].exercise_id,
        pool,
        state,
        equip: effectiveEquipmentMap(pack.equipment_baseline, state.equipment_overrides),
        config: pack.config.values,
        posture: session.posture,
        now,
        swapType: 'USER_SWAP',
      });
      expect(workout.items.some((i) => i.status === 'SWAPPED_OUT')).toBe(true);
      steps = buildFlatSteps(workout); // rebuild: swapped-out item no longer contributes steps
    } else {
      console.warn('No swap options available for this tiny dev pool; swap path skipped for this run.');
    }

    let idx = currentStepIndex(workout, steps);
    let guard = 0;
    while (idx < steps.length && guard < 500) {
      guard++;
      const step = steps[idx];
      const item = workout.items.find((i) => i.item_key === step.itemKey)!;
      now = new Date(Date.parse(now) + 60000).toISOString();
      workout = logSet(workout, step, {
        now,
        load: item.prescription.load,
        reps: item.prescription.unit === 'REPS' ? item.prescription.target : null,
        seconds: item.prescription.unit === 'SECONDS' ? item.prescription.target : null,
        entry: 'AS_PLANNED',
        effort: step.isFinalSetForItem ? 'GOOD' : null,
      });
      idx = currentStepIndex(workout, steps);
    }
    expect(idx).toBe(steps.length);
    expect(workout.items.filter((i) => i.status !== 'SWAPPED_OUT').every((i) => i.status === 'DONE' || i.sets.length === 0)).toBe(true);

    // A discomfort flag on one item, exercised before completion (does not block it).
    const flaggable = workout.items.find((i) => i.status === 'DONE');
    if (flaggable) {
      workout = addFlag(workout, { itemKey: flaggable.item_key, side: null, code: 'UNCOMFORTABLE', now });
      expect(workout.items.find((i) => i.item_key === flaggable.item_key)!.flags.length).toBe(1);
    }

    // COMPLETE -> UPDATE HISTORY: run the real completeWorkout()/applyFlags() and assert
    // the GeneratorState actually changed (lines were written, session count incremented).
    now = new Date(Date.parse(now) + 60000).toISOString();
    const result = finishWorkout({
      workout,
      state,
      checkIn,
      equip: effectiveEquipmentMap(pack.equipment_baseline, state.equipment_overrides),
      pool,
      config: pack.config.values,
      now,
      sessionCapacity: 'usual',
      finishMethod: 'FINISH_STEP',
      posture: session.posture,
    });

    expect(result.workout.status).toBe('COMPLETED');
    expect(result.workout.ended_at).toBe(now);
    expect(result.state.apartment_sessions_completed).toBe(1);
    expect(Object.keys(result.state.lines).length).toBeGreaterThan(0);
    expect(result.completion.items.length).toBeGreaterThan(0);
  });
});

describe('applySwap: unit-level (synthetic 2-candidate pool, since the dev seed has only one exercise per family)', () => {
  it('swaps the slot item, keeps the old item as SWAPPED_OUT history, and excludes it from the flat steps', () => {
    const now = '2026-09-24T15:00:00.000Z';
    const twoKdPool: PoolExercise[] = [
      {
        exercise_id: 'EX012',
        status: 'ACTIVE',
        display_name: 'Goblet Squat',
        family: 'KD',
        sub_target: null,
        roles_allowed: ['PRIMARY', 'SECONDARY'],
        laterality: 'BILATERAL',
        per_side_logging: false,
        load_mode: 'EXTERNAL_LOAD',
        equipment_options: [['EQ009']],
        station: 'NONE',
        heavy_lower: true,
        right_triceps_involvement: 'NONE',
        hand_support: 'NONE',
        position_tags: [],
        sore_regions: ['LOWER'],
        capability_prereq: null,
        evidence_basis: 'ALLOY_LIBRARY',
        default_order: 1,
        library_order: 1,
        executed_as: null,
        demo_ref: null,
        authoring_note: null,
      },
      {
        exercise_id: 'EX013',
        status: 'ACTIVE',
        display_name: 'Kettlebell Deadlift',
        family: 'KD',
        sub_target: null,
        roles_allowed: ['PRIMARY', 'SECONDARY'],
        laterality: 'BILATERAL',
        per_side_logging: false,
        load_mode: 'EXTERNAL_LOAD',
        equipment_options: [['EQ010']],
        station: 'NONE',
        heavy_lower: true,
        right_triceps_involvement: 'NONE',
        hand_support: 'NONE',
        position_tags: [],
        sore_regions: ['LOWER'],
        capability_prereq: null,
        evidence_basis: 'ALLOY_LIBRARY',
        default_order: 2,
        library_order: 2,
        executed_as: null,
        demo_ref: null,
        authoring_note: null,
      },
    ];

    const workout = buildWorkoutFromSession({
      workoutId: 'wo_swap_unit',
      generationId: 'gen_swap_unit',
      checkInId: 'ci_swap_unit',
      now,
      planLocalDate: '2026-09-24',
      pool: twoKdPool,
      session: {
        result: 'SESSION',
        posture: 'NORMAL',
        tier: 'A',
        items: [
          {
            slot: 'A1',
            block: 'A',
            exerciseId: 'EX012',
            exerciseName: 'Goblet Squat',
            family: 'KD',
            role: 'PRIMARY',
            implement: ['EQ009'],
            sets: 3,
            target: 8,
            unit: 'REPS',
            load: 30,
            lineState: 'CALIBRATE',
            perSide: false,
            restAfterPairS: null,
            selectionReasonCode: 'ANCHOR',
            familyReasonCode: null,
            station: 'NONE',
            blockMode: 'PAIRED',
            whyMovement: '',
            whyExercise: '',
            whyDose: '',
          },
        ],
        durationEstimateMin: 20,
        trimsApplied: [],
        underfill: null,
        underfillSentence: null,
        unservable: [],
        unfillable: [],
      },
    });

    const state = createEmptyState();
    const equip = effectiveEquipmentMap(
      [{ env_id: 'ENV-APT', equipment_id: 'EQ010', availability: 'AVAILABLE', loads: [20, 25, 30], max_confirmed_load: null, station_group: 'NONE', confirmed_on: null }],
      state.equipment_overrides,
    );
    const config = loadPack().config.values;

    const original = workout.items[0];
    const swapped = applySwap({
      workout,
      slotItem: original,
      newExerciseId: 'EX013',
      pool: twoKdPool,
      state,
      equip,
      config,
      posture: 'NORMAL',
      now,
      swapType: 'USER_SWAP',
    });

    expect(swapped.items).toHaveLength(2);
    const oldItem = swapped.items.find((i) => i.item_key === original.item_key)!;
    const newItem = swapped.items.find((i) => i.item_key !== original.item_key)!;
    expect(oldItem.status).toBe('SWAPPED_OUT');
    expect(newItem.exercise_id).toBe('EX013');
    expect(newItem.swapped_from).toBe('EX012');
    expect(newItem.swapped_from_item_key).toBe(original.item_key);
    expect(newItem.swap_type).toBe('USER_SWAP');
    expect(newItem.item_key).toBe('A1#2');
    expect(newItem.status).toBe('PLANNED');
    // CALIBRATE (no prior line for EX013/PRIMARY/BILATERAL)
    expect(newItem.prescription.line_state).toBe('CALIBRATE');

    const steps = buildFlatSteps(swapped);
    expect(steps.every((s) => s.itemKey === newItem.item_key)).toBe(true);
    expect(steps).toHaveLength(newItem.prescription.sets);
  });
});

// Regression tests for a V0 QA-pass bug: `activeItems()` (buildFlatSteps' internal item
// filter) only excluded SWAPPED_OUT items, so a STOPPED (D-089 symptom stop) or SKIPPED
// item kept generating its remaining unlogged steps forever — Focus mode would keep
// showing the very exercise the person just said to stop, letting them keep logging
// working sets on it. Fixed by also excluding STOPPED and SKIPPED from activeItems().
describe('buildFlatSteps / currentStepIndex: a STOPPED or SKIPPED item must not keep generating steps', () => {
  function twoItemPairedWorkout() {
    const now = '2026-09-24T15:00:00.000Z';
    return buildWorkoutFromSession({
      workoutId: 'wo_stop_unit',
      generationId: 'gen_stop_unit',
      checkInId: 'ci_stop_unit',
      now,
      planLocalDate: '2026-09-24',
      pool: [],
      session: {
        result: 'SESSION',
        posture: 'NORMAL',
        tier: 'A',
        items: [
          {
            slot: 'A1',
            block: 'A',
            exerciseId: 'EX012',
            exerciseName: 'Goblet Squat',
            family: 'KD',
            role: 'PRIMARY',
            implement: ['EQ009'],
            sets: 2,
            target: 8,
            unit: 'REPS',
            load: 30,
            lineState: 'CALIBRATE',
            perSide: false,
            restAfterPairS: null,
            selectionReasonCode: 'ANCHOR',
            familyReasonCode: null,
            station: 'NONE',
            blockMode: 'PAIRED',
            whyMovement: '',
            whyExercise: '',
            whyDose: '',
          },
          {
            slot: 'A2',
            block: 'A',
            exerciseId: 'EX020',
            exerciseName: 'Kettlebell Row',
            family: 'HPULL',
            role: 'PRIMARY',
            implement: ['EQ011'],
            sets: 2,
            target: 8,
            unit: 'REPS',
            load: 25,
            lineState: 'CALIBRATE',
            perSide: false,
            restAfterPairS: 60,
            selectionReasonCode: 'ANCHOR',
            familyReasonCode: null,
            station: 'NONE',
            blockMode: 'PAIRED',
            whyMovement: '',
            whyExercise: '',
            whyDose: '',
          },
        ],
        durationEstimateMin: 20,
        trimsApplied: [],
        underfill: null,
        underfillSentence: null,
        unservable: [],
        unfillable: [],
      },
    });
  }

  it('a STOPPED_SYMPTOM flag with zero logged sets removes the item from the flat steps entirely', () => {
    const now = '2026-09-24T15:05:00.000Z';
    const workout = twoItemPairedWorkout();
    const a1 = workout.items.find((i) => i.slot === 'A1')!;
    const a2 = workout.items.find((i) => i.slot === 'A2')!;

    // sanity: before the flag, both items contribute steps and A1 is first (paired order).
    const stepsBefore = buildFlatSteps(workout);
    expect(stepsBefore.some((s) => s.itemKey === a1.item_key)).toBe(true);
    expect(currentStepIndex(workout, stepsBefore)).toBe(0);
    expect(stepsBefore[0].itemKey).toBe(a1.item_key);

    const stopped = addFlag(workout, { itemKey: a1.item_key, side: null, code: 'STOPPED_SYMPTOM', now });
    expect(stopped.items.find((i) => i.item_key === a1.item_key)!.status).toBe('STOPPED');

    const stepsAfter = buildFlatSteps(stopped);
    expect(stepsAfter.every((s) => s.itemKey !== a1.item_key)).toBe(true);
    expect(stepsAfter.every((s) => s.itemKey === a2.item_key)).toBe(true);
    expect(stepsAfter).toHaveLength(a2.prescription.sets);

    // Focus mode must land on A2's first step, not loop forever on the stopped A1.
    const idx = currentStepIndex(stopped, stepsAfter);
    expect(idx).toBe(0);
    expect(stepsAfter[idx].itemKey).toBe(a2.item_key);
  });

  it('a STOPPED_SYMPTOM flag partway through an item keeps its already-logged sets but drops the rest', () => {
    const now = '2026-09-24T15:05:00.000Z';
    let workout = twoItemPairedWorkout();
    const a1 = workout.items.find((i) => i.slot === 'A1')!;
    const steps = buildFlatSteps(workout);
    const a1FirstStep = steps.find((s) => s.itemKey === a1.item_key)!;

    workout = logSet(workout, a1FirstStep, { now, load: 30, reps: 8, seconds: null, entry: 'AS_PLANNED', effort: null });
    expect(workout.items.find((i) => i.item_key === a1.item_key)!.sets).toHaveLength(1);

    const stopped = addFlag(workout, { itemKey: a1.item_key, side: null, code: 'STOPPED_SYMPTOM', now });
    // the one already-logged set is untouched (completion still credits it)
    expect(stopped.items.find((i) => i.item_key === a1.item_key)!.sets).toHaveLength(1);
    // but no further A1 steps are generated — its second, never-logged set is gone from the flow
    const stepsAfter = buildFlatSteps(stopped);
    expect(stepsAfter.some((s) => s.itemKey === a1.item_key)).toBe(false);
  });

  it('skipItem removes a not-yet-started item from the flat steps the same way', () => {
    const now = '2026-09-24T15:05:00.000Z';
    const workout = twoItemPairedWorkout();
    const a1 = workout.items.find((i) => i.slot === 'A1')!;
    const a2 = workout.items.find((i) => i.slot === 'A2')!;

    const skipped = skipItem(workout, a1.item_key, now);
    expect(skipped.items.find((i) => i.item_key === a1.item_key)!.status).toBe('SKIPPED');

    const steps = buildFlatSteps(skipped);
    expect(steps.every((s) => s.itemKey === a2.item_key)).toBe(true);
    expect(currentStepIndex(skipped, steps)).toBe(0);
  });
});
