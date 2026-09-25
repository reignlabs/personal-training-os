import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import type { Workout } from '../contracts';
import { Today } from './Today';
import { Focus } from './Focus';
import { History } from './History';
import { LogAlloy } from './LogAlloy';
import { Equipment } from './Equipment';
import { Profile } from './Profile';

type Screen = 'today' | 'history' | 'logAlloy' | 'equipment' | 'profile';

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'today', label: 'Today' },
  { screen: 'logAlloy', label: 'Log Alloy' },
  { screen: 'history', label: 'History' },
  { screen: 'equipment', label: 'Equipment' },
  { screen: 'profile', label: 'Profile' },
];

/** Root: routes between TODAY (readiness + overview), Focus mode (the real workout
 * loop), and the LOG ALLOY SESSION / HISTORY / EQUIPMENT / PROFILE screens, wired to
 * real persistence and the real engine via src/app/store.ts — no mock data. The tab bar
 * is hidden during Focus mode (D hard rule: one thing at a time, no navigation mid-set)
 * and on the post-completion screen. */
export function App() {
  const { store, snapshot } = useAppStore();
  const [justCompleted, setJustCompleted] = useState<Workout | null>(null);
  const [screen, setScreen] = useState<Screen>('today');

  // §10.8: request persistent storage once, best-effort — reduces the odds of iOS
  // evicting IndexedDB under storage pressure. Silent; status is shown in Profile.
  useEffect(() => {
    void store.requestStoragePersistence();
  }, [store]);

  if (snapshot.status === 'loading') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <p className="muted">Loading your training data…</p>
        </div>
      </div>
    );
  }

  if (snapshot.status === 'error') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <h2>Couldn&rsquo;t open your training data</h2>
          <p className="muted">{snapshot.error}</p>
          <p className="muted">Your data is still on this device. Exporting it raw, unedited, is a safe first step either way.</p>
          <button className="btn-secondary" style={{ marginBottom: 10 }} onClick={() => store.exportRawData()}>
            Export raw data
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (justCompleted) {
    return (
      <div className="app-shell">
        <div className="screen">
          <h1>Workout complete</h1>
          <p className="muted">
            {justCompleted.items.filter((i) => i.status === 'DONE').length} of {justCompleted.items.filter((i) => i.status !== 'SWAPPED_OUT').length} exercises done. Saved to
            your history.
          </p>
          <div className="primary-bar">
            <button className="btn-primary" onClick={() => setJustCompleted(null)}>
              Back to Today
            </button>
          </div>
        </div>
      </div>
    );
  }

  const workout = snapshot.activeWorkout;
  const inFocus = workout && workout.status === 'IN_PROGRESS';

  return (
    <div className="app-shell">
      {inFocus ? (
        <Focus store={store} snapshot={snapshot} onFinished={(w) => setJustCompleted(w)} />
      ) : (
        <>
          <nav className="tab-bar">
            {TABS.map((t) => (
              <button key={t.screen} className={`tab-btn ${screen === t.screen ? 'tab-btn--active' : ''}`} onClick={() => setScreen(t.screen)}>
                {t.label}
              </button>
            ))}
          </nav>
          {screen === 'today' && <Today store={store} snapshot={snapshot} />}
          {screen === 'history' && <History store={store} snapshot={snapshot} />}
          {screen === 'logAlloy' && <LogAlloy store={store} snapshot={snapshot} onDone={() => setScreen('history')} />}
          {screen === 'equipment' && <Equipment store={store} snapshot={snapshot} />}
          {screen === 'profile' && <Profile store={store} snapshot={snapshot} />}
        </>
      )}
    </div>
  );
}
