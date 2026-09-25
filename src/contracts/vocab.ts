/**
 * Controlled vocabularies (APP_DATA_CONTRACTS_V0.md §4). Reason and decision codes are
 * append-only (D-116): never rename or remove a member here, only add.
 */
import { z } from 'zod';

export const FamilySchema = z.enum([
  'KD',
  'HD',
  'HPUSH',
  'VPUSH',
  'HPULL',
  'VPULL',
  'ANTI_EXT',
  'ANTI_ROT',
  'ANTI_LAT',
  'CARRY',
  'GOAL_ACCESSORY',
  'MOBILITY',
  'CONDITIONING',
]);
export type Family = z.infer<typeof FamilySchema>;

export const ParentSchema = z.enum(['LOWER', 'PUSH', 'PULL', 'CORE', 'CARRY', 'ACCESSORY', 'MOBILITY', 'CONDITIONING']);
export type Parent = z.infer<typeof ParentSchema>;

export const RoleSchema = z.enum(['PRIMARY', 'SECONDARY', 'CORE', 'CARRY', 'ACCESSORY', 'MOBILITY', 'CONDITIONING']);
export type Role = z.infer<typeof RoleSchema>;

export const SubTargetSchema = z.enum(['ELBOW_FLEXION', 'SHOULDER_ISOLATION', 'ELBOW_EXTENSION']);
export type SubTarget = z.infer<typeof SubTargetSchema>;

export const BlockIdSchema = z.enum(['A', 'B', 'C', 'F']);
export type BlockId = z.infer<typeof BlockIdSchema>;

export const SlotIdSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'F1', 'F2']);
export type SlotId = z.infer<typeof SlotIdSchema>;

export const PrepIdSchema = z.enum(['PG', 'PM1', 'PM2', 'RAMP_A1', 'RAMP_A2']);
export type PrepId = z.infer<typeof PrepIdSchema>;

export const SideSchema = z.enum(['BILATERAL', 'LEFT', 'RIGHT']);
export type Side = z.infer<typeof SideSchema>;

export const LateralitySchema = z.enum(['BILATERAL', 'UNILATERAL', 'ALTERNATING']);
export type Laterality = z.infer<typeof LateralitySchema>;

export const LoadModeSchema = z.enum(['EXTERNAL_LOAD', 'BODYWEIGHT', 'TIME', 'TIME_WITH_LOAD']);
export type LoadMode = z.infer<typeof LoadModeSchema>;

export const UnitSchema = z.enum(['REPS', 'SECONDS']);
export type Unit = z.infer<typeof UnitSchema>;

export const HandSupportSchema = z.enum(['NONE', 'FOREARM', 'QUADRUPED', 'HIGH_PLANK', 'PLANK_POSITION_UNCONFIRMED']);
export type HandSupport = z.infer<typeof HandSupportSchema>;

export const PositionTagSchema = z.enum([
  'straight_arm_weight_bearing',
  'supine_press',
  'overhead_press',
  'dip',
  'impact',
  'ballistic',
  'floor',
]);
export type PositionTag = z.infer<typeof PositionTagSchema>;

export const SoreRegionSchema = z.enum(['UPPER', 'LOWER', 'TRUNK']);
export type SoreRegion = z.infer<typeof SoreRegionSchema>;

export const InvolvementSchema = z.enum(['NONE', 'SECONDARY', 'PRIMARY']);
export type Involvement = z.infer<typeof InvolvementSchema>;

export const EvidenceBasisSchema = z.enum(['ALLOY_LIBRARY', 'ALLOY_LIBRARY_ADAPTED', 'SUPPLEMENTAL']);
export type EvidenceBasis = z.infer<typeof EvidenceBasisSchema>;

export const MetadataStatusSchema = z.enum(['ACTIVE', 'DRAFT', 'RETIRED']);
export type MetadataStatus = z.infer<typeof MetadataStatusSchema>;

export const AvailabilitySchema = z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'UNKNOWN']);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const EffortSchema = z.enum(['TOO_EASY', 'GOOD', 'HARD', 'TOO_HARD']);
export type Effort = z.infer<typeof EffortSchema>;

export const FlagCodeSchema = z.enum([
  'TECHNIQUE_DIFFICULTY',
  'UNCOMFORTABLE',
  'STOPPED_SYMPTOM',
  'RIGHT_ARM_FADE',
  'EQUIPMENT_ISSUE',
]);
export type FlagCode = z.infer<typeof FlagCodeSchema>;

export const PostureSchema = z.enum(['NORMAL', 'LIGHT']);
export type Posture = z.infer<typeof PostureSchema>;

export const CapacitySchema = z.enum(['below_usual', 'usual', 'above_usual']);
export type Capacity = z.infer<typeof CapacitySchema>;

export const LineStateSchema = z.enum(['BUILDING', 'LOAD_CAPPED']);
export type LineState = z.infer<typeof LineStateSchema>;

/** Extended post-hoc (engine B5) to also carry the persisted Line.state values
 * (BUILDING, LOAD_CAPPED) shown verbatim when no special-case label applies
 * (ENGINE_WORKOUT_GENERATOR_V0_2_1.md §G.3, §J.1 `prescription.line_state`); append-only. */
