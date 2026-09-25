import type { AppStore } from '../app/store';
import type { FlagCode, Side } from '../contracts';
import { Sheet } from './components/Primitives';

const OPTIONS: { code: FlagCode; label: string; hint: string }[] = [
  { code: 'TECHNIQUE_DIFFICULTY', label: 'Technique difficulty', hint: 'Next time, this drops one load step.' },
  { code: 'UNCOMFORTABLE', label: 'Uncomfortable', hint: 'Flagged for review.' },
  { code: 'EQUIPMENT_ISSUE', label: 'Equipment issue', hint: "Noted — won't count against progress." },
  { code: 'STOPPED_SYMPTOM', label: 'Stop — symptom', hint: 'Ends this exercise now.' },
];

/** D-089: the symptom stop is 2 taps total (open this sheet, tap "Stop — symptom") and
 * applies immediately — no confirmation dialog. */
export function DiscomfortSheet(props: { store: AppStore; itemKey: string; side: Side | null; onClose: () => void }) {
  async function apply(code: FlagCode) {
    await props.store.addFlag({ itemKey: props.itemKey, side: props.side, code });
    props.onClose();
  }

  return (
    <Sheet title="Something wrong?" onClose={props.onClose}>
      {OPTIONS.map((opt) => (
        <button key={opt.code} className={`sheet-option ${opt.code === 'STOPPED_SYMPTOM' ? 'btn-danger' : ''}`} onClick={() => apply(opt.code)}>
          <div className="name">{opt.label}</div>
          <div className="why">{opt.hint}</div>
        </button>
      ))}
    </Sheet>
  );
}
