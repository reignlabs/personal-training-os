import type { Workout } from '../contracts';
import type { StoredGeneration } from '../app/sessionLogic';
import { PrimaryBar } from './components/Primitives';

/** WORKOUT OVERVIEW: the generated plan, block by block, before starting. */
export function Overview(props: { workout: Workout; generation: StoredGeneration; onBegin: () => void }) {
  const { workout, generation } = props;
  const session = generation.result.result === 'SESSION' ? generation.result : null;

  return (
    <div className="screen">
      <h1>Today&rsquo;s session</h1>
      {session && (
        <p className="muted">
          ~{Math.round(session.durationEstimateMin)} min &middot; {session.tier} &middot; {session.posture === 'LIGHT' ? 'Light day' : 'Normal'}
        </p>
      )}
      {session?.underfillSentence && <p className="muted">{session.underfillSentence}</p>}

      {workout.blocks.map((block) => (
        <div className="block-group" key={block.block_id}>
          <h3>Block {block.block_id}</h3>
          <div className="card">
            {block.slots.map((slot) => {
              const item = workout.items.find((i) => i.slot === slot && i.status !== 'SWAPPED_OUT');
              if (!item) return null;
              return (
                <div className="overview-item" key={slot}>
                  <div>
                    <div className="name">{item.exercise_name_snapshot}</div>
                    <div className="dose">{item.role}</div>
                  </div>
                  <div className="dose">
                    {item.prescription.sets} &times; {item.prescription.target} {item.prescription.unit === 'SECONDS' ? 's' : ''}
                    {item.prescription.load !== null ? ` @ ${item.prescription.load} lb` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <PrimaryBar label="Begin workout" onClick={props.onBegin} />
    </div>
  );
}
