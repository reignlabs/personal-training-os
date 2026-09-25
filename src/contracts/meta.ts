/**
 * Meta (APP_DATA_CONTRACTS_V0.md §6.9): the single 'meta' document, not exported.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { IntSchema, UtcTsSchema } from './primitives';

export const MetaSchema = DocBaseSchema.extend({
  type: z.literal('meta'),
  id: z.literal('meta'),
  app_schema_version: IntSchema,
  installed_at: UtcTsSchema,
});
export type Meta = z.infer<typeof MetaSchema>;

/** The current stored-document shape version (APP_DATA_CONTRACTS_V0.md §12). */
export const APP_SCHEMA_VERSION = 1;
