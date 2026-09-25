import { useState } from 'react';
import type { AppStore } from '../app/store';
import type { Workout } from '../contracts';
import { PrimaryBar, ChipGroup } from './components/Primitives';

/** D-090: finish is 1 tap on the capacity question. Also reused for D-090/§5.10's "End
 * session" path (Bug fix, V0 QA pass: previously nothing in the UI could reach
 * finishMethod 'END_SESSION' at all — see Focus.tsx's "End workout" control): whatever
 * sets are already logged are saved exactly the same way; only `finish_method` differs. */
export function Finish(props: { store: AppStore; onFinished: (w: Workout) => void; finishMethod?: 'FINISH_STEP' | 'END_SESSION' }) {
  const [capacity, setCapacity] = useState<'below_usual' | 'usual' | 'above_usual'>('usual');
  const [finishing, setFinishing] = useState(false);
  const endedEarly = props.finishMethod === 'END_SESSION';

  async function finish() {
    setFinishing(true);
    try {
      const workout = await props.store.finishWorkout(capacity, props.finishMethod ?? 'FINISH_STEP');
      props.onFinished(workout);
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="screen">
      <h1>{endedEarly ? 'Ending here.' : 'Nice work.'}</h1>
      {endedEarly && <p className="muted">Whatever you logged is saved. Sets you didn&rsquo;t get to are simply skipped, not counted against you.</p>}
      <p className="muted">One last question before we save this.</p>
      <div className="field">
        <label>Compared to usual, how did today feel overall?</label>
        <ChipGroup
          options={[
            { value: 'below_usual', label: 'Below usual' },
            { value: 'usual', label: 'Usual' },
            { value: 'above_usual', label: 'Above usual' },
          ]}
          value={capacity}
          onChange={setCapacity}
        />
      </div>
      <PrimaryBar label={finishing ? 'Saving…' : 'Finish workout'} onClick={finish} disabled={finishing} />
    </div>
  );
}
