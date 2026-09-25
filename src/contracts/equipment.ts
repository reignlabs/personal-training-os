/**
 * Equipment catalog, gym environments, and per-environment equipment state
 * (APP_DATA_CONTRACTS_V0.md §5.2–§5.3).
 */
import { z } from 'zod';
import { LoadSchema, LocalDateSchema } from './primitives';
import { AvailabilitySchema, ImplementTypeSchema } from './vocab';

export const EquipmentCatalogItemSchema = z.object({
  equipment_id: z.string().min(1),
  kind: z.enum(['PHYSICAL', 'SETTING', 'CONCEPT']),
  /** required for SETTING */
  parent_equipment_id: z.string().nullable(),
  /** D-117; no engine effect in V0 */
  implement_type: ImplementTypeSchema,
  display_name: z.string().min(1),
  category: z.string().nullable(),
  description: z.string().nullable(),
  limitations: z.string().nullable(),
  confidence: z.string().nullable(),
  evidence_source: z.string().nullable(),
  load_unit: z.literal('lb').nullable(),
}).superRefine((row, ctx) => {
  if (row.kind === 'SETTING' && row.parent_equipment_id === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'parent_equipment_id is required for kind = SETTING',
      path: ['parent_equipment_id'],
    });
  }
});
export type EquipmentCatalogItem = z.infer<typeof EquipmentCatalogItemSchema>;

export const GymEnvironmentSchema = z.object({
  env_id: z.enum(['ENV-APT', 'ENV-ALLOY', 'ENV-OTHER']),
  name: z.string().min(1),
  kind: z.enum(['GENERATION_TARGET', 'TRAINER_LED_EXTERNAL', 'LOGGING_ONLY']),
  /** exactly one true in V0 (D-065) */
  generation_enabled: z.boolean(),
  load_unit: z.literal('lb'),
  station_groups: z.array(
    z.object({
      station_group: z.string().min(1),
      label: z.string().min(1),
      equipment_ids: z.array(z.string()),
    }),
  ),
  general_warmup_order: z.array(z.string()),
});
export type GymEnvironment = z.infer<typeof GymEnvironmentSchema>;

/** engine contract Q.3; pack baseline, one per (env_id, equipment_id). */
export const EquipmentStateSchema = z.object({
  env_id: z.string().min(1),
  equipment_id: z.string().min(1),
  availability: AvailabilitySchema,
  /** ascending, unique; null = unknown increments */
  loads: z.array(LoadSchema).nullable(),
  max_confirmed_load: LoadSchema.nullable(),
  station_group: z.string().min(1),
  confirmed_on: LocalDateSchema.nullable(),
}).superRefine((row, ctx) => {
  if (row.loads) {
    for (let i = 1; i < row.loads.length; i++) {
      if (!(row.loads[i] > row.loads[i - 1])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'loads must be strictly ascending', path: ['loads'] });
        break;
      }
    }
  }
});
export type EquipmentState = z.infer<typeof EquipmentStateSchema>;
