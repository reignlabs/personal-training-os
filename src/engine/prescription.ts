/**
 * Prescription (§G). Role table lookup (G.1), sets (G.2), targets/load display from
 * line state (G.3, via progression.ts's determineLineStatus), per-side handling (G.4),
 * and the duration estimate / fitting / underfill notice (G.5). Pure: no clock, no
 * randomness — `now` is never read here; all timing already lives in the caller's args.
 */
import type { BlockId, EngineConfigValues, LoadState, Posture, Role, Side, Unit, UnderfillCause } from '../contracts';
import type { Line } from './types';
import type { LineStatus, LineStatusResult } from './progression';

// ---------- §G.1 role table ----------

export interface RoleTableRow {
  unit: Unit;
  range_min: number;
  range_max: number;
  step: number;
  default_sets: number;
  rest_after_pair_s: number | null;
}

/**
 * AMBIGUITY NOTE: §G.1's table lists a single "CORE" row split into two variants
 * (rep-based 8-12 and time-based 20-40s) rather than two role names. The config
 * contract (§Q) models this as two ROLE_TABLE keys, 'CORE' and 'CORE_TIME', selected
 * here by the exercise's own unit (from its load_mode) when role === 'CORE'. Every
 * other role has exactly one row and ignores `unit` for lookup purposes.
 */
export function roleTableRow(role: Role, unit: Unit, config: EngineConfigValues): RoleTableRow {
  const key = role === 'CORE' && unit === 'SECONDS' ? 'CORE_TIME' : role;
  const row = (config.ROLE_TABLE as Record<string, RoleTableRow>)[key];
  if (!row) throw new Error(`No ROLE_TABLE row for role "${key}"`);
  return row;
}

// ---------- §G.2 sets ----------

export interface SetsArgs {
  role: Role;
  unit: Unit;
  posture: Posture;
  /** true when this slot was filled via the §C.7 fallback chain rather than the plan */
  isReplacedSlot: boolean;
  block: BlockId;
  config: EngineConfigValues;
}

/** §G.2 (FIXED). §G.5 trimming is applied afterward, separately, across the whole plan. */
export function computeSets(args: SetsArgs): number {
  if (args.posture === 'LIGHT') return 2;
  if (args.isReplacedSlot && (args.block === 'A' || args.block === 'B')) return 3;
  const row = roleTableRow(args.role, args.unit, args.config);
  return row.default_sets;
}

// ---------- §G.3 targets and load ----------

export interface TargetLoadResult {
  target: number;
  load: number | null;
  line_state: LoadState;
  why_this_load: string;
}

function fmtLoad(load: number | null): string {
  return load === null ? 'bodyweight' : `${load} lb`;
}

/** §G.3 (FIXED): reads the line-status determination from progression.ts and renders
 * the prescription table's five rows plus the two "any state" overrides (IMPLEMENT_CHANGED
 * takes precedence over RETURN, per progression.ts's determineLineStatus ordering). */
export function computeTargetLoad(statusResult: LineStatusResult, role: Role, unit: Unit, config: EngineConfigValues): TargetLoadResult {
  const row = roleTableRow(role, unit, config);

  switch (statusResult.status) {
    case 'CALIBRATE':
      return {
        target: row.range_min,
        load: null,
        line_state: 'CALIBRATE',
        why_this_load: 'First time on this exercise in this role: choose a weight where the target reps feel GOOD; you may change weight between sets.',
      };
    case 'SEEDED': {
      const seedFrom = statusResult.seedFrom as Line;
      return {
        target: row.range_min,
        load: seedFrom.next_load,
        line_state: 'SEEDED',
        why_this_load: `Seeded from your work on this exercise and side in the other main role, at ${fmtLoad(seedFrom.next_load)}.`,
      };
    }
    case 'IMPLEMENT_CHANGED': {
      const line = statusResult.line as Line;
      return {
        target: line.next_target,
        load: line.next_load,
        line_state: 'IMPLEMENT_CHANGED',
        why_this_load: `Today's implement differs from what this line normally uses. Same weight if the implement allows (last: ${fmtLoad(line.next_load)}); log what you use.`,
      };
    }
    case 'RETURN': {
      const line = statusResult.line as Line;
      return {
        target: line.next_target,
        load: line.next_load,
        line_state: 'RETURN',
        why_this_load: `Returning after a gap: last time was ${line.next_target}${line.unit === 'REPS' ? ' reps' : 's'} at ${fmtLoad(line.next_load)}.`,
      };
    }
    case 'NORMAL':
    default: {
      const line = statusResult.line as Line;
      const stateLabel: LoadState = line.state; // 'BUILDING' | 'LOAD_CAPPED', shown verbatim
      return {
        target: line.next_target,
        load: line.next_load,
        line_state: stateLabel,
        why_this_load:
          stateLabel === 'LOAD_CAPPED'
            ? `Holding here: no heavier option was available last time, so the rep range was extended to ${line.range_max}.`
            : `Last time: ${line.next_target}${line.unit === 'REPS' ? ' reps' : 's'} at ${fmtLoad(line.next_load)}.`,
      };
    }
  }
}

