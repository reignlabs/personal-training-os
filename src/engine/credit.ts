/**
 * Family/parent crediting (§B.3), shared by workout completion (§K step 4) and Alloy
 * logs (§L.3). A session credits family f when >= MIN_SETS_FOR_CREDIT working sets were
 * completed in items whose family = f; credit time = session end time. [M-01]
 */
import type { Family, Parent, UtcTs } from '../contracts';
import type { GeneratorState } from './types';
import { latestTs } from './state';
import { parentOf } from './families';

export function creditFamily(state: GeneratorState, family: Family, ts: UtcTs): void {
  state.family_last_trained[family] = latestTs(state.family_last_trained[family], ts) ?? ts;
  creditParent(state, parentOf(family), ts);
}

export function creditParent(state: GeneratorState, parent: Parent, ts: UtcTs): void {
  state.parent_last_trained[parent] = latestTs(state.parent_last_trained[parent], ts) ?? ts;
}

/** [M-01] apartment sessions only — never set by Alloy logs. */
export function creditFamilyPrimary(state: GeneratorState, family: Family, ts: UtcTs): void {
  state.family_last_primary[family] = latestTs(state.family_last_primary[family], ts) ?? ts;
  const parent = parentOf(family);
  if (parent === 'PUSH' || parent === 'PULL') {
    state.parent_last_primary[parent] = latestTs(state.parent_last_primary[parent], ts) ?? ts;
  }
}

/** lower_last_trained = parent_last_trained[LOWER] (§B.3). */
export function lowerLastTrained(state: GeneratorState): UtcTs | null {
  return state.parent_last_trained.LOWER ?? null;
}
