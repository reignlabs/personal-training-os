/**
 * Datapack (APP_DATA_CONTRACTS_V0.md §5.7): the one active document type 'datapack',
 * id 'datapack'. Everything personal or Alloy-derived enters the app only through this
 * (D-100).
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { SemVerSchema, UtcTsSchema } from './primitives';
import {
  ExerciseDisplaySchema,
  EvidenceSourceSchema,
  ExerciseAliasSchema,
  ExerciseMetadataSchema,
  SupplementalInfoSchema,
  FamilyOrderApprovalSchema,
} from './exercise';
import { EquipmentCatalogItemSchema, GymEnvironmentSchema, EquipmentStateSchema } from './equipment';
import { UserProfileSchema } from './profile';
import { ConstraintSchema } from './constraint';
import { EngineConfigSchema } from './config';

export const DatapackManifestSchema = z.object({
  format: z.literal('pto-datapack'),
  datapack_id: z.string().regex(/^dp_.+_[0-9a-f]{8}$/),
  pack_version: SemVerSchema,
  built_at: UtcTsSchema,
  tool_version: SemVerSchema,
  contract_version: SemVerSchema,
  engine_compat: z.object({ min: SemVerSchema, max_exclusive: SemVerSchema }),
  config_version: z.string().min(1),
  sources: z.array(z.object({ file: z.string().min(1), version: z.string().nullable(), sha256: z.string().min(1) })),
  counts: z.record(z.string(), z.number().int()),
});
export type DatapackManifest = z.infer<typeof DatapackManifestSchema>;

export const DatapackSchema = DocBaseSchema.extend({
  type: z.literal('datapack'),
  id: z.literal('datapack'),
  manifest: DatapackManifestSchema,
  exercises: z.array(ExerciseDisplaySchema),
  evidence_sources: z.array(EvidenceSourceSchema),
  aliases: z.array(ExerciseAliasSchema),
  /** may be empty -> generation NOT_READY */
  exercise_metadata: z.array(ExerciseMetadataSchema),
  supplemental: z.array(SupplementalInfoSchema),
  family_order_approvals: z.array(FamilyOrderApprovalSchema),
  equipment_catalog: z.array(EquipmentCatalogItemSchema),
  environments: z.array(GymEnvironmentSchema),
  equipment_baseline: z.array(EquipmentStateSchema),
  profile: UserProfileSchema,
  constraints: z.array(ConstraintSchema),
  config: EngineConfigSchema,
});
export type Datapack = z.infer<typeof DatapackSchema>;
