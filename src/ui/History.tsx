import { useState } from 'react';
import type { AppStore, AppSnapshot } from '../app/store';
import type { ExternalSession, Workout } from '../contracts';
import { AlloySessionForm } from './AlloySessionForm';

/** HISTORY: review of past apartment workouts and externally-logged Alloy/Other
 * sessions, and the entry point for editing or deleting an Alloy log. */
export function History(props: { store: AppStore; snapshot: AppSnapshot }) {
  const { store, snapshot } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const editing = editingId ? snapshot.externalSessions.find((s) => s.id === editingId) : undefined;

  return (
    <>
      {editingId && editing ? (
        <AlloySessionForm
          store={store}
          existing={editing}
          onSaved={() => setEditingId(null)}
          onCancel={() => setEditingId(null)}
          onDelete={() => setConfirmingDeleteId(editingId)}
        />
      ) : (
        <div className="screen screen--no-primary">
          <h1>History</h1>

          <h3>Apartment sessions</h3>
          {snapshot.workouts.length === 0 && <p className="muted">Nothing completed yet.</p>}
          {snapshot.workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}

          <h3>Alloy / other sessions</h3>
          {snapshot.externalSessions.length === 0 && <p className="muted">No externally-logged sessions yet.</p>}
          {snapshot.externalSessions.map((s) => (
            <ExternalSessionRow key={s.id} session={s} onEdit={() => setEditingId(s.id)} />
          ))}
        </div>
      )}

      {confirmingDeleteId && (
        <div className="sheet-backdrop" onClick={() => setConfirmingDeleteId(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Delete this session?</h2>
            <p className="muted">
              This removes the record. It won&rsquo;t retract any staleness credit it already applied to your training history &mdash; see the note on the edit
              screen for why.
            </p>
            <button
              className="btn-secondary btn-danger"
              onClick={async () => {
                await store.deleteAlloySession(confirmingDeleteId);
                setConfirmingDeleteId(null);
                setEditingId(null);
              }}
            >
              Delete
            </button>
            <button className="btn-text" style={{ width: '100%', marginTop: 8 }} onClick={() => setConfirmingDeleteId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WorkoutRow(props: { workout: Workout }) {
  const w = props.workout;
  const done = w.items.filter((i) => i.status === 'DONE').length;
  const total = w.items.filter((i) => i.status !== 'SWAPPED_OUT').length;
  return (
    <div className="card">
      <div className="list-row">
        <div>
          <div className="name">{w.plan_local_date}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {w.status === 'COMPLETED' ? `${done}/${total} exercises done` : 'In progress'}
          </div>
        </div>
        <div className="dose">{w.status}</div>
      </div>
    </div>
  );
}

function ExternalSessionRow(props: { session: ExternalSession; onEdit: () => void }) {
  const s = props.session;
  return (
    <div className="card" onClick={props.onEdit} style={{ cursor: 'pointer' }}>
      <div className="list-row">
        <div>
          <div className="name">
            {s.local_date} &middot; {s.kind}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {s.log_mode === 'FULL' ? `${s.items.length} exercise(s) logged` : 'Summary only'}
            {s.focus ? ` · ${s.focus}` : ''}
          </div>
        </div>
        <span className="muted">Edit</span>
      </div>
    </div>
  );
}
