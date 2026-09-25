/**
 * Engine facade (APP_TECH_ARCHITECTURE_V0.md §7.1). PURE: no I/O, no Date.now(), no
 * Math.random(), no globals — `now`, IDs, and data are always arguments (engine
 * ENGINE_WORKOUT_GENERATOR_V0_2_1.md, Conventions: Determinism, Time). Enforced by
 * `tests/architecture.test.ts`, which scans every file under src/engine for the
 * forbidden identifiers.
 *
 * B5 status: the rule engine itself (engine/{familyPlan,selection,station,prescription,
 * progression,filters,validation,explain,completion,alloy,generate,state}.ts) is real and
 * test-covered (tests/engine/*.test.ts, tests/architecture.test.ts) — see those files for
 * the actual generator. This facade wires that engine to the Datapack/SourceDocuments
 * contracts so a caller outside src/engine never has to import engine-internal modules
 * directly.
 *
 * SCOPE NOTE, honestly kept from B1: `replay()` is NOT implemented here. Rebuilding
 * GeneratorState from a real document history means folding Workout (real logged sets,
 * not a simulated performer), ExternalSession (Alloy logs) and UserActionEvent records
 * into completion.ts/alloy.ts/completion.ts's applyUserActionEvent, in chronological
 * order, correlating each Workout back to the Generation that produced it for fields
 * (posture, line_state) a Workout doesn't carry itself. That is a real, separate piece of
 * work — a persistence/replay layer — not a short extension of B5's 11-item scope (state
 * calculation, movement exposure, hard filtering, scoring, pairing, prescription,
 * progression, finish logic, validation, generation record, state updates), all of which
 * are implemented and tested. Every other facade function below is real.
 */
import type {
  CheckIn,
  Datapack,
  Generation,
  UserActionEvent,
  ExternalSession,
  Workout,
} from '../contracts';
import type { GeneratorState } from './types';
import { anchorKey, lineKey } from './types';
import { loadPool, type PoolExercise } from './pool';
import { effectiveEquipmentMap } from './equipment';
import { computeServability } from './servability';
import { candidatesFor, evaluateSlotCandidates, type FilterCtx } from './filters';
import { orderEligible, type SelectionSortOpts } from './selection';
import { generate as runGenerate, type GenerateResult } from './generate';
import { promptsDue as alloyPromptsDue, type AlloyScheduleEntry, type ScheduledSlot } from './alloy';
import { toLocalDate } from '../domain/time';
import { daySeed } from '../domain/seed';

/** The pack after `validatePack` — pool membership resolved (engine §7.1, V-00a..g). */
export interface LoadedPack {
  pack: Datapack;
  pool: PoolExercise[];
}

export interface PackValidation {
  pool: string[]; // exercise_ids admitted to the pool
  rejected: { exercise_id: string; validator: string }[];
  notReady: string[]; // families without a valid order approval (I-10) or similar blockers
}

export interface SourceDocuments {
  checkIns: CheckIn[];
  workouts: Workout[];
  externalSessions: ExternalSession[];
  events: UserActionEvent[];
}

/** replay() output shape (engine §B.1, §7.1) — kept typed for callers even though
 * replay() itself is not implemented (see the SCOPE NOTE above). */
export interface Derived {
  state: GeneratorState;
  decisions: unknown[]; // CompletionDecision[]
  exposures: unknown[]; // MovementExposure[]
  recoveryCredits: unknown[]; // RecoveryCredit[]
  errors: unknown[]; // replay isolation (§10.6): non-fatal, per-record
}

export interface AlloyPrompt {
  slotKey: string;
  scheduledStart: string;
}

export interface GenerationResult {
  /** The engine's own generation result (session or no-session), exactly as
   * engine/generate.ts produced it. Building the full persisted `Generation` document
   * (state_digest, config_hash, app_version, doc envelope) is a store/app-layer job, not
   * an engine-facade one — see engine/generate.ts's own header comment for the fields
   * this result does and does not populate (PREP items, in particular, are not built). */
  result: GenerateResult;
}

export interface SwapOption {
  exercise_id: string;
  display_name: string;
  outcome: 'ELIGIBLE' | string; // 'ELIGIBLE' or a FilterResult-shaped hfId/outcome string
}

export interface SwapOptions {
  options: SwapOption[];
  held: SwapOption[];
}

export interface ServabilityReport {
  unservable: { family: string; unblockingQuestion: string | null }[];
}

