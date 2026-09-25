import { useEffect, useState } from 'react';
import type { AppStore, AppSnapshot, StoragePersistStatus } from '../app/store';
import { ENGINE_VERSION, type PoolExercise } from '../app/sessionLogic';
import { APP_VERSION, type AppBackup } from '../app/backup';
import type { Weekday } from '../contracts';
import { APP_SCHEMA_VERSION } from '../contracts';
import { ChipGroup } from './components/Primitives';

const WEEKDAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** PROFILE: display/editing for the fields UserProfileSchema itself defines as
 * appropriate here (its own header comment: no diagnoses, medications, recovery
 * factors, clinical grades, body metrics, or performance baselines can enter this
 * shape at all — see APP_DATA_CONTRACTS_V0.md §5.4). Avoidances are explicit,
 * user-stated movement exclusions (HEALTH_CONSTRAINT_RULE) — never a diagnosis this
 * app infers — and are the one field proven, by test, to change subsequent
 * GENERATE output (HF-04). */
export function Profile(props: { store: AppStore; snapshot: AppSnapshot }) {
  const { store, snapshot } = props;
  const profile = snapshot.profile;

  return (
    <div className="screen screen--no-primary">
      <h1>Profile</h1>

      <DisplayNameField store={store} value={profile.display_name} />

      <h3>Avoidances</h3>
      <p className="muted">Exercises to exclude from every session — an explicit constraint you set, never something the app diagnoses on its own.</p>
      <AvoidancesEditor store={store} pool={store.getPool()} avoidances={profile.avoidances} />

      <h3>Alloy class schedule</h3>
      <p className="muted">When your recurring Alloy classes are, so the app can ask about a missed session.</p>
      <ScheduleEditor store={store} schedule={profile.alloy_schedule_default} />

      <h3>Goals</h3>
      <GoalsEditor store={store} goals={profile.goals_display} />

      <h3>Presentation preferences</h3>
      <p className="muted">Free-form notes on how you want sessions framed (e.g. &ldquo;prefers metric-free cues&rdquo;).</p>
      <TagListEditor
        items={profile.presentation_preferences}
        onChange={(next) => store.updateProfile({ presentation_preferences: next })}
        placeholder="Add a preference…"
      />

      <h3>Backup</h3>
      <BackupSection store={store} snapshot={snapshot} />

      <h3>Storage &amp; versions</h3>
      <StorageAndVersions store={store} snapshot={snapshot} />
    </div>
  );
}

function DisplayNameField(props: { store: AppStore; value: string }) {
  const [value, setValue] = useState(props.value);
  const [dirty, setDirty] = useState(false);
  return (
    <div className="field">
      <label>Name</label>
      <input
        className="text-input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={() => {
          if (dirty && value.trim()) {
            props.store.updateProfile({ display_name: value.trim() });
            setDirty(false);
          }
        }}
      />
    </div>
  );
}

