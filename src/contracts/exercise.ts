/**
 * Exercise data: the evidence-layer display projection, the SYSTEM_METADATA layer,
 * the supplemental layer, and family order approvals (APP_DATA_CONTRACTS_V0.md §5.1).
 * "Exercise" itself is a resolved view, never merged in storage.
 */
import { z } from 'zod';
import { LocalDateSchema, Hash64Schema, IntSchema } from './primitives';
import {
  FamilySchema,
  SubTargetSchema,
  RoleSchema,
  LateralitySchema,
  LoadModeSchema,
  HandSupportSchema,
  PositionTagSchema,
  SoreRegionSchema,
  InvolvementSchema,
  EvidenceBasisSchema,
  MetadataStatusSchema,
  ImplementTypeSchema,
} from './vocab';

/** §5.1.1 — projected from the evidence dataset; display only. */
export const ExerciseDisplaySchema = z.object({
  exercise_id: z.string().regex(/^EX\d{3}$/),
  canonical_name: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2)]),
  alloy_observed: z.boolean(),
  evidence_classification: z.enum(['ALLOY_DOCUMENTED', 'ALLOY_OBSERVED', 'SUPPORTED_PATTERN']),
  documented_coaching_cues: z.string().nullable(),
  source_ids: z.array(z.string()),
});
export type ExerciseDisplay = z.infer<typeof ExerciseDisplaySchema>;

export const EvidenceSourceSchema = z.object({
  source_id: z.string().min(1),
  url: z.string().nullable(),
  document: z.string().min(1),
});
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const ExerciseAliasSchema = z.object({
  alias: z.string().min(1),
  exercise_id: z.string().regex(/^(EX|SX)\d{3}$/),
  flagged_uncertain: z.boolean(),
});
export type ExerciseAlias = z.infer<typeof ExerciseAliasSchema>;

/** §5.1.2 — the populated SYSTEM_METADATA layer (engine contract Q.1). */
export const ExerciseMetadataSchema = z.object({
  exercise_id: z.string().regex(/^(EX|SX)\d{3}$/),
  status: MetadataStatusSchema,
  display_name: z.string().min(1),
  /** null = no single family (a complex movement); excluded from the pool as NO_FAMILY (§Q.1.1, V-00b). */
  family: FamilySchema.nullable(),
  sub_target: SubTargetSchema.nullable(),
  roles_allowed: z.array(RoleSchema).min(1),
  laterality: LateralitySchema,
  per_side_logging: z.boolean(),
  load_mode: LoadModeSchema,
  /** Ordered option sets; each set is a list of equipment IDs that must all be available; [[]] = bodyweight. */
  equipment_options: z.array(z.array(z.string())),
  station: z.string().min(1),
  heavy_lower: z.boolean(),
  right_triceps_involvement: InvolvementSchema,
  hand_support: HandSupportSchema,
  position_tags: z.array(PositionTagSchema),
  sore_regions: z.array(SoreRegionSchema),
  capability_prereq: z.string().nullable(),
  evidence_basis: EvidenceBasisSchema,
  default_order: IntSchema,
  library_order: IntSchema.nullable(),
  executed_as: z.string().nullable(),
  demo_ref: z.string().nullable(),
  /** ext: reason for a judgment call (Q.1.1). */
  authoring_note: z.string().nullable(),
}).superRefine((row, ctx) => {
  if (row.family === 'GOAL_ACCESSORY' && row.sub_target === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sub_target is required when family = GOAL_ACCESSORY',
      path: ['sub_target'],
    });
  }
});
export type ExerciseMetadata = z.infer<typeof ExerciseMetadataSchema>;

/** §5.1.4 */
export const SupplementalInfoSchema = z.object({
  exercise_id: z.string().regex(/^SX\d{3}$/),
  source: z.literal('SYSTEM_DESIGN'),
  added_because: z.string().min(1),
  /** null -> NOT_APPROVED */
  approved_by_user_on: LocalDateSchema.nullable(),
});
export type SupplementalInfo = z.infer<typeof SupplementalInfoSchema>;

/** §5.1.5 — pending confirmation, D-111. */
export const FamilyOrderApprovalSchema = z.object({
  family: FamilySchema,
  approved_on: LocalDateSchema,
  order_hash: Hash64Schema,
});
export type FamilyOrderApproval = z.infer<typeof FamilyOrderApprovalSchema>;

/** The resolved exercise view (not stored). */
export const ExerciseSchema = z.object({
  exercise_id: z.string().min(1),
  display_name: z.string().min(1),
  display: ExerciseDisplaySchema.nullable(),
  metadata: ExerciseMetadataSchema.nullable(),
  supplemental: SupplementalInfoSchema.nullable(),
  aliases: z.array(z.string()),
  sources: z.array(EvidenceSourceSchema),
  pool_status: z.enum(['IN_POOL', 'NO_METADATA', 'DRAFT', 'RETIRED', 'REJECTED', 'NOT_APPROVED']),
  rejected_by: z.array(z.string()),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

/** Implement type re-exported for callers that only need exercise-adjacent types. */
export { ImplementTypeSchema };