export type LineRef = { exercise_id: string; role: string; side: string };

function notImplemented(fn: string): never {
  throw new Error(`engine.${fn}: not implemented — see this file's SCOPE NOTE`);
}

// ---------- validatePack (§Q.1.2 V-00a..g) ----------

export function validatePack(pack: Datapack): PackValidation {
  const knownEquipmentIds = new Set(
    pack.equipment_catalog.length > 0 ? pack.equipment_catalog.map((c) => c.equipment_id) : pack.equipment_baseline.map((e) => e.equipment_id),
  );
  const { pool, rejected } = loadPool(pack.exercise_metadata, knownEquipmentIds);
  return {
    pool: pool.map((e) => e.exercise_id),
    rejected: rejected.map((r) => ({ exercise_id: r.exercise_id, validator: r.validator })),
    // I-10 (family order approvals) is a pack-authoring-tool concern (APP_BUILD_SEQUENCE_V0.md
    // B2), not something the engine facade can determine from a Datapack alone; left empty
    // rather than guessed.
    notReady: [],
  };
}

function loadPoolFromPack(pack: Datapack): PoolExercise[] {
  const knownEquipmentIds = new Set(
    pack.equipment_catalog.length > 0 ? pack.equipment_catalog.map((c) => c.equipment_id) : pack.equipment_baseline.map((e) => e.equipment_id),
  );
  return loadPool(pack.exercise_metadata, knownEquipmentIds).pool;
}

// ---------- replay (NOT IMPLEMENTED — see header SCOPE NOTE) ----------

export function replay(_pack: LoadedPack, _docs: SourceDocuments): Derived {
  return notImplemented('replay');
}

// ---------- promptsDue (§L.2) ----------

export interface PromptsDueSettings {
  schedule: AlloyScheduleEntry[];
  /** whether an Alloy ExternalSession already exists for this local date (the caller
   * already has SourceDocuments.externalSessions; this facade doesn't re-derive it). */
  hasAlloyLogOnDate: (localDate: string) => boolean;
}

export function promptsDue(pack: LoadedPack, derived: Derived, settings: PromptsDueSettings, now: string): AlloyPrompt[] {
  const slots: ScheduledSlot[] = alloyPromptsDue(
    now,
    pack.pack.profile.default_tz,
    pack.pack.config.values,
    settings.schedule,
    derived.state.alloy_resolved,
    settings.hasAlloyLogOnDate,
  );
  return slots.map((s) => ({ slotKey: s.slotKey, scheduledStart: s.scheduledAtUtc }));
}

// ---------- generate (§C.1 — the B5 deliverable) ----------

export function generate(
  pack: LoadedPack,
  derived: Derived,
  checkIn: CheckIn,
  ctx: { now: string; generationId: string; userId: string },
): GenerationResult {
  const tz = pack.pack.profile.default_tz;
  const todayLocalDate = toLocalDate(ctx.now, tz);
  const avoidances = new Set(pack.pack.profile.avoidances.map((a) => a.exercise_id));
  const result = runGenerate({
    pool: pack.pool,
    equipmentBaseline: pack.pack.equipment_baseline,
    constraints: pack.pack.constraints,
    avoidances,
    config: pack.pack.config.values,
    state: derived.state,
    checkIn,
    now: ctx.now,
    tz,
    todayLocalDate,
    seed: daySeed(ctx.userId, todayLocalDate, derived.state.apartment_sessions_completed),
    // Alloy prompts are resolved by the caller before calling generate (§C.1 step 2);
    // this facade doesn't do prompt resolution itself (see promptsDue()/alloy.ts).
    alloy: { prompts_asked: [], answers: [], credits_applied: [], recovery_credits_applied: [] },
    metadataRejected: [],
  });
  return { result };
}

// ---------- swapOptions (§E.6, user swap list) ----------

