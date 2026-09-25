import { useState } from 'react';
import type { AppStore } from '../app/store';
import type { StoredGeneration, FlatStep } from '../app/sessionLogic';
import { explainWorkoutItem } from '../app/sessionLogic';
import type { Workout, Effort } from '../contracts';
import { PrimaryBar, EffortButtons } from './components/Primitives';
import { LoadPicker } from './components/LoadPicker';
import { RepsStepper } from './components/RepsStepper';
import { WhySheet } from './WhySheet';
import { SwapSheet } from './SwapSheet';
import { DiscomfortSheet } from './DiscomfortSheet';

type Sheet = 'why' | 'swap' | 'discomfort' | null;

/** The exercise card: set completion, load/reps logging, effort (final set), and the
 * entry points to WHY THIS EXERCISE / swap / discomfort. One step = one (item, set, side). */
export function ExerciseCard(props: { store: AppStore; workout: Workout; generation: StoredGeneration; step: FlatStep; onLogged: () => void }) {
  const { step, workout } = props;
  const item = workout.items.find((i) => i.item_key === step.itemKey)!;
  const [load, setLoad] = useState<number | null>(item.prescription.load);
  const [amount, setAmount] = useState<number>(item.prescription.target);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [logging, setLogging] = useState(false);

  const sideLabel = step.side === 'BILATERAL' ? '' : step.side === 'LEFT' ? ' — Left' : ' — Right';

  // Bug fix (V0 QA pass, D-085): "the final working set is logged by tapping its effort"
  // is a one-tap action — tapping Too easy/Good/Hard/Too hard both logs the set (with
  // whatever reps/weight are currently shown) and records the effort, in the same tap.
  // The previous version only stored the tapped effort in local state and still required
  // a separate Done tap afterward, silently doubling the per-set interaction cost the
  // whole redesign exists to cut. `effortValue` is passed as an explicit argument (never
  // read back from state) so there's no stale-closure risk between the tap and the call.
  async function logIt(effortValue: Effort | null) {
    if (logging) return;
    setLogging(true);
    try {
      await props.store.logSet(step, {
        now: new Date().toISOString(),
        load: item.prescription.load === null ? null : load,
        reps: item.prescription.unit === 'REPS' ? amount : null,
        seconds: item.prescription.unit === 'SECONDS' ? amount : null,
        entry: (item.prescription.load !== null && load !== item.prescription.load) || amount !== item.prescription.target ? 'ADJUSTED' : 'AS_PLANNED',
        effort: effortValue,
      });
      props.onLogged();
    } finally {
      setLogging(false);
    }
  }

  const equip = props.store.getEquip();
  const equipForImplement = item.implement.length > 0 ? equip.get(item.implement[0]) : undefined;

  return (
    <div className="screen">
      <div className="step-header">
        <span className="slot-label">Block {item.block_id}</span>
        <span className="slot-label">
          Set {step.setNo} of {item.prescription.sets}
          {sideLabel}
        </span>
      </div>
      <div className="exercise-name">{item.exercise_name_snapshot}</div>
      <div className="set-progress">{item.role}</div>

      <div className="prescription-row">
        <div className="metric">
          <div className="value">{item.prescription.target}</div>
          <div className="label">{item.prescription.unit === 'SECONDS' ? 'seconds' : 'reps target'}</div>
        </div>
        <div className="metric">
          <div className="value">{item.prescription.load === null ? '—' : `${item.prescription.load} lb`}</div>
          <div className="label">prescribed</div>
        </div>
      </div>

      <RepsStepper value={amount} onChange={setAmount} unit={item.prescription.unit} />
      <LoadPicker prescribedLoad={item.prescription.load} equip={equipForImplement} nominalStep={props.store.getConfig().NOMINAL_LOAD_STEP} value={load} onChange={setLoad} />

      {step.isFinalSetForItem && (
        <div className="field">
          <label>How did that final set feel? (logs this set)</label>
          <EffortButtons value={null} onChange={(e) => logIt(e)} />
        </div>
      )}

      <div className="card-actions">
        <button className="btn-text" onClick={() => setSheet('why')}>
          Why this exercise
        </button>
        <button className="btn-text" onClick={() => setSheet('swap')}>
          Swap
        </button>
        <button className="btn-text btn-danger" onClick={() => setSheet('discomfort')}>
          Something wrong?
        </button>
      </div>

      {!step.isFinalSetForItem && <PrimaryBar label={logging ? 'Logging…' : 'Done'} onClick={() => logIt(null)} disabled={logging} />}

      {sheet === 'why' && <WhySheet why={explainWorkoutItem(item, props.generation)} onClose={() => setSheet(null)} />}
      {sheet === 'swap' && <SwapSheet store={props.store} itemKey={item.item_key} options={props.store.getSwapOptions(item.slot)} onClose={() => setSheet(null)} />}
      {sheet === 'discomfort' && <DiscomfortSheet store={props.store} itemKey={item.item_key} side={step.side === 'BILATERAL' ? null : step.side} onClose={() => setSheet(null)} />}
    </div>
  );
}
