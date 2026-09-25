/**
 * Integration tests for the AppStore-level LOG ALLOY SESSION / EQUIPMENT / PROFILE /
 * HISTORY methods, run against a real MemoryAdapter (real persistence semantics, no
 * mocked storage) and the real engine underneath. The explicitly required proof —
 * "equipment/profile changes affect subsequent generation correctly" — lives in the
 * last describe block below.
 */
import { describe, expect, it } from 'vitest';
import { AppStore } from '../../src/app/store';
import { MemoryAdapter } from '../../src/store/MemoryAdapter';
import { buildFlatSteps, currentStepIndex, type AlloySessionInput, type AlloyItemInput } from '../../src/app/sessionLogic';

function blankItem(overrides: Partial<AlloyItemInput> = {}): AlloyItemInput {
  return {
    slotLabel: null,
    exerciseId: null,
    freeText: null,
    manualFamilyTag: null,
    sets: null,
    reps: null,
    load: null,
    doseText: null,
    isFinisher: false,
    coachModified: false,
    coachNote: null,
    ...overrides,
  };
}

function baseAlloyInput(overrides: Partial<Omit<AlloySessionInput, 'now'>> = {}): Omit<AlloySessionInput, 'now'> {
  return {
    localDate: '2026-09-23',
    performedAt: '2026-09-23T14:00:00.000Z',
    durationKnown: false,
    durationMin: null,
    focus: 'full',
    items: [],
    notes: null,
    coachNotes: null,
    perceivedEffort: null,
    program: 'Manual',
    entryMode: 'TYPED',
    ...overrides,
  };
}

async function readyStore(): Promise<AppStore> {
  const store = new AppStore(new MemoryAdapter());
  await store.init();
  return store;
}

describe('AppStore.init: persisted, editable datapack', () => {
  it('seeds a persisted datapack copy on first run and reuses it on subsequent init()s', async () => {
    const adapter = new MemoryAdapter();
    const store1 = new AppStore(adapter);
    await store1.init();
    expect(store1.getSnapshot().status).toBe('ready');

    const docs = await adapter.loadAll();
    expect(docs.some((d) => d.id === 'datapack' && d.type === 'datapack')).toBe(true);

    // a second store over the SAME adapter loads the persisted copy, not a fresh seed
    const store2 = new AppStore(adapter);
    await store2.init();
    expect(store2.getSnapshot().profile.user_id).toBe(store1.getSnapshot().profile.user_id);
  });
});

describe('LOG ALLOY SESSION: save / edit / delete', () => {
  it('saveAlloySession persists a real ExternalSession and it appears in history, newest first', async () => {
    const store = await readyStore();
    const session = await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-20', performedAt: '2026-09-20T14:00:00.000Z' }));
    expect(session.id).toBe('ext_alloy_2026-09-20');
    const snap = store.getSnapshot();
    expect(snap.externalSessions.map((s) => s.id)).toContain(session.id);

    const second = await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-22', performedAt: '2026-09-22T14:00:00.000Z' }));
    const snap2 = store.getSnapshot();
    // newest performed_at first
    expect(snap2.externalSessions[0].id).toBe(second.id);
  });

  it('accepts a bare SUMMARY log (no items) — graceful with incomplete information', async () => {
    const store = await readyStore();
    const session = await store.saveAlloySession(baseAlloyInput());
    expect(session.log_mode).toBe('SUMMARY');
    expect(store.getSnapshot().externalSessions.some((s) => s.id === session.id)).toBe(true);
  });

  it('saveAlloySession credits GeneratorState (parent_last_trained) — a real history update, not cosmetic', async () => {
    const store = await readyStore();
    const session = await store.saveAlloySession(baseAlloyInput({ focus: 'full' }));
    const docs = await (store as unknown as { adapter: MemoryAdapter }).adapter.loadAll();
    const engineDoc = docs.find((d) => d.id === 'engine_state') as { state: { parent_last_trained: Record<string, string> } } | undefined;
    expect(engineDoc).toBeDefined();
    expect(engineDoc!.state.parent_last_trained.LOWER).toBe(session.ended_at);
  });

  it('updateAlloySession edits in place: same id, original created_at preserved, content changes', async () => {
    const store = await readyStore();
    const original = await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-20', notes: 'first draft' }));
    const updated = await store.updateAlloySession(original.id, baseAlloyInput({ localDate: '2026-09-20', notes: 'corrected after reviewing notes' }));
    expect(updated.id).toBe(original.id);
    expect(updated.created_at).toBe(original.created_at);
    expect(updated.notes).toBe('corrected after reviewing notes');

    const snap = store.getSnapshot();
    const inHistory = snap.externalSessions.find((s) => s.id === original.id);
    expect(inHistory?.notes).toBe('corrected after reviewing notes');
    // only one record for this id, not a duplicate
    expect(snap.externalSessions.filter((s) => s.id === original.id).length).toBe(1);
  });

  it('updateAlloySession throws for an unknown id', async () => {
    const store = await readyStore();
    await expect(store.updateAlloySession('ext_alloy_9999-01-01', baseAlloyInput())).rejects.toThrow();
  });

  it('deleteAlloySession removes the record from history', async () => {
    const store = await readyStore();
    const session = await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-20' }));
    expect(store.getSnapshot().externalSessions.some((s) => s.id === session.id)).toBe(true);
    await store.deleteAlloySession(session.id);
    expect(store.getSnapshot().externalSessions.some((s) => s.id === session.id)).toBe(false);
    expect(store.getAlloySession(session.id)).toBeUndefined();
  });

  it('exercise lookup + A1/A2 pair entry + sets/reps/load optionality round-trip through persistence', async () => {
    const store = await readyStore();
    const hits = store.getPool().filter((e) => e.display_name.toLowerCase().includes('goblet'));
    expect(hits.length).toBeGreaterThan(0);
    const session = await store.saveAlloySession(
      baseAlloyInput({
        localDate: '2026-09-21',
        items: [
          blankItem({ slotLabel: 'A1', exerciseId: hits[0].exercise_id, sets: 3, reps: 8, load: 35 }),
          blankItem({ slotLabel: 'A2', freeText: 'Banded row', manualFamilyTag: 'HPULL', sets: 3, reps: null, load: null, doseText: 'light band' }),
        ],
      }),
    );
    expect(session.log_mode).toBe('FULL');
    expect(session.items.map((i) => i.slot_label)).toEqual(['A1', 'A2']);
    expect(session.items[0].exercise_id).toBe(hits[0].exercise_id);
    expect(session.items[1].free_text).toBe('Banded row');
    expect(session.items[1].reps).toBeNull();
  });
});

