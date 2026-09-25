import { useState } from 'react';
import type { AppStore } from '../app/store';
import type { SwapOptions } from '../app/sessionLogic';
import { Sheet } from './components/Primitives';

const REASON_CHIPS = ['Equipment busy', "Don't like it", 'Discomfort', 'Too easy', 'Too hard'];

/** D-088: swap shows the engine's own options immediately (computed synchronously from
 * already-loaded state, no spinner), one tap applies it, and the reason is an optional
 * post-swap chip — never a blocking dialog. */
export function SwapSheet(props: { store: AppStore; itemKey: string; options: SwapOptions; onClose: () => void }) {
  const [appliedTo, setAppliedTo] = useState<string | null>(null);
  const [savingReason, setSavingReason] = useState(false);

  async function pick(exerciseId: string) {
    await props.store.applySwap(props.itemKey, exerciseId, 'USER_SWAP');
    setAppliedTo(exerciseId);
  }

  async function pickReason(reason: string) {
    setSavingReason(true);
    try {
      const workout = props.store.getSnapshot().activeWorkout;
      const newItem = workout?.items.find((i) => i.swapped_from_item_key === props.itemKey);
      if (newItem) await props.store.setItemNote(newItem.item_key, reason);
    } finally {
      setSavingReason(false);
      props.onClose();
    }
  }

  if (appliedTo) {
    return (
      <Sheet title="Swapped" onClose={props.onClose}>
        <p className="muted">Optional: why did you swap?</p>
        <div className="chip-row">
          {REASON_CHIPS.map((r) => (
            <button key={r} className="chip" disabled={savingReason} onClick={() => pickReason(r)}>
              {r}
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Swap exercise" onClose={props.onClose}>
      {props.options.options.length === 0 && <p className="muted">No eligible alternatives today.</p>}
      {props.options.options.map((opt) => (
        <button key={opt.exercise_id} className="sheet-option" onClick={() => pick(opt.exercise_id)}>
          <div className="name">{opt.display_name}</div>
        </button>
      ))}
      {props.options.held.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Not available today</h3>
          {props.options.held.map((opt) => (
            <div key={opt.exercise_id} className="sheet-option" style={{ opacity: 0.5, cursor: 'default' }}>
              <div className="name">{opt.display_name}</div>
              <div className="why">{opt.outcome}</div>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}
