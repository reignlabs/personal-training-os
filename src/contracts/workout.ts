/**
 * Workout, WorkoutExercise, SetPerformance (APP_DATA_CONTRACTS_V0.md §6.3, engine
 * contract Q.5).
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { IntSchema, LoadSchema, UtcTsSchema } from './primitives';
import {
  BlockIdSchema,
  CapacitySchema,
  EffortSchema,
  FamilySchema,
  FlagCodeSchema,
  LoadStateSchema,
  RoleSchema,
  SelectionReasonSchema,
  SideSchema,
  SlotIdSchema,
  SubTargetSchema,
  UnitSchema,
} from './vocab';

export const SetPerformanceSchema = z
  .object({
    set_no: IntSchema.refine((v) => v >= 1, 'set_no must be >= 1'),
    side: SideSchema,
    load: LoadSchema.nullable(),
    reps: IntSchema.nullable(),
    seconds: IntSchema.nullable(),
    is_working: z.boolean(),
    /** ext; also used to derive rest state on resume */
    logged_at: UtcTsSchema,
    entry: z.enum(['AS_PLANNED', 'ADJUSTED', 'TIMED_AUTO', 'TIMED_STOPPED']),
  })
  .superRefine((row, ctx) => {
    const hasReps = row.reps !== null;
    const hasSeconds = row.seconds !== null;
    if (hasReps === hasSeconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one of reps / seconds must be set per set',
        path: ['reps'],
      });
    }
  });
export type SetPerformance = z.infer<typeof SetPerformanceSchema>;

export const WorkoutExerciseSchema = z
  .object({
    item_key: z.string().regex(/^[A-Z]\d#\d+$/),
    slot: SlotIdSchema,
    block_id: BlockIdSchema,
    exercise_id: z.string().min(1),
    exercise_name_snapshot: z.string().min(1),
    family: FamilySchema,
    sub_target: SubTargetSchema.nullable(),
    role: RoleSchema,
    anchor_pick_reason: SelectionReasonSchema,
    implement: z.array(z.string()),
    swapped_from: z.string().nullable(),
    swapped_from_item_key: z.string().nullable(),
    swap_type: z.enum(['USER_SWAP', 'USER_REPLACE']).nullable(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE', 'SKIPPED', 'SWAPPED_OUT', 'STOPPED']),
    prescription: z.object({
      sets: IntSchema,
      target: IntSchema,
      unit: UnitSchema,
      load: LoadSchema.nullable(),
      line_state: LoadStateSchema,
      per_side: z.boolean(),
      rest_after_pair_s: IntSchema.nullable(),
    }),
    effort: z.object({
      BILATERAL: EffortSchema.nullable().optional(),
      LEFT: EffortSchema.nullable().optional(),
      RIGHT: EffortSchema.nullable().optional(),
    }),
    flags: z.array(
      z.object({
        code: FlagCodeSchema,
        side: SideSchema.nullable(),
        rep: IntSchema.nullable(),
        text: z.string().nullable(),
        flagged_at: UtcTsSchema,
      }),
    ),
    sets: z.array(SetPerformanceSchema),
    note: z.string().nullable(),
  })
  .superRefine((row, ctx) => {
    if ((row.swap_type !== null) !== (row.swapped_from !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'swap_type is set iff swapped_from is set',
        path: ['swap_type'],
      });
    }
  });
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;

export const WorkoutSchema = DocBaseSchema.extend({
  type: z.literal('workout'),
  generation_id: z.string().min(1),
  check_in_id: z.string().min(1),
  env_id: z.literal('ENV-APT'),
  /** plan keeps its start date past midnight */
  plan_local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** discarded workouts are deleted */
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
  started_at: UtcTsSchema,
  ended_at: UtcTsSchema.nullable(),
  session_capacity: CapacitySchema.nullable(),
  load_unit: z.literal('lb'),
  blocks: z.array(
    z.object({
      block_id: BlockIdSchema,
      mode: z.enum(['PAIRED', 'STRAIGHT_SETS']),
      slots: z.array(SlotIdSchema),
      mode_actual: z.enum(['PAIRED', 'STRAIGHT_SETS']),
    }),
  ),
  items: z.array(WorkoutExerciseSchema),
  /** ext (resume) */
  warmup_completed: z.boolean(),
  finish_method: z.enum(['FINISH_STEP', 'END_SESSION', 'FINISHED_LATER']).nullable(),
  note: z.string().nullable(),
}).superRefine((row, ctx) => {
  if (row.status === 'COMPLETED') {
    if (row.ended_at === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'COMPLETED requires ended_at', path: ['ended_at'] });
    } else if (Date.parse(row.ended_at) < Date.parse(row.started_at)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ended_at must be >= started_at', path: ['ended_at'] });
    }
  }
});
export type Workout = z.infer<typeof WorkoutSchema>;
