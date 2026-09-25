import { useState } from 'react';
import type { EffectiveEquipment } from '../../app/sessionLogic';

/** D-087: weight entry via chips with carry-forward, no keyboard except "Other". The
 * prescribed load (already carried forward by the engine's own progression logic) is the
 * default selection; nearby known loads (from the equipment's confirmed increments, or a
 * synthetic range around the prescription when increments aren't known) fill the rest. */
export function LoadPicker(props: {
  prescribedLoad: number | null;
  equip: EffectiveEquipment | undefined;
  nominalStep: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  if (props.prescribedLoad === null && !props.equip?.loads?.length) {
    // bodyweight / no load concept
    return <p className="muted">Bodyweight — no load to log.</p>;
  }

  const known = props.equip?.loads ?? null;
  const center = props.prescribedLoad ?? known?.[0] ?? 0;
  let choices: number[];
  if (known && known.length > 0) {
    choices = [...known].sort((a, b) => Math.abs(a - center) - Math.abs(b - center)).slice(0, 4).sort((a, b) => a - b);
  } else {
    const step = props.nominalStep || 5;
    choices = [center - step, center, center + step, center + 2 * step].filter((v) => v >= 0);
  }
  if (props.prescribedLoad !== null && !choices.includes(props.prescribedLoad)) {
    choices = [...choices, props.prescribedLoad].sort((a, b) => a - b);
  }
  const isOtherSelected = props.value !== null && !choices.includes(props.value);

  return (
    <div>
      <div className="chip-row">
        {choices.map((v) => (
          <button
            key={v}
            type="button"
            className={`chip ${props.value === v ? 'chip--selected' : ''}`}
            onClick={() => {
              setCustomOpen(false);
              props.onChange(v);
            }}
          >
            {v} lb
          </button>
        ))}
        <button
          type="button"
          className={`chip ${isOtherSelected || customOpen ? 'chip--selected' : ''}`}
          onClick={() => setCustomOpen(true)}
        >
          Other
        </button>
      </div>
      {customOpen && (
        <div className="field">
          <input
            type="number"
            inputMode="decimal"
            step={0.5}
            placeholder="Weight (lb)"
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && !Number.isNaN(n)) props.onChange(n);
            }}
            style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>
      )}
    </div>
  );
}
