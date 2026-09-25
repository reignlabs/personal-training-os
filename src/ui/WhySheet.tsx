import { Sheet } from './components/Primitives';
import type { WhyText } from '../app/sessionLogic';

/** WHY THIS EXERCISE: the engine's own §J.3 three-line explanation (movement, exercise,
 * dose) — real generated text, not placeholder copy. */
export function WhySheet(props: { why: WhyText; onClose: () => void }) {
  return (
    <Sheet title="Why this exercise" onClose={props.onClose}>
      <div className="card">
        <h3>Movement</h3>
        <p>{props.why.whyMovement}</p>
        <h3>Exercise</h3>
        <p>{props.why.whyExercise}</p>
        <h3>Today&rsquo;s dose</h3>
        <p>{props.why.whyDose}</p>
      </div>
    </Sheet>
  );
}
