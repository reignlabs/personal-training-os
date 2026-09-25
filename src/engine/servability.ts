/**
 * Servability (§C.4.1, [M-06]). A family is servable today if at least one of its
 * exercises passes the static filters for its role. Unservable families are removed
 * from every planning pool and listed once in the record.
 */
import type { Family } from '../contracts';
import type { PoolExercise } from './pool';
import type { FilterCtx } from './filters';
import { passesStatic } from './filters';
import { rolesForFamilySlot } from './families';

export function isFamilyServable(family: Family, pool: PoolExercise[], ctx: FilterCtx): boolean {
  const roles = rolesForFamilySlot(family);
  return pool.some((e) => e.family === family && roles.some((r) => e.roles_allowed.includes(r) && passesStatic(e, r, ctx)));
}

export interface ServabilityResult {
  servable: Set<Family>;
  unservable: Family[];
}

export function computeServability(families: Family[], pool: PoolExercise[], ctx: FilterCtx): ServabilityResult {
  const servable = new Set<Family>();
  const unservable: Family[] = [];
  for (const f of families) {
    if (isFamilyServable(f, pool, ctx)) servable.add(f);
    else unservable.push(f);
  }
  return { servable, unservable };
}
