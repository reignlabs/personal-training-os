/**
 * ExternalSession (APP_DATA_CONTRACTS_V0.md §6.4, D-106): Alloy and other outside
 * sessions share one contract with `kind`.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { IntSchema, LoadSchema, UtcTsSchema } from './primitives';
import { EffortSchema, FamilySchema } from './vocab';

export const ExternalItemSchema = z
  .object({
    item_no: IntSchema,
    slot_label: z.string().nullable(),
    exercise_id: z.string().nullable(),
    exercise_name_snapshot: z.string().nullable(),
    free_text: z.string().nullable(),
    family_tag: FamilySchema.nullable(),
    family_tag_source: z.enum(['METADATA', 'USER_CHIP', 'NONE']),
    sets: IntSchema.nullable(),
    reps: IntSchema.nullable(),
    load: LoadSchema.nullable(),
    dose_text: z.string().nullable(),
    is_finisher: z.boolean(),
    coach_modified: z.boolean(),
    coach_note: z.string().nullable(),
    coach_note_reviewed: z.boolean(),
  })
  .superRefine((row, ctx) => {
    const hasEx = row.exercise_id !== null;
    const hasText = row.free_text !== null;
    if (hasEx === hasText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one of exercise_id / free_text per item',
        path: ['exercise_id'],
      });
    }
  });
export type ExternalItem = z.infer<typeof ExternalItemSchema>;

export const ExternalSessionSchema = DocBaseSchema.extend({
  type: z.literal('external_session'),
  /** engine reads ALLOY only; OTHER stored, not read (B2) */
  kind: z.enum(['ALLOY', 'OTHER']),
  env_id: z.enum(['ENV-ALLOY', 'ENV-OTHER']),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** class time, never entry time */
  performed_at: UtcTsSchema,
  ended_at: UtcTsSchema,
  /** false -> ended_at = performed_at + 55 min */
  duration_known: z.boolean(),
  source: z.enum(['USER_ENTRY', 'CHECKIN_PROMPT']),
  /** ext; FUTURE history import (§10) */
  import_batch_id: z.string().nullable(),
  log_mode: z.enum(['SUMMARY', 'FULL']).nullable(),
  focus: z.enum(['full', 'upper', 'lower']).nullable(),
  perceived_effort: EffortSchema.nullable(),
  coach_notes: z.string().nullable(),
  coach_notes_reviewed_at: UtcTsSchema.nullable(),
  program: z.enum(['DailyArms', 'DailyAbs', 'Walking', 'Manual']).nullable(),
  focus_tags: z.array(z.string()),
  duration_min: IntSchema.nullable(),
  notes: z.string().nullable(),
  entry_mode: z.enum(['CHIPS', 'TYPED', 'DICTATED', 'PROMPT', 'IMPORT']),
  items: z.array(ExternalItemSchema),
}).superRefine((row, ctx) => {
  if (row.kind === 'ALLOY') {
    if (row.id !== `ext_alloy_${row.local_date}`) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ALLOY id must be ext_alloy_<local_date>', path: ['id'] });
    }
    if (row.env_id !== 'ENV-ALLOY') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ALLOY sessions use env_id = ENV-ALLOY', path: ['env_id'] });
    }
    if (row.focus === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ALLOY sessions require focus', path: ['focus'] });
    }
    const expectedLogMode = row.items.length > 0 ? 'FULL' : 'SUMMARY';
    if (row.log_mode !== expectedLogMode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ALLOY log_mode must be ${expectedLogMode} given item count`, path: ['log_mode'] });
    }
  } else {
    if (row.log_mode !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OTHER sessions have log_mode = null', path: ['log_mode'] });
    }
  }
});
export type ExternalSession = z.infer<typeof ExternalSessionSchema>;
