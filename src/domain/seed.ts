/**
 * Seeded PRNG for limited variety (ENGINE_WORKOUT_GENERATOR_V0_2_1.md §E.4) and its
 * per-slot draw (APP_TECH_ARCHITECTURE_V0.md §21, ECR-02 provisional default):
 *
 *   seed = FNV-1a-32("user_id|local_date|apartment_sessions_completed")
 *   per slot: r = mulberry32(FNV-1a-32(seed + "|" + slot))()
 *
 * Randomness never selects families, blocks, pairs, set counts, reps, rest, loads, or
 * main-role (PRIMARY/SECONDARY) exercises (engine §E.4) — this module only produces
 * numbers; callers are responsible for restricting where it is used.
 */

import { fnv1a32 } from './hash';

/** mulberry32: a small, fast, deterministic PRNG. Returns a function yielding [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day's seed (ECR-02 default): stable for one local date and session count. */
export function daySeed(userId: string, localDate: string, apartmentSessionsCompleted: number): number {
  return fnv1a32(`${userId}|${localDate}|${apartmentSessionsCompleted}`);
}

/** A [0, 1) draw for one slot, deterministic given the day's seed. */
export function slotDraw(seed: number, slotKey: string): number {
  const slotSeed = fnv1a32(`${seed}|${slotKey}`);
  return mulberry32(slotSeed)();
}

/** Picks an index in [0, n) from a slot draw (§E.4: `index = floor(r × n)`). */
export function drawIndex(seed: number, slotKey: string, n: number): number {
  if (n <= 0) throw new RangeError('drawIndex requires n > 0');
  return Math.floor(slotDraw(seed, slotKey) * n);
}
