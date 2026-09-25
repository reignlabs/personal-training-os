/**
 * Family vocabulary and grouping (§B.2). Pure constants; no rule logic.
 */
import type { Family, Parent, Role } from '../contracts';

export const MAIN_FAMILIES: Family[] = ['KD', 'HD', 'HPUSH', 'VPUSH', 'HPULL', 'VPULL'];
export const LOWER_FAMILIES: Family[] = ['KD', 'HD'];
export const PUSH_FAMILIES: Family[] = ['HPUSH', 'VPUSH'];
export const PULL_FAMILIES: Family[] = ['HPULL', 'VPULL'];
export const CORE_FAMILIES: Family[] = ['ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT'];

export const FAMILY_TO_PARENT: Record<Family, Parent> = {
  KD: 'LOWER',
  HD: 'LOWER',
  HPUSH: 'PUSH',
  VPUSH: 'PUSH',
  HPULL: 'PULL',
  VPULL: 'PULL',
  ANTI_EXT: 'CORE',
  ANTI_ROT: 'CORE',
  ANTI_LAT: 'CORE',
  CARRY: 'CARRY',
  GOAL_ACCESSORY: 'ACCESSORY',
  MOBILITY: 'MOBILITY',
  CONDITIONING: 'CONDITIONING',
};

/** The role(s) a family is placed in when planned as a main/core/carry slot (§B.2). */
export function rolesForFamilySlot(family: Family): Role[] {
  if (MAIN_FAMILIES.includes(family)) return ['PRIMARY', 'SECONDARY'];
  if (CORE_FAMILIES.includes(family)) return ['CORE'];
  if (family === 'CARRY') return ['CARRY'];
  if (family === 'GOAL_ACCESSORY') return ['ACCESSORY'];
  if (family === 'MOBILITY') return ['MOBILITY'];
  if (family === 'CONDITIONING') return ['CONDITIONING'];
  return [];
}

export function parentOf(family: Family): Parent {
  return FAMILY_TO_PARENT[family];
}
