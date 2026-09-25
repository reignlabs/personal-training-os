import { useState } from 'react';
import type { AppStore } from '../app/store';
import type { AlloyItemInput, AlloySessionInput, PoolExercise } from '../app/sessionLogic';
import { lookupExercise } from '../app/sessionLogic';
import type { Effort, ExternalSession, Family } from '../contracts';
import { localDateTimeToUtc, toLocalTime } from '../domain/time';
import { ChipGroup, EffortButtons } from './components/Primitives';

const FAMILIES: Family[] = ['KD', 'HD', 'HPUSH', 'VPUSH', 'HPULL', 'VPULL', 'ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY', 'GOAL_ACCESSORY', 'MOBILITY', 'CONDITIONING'];
const PROGRAMS: { value: NonNullable<AlloySessionInput['program']> | 'NONE'; label: string }[] = [
  { value: 'NONE', label: "Don't know / N/A" },
  { value: 'DailyArms', label: 'Daily Arms' },
  { value: 'DailyAbs', label: 'Daily Abs' },
  { value: 'Walking', label: 'Walking' },
  { value: 'Manual', label: 'Manual' },
];

function todayLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function blankItem(): AlloyItemInput {
  return {
    slotLabel: null,
    exerciseId: null,
    freeText: null,
    manualFamilyTag: null,
    sets: null,
    reps: null,
    load: null,
    doseText: null,
    isFinisher: false,
    coachModified: false,
    coachNote: null,
  };
}

function itemFromExisting(session: ExternalSession, itemNo: number): AlloyItemInput {
  const item = session.items.find((i) => i.item_no === itemNo)!;
  return {
    slotLabel: item.slot_label,
    exerciseId: item.exercise_id,
    freeText: item.free_text,
    manualFamilyTag: item.family_tag_source === 'USER_CHIP' ? item.family_tag : null,
    sets: item.sets,
    reps: item.reps,
    load: item.load,
    doseText: item.dose_text,
    isFinisher: item.is_finisher,
    coachModified: item.coach_modified,
    coachNote: item.coach_note,
  };
}

/** The shared LOG ALLOY SESSION form: used both for a fresh entry (LogAlloy.tsx) and
 * for editing an existing record (History.tsx). Accepts partial/incomplete input by
 * construction — every field below is optional except local date, focus, and (for a
 * FULL log) at least an exercise_id or free-text name per item; a SUMMARY log with no
 * items at all is a complete, valid save. */
export function AlloySessionForm(props: { store: AppStore; existing?: ExternalSession; onSaved: () => void; onCancel: () => void; onDelete?: () => void }) {
  const { store, existing } = props;
  const tz = store.getSnapshot().profile.default_tz;
  const pool = store.getPool();

  const [localDate, setLocalDate] = useState(existing ? existing.local_date : todayLocalDate());
  const [time, setTime] = useState(existing ? toLocalTime(existing.performed_at, tz) : '18:00');
  const [durationKnown, setDurationKnown] = useState(existing?.duration_known ?? false);
  const [durationMin, setDurationMin] = useState<string>(existing?.duration_min !== null && existing?.duration_min !== undefined ? String(existing.duration_min) : '55');
  const [focus, setFocus] = useState<'full' | 'upper' | 'lower'>(existing?.focus ?? 'full');
  const [program, setProgram] = useState<NonNullable<AlloySessionInput['program']> | 'NONE'>(existing?.program ?? 'NONE');
  const [perceivedEffort, setPerceivedEffort] = useState<Effort | null>(existing?.perceived_effort ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [coachNotes, setCoachNotes] = useState(existing?.coach_notes ?? '');
  const [items, setItems] = useState<AlloyItemInput[]>(existing ? existing.items.map((_, idx) => itemFromExisting(existing, idx + 1)) : []);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<AlloyItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function save() {
    setSaving(true);
    try {
      const performedAt = localDateTimeToUtc(localDate, time, tz);
      const input: Omit<AlloySessionInput, 'now'> = {
        localDate,
        performedAt,
        durationKnown,
        durationMin: durationKnown ? (durationMin.trim() ? Number(durationMin) : null) : null,
        focus,
        items,
        notes: notes.trim() || null,
        coachNotes: coachNotes.trim() || null,
        perceivedEffort,
        program: program === 'NONE' ? null : program,
        entryMode: 'TYPED',
      };
      if (existing) {
        await store.updateAlloySession(existing.id, input);
      } else {
        await store.saveAlloySession(input);
      }
      props.onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen screen--no-primary">
      <h1>{existing ? 'Edit Alloy session' : 'Log Alloy session'}</h1>
      <p className="muted">
        Whatever you remember is enough &mdash; a bare &ldquo;I went&rdquo; still updates your training history. Add exercises only if you remember them.
      </p>

      <div className="field">
        <label>Date</label>
        <input className="text-input" type="date" value={localDate} onChange={(e) => setLocalDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Approx. start time</label>
        <input className="text-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="field">
        <label>Duration</label>
        <ChipGroup
          options={[
            { value: 'unknown', label: "Don't know (assume 55 min)" },
            { value: 'known', label: 'I know it' },
          ]}
          value={durationKnown ? 'known' : 'unknown'}
          onChange={(v) => setDurationKnown(v === 'known')}
        />
        {durationKnown && (
          <input className="text-input" type="number" inputMode="numeric" placeholder="minutes" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        )}
      </div>
      <div className="field">
        <label>Focus</label>
        <ChipGroup
          options={[
            { value: 'full', label: 'Full body' },
            { value: 'upper', label: 'Upper' },
            { value: 'lower', label: 'Lower' },
          ]}
          value={focus}
          onChange={(v) => setFocus(v as 'full' | 'upper' | 'lower')}
        />
      </div>
      <div className="field">
        <label>Program (if known)</label>
        <ChipGroup options={PROGRAMS} value={program} onChange={(v) => setProgram(v as typeof program)} />
      </div>
      <div className="field">
        <label>Overall effort (optional)</label>
        <EffortButtons value={perceivedEffort} onChange={setPerceivedEffort} />
      </div>

      <h3>Exercises {items.length > 0 ? `(${items.length})` : '(none logged — that’s OK)'}</h3>
      {items.map((item, idx) => (
        <AlloyItemEditor key={idx} pool={pool} item={item} onChange={(patch) => updateItem(idx, patch)} onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))} />
      ))}
      <button className="btn-secondary" style={{ marginBottom: 20 }} onClick={() => setItems((prev) => [...prev, blankItem()])}>
        + Add exercise (A1, A2…)
      </button>

      <div className="field">
        <label>Notes</label>
        <textarea className="text-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How it felt, anything notable…" />
      </div>
      <div className="field">
        <label>Coach notes</label>
        <textarea className="text-input" rows={2} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} placeholder="Anything the coach said to you" />
      </div>

      {existing && (
        <p className="muted" style={{ fontSize: 13 }}>
          Editing a saved log applies any new exercise/family credit on top of what was already recorded &mdash; it can&rsquo;t retract credit the original version
          already applied. If you&rsquo;re fixing a mistake, the record itself is corrected either way.
        </p>
      )}

      <div className="card-actions" style={{ marginTop: 8 }}>
        <button className="btn-text" onClick={props.onCancel}>
          Cancel
        </button>
        {existing && props.onDelete && (
          <button className="btn-text btn-danger" onClick={props.onDelete}>
            Delete
          </button>
        )}
      </div>
      <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : existing ? 'Save changes' : 'Save session'}
      </button>
    </div>
  );
}

