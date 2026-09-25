import { useState } from 'react';
import type { AppStore, AppSnapshot } from '../app/store';
import type { DifferentDayAnswers } from '../app/sessionLogic';
import { PrimaryBar, ChipGroup } from './components/Primitives';

// Bug fix (V0 QA pass): the engine supports sessions down to MIN_SESSION_MINUTES (15,
// with an honest "too short" message below that — see engine/explain.ts's TOO_SHORT
// text and PRODUCT_UX_SPEC_V0.md §4.2's own chip row, which includes 20). The shipped
// chip row started at 30, so a person short on time had no way to ask for a quick
// session at all, and the TOO_SHORT path could never be reached through the UI.
const MINUTE_OPTIONS = [20, 30, 45, 60, 75];

function todayLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** §10.8/D-107: "a quiet backup reminder on Today after 3 completed sessions or 7 days
 * since the last export (never in focus mode, never a dialog)" — approximated here as
 * total completed-workout count (not a since-last-export session counter, which would
 * need extra state this app doesn't otherwise keep) since 3+ completed sessions with no
 * export at all is exactly the case worth nudging about. Nothing to back up yet -> no
 * reminder, however many days have passed. */
function shouldRemindBackup(snapshot: AppSnapshot): boolean {
  const hasHistory = snapshot.workouts.length > 0 || snapshot.externalSessions.length > 0;
  if (!hasHistory) return false;
  const completedCount = snapshot.workouts.filter((w) => w.status === 'COMPLETED').length;
  const sinceExport = snapshot.settings.last_export_at ?? snapshot.meta.installed_at;
  const daysSinceExport = (Date.now() - Date.parse(sinceExport)) / (1000 * 60 * 60 * 24);
  return completedCount >= 3 || daysSinceExport >= 7;
}

/** TODAY: pre-workout readiness, then hands off to Overview (rendered by App once a
 * workout exists) once GENERATE produces a session. */
export function Today(props: { store: AppStore; snapshot: AppSnapshot }) {
  const { store } = props;
  const [mode, setMode] = useState<'shortcut' | 'full'>('shortcut');
  const [minutes, setMinutes] = useState<number>(45);
  const [customMinutes, setCustomMinutes] = useState('');
  const [symptomToday, setSymptomToday] = useState<'no' | 'yes'>('no');
  const [symptomChoice, setSymptomChoice] = useState<'normal' | 'lighter' | 'skip'>('normal');

  const [sleep, setSleep] = useState<'low' | 'normal' | 'high'>('normal');
  const [energy, setEnergy] = useState<'worse' | 'same' | 'better'>('same');
  const [energyWorseChoice, setEnergyWorseChoice] = useState<'as_usual' | 'swap'>('as_usual');
  const [soreRegions, setSoreRegions] = useState<('upper' | 'lower' | 'trunk')[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bug fix (V0 QA pass): Today previously had no COMPLETED state at all (§4.1 lists
  // NOT_READY / CHECK-IN / PLAN / IN_PROGRESS / COMPLETED / NO_SESSION) — finishing a
  // workout just dropped the person back onto this same readiness form with zero
  // acknowledgment, so nothing stopped generating and completing a second, third, etc.
  // full session on the same calendar day by accident. `trainAgain` is the explicit,
  // one-tap opt-in (§4.5's "Train again today") back into the form below.
  const [trainAgain, setTrainAgain] = useState(false);

  const effectiveMinutes = customMinutes ? Number(customMinutes) : minutes;
  const completedToday = !trainAgain && props.snapshot.workouts.find((w) => w.status === 'COMPLETED' && w.plan_local_date === todayLocalDate());

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const result =
        mode === 'shortcut'
          ? await store.startNormalDay({
              minutesAvailable: effectiveMinutes,
              symptomToday,
              symptomChoice: symptomToday === 'yes' ? symptomChoice : null,
              equipmentIssues: [],
            })
          : await store.startDifferentDay(
              buildAnswers({ minutes: effectiveMinutes, sleep, energy, energyWorseChoice, soreRegions, symptomToday, symptomChoice }),
            );
      if ('noSession' in result) {
        setError(result.noSession.sentence);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (props.snapshot.lastNoSession && !props.snapshot.activeWorkout) {
    return (
      <div className="screen screen--no-primary">
        <h1>No session today</h1>
        <p>{props.snapshot.lastNoSession.sentence}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (completedToday) {
    const done = completedToday.items.filter((i) => i.status === 'DONE').length;
    const total = completedToday.items.filter((i) => i.status !== 'SWAPPED_OUT').length;
    return (
      <div className="screen screen--no-primary">
        <h1>Done today</h1>
        <p className="muted">
          {done}/{total} exercises done{completedToday.session_capacity ? ` · felt ${completedToday.session_capacity.replace('_', ' ')}` : ''}.
        </p>
        <p className="muted">See it in History for the full breakdown.</p>
        <button className="btn-secondary" onClick={() => setTrainAgain(true)}>
          Train again today
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>Today</h1>
      <p className="muted">Quick readiness check before we build your session.</p>
      {shouldRemindBackup(props.snapshot) && (
        <p className="muted" style={{ fontSize: 13 }}>
          It&rsquo;s been a while since your last backup &mdash; you can export one from Profile.
        </p>
      )}

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <button className={`chip ${mode === 'shortcut' ? 'chip--selected' : ''}`} onClick={() => setMode('shortcut')}>
          Same as always
        </button>
        <button className={`chip ${mode === 'full' ? 'chip--selected' : ''}`} onClick={() => setMode('full')}>
          Different day
        </button>
      </div>

      <div className="field">
        <label>How many minutes do you have?</label>
        <ChipGroup
          options={MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m} min` }))}
          value={customMinutes ? null : String(minutes)}
          onChange={(v) => {
            setCustomMinutes('');
            setMinutes(Number(v));
          }}
        />
      </div>

      {mode === 'full' && (
        <>
          <div className="field">
            <label>Sleep last night</label>
            <ChipGroup
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              value={sleep}
              onChange={setSleep}
            />
          </div>
          <div className="field">
            <label>Energy vs. usual</label>
            <ChipGroup
              options={[
                { value: 'worse', label: 'Worse' },
                { value: 'same', label: 'Same' },
                { value: 'better', label: 'Better' },
              ]}
              value={energy}
              onChange={setEnergy}
            />
          </div>
          {energy === 'worse' && (
            <div className="field">
              <label>Right arm today</label>
              <ChipGroup
                options={[
                  { value: 'as_usual', label: 'Load as usual' },
                  { value: 'swap', label: 'Swap pressing for core' },
                ]}
                value={energyWorseChoice}
                onChange={setEnergyWorseChoice}
              />
            </div>
          )}
          <div className="field">
            <label>Sore anywhere today?</label>
            <ChipGroup
              multi
              options={[
                { value: 'upper', label: 'Upper' },
                { value: 'lower', label: 'Lower' },
                { value: 'trunk', label: 'Trunk' },
              ]}
              value={soreRegions}
              onChange={setSoreRegions}
            />
          </div>
        </>
      )}

      <div className="field">
        <label>Any symptom today?</label>
        <ChipGroup
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ]}
          value={symptomToday}
          onChange={setSymptomToday}
        />
      </div>
      {symptomToday === 'yes' && (
        <div className="field">
          <label>How should today go?</label>
          <ChipGroup
            options={[
              { value: 'normal', label: 'Train normally' },
              { value: 'lighter', label: 'Train lighter' },
              { value: 'skip', label: 'Skip today' },
            ]}
            value={symptomChoice}
            onChange={setSymptomChoice}
          />
        </div>
      )}

      {error && (
        <p className="muted" role="alert" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      )}

      <PrimaryBar label={submitting ? 'Building your session…' : 'Build my session'} onClick={submit} disabled={submitting} />
    </div>
  );
}

function buildAnswers(a: {
  minutes: number;
  sleep: 'low' | 'normal' | 'high';
  energy: 'worse' | 'same' | 'better';
  energyWorseChoice: 'as_usual' | 'swap';
  soreRegions: ('upper' | 'lower' | 'trunk')[];
  symptomToday: 'no' | 'yes';
  symptomChoice: 'normal' | 'lighter' | 'skip';
}): DifferentDayAnswers {
  return {
    minutesAvailable: a.minutes,
    sleep: a.sleep,
    sorenessOverall: null,
    energyVsUsual: a.energy,
    energyWorseChoice: a.energy === 'worse' ? a.energyWorseChoice : null,
    soreRegions: a.soreRegions,
    symptomToday: a.symptomToday,
    symptomChoice: a.symptomToday === 'yes' ? a.symptomChoice : null,
    equipmentIssues: [],
  };
}
