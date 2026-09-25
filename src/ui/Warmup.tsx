import { PrimaryBar } from './components/Primitives';

/** WARM-UP: engine §C.6 PREP items (general warm-up + mobility slots) aren't built yet
 * (generate.ts's own SCOPE NOTE) — this is a generic, honestly-labeled prompt rather than
 * a fabricated PREP list, consistent with the project's evidence-discipline rule against
 * silently presenting a SYSTEM_DESIGN placeholder as something the engine actually decided. */
export function Warmup(props: { onDone: () => void }) {
  return (
    <div className="screen">
      <h1>Warm up</h1>
      <p className="muted">Get your body moving before block A &mdash; a few minutes of general warm-up and light mobility for the areas you&rsquo;ll train today.</p>
      <div className="card">
        <p>Suggested: light cardio or marching in place, arm circles, hip circles, a few bodyweight squats.</p>
      </div>
      <PrimaryBar label="I'm warmed up" onClick={props.onDone} />
    </div>
  );
}
