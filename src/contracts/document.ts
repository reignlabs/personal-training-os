/**
 * The document base every stored document shares (APP_DATA_CONTRACTS_V0.md §3),
 * stored in the single IndexedDB object store `docs` (key path `id`).
 */
import { z } from 'zod';
import { UtcTsSchema } from './primitives';

export const DocTypeSchema = z.enum([
  'meta',
  'settings',
  'datapack',
  'pack_history',
  'state_summary',
  'check_in',
  'generation',
  'workout',
  'external_session',
  'event',
  /** ext (app-internal, not part of APP_DATA_CONTRACTS_V0.md's canonical §4-10 types):
   * the persisted GeneratorState cache — see src/app/store.ts and B5/B7's `replay()` gap
   * (claude/B5_GENERATOR_BUILD_STATUS.md). Carried forward incrementally after every
   * completion/event rather than rebuilt from history on each load. */
  'engine_state',
  /** ext (app-internal): a deliberately simplified wrapper around the engine's own
   * GenerateResult union (src/engine/generate.ts), NOT the full canonical
   * GenerationRecordSchema/GenerationSchema (§6.2) — building that full record (state_digest,
   * config_hash, app_version, alternatives[], family_plan[], validators[], etc.) is
   * deferred, documented app-layer scope (claude/B5_GENERATOR_BUILD_STATUS.md). See
   * src/app/sessionLogic.ts's StoredGeneration. */
  'stored_generation',
]);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DocBaseSchema = z.object({
  id: z.string().min(1),
  type: DocTypeSchema,
  created_at: UtcTsSchema,
  /** = created_at for immutable documents. */
  updated_at: UtcTsSchema,
});
export type DocBase = z.infer<typeof DocBaseSchema>;