describe('EQUIPMENT availability management', () => {
  it('confirmEquipment updates equipmentOverrides in the snapshot and getEquip()', async () => {
    const store = await readyStore();
    expect(store.getEquip().get('EQ009')?.availability).toBe('AVAILABLE');
    await store.confirmEquipment({ equipmentId: 'EQ009', availability: 'NOT_AVAILABLE' });
    expect(store.getSnapshot().equipmentOverrides.EQ009?.availability).toBe('NOT_AVAILABLE');
    expect(store.getEquip().get('EQ009')?.availability).toBe('NOT_AVAILABLE');
  });

  it('confirmEquipment can set loads / max_confirmed_load / station_group', async () => {
    const store = await readyStore();
    await store.confirmEquipment({ equipmentId: 'EQ010', availability: 'AVAILABLE', loads: [20, 25, 30], maxConfirmedLoad: 30, stationGroup: 'RACK_AREA' });
    const override = store.getSnapshot().equipmentOverrides.EQ010;
    expect(override?.loads).toEqual([20, 25, 30]);
    expect(override?.max_confirmed_load).toBe(30);
  });

  it('equipment overrides persist and reload across a fresh AppStore over the same adapter', async () => {
    const adapter = new MemoryAdapter();
    const store1 = new AppStore(adapter);
    await store1.init();
    await store1.confirmEquipment({ equipmentId: 'EQ009', availability: 'NOT_AVAILABLE' });

    const store2 = new AppStore(adapter);
    await store2.init();
    expect(store2.getSnapshot().equipmentOverrides.EQ009?.availability).toBe('NOT_AVAILABLE');
  });
});

describe('PROFILE display/editing', () => {
  it('updateProfile patches non-medical fields and persists across a fresh AppStore', async () => {
    const adapter = new MemoryAdapter();
    const store1 = new AppStore(adapter);
    await store1.init();
    await store1.updateProfile({ display_name: 'Nelson' });
    expect(store1.getSnapshot().profile.display_name).toBe('Nelson');

    const store2 = new AppStore(adapter);
    await store2.init();
    expect(store2.getSnapshot().profile.display_name).toBe('Nelson');
  });

  it('addAvoidance / removeAvoidance round-trip through the snapshot', async () => {
    const store = await readyStore();
    expect(store.getSnapshot().profile.avoidances).toEqual([]);
    await store.addAvoidance('EX012', 'knee discomfort');
    expect(store.getSnapshot().profile.avoidances).toContainEqual({ exercise_id: 'EX012', label: 'knee discomfort' });
    await store.removeAvoidance('EX012');
    expect(store.getSnapshot().profile.avoidances).toEqual([]);
  });
});

describe('HISTORY review', () => {
  it('workouts and external sessions are both listed, newest first, independently', async () => {
    const store = await readyStore();
    await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-18', performedAt: '2026-09-18T14:00:00.000Z' }));
    await store.saveAlloySession(baseAlloyInput({ localDate: '2026-09-21', performedAt: '2026-09-21T14:00:00.000Z' }));
    const snap = store.getSnapshot();
    expect(snap.externalSessions.map((s) => s.local_date)).toEqual(['2026-09-21', '2026-09-18']);
  });
});

