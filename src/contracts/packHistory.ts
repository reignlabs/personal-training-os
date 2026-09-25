/**
 * PackHistory (APP_DATA_CONTRACTS_V0.md §6.7, D-118): append-only manifest + config of
 * every activated pack.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { UtcTsSchema } from './primitives';
import { DatapackManifestSchema } from './datapack';
import { EngineConfigSchema } from './config';

export const PackHistorySchema = DocBaseSchema.extend({
  type: z.literal('pack_history'),
  id: z.literal('pack_history'),
  entries: z.array(z.object({ activated_at: UtcTsSchema, manifest: DatapackManifestSchema, config: EngineConfigSchema })),
});
export type PackHistory = z.infer<typeof PackHistorySchema>;
