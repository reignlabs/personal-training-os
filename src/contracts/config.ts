/**
 * EngineConfig (APP_DATA_CONTRACTS_V0.md §5.6, engine contract Q.12). Values are the
 * §R defaults, config_version 0.2.0. `set_by` names, per value, the engine default or
 * the question that set it (D-118).
 */
import { z } from 'zod';
import { IntSchema, LoadSchema, LocalTimeSchema, MinutesSchema, WeekdaySchema } from './primitives';
import { FamilySchema, RoleSchema, UnitSchema } from './vocab';

const RoleTableRowSchema = z.object({
  unit: UnitSchema,
  range_min: IntSchema,
  range_max: IntSchema,
  step: IntSchema,
  default_sets: IntSchema,
  rest_after_pair_s: IntSchema.nullable(),
});

export const EngineConfigValuesSchema = z.object({
  MIN_SESSION_MINUTES: IntSchema,
  TIER_AB_MINUTES: IntSchema,
  TIER_ABC_MINUTES: IntSchema,
  TIER_ABCF_MINUTES: IntSchema,
  PREP_MINUTES_SHORT: MinutesSchema,
  PREP_MINUTES: MinutesSchema,
  PREP_GENERAL_MINUTES: MinutesSchema,
  FIRST_SESSIONS_NO_FINISH: IntSchema,
  FAMILY_ORDER: z.array(FamilySchema),
  PARENT_ORDER: z.array(z.enum(['PULL', 'PUSH'])),
  CORE_STARVATION_DAYS: IntSchema,
  FINISH_PRIORITY: z.array(z.enum(['GOAL_ACCESSORY', 'CORE_OR_CARRY', 'CONDITIONING', 'MOBILITY'])),
  GOAL_ACCESSORY_ENABLED: z.boolean(),
  GOAL_ACCESSORY_MIN_HOURS: IntSchema,
  CONDITIONING_OPT_IN: z.boolean(),
  CONDITIONING_FORMAT: z.object({ minutes: IntSchema, work_s: IntSchema, easy_s: IntSchema, non_impact_only: z.boolean() }),
  MIN_SETS_FOR_CREDIT: IntSchema,
  REPEAT_EXCLUSION_DAYS: IntSchema,
  HEAVY_LOWER_RECOVERY_HOURS: IntSchema,
  ACCESSORY_ROTATION_EXPOSURES: IntSchema,
  ENABLE_NOVEL_DRAW: z.boolean(),
  ROLE_TABLE: z.record(RoleSchema.or(z.literal('CORE_TIME')), RoleTableRowSchema),
  PAIR_SET_MINUTES: z.object({ PRIMARY: MinutesSchema, SECONDARY: MinutesSchema, OTHER: MinutesSchema }),
  UNILATERAL_ADD_MINUTES: MinutesSchema,
  BLOCK_SETUP_MINUTES: MinutesSchema,
  RAMP_MINUTES: MinutesSchema,
  STRAIGHT_SETS_ADD_MINUTES: MinutesSchema,
  FINISH_MINUTES: MinutesSchema,
  DURATION_TOLERANCE_MINUTES: MinutesSchema,
  UNDERFILL_NOTICE_MINUTES: MinutesSchema,
  LOAD_UP_CONFIRMATIONS: IntSchema,
  NOMINAL_LOAD_STEP: LoadSchema,
  LOAD_CAP_EXTRA: IntSchema,
  GAP_DAYS: IntSchema,
  STALL_FLAG_EXPOSURES: IntSchema,
  ALLOW_UNEVEN_SIDE_DOSING: z.boolean(),
  ALLOY_SCHEDULE: z.array(z.object({ weekday: WeekdaySchema, start: LocalTimeSchema })),
  ALLOY_PROMPT_LOOKBACK_HOURS: IntSchema,
  ALLOY_MAX_PROMPTS: IntSchema,
  ALLOY_DEFAULT_DURATION_MINUTES: IntSchema,
  ALLOY_TIME_UNCERTAINTY_HOURS: IntSchema,
});
export type EngineConfigValues = z.infer<typeof EngineConfigValuesSchema>;

export const EngineConfigSchema = z.object({
  config_version: z.string().min(1),
  values: EngineConfigValuesSchema,
  set_by: z.record(z.string(), z.string()),
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;
