import type { AppStore, AppSnapshot } from '../app/store';
import { AlloySessionForm } from './AlloySessionForm';

/** LOG ALLOY SESSION entry point — a fresh, empty AlloySessionForm. Editing an existing
 * log happens from History.tsx instead, which passes `existing` into the same form. */
export function LogAlloy(props: { store: AppStore; snapshot: AppSnapshot; onDone: () => void }) {
  return <AlloySessionForm store={props.store} onSaved={props.onDone} onCancel={props.onDone} />;
}
