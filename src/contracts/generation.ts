/**
 * Generation (APP_DATA_CONTRACTS_V0.md §6.2): Q.10 GeneratedSession + Q.11
 * GenerationRecord in one immutable document. Never modified after being written.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { Hash64Schema, IntSchema, LoadSchema, MinutesSchema, SemVerSchema, UtcTsSchema } from './primitives';
import {
  BlockIdSchema,
  DecidedBySchema,
  EvidenceBasisSchema,
  FamilyReasonCodeSchema,
  FamilySchema,
  HfIdSchema,
  LoadStateSchema,
  NoSessionReasonSchema,
  PostureSchema,
  PrepIdSchema,
  RoleSchema,
  SelectionReasonSchema,
  SlotIdSchema,
  SubTargetSchema,
  UnderfillCauseSchema,
  UnitSchema,
} from './vocab';
import { CheckInObjectSchema } from './checkIn';

export const PrepItemSchema = z.object({
  prep_id: PrepIdSchema,
  kind: z.enum(['GENERAL', 'MOBILITY', 'RAMP']),
  exercise_id: z.string().nullable(),
  equipment_id: z.string().nullable(),
  minutes: MinutesSchema.nullable(),
  sets: IntSchema.nullable(),
  target: IntSchema.nullable(),
  unit: UnitSchema.nullable(),
  /** text only, never logged (D-095) */
  ramp_loads: z.array(LoadSchema).nullable(),
});
export type PrepItem = z.infer<typeof PrepItemSchema>;

export const WorkoutBlockSchema = z.object({
  block_id: BlockIdSchema,
  mode: z.enum(['PAIRED', 'STRAIGHT_SETS']),
  slots: z.array(SlotIdSchema),
});
export type WorkoutBlock = z.infer<typeof WorkoutBlockSchema>;

export const PlannedExerciseSchema = z.object({
  slot: SlotIdSchema,
  block_id: BlockIdSchema,
  exercise_id: z.string().min(1),
  family: FamilySchema,
  sub_target: SubTargetSchema.nullable(),
  role: RoleSchema,
  /** option set chosen today [M-13, M-20] */
  implement: z.array(z.string()),
  sets: IntSchema,
  target: IntSchema,
  unit: UnitSchema,
  load: LoadSchema.nullable(),
  /** BUILDING/LOAD_CAPPED (Line.state, shown as-is) or the special-case label
   * CALIBRATE/SEEDED/RETURN/IMPLEMENT_CHANGED (§G.3). */
  line_state: LoadStateSchema,
  rest_after_pair_s: IntSchema.nullable(),
  per_side: z.boolean(),
  notes: z.array(z.string()),
});
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>;

export const GeneratedSessionSchema = z.object({
  posture: PostureSchema,
  tier: z.enum(['A', 'AB', 'ABC', 'ABCF']),
  prep: z.array(PrepItemSchema),
  blocks: z.array(WorkoutBlockSchema),
  /** execution order (§F.3) */
  items: z.array(PlannedExerciseSchema),
  finish_choice: z.enum(['GOAL_ACCESSORY', 'CORE_OR_CARRY', 'CONDITIONING', 'MOBILITY', 'NONE']),
  duration_estimate_min: MinutesSchema,
  underfill: z.object({ planned_min: MinutesSchema, available_min: IntSchema, cause: UnderfillCauseSchema }).nullable(),
  /** plan notice codes (UX §4.4) */
  notices: z.array(z.string()),
});
export type GeneratedSession = z.infer<typeof GeneratedSessionSchema>;

const GenerationRecordItemSchema = z.object({
  slot: z.union([SlotIdSchema, PrepIdSchema]),
  exercise_id: z.string().min(1),
  evidence_basis: EvidenceBasisSchema,
  role: RoleSchema,
  family_reason_code: FamilyReasonCodeSchema.nullable(),
  implement: z.array(z.string()),
  selection: z.object({
    reason_code: SelectionReasonSchema,
    decided_by: DecidedBySchema.nullable(),
    anchor_before: z.string().nullable(),
    anchor_candidate_if_substitute: z.string().nullable(),
    anchor_after_if_performed: z.string().nullable(),
    note: z.string().nullable(),
  }),
  /** the next 3 in order + every HELD/EXCLUDED in the family */
  alternatives: z.array(z.object({ exercise_id: z.string().min(1), outcome: z.string().min(1) })),
  recent_training: z.array(z.object({ what: z.string(), when: UtcTsSchema, source: z.string() })),
  prescription: z.object({
    sets: IntSchema,
    target: IntSchema,
    unit: UnitSchema,
    load: LoadSchema.nullable(),
    rest: IntSchema.nullable(),
    per_side: z.boolean(),
    line_state: z.string(),
  }),
  progression: z.object({
    line_state: z.string(),
    last_decision: z.string().nullable(),
    why_this_load: z.string(),
    reduce_locked: z.boolean(),
  }),
  constraint_effects: z.array(z.object({ id: z.string(), effect: z.string() })),
  station: z.object({ group: z.string(), block_mode: z.enum(['PAIRED', 'STRAIGHT_SETS']), reselect_detail: z.string().nullable() }),
});

