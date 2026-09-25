/**
 * UserProfile: the runtime projection built from PERSONAL_user_profile.yaml through
 * PROFILE_PROJECTION.yaml (APP_DATA_CONTRACTS_V0.md §5.4, D-101). Nothing outside this
 * shape can enter the pack — no diagnoses, medications, recovery factors, evidence
 * labels, Health handoff quotes, clinician names, clinical grades, body metrics,
 * performance baselines, monitoring variables, or CONTEXT content.
 */
import { z } from 'zod';
import { IanaTzSchema, LocalTimeSchema } from './primitives';
import { WeekdaySchema } from './primitives';

export const UserProfileSchema = z.object({
  /** engine (seed); literal "nelson", must never change (§2). */
  user_id: z.literal('nelson'),
  display_name: z.string().min(1),
  profile_version: z.string().min(1),
  constraints_version: z.string().min(1),
  default_tz: IanaTzSchema,
  units: z.literal('lb'),
  generation_env_id: z.literal('ENV-APT'),
  alloy_schedule_default: z.array(z.object({ weekday: WeekdaySchema, start: LocalTimeSchema })),
  /** engine (HF-04); may be empty */
  avoidances: z.array(z.object({ exercise_id: z.string().min(1), label: z.string().min(1) })),
  pending_questions: z.array(
    z.object({
      question_id: z.string().min(1),
      status: z.enum(['OPEN', 'ANSWERED']),
      question: z.string().min(1),
      what_app_does_until_answered: z.string().min(1),
      answerable_in_app: z.boolean(),
    }),
  ),
  goals_display: z.array(z.object({ goal_id: z.string().min(1), text: z.string().min(1), status: z.string().min(1) })),
  presentation_preferences: z.array(z.string()),
  /** IDs only (engine §0; D-074) */
  context_item_ids: z.array(z.string()),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
