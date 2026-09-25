import { useEffect, useState } from 'react';

/** D-086: rest starts automatically after a set is logged and ends when the next set is
 * logged — there's no Skip button. It counts down from the prescribed rest, then counts
 * up (overrun) once it reaches zero, for as long as the user takes. The single action
 * here ("Log next set") is what ends rest, exactly like the spec's own "ends when the
 * next set is logged" — it isn't a skip, it's advancing into the next set's card. */
export function RestTimer(props: { restSeconds: number; nextLabel: string; onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = props.restSeconds - elapsed;
  const overrun = remaining < 0;
  const display = overrun ? elapsed - props.restSeconds : remaining;
  const mm = Math.floor(display / 60);
  const ss = display % 60;
  const formatted = `${mm}:${String(ss).padStart(2, '0')}`;

  return (
    <div className="rest-overlay">
      <p className="muted" style={{ marginBottom: 4 }}>
        Rest
      </p>
      <div className={`rest-timer-number ${overrun ? 'overrun' : ''}`}>{overrun ? `+${formatted}` : formatted}</div>
      <p className="up-next">Up next: {props.nextLabel}</p>
      <div className="primary-bar" style={{ position: 'static', width: '100%', maxWidth: 320, marginTop: 24 }}>
        <button className="btn-primary" onClick={props.onDone}>
          Log next set
        </button>
      </div>
    </div>
  );
}