export function swapOptions(
  pack: LoadedPack,
  derived: Derived,
  generation: Generation,
  req: { slot: string; todayIssues: string[]; busyStations: string[]; now: string },
): SwapOptions {
  const planned = generation.session?.items.find((i) => i.slot === req.slot);
  if (!planned) return { options: [], held: [] };

  const tz = pack.pack.profile.default_tz;
  const equip = effectiveEquipmentMap(pack.pack.equipment_baseline, derived.state.equipment_overrides);
  const ctx: FilterCtx = {
    now: req.now,
    todayLocalDate: toLocalDate(req.now, tz),
    tz,
    posture: generation.session!.posture,
    constraints: pack.pack.constraints,
    avoidances: new Set(pack.pack.profile.avoidances.map((a) => a.exercise_id)),
    todaySoreRegions: new Set(),
    equip,
    todayEquipmentIssues: req.todayIssues,
    state: derived.state,
    selectedIds: new Set(generation.session!.items.map((i) => i.exercise_id)),
    hoursSinceLower: null,
    repeatExclusionDays: 1,
    heavyLowerRecoveryHours: pack.pack.config.values.HEAVY_LOWER_RECOVERY_HOURS,
  };

  const candidates = candidatesFor(pack.pool, planned.family, planned.sub_target, planned.role);
  const outcomes = evaluateSlotCandidates(candidates, planned.role, ctx);
  const opts: SelectionSortOpts = {
    preference: derived.state.preference,
    exerciseLastUsed: derived.state.exercise_last_used,
    hasLine: (id) => Object.keys(derived.state.lines).some((k) => k.startsWith(`${id}|`)),
    anchorOtherRole: null,
    r04Worse: false,
  };
  const eligible = candidates.filter((c) => outcomes.get(c.exercise_id) === null && c.exercise_id !== planned.exercise_id);
  const ordered = orderEligible(eligible, planned.role, opts, false, 0, `swap:${req.slot}`).ordered;

  const options: SwapOption[] = ordered
    .filter((e) => !req.busyStations.includes(e.station))
    .map((e) => ({ exercise_id: e.exercise_id, display_name: e.display_name, outcome: 'ELIGIBLE' }));
  const held: SwapOption[] = candidates
    .filter((c) => c.exercise_id !== planned.exercise_id && outcomes.get(c.exercise_id) !== null)
    .map((c) => {
      const o = outcomes.get(c.exercise_id)!;
      return { exercise_id: c.exercise_id, display_name: c.display_name, outcome: `${o.hfId}:${o.outcome}` };
    });
  return { options, held };
}

// ---------- servability (§C.4.1) ----------

const ALL_FAMILIES = ['KD', 'HD', 'HPUSH', 'VPUSH', 'HPULL', 'VPULL', 'ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY', 'GOAL_ACCESSORY', 'MOBILITY', 'CONDITIONING'] as const;

export function servability(pack: LoadedPack, derived: Derived, now: string): ServabilityReport {
  // Deviation from the B1 stub's signature `servability(pack, derived)`: servability is
  // inherently time-dependent (today-only filters, HF-12 recovery windows), and the
  // engine's own determinism rule (never read the clock — `now` is always an argument,
  // enforced by tests/architecture.test.ts) means this facade cannot default `now`
  // itself. Adding the parameter is the smallest change that keeps the function pure.
  const tz = pack.pack.profile.default_tz;
  const equip = effectiveEquipmentMap(pack.pack.equipment_baseline, derived.state.equipment_overrides);
  const ctx: FilterCtx = {
    now,
    todayLocalDate: toLocalDate(now, tz),
    tz,
    posture: 'NORMAL',
    constraints: pack.pack.constraints,
    avoidances: new Set(pack.pack.profile.avoidances.map((a) => a.exercise_id)),
    todaySoreRegions: new Set(),
    equip,
    todayEquipmentIssues: [],
    state: derived.state,
    selectedIds: new Set(),
    hoursSinceLower: null,
    repeatExclusionDays: 1,
    heavyLowerRecoveryHours: pack.pack.config.values.HEAVY_LOWER_RECOVERY_HOURS,
  };
  const { unservable } = computeServability([...ALL_FAMILIES], pack.pool, ctx);
  return { unservable: unservable.map((f) => ({ family: f, unblockingQuestion: null })) };
}

// ---------- equipmentImpact ----------

export function equipmentImpact(derived: Derived, equipmentId: string): LineRef[] {
  const refs: LineRef[] = [];
  for (const line of Object.values(derived.state.lines)) {
    if (line.implement.includes(equipmentId)) {
      refs.push({ exercise_id: line.exercise_id, role: line.role, side: line.side });
    }
  }
  return refs;
}

export { anchorKey, lineKey, loadPoolFromPack };

/** ENGINE_VERSION (APP_TECH_ARCHITECTURE_V0.md §7.2); PARAMs come from the pack config, never from code. */
export const ENGINE_VERSION = '0.2.1';
