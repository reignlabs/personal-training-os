/**
 * UserActionEvent (APP_DATA_CONTRACTS_V0.md §6.5, engine contract Q.8). Append-only;
 * a correction is a later event, never an edit.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { LoadSchema, UtcTsSchema } from './primitives';
import { AvailabilitySchema, FamilySchema, RoleSchema, SideSchema, SubTargetSchema } from './vocab';

const PayloadClearHold = z.object({ exercise_id: z.string().min(1) });
const PayloadClearReview = z.object({ exercise_id: z.string().min(1), role: RoleSchema.nullable(), side: SideSchema.nullable() });
const PayloadSetPreference = z.object({ exercise_id: z.string().min(1), value: z.enum(['PREFER', 'DISLIKE']).nullable() });
const PayloadUserReplace = z.object({
  family: FamilySchema,
  role: RoleSchema,
  sub_target: SubTargetSchema.nullable(),
  exercise_id: z.string().min(1),
  replaced_exercise_id: z.string().nullable(),
});
const PayloadConfirmCapability = z.object({ capability_prereq: z.string().min(1), exercise_ids: z.array(z.string()) });
const PayloadConfirmEquipment = z.object({
  env_id: z.string().min(1),
  equipment_id: z.string().min(1),
  availability: AvailabilitySchema,
  loads: z.array(LoadSchema).nullable(),
  max_confirmed_load: LoadSchema.nullable(),
  station_group: z.string().nullable(),
});
const PayloadAlloySkipped = z.object({ slot_key: z.string().min(1) });

export const UserActionEventSchema = z.discriminatedUnion('event_type', [
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('CLEAR_HOLD'), payload: PayloadClearHold, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('CLEAR_REVIEW'), payload: PayloadClearReview, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('SET_PREFERENCE'), payload: PayloadSetPreference, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('USER_REPLACE'), payload: PayloadUserReplace, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('CONFIRM_CAPABILITY'), payload: PayloadConfirmCapability, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('CONFIRM_EQUIPMENT'), payload: PayloadConfirmEquipment, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
  DocBaseSchema.extend({ type: z.literal('event'), event_at: UtcTsSchema, event_type: z.literal('ALLOY_SKIPPED'), payload: PayloadAlloySkipped, context: z.object({ workout_id: z.string().optional(), generation_id: z.string().optional() }).nullable() }),
]);
export type UserActionEvent = z.infer<typeof UserActionEventSchema>;