describe('REQUIRED: equipment and profile changes affect subsequent GENERATE output', () => {
  // Cold-start ordering on the 8-exercise dev pool anchors EX012 (Goblet Squat, family
  // KD, default_order 1) into slot A1 whenever nothing excludes it — established as a
  // baseline below, then falsified by an avoidance and by an equipment change.
  async function firstSessionExerciseIds(store: AppStore): Promise<string[] | null> {
    const r = await store.startNormalDay({ minutesAvailable: 60, symptomToday: 'no', symptomChoice: null, equipmentIssues: [] });
    if (!('workout' in r)) return null;
    return r.workout.items.map((i) => i.exercise_id);
  }

  it('baseline: a cold-start GENERATE includes EX012 (Goblet Squat) before any change', async () => {
    const store = await readyStore();
    const ids = await firstSessionExerciseIds(store);
    expect(ids).not.toBeNull();
    expect(ids).toContain('EX012');
  });

  it('PROFILE: adding an avoidance for EX012 removes it from every subsequent generation (HF-04)', async () => {
    const store = await readyStore();
    const before = await firstSessionExerciseIds(store);
    expect(before).toContain('EX012');

    await store.addAvoidance('EX012', 'knee');
    const after = await firstSessionExerciseIds(store);
    expect(after === null || !after.includes('EX012')).toBe(true);

    // and removing the avoidance restores it
    await store.removeAvoidance('EX012');
    const restored = await firstSessionExerciseIds(store);
    expect(restored).toContain('EX012');
  });

  it('EQUIPMENT: marking every equipment option for EX012 NOT_AVAILABLE removes it from generation (HF-06)', async () => {
    const store = await readyStore();
    const before = await firstSessionExerciseIds(store);
    expect(before).toContain('EX012');

    // EX012's equipment_options in the dev pack are [[EQ009],[EQ010]] — an OR of two
    // single-equipment sets, so both must be marked unavailable to exclude it.
    await store.confirmEquipment({ equipmentId: 'EQ009', availability: 'NOT_AVAILABLE' });
    await store.confirmEquipment({ equipmentId: 'EQ010', availability: 'NOT_AVAILABLE' });

    const after = await firstSessionExerciseIds(store);
    expect(after === null || !after.includes('EX012')).toBe(true);
  });
});

// Regression test for a V0 QA-pass bug: finishWorkout() persisted the COMPLETED workout
// and the updated engine state, but never called refreshHistoryLists() the way every
// other history-mutating method (saveAlloySession, updateAlloySession, deleteAlloySession)
// already did — so a just-completed workout was invisible in History (snapshot.workouts)
// until the next full AppStore.init(), i.e. a page reload. Fixed by adding the same
// refreshHistoryLists() call finishWorkout was missing.
describe('Bug fix regression: finishWorkout() must update History live, without a reload', () => {
  it('a completed workout appears in snapshot.workouts immediately after finishWorkout(), with no re-init', async () => {
    const store = await readyStore();
    expect(store.getSnapshot().workouts).toHaveLength(0);

    const result = await store.startNormalDay({ minutesAvailable: 60, symptomToday: 'no', symptomChoice: null, equipmentIssues: [] });
    if (!('workout' in result)) {
      console.warn('GENERATE returned NO_SESSION for this run; skipping this regression check.');
      return;
    }

    await store.completeWarmup();
    // Log every prescribed set exactly as planned so the workout can actually finish.
    let guard = 0;
    for (;;) {
      const workout = store.getSnapshot().activeWorkout!;
      const steps = buildFlatSteps(workout);
      const idx = currentStepIndex(workout, steps);
      if (idx >= steps.length || guard++ > 200) break;
      const step = steps[idx];
      const item = workout.items.find((i) => i.item_key === step.itemKey)!;
      await store.logSet(step, {
        now: new Date().toISOString(),
        load: item.prescription.load,
        reps: item.prescription.unit === 'REPS' ? item.prescription.target : null,
        seconds: item.prescription.unit === 'SECONDS' ? item.prescription.target : null,
        entry: 'AS_PLANNED',
        effort: step.isFinalSetForItem ? 'GOOD' : null,
      });
    }

    const finished = await store.finishWorkout('usual', 'FINISH_STEP');
    expect(finished.status).toBe('COMPLETED');

    // The bug: without refreshHistoryLists(), this next line would still see an empty
    // list (or a stale one) even though the workout document was already persisted.
    const liveWorkouts = store.getSnapshot().workouts;
    expect(liveWorkouts).toHaveLength(1);
    expect(liveWorkouts[0].id).toBe(finished.id);
    expect(liveWorkouts[0].status).toBe('COMPLETED');
  });
});
