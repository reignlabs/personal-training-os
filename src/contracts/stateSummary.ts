/**
 * StateSummary (APP_DATA_CONTRACTS_V0.md §6.8): diff baseline only, not exported.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { Hash64Schema, IntSchema, LoadSchema, SemVerSchema } from './primitives';

export const StateSummarySchema = DocBaseSchema.extend({
  type: z.literal('state_summary'),
  id: z.literal('state_summary'),
  engine_version: SemVerSchema,
  datapack_id: z.string().min(1),
  state_digest: Hash64Schema,
  lines: z.array(
    z.object({
      key: z.string(),
      state: z.enum(['BUILDING', 'LOAD_CAPPED']),
      next_load: LoadSchema.nullable(),
      next_target: IntSchema,
      implement: z.array(z.string()),
    }),
  ),
  anchors: z.array(z.object({ key: z.string(), exercise_id: z.string(), rotate_due: z.boolean() })),
  holds: z.array(z.object({ exercise_id: z.string(), cause: z.string() })),
});
export type StateSummary = z.infer<typeof StateSummarySchema>;
