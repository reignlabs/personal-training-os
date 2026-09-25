/**
 * Constraint and its engine bindings (APP_DATA_CONTRACTS_V0.md §5.5, D-102). Bindings
 * are what let the pack tool refuse to build a pack whose active hard constraint has
 * no engine effect (I-08).
 */
import { z } from 'zod';
import { HandSupportSchema, PositionTagSchema } from './vocab';

export const EngineBindingSchema = z.object({
  filter: z.enum(['HF-01', 'HF-02', 'HF-03']),
  outcome: z.enum(['EXCLUDED', 'HELD_PENDING_SCOPE']),
  where: z.object({
    position_tags_any: z.array(PositionTagSchema).optional(),
    hand_support_in: z.array(HandSupportSchema).optional(),
    exercise_ids: z.array(z.string()).optional(),
  }),
});
export type EngineBinding = z.infer<typeof EngineBindingSchema>;

export const ConstraintSchema = z.object({
  constraint_id: z.string().regex(/^(HC|SC)-\d{2}$/),
  kind: z.enum(['HARD', 'SOFT']),
  status: z.enum([
    'ACTIVE',
    'ACTIVE_SCOPE_PENDING',
    'ACTIVE_PARAMETERS_PENDING',
    'CANDIDATE_PENDING_USER',
    'NOT_ADOPTED',
    'RETIRED',
  ]),
  source: z.enum(['USER', 'CLINICIAN', 'TRAINER', 'USER_ADOPTED_FROM_AI_PLAN']),
  label_in_app: z.string().min(1),
  /** authored in the projection file; no clinical detail */
  description_in_app: z.string().min(1),
  programming_effect_in_app: z.string().min(1),
  review_question: z.string().nullable(),
  engine_bindings: z.array(EngineBindingSchema),
}).superRefine((row, ctx) => {
  if (row.kind === 'HARD' && (row.status === 'ACTIVE' || row.status === 'ACTIVE_SCOPE_PENDING') && row.engine_bindings.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Every active hard constraint must have >= 1 engine binding (I-08)',
      path: ['engine_bindings'],
    });
  }
});
export type Constraint = z.infer<typeof ConstraintSchema>;