export const LoadStateSchema = z.enum(['CALIBRATE', 'SEEDED', 'KNOWN', 'RETURN', 'IMPLEMENT_CHANGED', 'NONE', 'BUILDING', 'LOAD_CAPPED']);
export type LoadState = z.infer<typeof LoadStateSchema>;

export const HfIdSchema = z.enum([
  'HF-01',
  'HF-02',
  'HF-03',
  'HF-04',
  'HF-05',
  'HF-06',
  'HF-07',
  'HF-08',
  'HF-09',
  'HF-10',
  'HF-11',
  'HF-12',
  'HF-13',
  'HF-14',
]);
export type HfId = z.infer<typeof HfIdSchema>;

export const FilterOutcomeSchema = z.enum([
  'PASS',
  'EXCLUDED',
  'EXCLUDED_TODAY',
  'HELD_PENDING_SCOPE',
  'HELD_EQUIPMENT_UNKNOWN',
  'HELD_PENDING_REVIEW',
  'HELD_CAPABILITY_UNKNOWN',
  'HELD_PREFERENCE_UNKNOWN',
  'NOT_CANDIDATE',
  'NOT_IN_POOL', // provisional, EI-09 (APP_TECH_ARCHITECTURE_V0.md §21)
]);
export type FilterOutcome = z.infer<typeof FilterOutcomeSchema>;

/** Exact engine strings (engine §E.3), e.g. "SUBSTITUTE_FOR_ANCHOR(HF-12)"; pattern-validated. */
export const SelectionReasonSchema = z
  .string()
  .regex(
    /^(ANCHOR|SUBSTITUTE_FOR_ANCHOR\((HF-\d{2}|R-04)\)|SUBSTITUTE_NO_ANCHOR\(HF-\d{2}\)|NEW_ANCHOR_NONE_PRIOR|NEW_ANCHOR_ROTATION\((LOAD_CAPPED|EXPOSURES|DISLIKE|USER_REPLACE)\)|NEW_ANCHOR_BLOCKED\(HF-\d{2}\)|STATION_RESELECT|USER_SWAP|USER_REPLACE)$/,
  );
export type SelectionReason = z.infer<typeof SelectionReasonSchema>;

export const DecidedBySchema = z.enum(['K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'ANCHOR_CANDIDATE', 'DRAW']);
export type DecidedBy = z.infer<typeof DecidedBySchema>;

export const DecisionCodeSchema = z.enum([
  'CALIBRATE',
  'SEEDED',
  'RETURN',
  'IMPLEMENT_CHANGED',
  'NOT_EVIDENCE',
  'REDUCE',
  'HOLD',
  'HOLD(REDUCE_LIMIT)',
  'REPS_UP',
  'CONFIRM_TOP',
  'LOAD_UP',
  'EXTEND_RANGE',
  'LOAD_CAPPED',
  'AT_MINIMUM',
]);
export type DecisionCode = z.infer<typeof DecisionCodeSchema>;

export const FamilyReasonCodeSchema = z.enum([
  'STALEST_LOWER',
  'STALEST_UPPER_PARENT',
  'LOWER_ROLE_ALTERNATION',
  'UPPER_ROLE_ALTERNATION',
  'OTHER_UPPER_PARENT',
  'STALEST_CORE',
  'STALEST_C2',
  'SORENESS_REPLACEMENT',
  'R04_SWAP',
  'CORE_STARVATION_SWAP',
  'FALLBACK_SIBLING',
  'FALLBACK_SAME_SIDE',
  'FALLBACK_CORE',
  'FALLBACK_NEXT_IN_POOL',
  'SLOT_EMPTY',
  'FINISH_GOAL_ACCESSORY',
  'FINISH_CORE_OR_CARRY',
  'FINISH_CONDITIONING',
  'FINISH_MOBILITY',
]);
export type FamilyReasonCode = z.infer<typeof FamilyReasonCodeSchema>;

export const UnderfillCauseSchema = z.enum(['FIRST_SESSIONS', 'LIGHT_POSTURE', 'SLOTS_EMPTY', 'TIER_MAXIMUM', 'TIER_BOUNDARY']);
export type UnderfillCause = z.infer<typeof UnderfillCauseSchema>;

export const NoSessionReasonSchema = z.enum(['USER_SKIP', 'TOO_SHORT', 'NO_BLOCK_A', 'VALIDATION_FAILED']);
export type NoSessionReason = z.infer<typeof NoSessionReasonSchema>;

/** Controlled vocabulary declared in EQUIPMENT_MODEL.md; kept open here (string) with
 * the documented examples enumerated for reference and dev-data validation. */
export const KNOWN_IMPLEMENT_TYPES = [
  'DUMBBELL',
  'KETTLEBELL',
  'BARBELL',
  'PLATES',
  'FLAT_BENCH',
  'ADJUSTABLE_BENCH',
  'RACK',
  'PULLUP_BAR',
  'DIP_STATION',
  'STABILITY_BALL',
  'MAT',
  'BIKE',
  'TREADMILL',
  'ELLIPTICAL',
  'SELECTORIZED_MACHINE',
  'ADJUSTABLE_CABLE',
  'SUSPENSION_TRAINER',
  'BAND',
  'AB_WHEEL',
  'FOAM_ROLLER',
  'TRAP_BAR',
] as const;
export const ImplementTypeSchema = z.string().min(1);
export type ImplementType = z.infer<typeof ImplementTypeSchema>;