function AvoidancesEditor(props: { store: AppStore; pool: PoolExercise[]; avoidances: { exercise_id: string; label: string }[] }) {
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const matches = query.trim() ? props.pool.filter((e) => e.display_name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <div style={{ marginBottom: 20 }}>
      {props.avoidances.map((a) => (
        <div className="list-row" key={a.exercise_id}>
          <div>
            <div className="name">{exerciseName(props.pool, a.exercise_id)}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {a.label}
            </div>
          </div>
          <button className="btn-text btn-danger" onClick={() => props.store.removeAvoidance(a.exercise_id)}>
            Remove
          </button>
        </div>
      ))}

      <div className="field">
        <label>Add an avoidance</label>
        <input className="text-input" placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {matches.length > 0 && (
        <div className="chip-row">
          {matches.slice(0, 6).map((e) => (
            <button
              key={e.exercise_id}
              type="button"
              className="chip"
              onClick={() => {
                setQuery(e.display_name);
              }}
            >
              {e.display_name}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <label>Reason (optional)</label>
        <input className="text-input" placeholder="e.g. knee discomfort" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <button
        className="btn-secondary"
        disabled={!query.trim()}
        onClick={() => {
          const matched = props.pool.find((e) => e.display_name.toLowerCase() === query.trim().toLowerCase());
          const exerciseId = matched?.exercise_id ?? query.trim();
          props.store.addAvoidance(exerciseId, label.trim() || 'no reason given');
          setQuery('');
          setLabel('');
        }}
      >
        Add avoidance
      </button>
    </div>
  );
}

function exerciseName(pool: PoolExercise[], exerciseId: string): string {
  return pool.find((e) => e.exercise_id === exerciseId)?.display_name ?? exerciseId;
}

function ScheduleEditor(props: { store: AppStore; schedule: { weekday: Weekday; start: string }[] }) {
  const [weekday, setWeekday] = useState<Weekday>('MON');
  const [start, setStart] = useState('09:00');

  return (
    <div style={{ marginBottom: 20 }}>
      {props.schedule.map((entry, idx) => (
        <div className="list-row" key={`${entry.weekday}-${entry.start}-${idx}`}>
          <div className="name">
            {entry.weekday} {entry.start}
          </div>
          <button
            className="btn-text btn-danger"
            onClick={() => props.store.updateProfile({ alloy_schedule_default: props.schedule.filter((_, i) => i !== idx) })}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="field">
        <label>Add a class time</label>
        <ChipGroup options={WEEKDAYS.map((w) => ({ value: w, label: w }))} value={weekday} onChange={(v) => setWeekday(v as Weekday)} />
      </div>
      <div className="field">
        <input className="text-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <button
        className="btn-secondary"
        onClick={() => props.store.updateProfile({ alloy_schedule_default: [...props.schedule, { weekday, start }] })}
      >
        Add
      </button>
    </div>
  );
}

function GoalsEditor(props: { store: AppStore; goals: { goal_id: string; text: string; status: string }[] }) {
  const [text, setText] = useState('');

  return (
    <div style={{ marginBottom: 20 }}>
      {props.goals.map((g) => (
        <div className="list-row" key={g.goal_id}>
          <div>
            <div className="name">{g.text}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {g.status}
            </div>
          </div>
          <button className="btn-text btn-danger" onClick={() => props.store.updateProfile({ goals_display: props.goals.filter((x) => x.goal_id !== g.goal_id) })}>
            Remove
          </button>
        </div>
      ))}
      <div className="field">
        <input className="text-input" placeholder="Add a goal…" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button
        className="btn-secondary"
        disabled={!text.trim()}
        onClick={() => {
          const goal = { goal_id: `goal_${Date.now()}`, text: text.trim(), status: 'active' };
          props.store.updateProfile({ goals_display: [...props.goals, goal] });
          setText('');
        }}
      >
        Add goal
      </button>
    </div>
  );
}

function TagListEditor(props: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('');
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="chip-row">
        {props.items.map((item, idx) => (
          <button key={`${item}-${idx}`} type="button" className="chip chip--selected" onClick={() => props.onChange(props.items.filter((_, i) => i !== idx))}>
            {item} &times;
          </button>
        ))}
      </div>
      <div className="field">
        <input className="text-input" placeholder={props.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button
        className="btn-secondary"
        disabled={!text.trim()}
        onClick={() => {
          props.onChange([...props.items, text.trim()]);
          setText('');
        }}
      >
        Add
      </button>
    </div>
  );
}

/** D-107: one self-contained JSON file, export via share sheet/download, import
 * replaces everything with confirmation. Both actions go through AppStore, never
 * `src/platform` directly (module boundaries: ui -> app, contracts, domain only). */
function BackupSection(props: { store: AppStore; snapshot: AppSnapshot }) {
  const { store, snapshot } = props;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState(snapshot.settings.device_label);

  async function doExport() {
    setBusy(true);
    setStatus(null);
    try {
      const { result } = await store.exportBackup();
      setStatus(result === 'shared' ? 'Backup shared.' : result === 'downloaded' ? 'Backup downloaded.' : 'Export cancelled.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function choosePickFile() {
    setImportError(null);
    setBusy(true);
    try {
      const preview = await store.pickAndPreviewBackup();
      if (preview.ok) setPendingImport(preview.backup);
      else setImportError(preview.error);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setBusy(true);
    try {
      await store.restoreFromBackup(pendingImport);
      setPendingImport(null);
      setStatus('Backup restored.');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="field">
        <label>Device label (helps tell backups apart)</label>
        <input
          className="text-input"
          value={deviceLabel}
          onChange={(e) => setDeviceLabel(e.target.value)}
          onBlur={() => deviceLabel.trim() && store.updateSettings({ device_label: deviceLabel.trim() })}
        />
      </div>

      <p className="muted" style={{ fontSize: 13 }}>
        Last export: {snapshot.settings.last_export_at ? new Date(snapshot.settings.last_export_at).toLocaleString() : 'never'}
      </p>

      <button className="btn-secondary" disabled={busy} style={{ marginBottom: 10 }} onClick={doExport}>
        Export backup
      </button>
      <button className="btn-secondary" disabled={busy} onClick={choosePickFile}>
        Import backup…
      </button>

      {status && <p className="muted">{status}</p>}
      {importError && (
        <p className="muted" role="alert" style={{ color: 'var(--bad)' }}>
          {importError}
        </p>
      )}

      {pendingImport && (
        <div className="sheet-backdrop" onClick={() => setPendingImport(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Replace all data with this backup?</h2>
            <p className="muted">
              From {pendingImport.device_label}, exported {new Date(pendingImport.exported_at).toLocaleString()}.
            </p>
            <ul style={{ color: 'var(--text-dim)', fontSize: 14, paddingLeft: 18 }}>
              {Object.entries(pendingImport.counts).map(([type, count]) => (
                <li key={type}>
                  {count} {type}
                </li>
              ))}
            </ul>
            <p className="muted" style={{ color: 'var(--bad)' }}>
              This replaces everything currently on this device. It can&rsquo;t be undone unless you have another backup of the current data.
            </p>
            <button className="btn-secondary btn-danger" disabled={busy} onClick={confirmImport}>
              Replace everything
            </button>
            <button className="btn-text" style={{ width: '100%', marginTop: 8 }} onClick={() => setPendingImport(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** P-09: versions and storage-persistence status. Persistence is requested once on app
 * mount (App.tsx); this just reports the current status, re-checking on a manual
 * request since the browser's answer can change (e.g. after Home Screen install).
 *
 * Also surfaces D-109's update flag: a new build only ever gets applied automatically
 * when no workout is IN_PROGRESS (AppStore.tryApplyPendingUpdate, called on launch and
 * right after a workout finishes), so this line only lingers on screen in the unlikely
 * case that didn't happen yet — normally the reload has already happened by the time
 * anyone would see this screen. */
function StorageAndVersions(props: { store: AppStore; snapshot: AppSnapshot }) {
  const [persist, setPersist] = useState<StoragePersistStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    props.store.getStoragePersistStatus().then((s) => {
      if (!cancelled) setPersist(s);
    });
    return () => {
      cancelled = true;
    };
  }, [props.store]);

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="list-row">
        <div className="name">Storage persistence</div>
        <div className="muted">{persist === null ? '…' : !persist.supported ? 'N/A' : persist.persisted ? 'Persisted' : 'Not persisted'}</div>
      </div>
      {persist && persist.supported && !persist.persisted && (
        <button
          className="btn-text"
          onClick={async () => {
            const next = await props.store.requestStoragePersistence();
            setPersist(next);
          }}
        >
          Request persistent storage
        </button>
      )}
      <div className="list-row">
        <div className="name">App version</div>
        <div className="muted">{APP_VERSION}</div>
      </div>
      <div className="list-row">
        <div className="name">Data schema version</div>
        <div className="muted">{APP_SCHEMA_VERSION}</div>
      </div>
      <div className="list-row">
        <div className="name">Engine version</div>
        <div className="muted">{ENGINE_VERSION}</div>
      </div>
      {props.snapshot.updateAvailable && <p className="muted">An update is ready and will finish applying once no workout is in progress.</p>}
    </div>
  );
}
