/**
 * Unit tests for §C.2-C.5, C.7 family-planning rule components (posture, size tier,
 * staleness ordering, main/core/carry family plan, core-starvation swap, fallback
 * chains, finish plan). Exercise *selection* itself (§E) is covered separately in
 * selection.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { loadFxConfig } from '../fixtures/fxConfig';
import {
  blocksIncludedForTier,
  coreStarvationApplies,
  computePosture,
  computeTier,
  fallbackChainForCoreCarrySlot,
  fallbackChainForMainSlot,
  planCoreAndCarry,
  planFinish,
  planMainAndCoreFamilies,
  prepMinutesForTier,
  sortFamiliesByStaleness,
  type FinishPlanArgs,
} from '../../src/engine/familyPlan';
import { createEmptyState } from '../../src/engine/state';
import type { GeneratorState } from '../../src/engine/types';
import type { Family } from '../../src/contracts';

const config = loadFxConfig();

describe('computePosture (§C.2)', () => {
  it('R06=yes + lighter -> LIGHT', () => {
    expect(computePosture({ R02: 'normal', R06: 'yes', R06_choice: 'lighter' }).posture).toBe('LIGHT');
  });

  it('R02=low -> LIGHT', () => {
    expect(computePosture({ R02: 'low', R06: 'no', R06_choice: null }).posture).toBe('LIGHT');
  });

  it('defaults to NORMAL', () => {
    expect(computePosture({ R02: 'normal', R06: 'no', R06_choice: null }).posture).toBe('NORMAL');
  });

  it('R06=yes without choosing "lighter" does not by itself force LIGHT', () => {
    expect(computePosture({ R02: 'normal', R06: 'yes', R06_choice: 'skip' as never }).posture).toBe('NORMAL');
  });
});

describe('computeTier (§C.3)', () => {
  it('below MIN_SESSION_MINUTES -> NONE', () => {
    expect(computeTier(10, 10, config)).toBe('NONE');
  });

  it('boundaries map to A / AB / ABC / ABCF', () => {
    expect(computeTier(config.MIN_SESSION_MINUTES, 10, config)).toBe('A');
    expect(computeTier(config.TIER_AB_MINUTES, 10, config)).toBe('AB');
    expect(computeTier(config.TIER_ABC_MINUTES, 10, config)).toBe('ABC');
    expect(computeTier(config.TIER_ABCF_MINUTES, 10, config)).toBe('ABCF');
  });

  it('ABCF is downgraded to ABC when apartment_sessions_completed is below FIRST_SESSIONS_NO_FINISH', () => {
    expect(computeTier(config.TIER_ABCF_MINUTES, config.FIRST_SESSIONS_NO_FINISH - 1, config)).toBe('ABC');
    expect(computeTier(config.TIER_ABCF_MINUTES, config.FIRST_SESSIONS_NO_FINISH, config)).toBe('ABCF');
  });

  it('prepMinutesForTier: A uses the short prep, everything else the full prep', () => {
    expect(prepMinutesForTier('A', config)).toBe(config.PREP_MINUTES_SHORT);
    expect(prepMinutesForTier('AB', config)).toBe(config.PREP_MINUTES);
    expect(prepMinutesForTier('ABCF', config)).toBe(config.PREP_MINUTES);
  });

  it('blocksIncludedForTier lists the blocks for each tier, and none for NONE', () => {
    expect(blocksIncludedForTier('A')).toEqual(['A']);
    expect(blocksIncludedForTier('AB')).toEqual(['A', 'B']);
    expect(blocksIncludedForTier('ABC')).toEqual(['A', 'B', 'C']);
    expect(blocksIncludedForTier('ABCF')).toEqual(['A', 'B', 'C', 'F']);
    expect(blocksIncludedForTier('NONE')).toEqual([]);
  });
});

describe('sortFamiliesByStaleness (§C.4.2, [M-01])', () => {
  const order: Family[] = ['KD', 'HD'];

  it('orders by primary key ascending, null (never trained) first', () => {
    const ts: Partial<Record<Family, string | null>> = { KD: '2026-09-10T00:00:00.000Z', HD: null };
    const result = sortFamiliesByStaleness(['KD', 'HD'], (f) => ts[f] ?? null, () => null, order);
    expect(result.ordered).toEqual(['HD', 'KD']);
    expect(result.decidedByPrimary).toBe(true);
  });

  it('a primary-key tie falls through to the secondary key', () => {
    const primary: Partial<Record<Family, string | null>> = { KD: null, HD: null };
    const secondary: Partial<Record<Family, string | null>> = { KD: '2026-09-01T00:00:00.000Z', HD: '2026-09-10T00:00:00.000Z' };
    const result = sortFamiliesByStaleness(['KD', 'HD'], (f) => primary[f] ?? null, (f) => secondary[f] ?? null, order);
    expect(result.ordered).toEqual(['KD', 'HD']);
    expect(result.decidedByPrimary).toBe(false);
  });

  it('a full tie on both keys falls back to the supplied tie order', () => {
    const result = sortFamiliesByStaleness(['HD', 'KD'], () => null, () => null, ['KD', 'HD']);
    expect(result.ordered).toEqual(['KD', 'HD']);
    expect(result.decidedByPrimary).toBe(false);
  });

  it('a single item is trivially "decided by primary"', () => {
    const result = sortFamiliesByStaleness(['KD'], () => null, () => null, order);
    expect(result.decidedByPrimary).toBe(true);
  });
});

describe('planMainAndCoreFamilies (§C.4.3)', () => {
  const servable = new Set<Family>(['KD', 'HD', 'HPUSH', 'VPUSH', 'HPULL', 'VPULL', 'ANTI_EXT', 'ANTI_ROT']);

  it('cold start: no prior training data ties every key, so A1/B1 use LOWER_ROLE_ALTERNATION per family order', () => {
    const state = createEmptyState();
    const result = planMainAndCoreFamilies(state, servable, config.FAMILY_ORDER, config.PARENT_ORDER);
    expect(result.A1).toMatchObject({ slot: 'A1', family: 'KD', role: 'PRIMARY', reasonCode: 'LOWER_ROLE_ALTERNATION' });
    expect(result.B1).toMatchObject({ slot: 'B1', family: 'HD', role: 'SECONDARY', reasonCode: 'LOWER_ROLE_ALTERNATION' });
    expect(result.A2).not.toBeNull();
    expect(result.B2).not.toBeNull();
    expect(result.coreServable).toEqual(['ANTI_EXT', 'ANTI_ROT']);
  });

  it('when one lower family was trained more recently than the other, the staler one leads with STALEST_LOWER', () => {
    const state = createEmptyState();
    state.family_last_trained.KD = '2026-09-20T00:00:00.000Z';
    state.family_last_trained.HD = '2026-09-01T00:00:00.000Z';
    const result = planMainAndCoreFamilies(state, servable, config.FAMILY_ORDER, config.PARENT_ORDER);
    expect(result.A1).toMatchObject({ family: 'HD', reasonCode: 'STALEST_LOWER' });
    expect(result.B1).toMatchObject({ family: 'KD', reasonCode: 'STALEST_LOWER' });
  });

  it('an unservable lower family leaves A1/B1 partially or fully empty', () => {
    const state = createEmptyState();
    const onlyKd = new Set<Family>(['KD', 'HPUSH', 'HPULL']);
    const result = planMainAndCoreFamilies(state, onlyKd, config.FAMILY_ORDER, config.PARENT_ORDER);
    expect(result.A1).toMatchObject({ family: 'KD' });
    expect(result.B1).toBeNull();
  });

  it('A2 leads with the staler parent (PULL/PUSH), B2 takes the other', () => {
    const state = createEmptyState();
    state.parent_last_trained.PULL = '2026-09-01T00:00:00.000Z';
    state.parent_last_trained.PUSH = '2026-09-20T00:00:00.000Z';
    const result = planMainAndCoreFamilies(state, servable, config.FAMILY_ORDER, config.PARENT_ORDER);
    expect(['HPULL', 'VPULL']).toContain(result.A2!.family);
    expect(['HPUSH', 'VPUSH']).toContain(result.B2!.family);
  });
});

describe('planCoreAndCarry (§C.4.3)', () => {
  it('picks the stalest core family for C1, and CARRY (when servable) competes for C2', () => {
    const state = createEmptyState();
    state.family_last_trained.ANTI_EXT = '2026-09-20T00:00:00.000Z';
    const result = planCoreAndCarry(state, ['ANTI_EXT', 'ANTI_ROT'], true, config.FAMILY_ORDER);
    expect(result.C1).toBe('ANTI_ROT'); // ANTI_EXT more recently trained -> not staler
    expect(result.C2).toBe('CARRY'); // CARRY is untrained (null, ranks oldest) and excluded from C1 since it isn't in coreServable
  });

  it('C2 never repeats C1', () => {
    const state = createEmptyState();
    const result = planCoreAndCarry(state, ['ANTI_EXT'], false, config.FAMILY_ORDER);
    expect(result.C1).toBe('ANTI_EXT');
    expect(result.C2).toBeNull();
  });
});

describe('coreStarvationApplies (§C.4.3 core-starvation swap)', () => {
  const now = '2026-09-24T00:00:00.000Z';

  it('never applies when the tier already includes block C', () => {
    expect(coreStarvationApplies(true, 100, ['ANTI_EXT'], createEmptyState(), now, config)).toBe(false);
  });

  it('does not apply before CORE_STARVATION_DAYS of history exist', () => {
    expect(coreStarvationApplies(false, config.CORE_STARVATION_DAYS - 1, ['ANTI_EXT'], createEmptyState(), now, config)).toBe(false);
  });

  it('does not apply when there is no servable core family', () => {
    expect(coreStarvationApplies(false, 100, [], createEmptyState(), now, config)).toBe(false);
  });

  it('applies when every servable core family has gone untrained past the threshold', () => {
    const state = createEmptyState();
    state.family_last_trained.ANTI_EXT = '2026-09-01T00:00:00.000Z'; // 23 days ago, well past 7
    expect(coreStarvationApplies(false, 100, ['ANTI_EXT'], state, now, config)).toBe(true);
  });

  it('does not apply if any servable core family was trained within the threshold', () => {
    const state = createEmptyState();
    state.family_last_trained.ANTI_EXT = '2026-09-23T00:00:00.000Z'; // 1 day ago
    expect(coreStarvationApplies(false, 100, ['ANTI_EXT', 'ANTI_ROT'], state, now, config)).toBe(false);
  });
});

describe('fallbackChainForMainSlot (§C.7)', () => {
  const state = createEmptyState();

  it('tries the sibling family first (KD <-> HD, HPUSH <-> VPUSH, HPULL <-> VPULL)', () => {
    const servable = new Set<Family>(['KD', 'HD']);
    const steps = fallbackChainForMainSlot('KD', 'PRIMARY', 'LOWER', servable, new Set(), config.FAMILY_ORDER, state);
    expect(steps[0]).toMatchObject({ family: 'HD', role: 'PRIMARY', reasonCode: 'FALLBACK_SIBLING' });
  });

  it('skips the sibling when it is already planned elsewhere, and falls through to same-side, then core', () => {
    const servable = new Set<Family>(['KD', 'HD', 'ANTI_EXT']);
    const planned = new Set<Family>(['HD']);
    const steps = fallbackChainForMainSlot('KD', 'PRIMARY', 'LOWER', servable, planned, config.FAMILY_ORDER, state);
    expect(steps.some((s) => s.family === 'HD')).toBe(false);
    expect(steps.some((s) => s.reasonCode === 'FALLBACK_CORE' && s.family === 'ANTI_EXT')).toBe(true);
  });

  it('produces no steps when nothing else is servable', () => {
    const servable = new Set<Family>(['KD']);
    const steps = fallbackChainForMainSlot('KD', 'PRIMARY', 'LOWER', servable, new Set(), config.FAMILY_ORDER, state);
    expect(steps).toEqual([]);
  });
});

describe('fallbackChainForCoreCarrySlot (§C.7)', () => {
  it('picks the stalest unplanned core/carry family, role CARRY only for the CARRY family', () => {
    const state = createEmptyState();
    const servable = new Set<Family>(['ANTI_EXT', 'CARRY']);
    const steps = fallbackChainForCoreCarrySlot(servable, new Set(), config.FAMILY_ORDER, state);
    expect(steps.length).toBe(1);
    expect(['ANTI_EXT', 'CARRY']).toContain(steps[0].family);
    expect(steps[0].role).toBe(steps[0].family === 'CARRY' ? 'CARRY' : 'CORE');
  });

  it('returns no steps when the pool is empty', () => {
    expect(fallbackChainForCoreCarrySlot(new Set(), new Set(), config.FAMILY_ORDER, createEmptyState())).toEqual([]);
  });
});

describe('planFinish (§C.5)', () => {
  function args(overrides: Partial<FinishPlanArgs> = {}): FinishPlanArgs {
    return {
      posture: 'NORMAL',
      config,
      state: createEmptyState(),
      now: '2026-09-24T18:00:00.000Z',
      servable: new Set<Family>(['ANTI_EXT', 'CARRY']),
      planned: new Set<Family>(),
      pool: [],
      ctx: {} as FinishPlanArgs['ctx'],
      ...overrides,
    };
  }

  it('LIGHT posture always tries MOBILITY x2 regardless of FINISH_PRIORITY, and returns [] if no mobility exercise is eligible', () => {
    expect(planFinish(args({ posture: 'LIGHT' }))).toEqual([]);
  });

  it('FX-CONFIG has GOAL_ACCESSORY_ENABLED=false and CONDITIONING_OPT_IN=false, so both are skipped', () => {
    expect(config.GOAL_ACCESSORY_ENABLED).toBe(false);
    expect(config.CONDITIONING_OPT_IN).toBe(false);
  });

  it('with no eligible exercises anywhere in the (empty) pool, planFinish returns no slots', () => {
    expect(planFinish(args())).toEqual([]);
  });
});