function AlloyItemEditor(props: { pool: PoolExercise[]; item: AlloyItemInput; onChange: (patch: Partial<AlloyItemInput>) => void; onRemove: () => void }) {
  const { item, pool } = props;
  const [query, setQuery] = useState(item.exerciseId ? pool.find((e) => e.exercise_id === item.exerciseId)?.display_name ?? '' : '');
  const [manualMode, setManualMode] = useState(!item.exerciseId && !!item.freeText);
  const matches = !manualMode && query.trim() ? lookupExercise(pool, query) : [];

  return (
    <div className="card">
      <div className="field">
        <label>Slot (optional — e.g. A1, A2 for a pair)</label>
        <input className="text-input" placeholder="A1" value={item.slotLabel ?? ''} onChange={(e) => props.onChange({ slotLabel: e.target.value || null })} />
      </div>

      {!manualMode ? (
        <div className="field">
          <label>Exercise</label>
          <input
            className="text-input"
            placeholder="Search exercise library…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              props.onChange({ exerciseId: null });
            }}
          />
          {matches.length > 0 && (
            <div className="chip-row">
              {matches.slice(0, 6).map((e) => (
                <button
                  key={e.exercise_id}
                  type="button"
                  className={`chip ${item.exerciseId === e.exercise_id ? 'chip--selected' : ''}`}
                  onClick={() => {
                    setQuery(e.display_name);
                    props.onChange({ exerciseId: e.exercise_id, freeText: null });
                  }}
                >
                  {e.display_name}
                </button>
              ))}
            </div>
          )}
          <button className="btn-text" onClick={() => setManualMode(true)}>
            Can&rsquo;t find it — enter manually
          </button>
        </div>
      ) : (
        <div className="field">
          <label>Exercise name (not in the library yet)</label>
          <input className="text-input" placeholder="e.g. Cable woodchop" value={item.freeText ?? ''} onChange={(e) => props.onChange({ freeText: e.target.value, exerciseId: null })} />
          <label style={{ marginTop: 10 }}>Movement family (optional)</label>
          <div className="chip-row">
            {FAMILIES.map((f) => (
              <button key={f} type="button" className={`chip ${item.manualFamilyTag === f ? 'chip--selected' : ''}`} onClick={() => props.onChange({ manualFamilyTag: f })}>
                {f}
              </button>
            ))}
          </div>
          <button
            className="btn-text"
            onClick={() => {
              setManualMode(false);
              props.onChange({ freeText: null, manualFamilyTag: null });
            }}
          >
            Search the library instead
          </button>
        </div>
      )}

      <div className="prescription-row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Sets</label>
          <input className="text-input" type="number" inputMode="numeric" value={item.sets ?? ''} onChange={(e) => props.onChange({ sets: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Reps</label>
          <input className="text-input" type="number" inputMode="numeric" value={item.reps ?? ''} onChange={(e) => props.onChange({ reps: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Load (lb)</label>
          <input className="text-input" type="number" inputMode="decimal" value={item.load ?? ''} onChange={(e) => props.onChange({ load: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>
      <div className="field">
        <label>Dose, if sets/reps/load don&rsquo;t fit (optional)</label>
        <input className="text-input" placeholder='e.g. "30 sec each side"' value={item.doseText ?? ''} onChange={(e) => props.onChange({ doseText: e.target.value || null })} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={item.isFinisher} onChange={(e) => props.onChange({ isFinisher: e.target.checked })} /> Finisher
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={item.coachModified} onChange={(e) => props.onChange({ coachModified: e.target.checked })} /> Coach modified this exercise for me
        </label>
        {item.coachModified && (
          <input className="text-input" placeholder="How it was modified" value={item.coachNote ?? ''} onChange={(e) => props.onChange({ coachNote: e.target.value || null })} />
        )}
      </div>
      <button className="btn-text btn-danger" onClick={props.onRemove}>
        Remove this exercise
      </button>
    </div>
  );
}
