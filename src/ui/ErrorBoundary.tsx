import { Component, type ReactNode } from 'react';
import { getAppStore } from '../app/store';

interface State {
  error: Error | null;
}

/** Basic error recovery for a render crash React's own machinery would otherwise turn
 * into a blank screen. Deliberately outside `AppStore`'s own `status: 'error'` path
 * (App.tsx handles that one, for a failed `init()`) — this catches everything else:
 * a bug in a screen's render, a bad prop, anything thrown during a commit. Offers the
 * same "export raw data" escape hatch either way, via `getAppStore()` so it can reach
 * the store even when the crash happened inside the tree that would normally provide
 * it via `useAppStore()`. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private exportRawData = async (): Promise<void> => {
    try {
      await getAppStore().exportRawData();
    } catch {
      // best-effort; the reload button below is always available regardless
    }
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app-shell">
        <div className="center-screen">
          <h2>Something went wrong</h2>
          <p className="muted">
            The app hit an unexpected error. Your data is still on this device &mdash; exporting a backup now is a good idea before reloading.
          </p>
          <button className="btn-secondary" style={{ marginBottom: 10 }} onClick={this.exportRawData}>
            Export raw data
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
