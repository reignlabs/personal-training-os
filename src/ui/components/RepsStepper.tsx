/** Reps/seconds entry via a tap stepper (no keyboard — §2.1's "no keyboard except Other
 * weight entry" extends naturally to rep/second counts too). Defaults to the target. */
export function RepsStepper(props: { value: number; onChange: (v: number) => void; unit: 'REPS' | 'SECONDS' }) {
  const unitLabel = props.unit === 'SECONDS' ? 's' : 'reps';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 }}>
      <button
        type="button"
        className="chip"
        style={{ fontSize: 22, minWidth: 52, minHeight: 52 }}
        onClick={() => props.onChange(Math.max(0, props.value - 1))}
        aria-label="Decrease"
      >
        &minus;
      </button>
      <div style={{ fontSize: 32, fontWeight: 800, minWidth: 90, textAlign: 'center' }}>
        {props.value} <span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 600 }}>{unitLabel}</span>
      </div>
      <button type="button" className="chip" style={{ fontSize: 22, minWidth: 52, minHeight: 52 }} onClick={() => props.onChange(props.value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}
