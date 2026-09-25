import type { Effort } from '../../contracts';

export function PrimaryBar(props: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="primary-bar">
      <button className="btn-primary" onClick={props.onClick} disabled={props.disabled}>
        {props.label}
      </button>
    </div>
  );
}

export function ChipGroup<T extends string>(props: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; multi?: false }): JSX.Element;
export function ChipGroup<T extends string>(props: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi: true }): JSX.Element;
export function ChipGroup<T extends string>(props: any) {
  const isSelected = (v: T) => (props.multi ? (props.value as T[]).includes(v) : props.value === v);
  const toggle = (v: T) => {
    if (props.multi) {
      const cur: T[] = props.value;
      props.onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    } else {
      props.onChange(v);
    }
  };
  return (
    <div className="chip-row">
      {props.options.map((opt: { value: T; label: string }) => (
        <button key={opt.value} type="button" className={`chip ${isSelected(opt.value) ? 'chip--selected' : ''}`} onClick={() => toggle(opt.value)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const EFFORT_OPTIONS: { value: Effort; label: string }[] = [
  { value: 'TOO_EASY', label: 'Too easy' },
  { value: 'GOOD', label: 'Good' },
  { value: 'HARD', label: 'Hard' },
  { value: 'TOO_HARD', label: 'Too hard' },
];

/** D-067: the final working set is logged via one of 4 effort buttons — no numeric RPE. */
export function EffortButtons(props: { value: Effort | null; onChange: (v: Effort) => void }) {
  return (
    <div className="effort-grid">
      {EFFORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`effort-btn effort-btn--${opt.value.toLowerCase()} ${props.value === opt.value ? 'effort-btn--selected' : ''}`}
          onClick={() => props.onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{props.title}</h2>
        {props.children}
        <button className="btn-text" onClick={props.onClose} style={{ width: '100%', marginTop: 8 }}>
          Close
        </button>
      </div>
    </div>
  );
}
