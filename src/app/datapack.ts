/**
 * The active Datapack for this app instance. B2 (the datapack authoring tool) and B6
 * (metadata authoring) are not built yet — per this task's scope (the core workout
 * loop), the app loads the same dev seed datapack the engine's facade smoke test uses
 * (dev-data/seed-datapack.json), validated against the real contracts. A real
 * datapack-import screen is future (B4/B9) work; this is a deliberate, documented
 * simplification, not silent mock data — the seed pack is real, schema-valid data that
 * flows through the same `Datapack` contract and the same engine facade production code
 * will use.
 */
import { DatapackSchema, type Datapack } from '../contracts';
import seedDatapackJson from '../../dev-data/seed-datapack.json';

let cached: Datapack | null = null;

export function loadDefaultDatapack(): Datapack {
  if (cached) return cached;
  const result = DatapackSchema.safeParse(seedDatapackJson);
  if (!result.success) {
    throw new Error(`Seed datapack failed contract validation: ${JSON.stringify(result.error.issues)}`);
  }
  cached = result.data;
  return cached;
}