// ---------- §G.4 per-side (right-arm) items ----------

const STATUS_CONSERVATISM: LineStatus[] = ['CALIBRATE', 'SEEDED', 'RETURN', 'IMPLEMENT_CHANGED', 'NORMAL'];

export interface PerSideInput {
  side: Side;
  status: LineStatusResult;
  targetLoad: TargetLoadResult;
}

export interface PerSideResult {
  left: TargetLoadResult;
  right: TargetLoadResult;
  /** true if the two sides' natural determinations differed and were unified */
  unified: boolean;
}

/**
 * §G.4 (FIXED structure; ALLOW_UNEVEN_SIDE_DOSING UNRESOLVED B5, default false).
 *
 * AMBIGUITY NOTE: the spec states the outcome ("prescription is identical for both
 * sides unless ALLOW_UNEVEN_SIDE_DOSING") but not which side's determination governs
 * when the two sides' lines have independently diverged (a rare edge case — §H.6 keeps
 * both sides' *decisions* merged after every completed exposure, so divergence can only
 * arise pre-merge, e.g. one side never previously exposed). Smallest reasonable choice:
 * when unresolved, prefer whichever side's line status is *least advanced* using the same
 * conservatism spirit as §H.6 (CALIBRATE is the most cautious outcome, NORMAL the least),
 * and within equal status prefer the lower load, then the lower target. This never invents
 * a new programming rule — it degrades to "use whichever side has done this the least."
 */
export function unifyPerSide(left: PerSideInput, right: PerSideInput, allowUnevenSideDosing: boolean): PerSideResult {
  if (allowUnevenSideDosing) {
    return { left: left.targetLoad, right: right.targetLoad, unified: false };
  }
  const same =
    left.targetLoad.line_state === right.targetLoad.line_state &&
    left.targetLoad.target === right.targetLoad.target &&
    left.targetLoad.load === right.targetLoad.load;
  if (same) return { left: left.targetLoad, right: right.targetLoad, unified: false };

  const li = STATUS_CONSERVATISM.indexOf(left.status.status);
  const ri = STATUS_CONSERVATISM.indexOf(right.status.status);
  let chosen: TargetLoadResult;
  if (li !== ri) {
    chosen = li < ri ? left.targetLoad : right.targetLoad;
  } else {
    const lLoad = left.targetLoad.load ?? -Infinity;
    const rLoad = right.targetLoad.load ?? -Infinity;
    if (lLoad !== rLoad) {
      chosen = lLoad < rLoad ? left.targetLoad : right.targetLoad;
    } else {
      chosen = left.targetLoad.target <= right.targetLoad.target ? left.targetLoad : right.targetLoad;
    }
  }
  return { left: chosen, right: chosen, unified: true };
}

// ---------- §G.5 duration estimate, fitting, underfill notice ----------

export function pairSetMinutes(role: Role, unilateralItemCount: number, config: EngineConfigValues): number {
  const base = role === 'PRIMARY' ? config.PAIR_SET_MINUTES.PRIMARY : role === 'SECONDARY' ? config.PAIR_SET_MINUTES.SECONDARY : config.PAIR_SET_MINUTES.OTHER;
  return base + config.UNILATERAL_ADD_MINUTES * unilateralItemCount;
}

export interface PlannedBlockInput {
  block: 'A' | 'B' | 'C';
  mode: 'PAIRED' | 'STRAIGHT_SETS';
  /** role of slot 1, per the formula's "pair_set_min(role of slot 1)" */
  slot1Role: Role;
  sets: number;
  /** only meaningful for block A */
  hasRamp: boolean;
  unilateralItemCount: number;
}

export function blockMinutes(input: PlannedBlockInput, config: EngineConfigValues): number {
  let min = config.BLOCK_SETUP_MINUTES + input.sets * pairSetMinutes(input.slot1Role, input.unilateralItemCount, config);
  if (input.block === 'A' && input.hasRamp) min += config.RAMP_MINUTES;
  if (input.mode === 'STRAIGHT_SETS') min += config.STRAIGHT_SETS_ADD_MINUTES;
  return min;
}