export const GenerationRecordSchema = z.object({
  generation_id: z.string().min(1),
  engine_version: SemVerSchema,
  config_version: z.string().min(1),
  generated_at: UtcTsSchema,
  seed: IntSchema,
  input_versions: z.object({
    profile: z.string(),
    constraints: z.string(),
    equipment: z.string(),
    metadata: z.string(),
    supplemental: z.string(),
  }),
  metadata_rejected: z.array(z.object({ exercise_id: z.string(), validator: z.string() })),
  check_in: CheckInObjectSchema.omit({ id: true, type: true, created_at: true, updated_at: true }),
  posture: PostureSchema,
  posture_reason: z.string(),
  tier: z.string(),
  blocks_included: z.array(BlockIdSchema),
  finish_choice: z.string(),
  finish_reason: z.string(),
  unservable: z.array(z.object({ family: FamilySchema, unblocking_question: z.string().nullable() })),
  family_plan: z.array(
    z.object({
      slot: SlotIdSchema,
      family: FamilySchema,
      role: RoleSchema,
      reason_code: FamilyReasonCodeSchema,
      family_last_trained: UtcTsSchema.nullable(),
      family_last_primary: UtcTsSchema.nullable(),
      parent_last_trained: UtcTsSchema.nullable(),
      parent_last_primary: UtcTsSchema.nullable(),
      source_of_timestamp: z.enum(['APARTMENT', 'ALLOY_FULL', 'ALLOY_SUMMARY', 'ALLOY_PROMPT']).nullable(),
    }),
  ),
  alloy: z.object({
    prompts_asked: z.array(z.string()),
    answers: z.array(z.unknown()),
    credits_applied: z.array(z.string()),
    recovery_credits_applied: z.array(UtcTsSchema),
  }),
  unfillable: z.array(z.object({ family: FamilySchema, reason: z.string(), unblocking_question: z.string().nullable() })),
  constraints_applied: z.array(z.object({ id: z.string(), filter: HfIdSchema, items_affected: z.array(z.string()) })),
  constraints_not_applied: z.array(z.object({ id: z.string(), status: z.string() })),
  context_items_shown: z.array(z.string()),
  validators: z.array(z.object({ id: z.string(), result: z.enum(['PASS', 'REPAIRED', 'FAIL']), repairs: z.array(z.string()) })),
  duration_estimate: MinutesSchema,
  trims_applied: z.array(z.string()),
  underfill: z.object({ planned_min: MinutesSchema, available_min: IntSchema, cause: UnderfillCauseSchema }).nullable(),
  items: z.array(GenerationRecordItemSchema),
});
export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;

export const GenerationSchema = DocBaseSchema.extend({
  type: z.literal('generation'),
  check_in_id: z.string().min(1),
  env_id: z.literal('ENV-APT'),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generated_at: UtcTsSchema,
  datapack_id: z.string().min(1),
  engine_version: SemVerSchema,
  config_version: z.string().min(1),
  config_hash: Hash64Schema,
  app_version: SemVerSchema,
  state_digest: Hash64Schema,
  result: z.enum(['SESSION', 'NO_SESSION']),
  session: GeneratedSessionSchema.nullable(),
  no_session: z.object({ reason: NoSessionReasonSchema, validator_ids: z.array(z.string()), sentence: z.string() }).nullable(),
  record: GenerationRecordSchema,
  /** rendered §J.3 text (D-116) */
  why: z.array(z.object({ slot: z.union([SlotIdSchema, PrepIdSchema]), movement: z.string(), exercise: z.string(), dose: z.string() })),
}).superRefine((row, ctx) => {
  if (row.result === 'SESSION' && row.session === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'result = SESSION requires session', path: ['session'] });
  }
  if (row.result === 'NO_SESSION' && row.no_session === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'result = NO_SESSION requires no_session', path: ['no_session'] });
  }
});
export type Generation = z.infer<typeof GenerationSchema>;
