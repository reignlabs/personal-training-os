/**
 * Document and domain identifiers.
 * APP_DATA_CONTRACTS_V0.md §2: `<uuid>` = crypto.randomUUID(); every device-assigned
 * ID is a type-prefixed UUID (D-105). The seed `user_id` is the literal "nelson" and
 * must never change (§2).
 */

export const SEED_USER_ID = 'nelson' as const;

/** Type-prefixed crypto.randomUUID(), e.g. newId('wo') -> "wo_3f9c...". */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** ext_alloy_<LocalDate> — one Alloy ExternalSession id per local date (§2, D-105). */
export function alloySessionId(localDate: string): string {
  return `ext_alloy_${localDate}`;
}

const ID_PATTERNS: Record<string, RegExp> = {
  exercise: /^(EX\d{3}|SX\d{3})$/,
  equipmentPhysical: /^EQ\d{3}$/,
  equipmentSetting: /^EQ\d{3}_[A-Z]+$/,
  equipmentConcept: /^EQ_[A-Z0-9_]+$/,
  stationGroup: /^([A-Z][A-Z0-9_]*|NONE)$/,
  envId: /^ENV-[A-Z]+$/,
  constraintId: /^(HC|SC)-\d{2}$/,
};

export function isExerciseId(v: string): boolean {
  return ID_PATTERNS.exercise.test(v);
}

export function isEquipmentId(v: string): boolean {
  return (
    ID_PATTERNS.equipmentPhysical.test(v) ||
    ID_PATTERNS.equipmentSetting.test(v) ||
    ID_PATTERNS.equipmentConcept.test(v)
  );
}

export function isEnvId(v: string): boolean {
  return ID_PATTERNS.envId.test(v);
}

export function isConstraintId(v: string): boolean {
  return ID_PATTERNS.constraintId.test(v);
}
