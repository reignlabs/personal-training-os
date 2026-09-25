/**
 * CheckIn / Readiness (APP_DATA_CONTRACTS_V0.md §6.1, engine contract Q.4).
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { IanaTzSchema, IntSchema, UtcTsSchema } from './primitives';

export const AlloyAnswerSchema = z.object({
  slot_key: z.string().min(1),
  scheduled_start: UtcTsSchema,
  answer: z.enum(['yes', 'no', 'not_sure', 'unanswered']),
  created_external_session_id: z.string().nullable(),
});
export type AlloyAnswer = z.infer<typeof AlloyAnswerSchema>;

/** The plain object shape, before cross-field validation — kept separate so callers
 * (e.g. GenerationRecord.check_in) can `.omit()` fields from it; ZodEffects (the
 * result of .superRefine()) does not support .omit(). */
export const CheckInObjectSchema = DocBaseSchema.extend({
  type: z.literal('check_in'),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: IanaTzSchema,
  /** D-117 */
  env_id: z.literal('ENV-APT'),
  revises_check_in_id: z.string().nullable(),
  /** engine; required to generate */
  R01: IntSchema.nullable(),
  R02: z.enum(['low', 'normal', 'high']).nullable(),
  /** recorded only (D-034) */
  R03: z.enum(['poor', 'ok', 'good']).nullable(),
  R04: z.enum(['worse', 'same', 'better']).nullable(),
  /** only if R04 = worse */
  R04b: z.enum(['as_usual', 'swap']).nullable(),
  R05: z.array(z.enum(['upper', 'lower', 'trunk'])).nullable(),
  /** engine; required */
  R06: z.enum(['no', 'yes']).nullable(),
  R06_choice: z.enum(['normal', 'lighter', 'skip']).nullable(),
  /** recorded only (D-034); sunset when OQ-02 closes */
  R07: z.enum(['yes', 'no']).nullable(),
  equipment_issues: z.array(z.string()),
  alloy_answers: z.array(AlloyAnswerSchema),
  defaulted_fields: z.array(z.enum(['R02', 'R04', 'R04b', 'R05'])),
  /** ext (D-081) */
  normal_day_shortcut: z.boolean(),
});

export const CheckInSchema = CheckInObjectSchema.superRefine((row, ctx) => {
  if (row.R06 === 'yes' && row.R06_choice === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'R06 = yes requires R06_choice', path: ['R06_choice'] });
  }
  if (row.R04b !== null && row.R04 !== 'worse') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'R04b is only set when R04 = worse', path: ['R04b'] });
  }
});
export type CheckIn = z.infer<typeof CheckInSchema>;
