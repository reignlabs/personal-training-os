import { useState } from 'react';
import type { AppStore, AppSnapshot } from '../app/store';
import type { Workout } from '../contracts';
import { buildFlatSteps, currentStepIndex } from '../app/sessionLogic';
import { Overview } from './Overview';
import { Warmup } from './Warmup';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './components/RestTimer';
import { Finish } from './Finish';
import { Sheet } from './components/Primitives';

const DEFAULT_REST_SECONDS = 60;

/** Whether this workout already has some real progress on it (warm-up done, or any
 * working set logged on any item) — used only to recover from a page reload mid-session
 * (Bug fix, V0 QA pass: see below). */
function hasStarted(workout: Workout): boolean {
  return workout.warmup_completed || workout.items.some((it) => it.sets.length > 0);
}

/** Focus mode: the real workout loop (PRODUCT_UX_SPEC_V0.md §8.3's step machine).
 * WARMUP -> SET(item, n) [-> SET(partner, n) if paired] -> REST -> ... -> FINISH_STEP. */
export function Focus(props: { store: AppStore; snapshot: AppSnapshot; onFinished: (w: Workout) => void }) {
  const workout0 = props.snapshot.activeWorkout;
  // Bug fix (V0 QA pass): `began` used to always start false, so reloading mid-workout
  // (§11.3: "App reloaded or crashed: Returns to the focused set; nothing lost") instead
  // dropped the person back to the plan Overview and an extra "Begin workout" tap, every
  // single time — nothing was actually lost, but the resume behavior contradicted the
  // spec. Seeding it from persisted progress makes a reload after real progress resume
  // directly; a reload before ever tapping "Begin workout" still correctly shows Overview
  // first (there is no persisted signal to tell those two apart, and showing Overview
  // once before any progress exists is the correct, intended screen).
  const [began, setBegan] = useState(() => (workout0 ? hasStarted(workout0) : false));
  const [resting, setResting] = useState(false);
  // Bug fix (V0 QA pass): there was previously no way to leave Focus mode short of
  // logging literally every prescribed set of every exercise — no Skip, no End session,
  // nothing in the "⋯" sense PRODUCT_UX_SPEC_V0.md §5.1/§5.10 describes. A person who
  // runs out of time, gets called away, or simply doesn't want to continue had no way out
  // except abandoning the tab, leaving the workout IN_PROGRESS forever (it's the only
  // thing App.tsx checks to decide whether to show Focus mode at all). This reuses the
  // existing Finish step and the already-defined but previously unreachable
  // finishMethod: 'END_SESSION'.
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [endingEarly, setEndingEarly] = useState(false);

  const workout = props.snapshot.activeWorkout;
  const generation = props.snapshot.activeGeneration;
  if (!workout || !generation) return null;

  if (endingEarly) return <Finish store={props.store} onFinished={props.onFinished} finishMethod="END_SESSION" />;

  // Fixed-position (independent of each screen's own flex/sticky layout) so it's always
  // reachable without disturbing the primary set-logging controls in the bottom 60%.
  const endWorkoutControl = (
    <button
      type="button"
      className="btn-text"
      style={{ position: 'fixed', top: 10, right: 12, zIndex: 25, color: 'var(--text-dim)', fontSize: 13, padding: '6px 10px' }}
      onClick={() => setConfirmingEnd(true)}
    >
      End workout
    </button>
  );
  const confirmSheet = confirmingEnd && (
    <Sheet title="End this workout now?" onClose={() => setConfirmingEnd(false)}>
      <p className="muted">Sets you&rsquo;ve already logged are saved either way. Anything left unlogged is simply skipped.</p>
      <button className="btn-secondary btn-danger" style={{ width: '100%', marginBottom: 8 }} onClick={() => setEndingEarly(true)}>
        End workout
      </button>
      <button className="btn-text" style={{ width: '100%' }} onClick={() => setConfirmingEnd(false)}>
        Keep going
      </button>
    </Sheet>
  );

  if (!began) return <Overview workout={workout} generation={generation} onBegin={() => setBegan(true)} />;
  if (!workout.warmup_completed) {
    return (
      <>
        <Warmup onDone={() => props.store.completeWarmup()} />
        {endWorkoutControl}
        {confirmSheet}
      </>
    );
  }

  const steps = buildFlatSteps(workout);
  const idx = currentStepIndex(workout, steps);

  if (idx >= steps.length) return <Finish store={props.store} onFinished={props.onFinished} />;

  const step = steps[idx];

  if (resting) {
    const item = workout.items.find((i) => i.item_key === step.itemKey)!;
    const restSeconds = item.prescription.rest_after_pair_s ?? DEFAULT_REST_SECONDS;
    return (
      <>
        <RestTimer
          restSeconds={restSeconds}
          nextLabel={item.exercise_name_snapshot}
          onDone={() => setResting(false)}
        />
        {endWorkoutControl}
        {confirmSheet}
      </>
    );
  }

  function handleLogged() {
    // Re-derive from the store's own latest snapshot rather than the (possibly stale)
    // render's `workout` prop, so a same-tick "was that the very last step?" check is
    // always correct — no trailing rest screen before Finish.
    const fresh = props.store.getSnapshot().activeWorkout;
    if (!fresh) return;
    const freshSteps = buildFlatSteps(fresh);
    const freshIdx = currentStepIndex(fresh, freshSteps);
    if (freshIdx < freshSteps.length) setResting(true);
  }

  return (
    <>
      <ExerciseCard store={props.store} workout={workout} generation={generation} step={step} onLogged={handleLogged} />
      {endWorkoutControl}
      {confirmSheet}
    </>
  );
}