export function estimateSessionMinutes(prepMin: number, blocks: PlannedBlockInput[], hasFinish: boolean, config: EngineConfigValues): number {
  const blockSum = blocks.reduce((sum, b) => sum + blockMinutes(b, config), 0);
  return prepMin + blockSum + (hasFinish ? config.FINISH_MINUTES : 0);
}

export interface FitResult {
  blocks: PlannedBlockInput[];
  hasFinish: boolean;
  sessionMin: number;
  trimsApplied: string[];
  /** false => caller must return NO_SESSION(TOO_SHORT) */
  fits: boolean;
}

/** §G.5 trimming order (FIXED): drop F; reduce sets to floor 2, block by block, C then
 * B then A; drop C, then B. A is never dropped. Tries the smallest trim first and stops
 * as soon as `session_min <= targetMin`. */
export function fitSession(prepMin: number, blocksIn: PlannedBlockInput[], hasFinishIn: boolean, targetMin: number, config: EngineConfigValues): FitResult {
  const blocks = blocksIn.map((b) => ({ ...b }));
  let hasFinish = hasFinishIn;
  const trimsApplied: string[] = [];

  let sessionMin = estimateSessionMinutes(prepMin, blocks, hasFinish, config);
  if (sessionMin <= targetMin) return { blocks, hasFinish, sessionMin, trimsApplied, fits: true };

  if (hasFinish) {
    hasFinish = false;
    trimsApplied.push('DROP_F');
    sessionMin = estimateSessionMinutes(prepMin, blocks, hasFinish, config);
    if (sessionMin <= targetMin) return { blocks, hasFinish, sessionMin, trimsApplied, fits: true };
  }

  for (const id of ['C', 'B', 'A'] as const) {
    const b = blocks.find((x) => x.block === id);
    if (!b) continue;
    while (b.sets > 2) {
      b.sets -= 1;
      trimsApplied.push(`REDUCE_SETS_${id}`);
      sessionMin = estimateSessionMinutes(prepMin, blocks, hasFinish, config);
      if (sessionMin <= targetMin) return { blocks, hasFinish, sessionMin, trimsApplied, fits: true };
    }
  }

  for (const id of ['C', 'B'] as const) {
    const idx = blocks.findIndex((x) => x.block === id);
    if (idx === -1) continue;
    blocks.splice(idx, 1);
    trimsApplied.push(`DROP_${id}`);
    sessionMin = estimateSessionMinutes(prepMin, blocks, hasFinish, config);
    if (sessionMin <= targetMin) return { blocks, hasFinish, sessionMin, trimsApplied, fits: true };
  }

  const fits = sessionMin <= targetMin + config.DURATION_TOLERANCE_MINUTES;
  return { blocks, hasFinish, sessionMin, trimsApplied, fits };
}

export interface UnderfillArgs {
  /** R-01: minutes the user made available */
  targetMin: number;
  sessionMin: number;
  apartmentSessionsCompleted: number;
  posture: Posture;
  anySlotEmptyAfterFallback: boolean;
  config: EngineConfigValues;
}

export interface UnderfillResult {
  planned_min: number;
  available_min: number;
  cause: UnderfillCause;
}

/** [M-16]: underfill notice, first-matching cause. Returns null when the gap does not
 * exceed UNDERFILL_NOTICE_MINUTES. */
export function computeUnderfill(args: UnderfillArgs): UnderfillResult | null {
  const gap = args.targetMin - args.sessionMin;
  if (gap <= args.config.UNDERFILL_NOTICE_MINUTES) return null;

  let cause: UnderfillCause;
  if (args.apartmentSessionsCompleted < args.config.FIRST_SESSIONS_NO_FINISH && args.targetMin >= args.config.TIER_ABCF_MINUTES) {
    cause = 'FIRST_SESSIONS';
  } else if (args.posture === 'LIGHT') {
    cause = 'LIGHT_POSTURE';
  } else if (args.anySlotEmptyAfterFallback) {
    cause = 'SLOTS_EMPTY';
  } else if (args.targetMin >= args.config.TIER_ABCF_MINUTES) {
    cause = 'TIER_MAXIMUM';
  } else {
    cause = 'TIER_BOUNDARY';
  }
  return { planned_min: args.sessionMin, available_min: args.targetMin, cause };
}
