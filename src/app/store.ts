/**
 * The app store: the React-facing layer that owns the in-memory document index (the
 * StorageAdapter interface has no querying, APP_TECH_ARCHITECTURE_V0.md §10.1 — the app
 * layer loads everything once and indexes it) and wires the real engine
 * (src/engine, via sessionLogic.ts) to real persistence (src/store) instead of mock data.
 *
 * A plain class with a tiny pub-sub, read through React's useSyncExternalStore — no state
 * library dependency needed for this scope (Today + Focus mode only).
 */
import { useSyncExternalStore } from 'react';
import type { Availability, CheckIn, Datapack, EngineConfigValues, ExternalSession, Meta, Settings, UserProfile, Workout } from '../contracts';
import { APP_SCHEMA_VERSION, DatapackSchema, MetaSchema, SettingsSchema } from '../contracts';
import type { StorageAdapter, StoredDoc } from '../store/StorageAdapter';
import { IndexedDbAdapter } from '../store/IndexedDbAdapter';
import { loadDefaultDatapack } from './datapack';
import { loadPool, type PoolExercise } from '../engine/pool';
import { createEmptyState } from '../engine/state';
import { applyUserActionEvent } from '../engine/completion';
import type { GeneratorState } from '../engine/types';
import { effectiveEquipmentMap, type EffectiveEquipment } from '../engine/equipment';
import type { LoadedPack, Derived } from '../engine/index';
import { newId, SEED_USER_ID } from '../domain/ids';
import { buildBackup, backupFileName, parseBackup, type AppBackup } from './backup';
import { saveJsonFile, pickJsonFile, type SaveResult } from '../platform/fileIO';
import { requestStoragePersistence, getStoragePersistStatus, type StoragePersistStatus } from '../platform/storagePersistence';
import { registerServiceWorker, onUpdateWaiting, applyWaitingUpdate } from '../platform/serviceWorker';

export type { StoragePersistStatus, SaveResult };
import {
  buildCheckIn,
  normalDayCheckIn,
  buildGeneration,
  buildWorkoutFromSession,
  isSession,
  computeSwapOptions,
  applySwap as sessionApplySwap,
  logSet as sessionLogSet,
  skipItem as sessionSkipItem,
  addFlag as sessionAddFlag,
  setItemNote as sessionSetItemNote,
  finishWorkout as sessionFinishWorkout,
  buildAlloySession,
  creditFromAlloySession,
  buildConfirmEquipmentEvent,
  applyProfilePatch,
  addAvoidance as sessionAddAvoidance,
  removeAvoidance as sessionRemoveAvoidance,
  type DifferentDayAnswers,
  type StoredGeneration,
  type FlatStep,
  type LogSetInput,
  type AlloySessionInput,
  type EditableProfileFields,
} from './sessionLogic';
import type { FlagCode, Side, SlotId } from '../contracts';
import type { SwapOptions } from '../engine/index';

const ENGINE_STATE_ID = 'engine_state';
const DATAPACK_ID = 'datapack';
const META_ID = 'meta';
const SETTINGS_ID = 'settings';

/** Best-effort, browser-only; MemoryAdapter-backed tests run under Node (no `navigator`),
 * so this always has a safe fallback rather than throwing. Just a human-readable label
 * for telling backups apart (P-09) — never used by the engine or by any generation
 * decision. */
function defaultDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent ?? '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android device';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'This device';
}

interface StoredEngineState extends StoredDoc {
  id: typeof ENGINE_STATE_ID;
  type: 'engine_state';
  state: GeneratorState;
}

export type AppStatus = 'loading' | 'ready' | 'error';

export interface AppSnapshot {
  status: AppStatus;
  error: string | null;
  /** the most recently touched workout, regardless of status — the UI decides what to
   * show (an IN_PROGRESS one resumes Focus mode; a COMPLETED one is just history). */
  activeWorkout: Workout | null;
  activeGeneration: StoredGeneration | null;
  activeCheckIn: CheckIn | null;
  lastNoSession: { reason: string; sentence: string } | null;
  /** HISTORY: every persisted workout and Alloy/external session, newest first. */
  workouts: Workout[];
  externalSessions: ExternalSession[];
  /** PROFILE / EQUIPMENT screens re-render off these — they come from the persisted,
   * editable Datapack copy (see `loadOrSeedDatapack`), not the read-only bundled seed. */
  profile: UserProfile;
  equipmentBaseline: Datapack['equipment_baseline'];
  equipmentOverrides: GeneratorState['equipment_overrides'];
  /** schema/version metadata (D-108) and device settings (P-09: versions, export,
   * persistence status) — both real, persisted documents (see loadOrSeedMeta /
   * loadOrSeedSettings), not placeholders. */
  meta: Meta;
  settings: Settings;
  /** D-109: a new service-worker version has installed and is waiting to activate. It
   * only ever gets applied when no workout is IN_PROGRESS (see AppStore.init /
   * finishWorkout, which retry `tryApplyPendingUpdate`); this flag is surfaced so the UI
   * can say so if it's stuck waiting on a long-running session. */
  updateAvailable: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function buildDefaultMeta(t: string): Meta {
  return { id: META_ID, type: 'meta', created_at: t, updated_at: t, app_schema_version: APP_SCHEMA_VERSION, installed_at: t };
}

function buildDefaultSettings(t: string, defaultTz: string): Settings {
  return {
    id: SETTINGS_ID,
    type: 'settings',
    created_at: t,
    updated_at: t,
    tz: defaultTz,
    units: 'lb',
    sound_rest_end: true,
    ask_sleep_and_fueling_every_time: false,
    technical_details: false,
    alloy_schedule: null,
    setup_completed_at: null,
    last_export_at: null,
    device_label: defaultDeviceLabel(),
  };
}

export class AppStore {
  private adapter: StorageAdapter;
  private listeners = new Set<() => void>();
  private snapshot: AppSnapshot = {
    status: 'loading',
    error: null,
    activeWorkout: null,
    activeGeneration: null,
    activeCheckIn: null,
    lastNoSession: null,
    workouts: [],
    externalSessions: [],
    profile: loadDefaultDatapack().profile,
    equipmentBaseline: loadDefaultDatapack().equipment_baseline,
    equipmentOverrides: {},
    meta: buildDefaultMeta(new Date(0).toISOString()),
    settings: buildDefaultSettings(new Date(0).toISOString(), loadDefaultDatapack().profile.default_tz),
    updateAvailable: false,
  };

  // resolved once at init(), then held for the session. `pack` starts as the bundled dev
  // seed and is overwritten in init() by whatever's actually persisted (see
  // `loadOrSeedDatapack`) — PROFILE/EQUIPMENT edits mutate that persisted copy, never the
  // bundled file, so B2's still-unbuilt datapack-authoring tool isn't a prerequisite for
  // "changes affect subsequent generation."
  private pack = loadDefaultDatapack();
  private pool: PoolExercise[] = [];
  private config: EngineConfigValues;
  private engineState: GeneratorState = createEmptyState();
  private equip: Map<string, EffectiveEquipment> = new Map();
  private docsById = new Map<string, StoredDoc>();
  private meta: Meta = buildDefaultMeta(new Date(0).toISOString());
  private settingsDoc: Settings = buildDefaultSettings(new Date(0).toISOString(), 'America/Los_Angeles');
  private swUpdatePending = false;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? new IndexedDbAdapter();
    this.config = this.pack.config.values;
    // D-109: registered once per AppStore instance; fires whenever a new service-worker
    // version has installed and is waiting. Applying it is gated on no workout being
    // IN_PROGRESS, so this only flips a flag and tries — it doesn't reload on its own.
    onUpdateWaiting(() => {
      this.swUpdatePending = true;
      this.setSnapshot({ updateAvailable: true });
      void this.tryApplyPendingUpdate();
    });
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): AppSnapshot => this.snapshot;

  private setSnapshot(patch: Partial<AppSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }

  private loadedPack(): LoadedPack {
    return { pack: this.pack, pool: this.pool };
  }

  /** Read-only accessors the UI needs for display (load chips, equipment lookups, "why"
   * text) without duplicating the store's own loaded state. */
  getEquip(): Map<string, EffectiveEquipment> {
    return this.equip;
  }

  getConfig(): EngineConfigValues {
    return this.config;
  }

  getPool(): PoolExercise[] {
    return this.pool;
  }

  getEquipmentCatalog() {
    return this.pack.equipment_catalog;
  }

  private derived(): Derived {
    return { state: this.engineState, decisions: [], exposures: [], recoveryCredits: [], errors: [] };
  }

  async init(): Promise<void> {
    // D-109: fire-and-forget — registration failing or being slow must never block the
    // app from opening (offline-first). Idempotent: re-running init() (e.g. after a
    // backup restore) just reuses the existing registration.
    void registerServiceWorker();
    try {
      const docs = await this.adapter.loadAll();
      this.docsById = new Map(docs.map((d) => [d.id, d]));

      // D-108: stored shapes are versioned by an integer app_schema_version; migrations
      // are pure and run in memory (none exist yet — APP_SCHEMA_VERSION has only ever
      // been 1); downgrades are refused rather than risking silent data loss under an
      // older app build.
      this.meta = await this.loadOrSeedMeta();

      this.pack = await this.loadOrSeedDatapack();
      this.config = this.pack.config.values;
      this.settingsDoc = await this.loadOrSeedSettings();
      const knownEquipmentIds = new Set(this.pack.equipment_catalog.map((c) => c.equipment_id));
      const { pool } = loadPool(this.pack.exercise_metadata, knownEquipmentIds);
      this.pool = pool;

      const stateDoc = docs.find((d) => d.type === 'engine_state') as StoredEngineState | undefined;
      this.engineState = stateDoc?.state ?? createEmptyState();
      this.equip = effectiveEquipmentMap(this.pack.equipment_baseline, this.engineState.equipment_overrides);

      const workouts = this.listDocs<Workout>('workout').sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
      const active = workouts.find((w) => w.status === 'IN_PROGRESS') ?? null;
      let activeGeneration: StoredGeneration | null = null;
      let activeCheckIn: CheckIn | null = null;
      if (active) {
        activeGeneration = (this.docsById.get(active.generation_id) as unknown as StoredGeneration) ?? null;
        activeCheckIn = (this.docsById.get(active.check_in_id) as unknown as CheckIn) ?? null;
      }
      const externalSessions = this.listDocs<ExternalSession>('external_session').sort((a, b) => Date.parse(b.performed_at) - Date.parse(a.performed_at));

      this.setSnapshot({
        status: 'ready',
        activeWorkout: active,
        activeGeneration,
        activeCheckIn,
        workouts,
        externalSessions,
        profile: this.pack.profile,
        equipmentBaseline: this.pack.equipment_baseline,
        equipmentOverrides: this.engineState.equipment_overrides,
        meta: this.meta,
        settings: this.settingsDoc,
      });
      void this.tryApplyPendingUpdate();
    } catch (err) {
      this.setSnapshot({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  /** D-109: applies a waiting service-worker update — which reloads the page once it
   * takes over (src/platform/serviceWorker.ts's controllerchange handler) — but only when
   * one is actually pending and no workout is IN_PROGRESS. A no-op otherwise. Retried on
   * every init() (i.e. on launch and after a backup restore) and after finishWorkout, so
   * an update that arrived mid-session gets applied as soon as it's safe rather than
   * waiting for the next full app launch. */
  private async tryApplyPendingUpdate(): Promise<void> {
    if (!this.swUpdatePending) return;
    if (this.snapshot.activeWorkout?.status === 'IN_PROGRESS') return;
    const applied = await applyWaitingUpdate();
    if (applied) this.swUpdatePending = false;
  }

  /** The persisted, editable Datapack copy (PROFILE/EQUIPMENT edits land here) — seeded
   * once from the bundled dev JSON (`loadDefaultDatapack`) on first run. B2 (the real
   * datapack-authoring tool) still isn't built; this is the smallest persistence this
   * pass needs so profile/equipment edits actually change what the next GENERATE sees,
   * without pretending to be that tool. */
  private async loadOrSeedDatapack(): Promise<Datapack> {
    const existing = this.docsById.get(DATAPACK_ID);
    if (existing) {
      const parsed = DatapackSchema.safeParse(existing);
      if (parsed.success) return parsed.data;
      // a corrupt/outdated persisted copy falls back to the bundled seed rather than
      // blocking the whole app on a parse error
    }
    const seed = loadDefaultDatapack();
    await this.persist(seed as unknown as StoredDoc);
    return seed;
  }

  /** Schema/version metadata (D-108). Synchronous and non-persisting on the read path —
   * the very first run is the only time this writes, via `init()`'s normal `persist()`
   * call below, so a corrupt/missing meta doc never blocks app start. A stored version
   * newer than this build understands is a downgrade and is refused outright (throwing
   * here surfaces as AppSnapshot.status 'error' with a clear message) rather than risking
   * silently misreading a future shape. */
  private async loadOrSeedMeta(): Promise<Meta> {
    const existing = this.docsById.get(META_ID);
    if (existing) {
      const parsed = MetaSchema.safeParse(existing);
      if (parsed.success) {
        if (parsed.data.app_schema_version > APP_SCHEMA_VERSION) {
          throw new Error(
            `This install understands data version ${APP_SCHEMA_VERSION}, but your data is version ${parsed.data.app_schema_version} (from a newer app build). Update the app before opening this data, or restore an older backup.`,
          );
        }
        return parsed.data;
      }
      // a corrupt meta doc shouldn't block the whole app — treated as first-run below
    }
    const meta = buildDefaultMeta(now());
    await this.persist(meta as unknown as StoredDoc);
    return meta;
  }

  /** Device settings (P-09): device label, tz/units defaults, and `last_export_at` (the
   * quiet backup-reminder threshold reads this). Seeded from the active pack's profile
   * on first run, then a real, independently editable document from then on. */
  private async loadOrSeedSettings(): Promise<Settings> {
    const existing = this.docsById.get(SETTINGS_ID);
    if (existing) {
      const parsed = SettingsSchema.safeParse(existing);
      if (parsed.success) return parsed.data;
    }
    const settings = buildDefaultSettings(now(), this.pack.profile.default_tz);
    await this.persist(settings as unknown as StoredDoc);
    return settings;
  }

  private listDocs<T>(type: string): T[] {
    return Array.from(this.docsById.values()).filter((d) => d.type === type) as unknown as T[];
  }

  private async persist(...docs: StoredDoc[]): Promise<void> {
    await this.adapter.putMany(docs);
    for (const d of docs) this.docsById.set(d.id, d);
  }

  private async persistEngineState(state: GeneratorState): Promise<void> {
    const doc: StoredEngineState = { id: ENGINE_STATE_ID, type: 'engine_state', created_at: now(), updated_at: now(), state };
    await this.persist(doc as unknown as StoredDoc);
    this.engineState = state;
    this.equip = effectiveEquipmentMap(this.pack.equipment_baseline, state.equipment_overrides);
    this.setSnapshot({ equipmentOverrides: state.equipment_overrides });
  }

  private refreshHistoryLists(): void {
    const workouts = this.listDocs<Workout>('workout').sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
    const externalSessions = this.listDocs<ExternalSession>('external_session').sort((a, b) => Date.parse(b.performed_at) - Date.parse(a.performed_at));
    this.setSnapshot({ workouts, externalSessions });
  }

  // -------------------------------------------------------------------
  // TODAY / readiness -> GENERATE -> START
  // -------------------------------------------------------------------

  async startNormalDay(args: { minutesAvailable: number; symptomToday: 'no' | 'yes'; symptomChoice: 'normal' | 'lighter' | 'skip' | null; equipmentIssues: string[] }): Promise<{ workout: Workout } | { noSession: { reason: string; sentence: string } }> {
    const t = now();
    const checkIn = normalDayCheckIn({
      id: newId('ci'),
      now: t,
      localDate: t.slice(0, 10),
      tz: this.pack.profile.default_tz,
      minutesAvailable: args.minutesAvailable,
      symptomToday: args.symptomToday,
      symptomChoice: args.symptomChoice,
      equipmentIssues: args.equipmentIssues,
    });
    return this.startFromCheckIn(checkIn);
  }

  async startDifferentDay(answers: DifferentDayAnswers): Promise<{ workout: Workout } | { noSession: { reason: string; sentence: string } }> {
    const t = now();
    const checkIn = buildCheckIn({ id: newId('ci'), now: t, localDate: t.slice(0, 10), tz: this.pack.profile.default_tz, answers });
    return this.startFromCheckIn(checkIn);
  }

  private async startFromCheckIn(checkIn: CheckIn): Promise<{ workout: Workout } | { noSession: { reason: string; sentence: string } }> {
    const t = now();
    const generation = buildGeneration({ pack: this.loadedPack(), derived: this.derived(), checkIn, now: t, userId: SEED_USER_ID });
    await this.persist(checkIn as unknown as StoredDoc, generation as unknown as StoredDoc);

    if (!isSession(generation.result)) {
      const noSession = { reason: generation.result.reason, sentence: generation.result.sentence };
      this.setSnapshot({ activeCheckIn: checkIn, activeGeneration: generation, lastNoSession: noSession });
      return { noSession };
    }

    const workout = buildWorkoutFromSession({
      workoutId: newId('wo'),
      generationId: generation.id,
      checkInId: checkIn.id,
      now: t,
      planLocalDate: checkIn.local_date,
      session: generation.result,
      pool: this.pool,
    });
    await this.persist(workout as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: workout, activeGeneration: generation, activeCheckIn: checkIn, lastNoSession: null });
    return { workout };
  }

  // -------------------------------------------------------------------
  // WARM-UP
  // -------------------------------------------------------------------

  async completeWarmup(): Promise<void> {
    const workout = this.requireActiveWorkout();
    const next: Workout = { ...workout, warmup_completed: true, updated_at: now() };
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  // -------------------------------------------------------------------
  // LOG SETS
  // -------------------------------------------------------------------

  async logSet(step: FlatStep, input: LogSetInput): Promise<void> {
    const workout = this.requireActiveWorkout();
    const next = sessionLogSet(workout, step, input);
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  async skipItem(itemKey: string): Promise<void> {
    const workout = this.requireActiveWorkout();
    const next = sessionSkipItem(workout, itemKey, now());
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  async setItemNote(itemKey: string, note: string | null): Promise<void> {
    const workout = this.requireActiveWorkout();
    const next = sessionSetItemNote(workout, itemKey, note, now());
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  async addFlag(args: { itemKey: string; side: Side | null; code: FlagCode; text?: string | null }): Promise<void> {
    const workout = this.requireActiveWorkout();
    const next = sessionAddFlag(workout, { ...args, now: now() });
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  // -------------------------------------------------------------------
  // SWAP IF NEEDED
  // -------------------------------------------------------------------

  getSwapOptions(slot: SlotId, todayIssues: string[] = [], busyStations: string[] = []): SwapOptions {
    const generation = this.snapshot.activeGeneration;
    if (!generation || !isSession(generation.result)) return { options: [], held: [] };
    return computeSwapOptions({
      pack: this.loadedPack(),
      derived: this.derived(),
      session: generation.result,
      generationId: generation.id,
      slot,
      todayIssues,
      busyStations,
      now: now(),
    });
  }

  async applySwap(slotItemKey: string, newExerciseId: string, swapType: 'USER_SWAP' | 'USER_REPLACE' = 'USER_SWAP'): Promise<void> {
    const workout = this.requireActiveWorkout();
    const generation = this.snapshot.activeGeneration;
    if (!generation || !isSession(generation.result)) throw new Error('applySwap: no active session generation');
    const slotItem = workout.items.find((i) => i.item_key === slotItemKey);
    if (!slotItem) throw new Error(`applySwap: item ${slotItemKey} not found`);

    const next = sessionApplySwap({
      workout,
      slotItem,
      newExerciseId,
      pool: this.pool,
      state: this.engineState,
      equip: this.equip,
      config: this.config,
      posture: generation.result.posture,
      now: now(),
      swapType,
    });
    await this.persist(next as unknown as StoredDoc);
    this.setSnapshot({ activeWorkout: next });
  }

  // -------------------------------------------------------------------
  // COMPLETE -> UPDATE HISTORY
  // -------------------------------------------------------------------

  async finishWorkout(sessionCapacity: 'below_usual' | 'usual' | 'above_usual', finishMethod: 'FINISH_STEP' | 'END_SESSION' | 'FINISHED_LATER' = 'FINISH_STEP'): Promise<Workout> {
    const workout = this.requireActiveWorkout();
    const checkIn = this.snapshot.activeCheckIn;
    const generation = this.snapshot.activeGeneration;
    if (!checkIn) throw new Error('finishWorkout: no active check-in');
    if (!generation || !isSession(generation.result)) throw new Error('finishWorkout: no active session generation');

    const t = now();
    const result = sessionFinishWorkout({
      workout,
      state: this.engineState,
      checkIn,
      equip: this.equip,
      pool: this.pool,
      config: this.config,
      now: t,
      sessionCapacity,
      finishMethod,
      posture: generation.result.posture,
    });

    await this.persist(result.workout as unknown as StoredDoc);
    await this.persistEngineState(result.state);
    this.setSnapshot({ activeWorkout: result.workout });
    // Bug fix (V0 QA pass): a completed workout must show up in History immediately, not
    // only after a full reload re-fetches `workouts` from the adapter in init(). Every
    // other place that changes the history lists (Alloy save/edit/delete) already calls
    // this; finishWorkout simply never did.
    this.refreshHistoryLists();
    void this.tryApplyPendingUpdate();
    return result.workout;
  }

  private requireActiveWorkout(): Workout {
    const w = this.snapshot.activeWorkout;
    if (!w) throw new Error('No active workout');
    return w;
  }

  // -------------------------------------------------------------------
  // LOG ALLOY SESSION / HISTORY
  // -------------------------------------------------------------------

  /** Builds + persists a new externally-logged Alloy session, then credits the same
   * movement/exercise history the generator itself reads (engine/alloy.ts's
   * creditAlloyLog, via sessionLogic's creditFromAlloySession) — an Alloy log is not a
   * cosmetic record, it changes what the next GENERATE call sees (parent-pattern and,
   * for FULL-mode logs, specific-family staleness plus exercise_last_used). Accepts
   * partial/incomplete input by construction: every set/rep/load/family field on each
   * item is nullable end to end (see AlloySessionInput / buildAlloySession). */
  async saveAlloySession(input: Omit<AlloySessionInput, 'now'>): Promise<ExternalSession> {
    const t = now();
    const session = buildAlloySession({ ...input, now: t }, this.pool);
    await this.persist(session as unknown as StoredDoc);
    const nextState = creditFromAlloySession(this.engineState, session);
    await this.persistEngineState(nextState);
    this.refreshHistoryLists();
    return session;
  }

  /** Edits an existing Alloy session in place (same id, original created_at preserved).
   * Crediting is applied forward-only, on top of whatever the session now says — it does
   * NOT first retract credit from the pre-edit version (that needs a full state replay(),
   * not built in this pass). That's safe/idempotent for staleness timestamps
   * (exercise_last_used / family last-used are max-of-timestamps operations) but can
   * double-count parent-pattern exposure if an edit changes which families were logged.
   * This is a documented, honest limitation per the project's evidence-discipline rule —
   * never silently presented as fully correct — not a silently hidden gap. */
  async updateAlloySession(id: string, input: Omit<AlloySessionInput, 'now' | 'id' | 'createdAt'>): Promise<ExternalSession> {
    const existing = this.docsById.get(id) as unknown as ExternalSession | undefined;
    if (!existing) throw new Error(`updateAlloySession: session ${id} not found`);
    const t = now();
    const session = buildAlloySession({ ...input, id, createdAt: existing.created_at, now: t }, this.pool);
    await this.persist(session as unknown as StoredDoc);
    const nextState = creditFromAlloySession(this.engineState, session);
    await this.persistEngineState(nextState);
    this.refreshHistoryLists();
    return session;
  }

  /** Deletes an Alloy session record. Does NOT retract previously-applied staleness
   * credit — same non-retraction limitation as updateAlloySession above. */
  async deleteAlloySession(id: string): Promise<void> {
    await this.adapter.deleteMany([id]);
    this.docsById.delete(id);
    this.refreshHistoryLists();
  }

  getAlloySession(id: string): ExternalSession | undefined {
    return this.docsById.get(id) as unknown as ExternalSession | undefined;
  }

  // -------------------------------------------------------------------
  // EQUIPMENT availability management
  // -------------------------------------------------------------------

  /** Confirms/edits an equipment item's availability, known loads, max confirmed load,
   * or station group. Goes through the same CONFIRM_EQUIPMENT UserActionEvent +
   * applyUserActionEvent the engine already defines — writing into
   * GeneratorState.equipment_overrides, which effectiveEquipmentMap() layers over the
   * Datapack's equipment_baseline on every engine read (generation, swap options, this
   * store's own getEquip()). That layering is the exact mechanism that makes an
   * Equipment-screen edit visible to the next GENERATE call. */
  async confirmEquipment(args: {
    equipmentId: string;
    availability: Availability;
    loads?: number[] | null;
    maxConfirmedLoad?: number | null;
    stationGroup?: string | null;
  }): Promise<void> {
    const t = now();
    const event = buildConfirmEquipmentEvent({
      id: newId('evt'),
      now: t,
      envId: this.pack.profile.generation_env_id,
      equipmentId: args.equipmentId,
      availability: args.availability,
      loads: args.loads ?? null,
      maxConfirmedLoad: args.maxConfirmedLoad ?? null,
      stationGroup: args.stationGroup ?? null,
    });
    await this.persist(event as unknown as StoredDoc);
    const nextState = applyUserActionEvent(this.engineState, event);
    await this.persistEngineState(nextState);
  }

  // -------------------------------------------------------------------
  // PROFILE editing — appropriate non-medical fields only
  // -------------------------------------------------------------------

  private async persistPack(nextPack: Datapack): Promise<void> {
    await this.persist(nextPack as unknown as StoredDoc);
    this.pack = nextPack;
    this.config = nextPack.config.values;
    this.equip = effectiveEquipmentMap(nextPack.equipment_baseline, this.engineState.equipment_overrides);
    this.setSnapshot({ profile: nextPack.profile, equipmentBaseline: nextPack.equipment_baseline });
  }

  /** Patches display_name / alloy_schedule_default / avoidances / goals_display /
   * presentation_preferences on the persisted, editable Datapack copy (see
   * loadOrSeedDatapack) — never the bundled dev-data seed. Excludes every field this
   * project's HEALTH_CONSTRAINT_RULE and evidence-discipline rules keep out of user
   * editing here (units, generation_env_id, profile/constraints_version, pending
   * questions/context items — B2/B6 authoring concerns, not this screen's job). */
  async updateProfile(patch: Partial<EditableProfileFields>): Promise<void> {
    const nextPack = applyProfilePatch(this.pack, patch, now());
    await this.persistPack(nextPack);
  }

  /** HF-04 movement exclusions: an explicit user-stated constraint, never an
   * app-inferred diagnosis (HEALTH_CONSTRAINT_RULE) — filters.ts excludes the exercise
   * outright wherever it's a candidate, so this is a direct, testable lever on
   * subsequent generation output. */
  async addAvoidance(exerciseId: string, label: string): Promise<void> {
    const nextPack = sessionAddAvoidance(this.pack, exerciseId, label, now());
    await this.persistPack(nextPack);
  }

  async removeAvoidance(exerciseId: string): Promise<void> {
    const nextPack = sessionRemoveAvoidance(this.pack, exerciseId, now());
    await this.persistPack(nextPack);
  }

  // -------------------------------------------------------------------
  // SETTINGS (device label, export bookkeeping — P-09)
  // -------------------------------------------------------------------

  async updateSettings(patch: Partial<Pick<Settings, 'device_label' | 'sound_rest_end' | 'technical_details' | 'last_export_at'>>): Promise<void> {
    const next: Settings = { ...this.settingsDoc, ...patch, updated_at: now() };
    await this.persist(next as unknown as StoredDoc);
    this.settingsDoc = next;
    this.setSnapshot({ settings: next });
  }

  // -------------------------------------------------------------------
  // DATA EXPORT / IMPORT (backup) — D-107
  // -------------------------------------------------------------------

  /** Exports every persisted document as one self-contained JSON file (src/app/backup.ts;
   * see that file for why its shape deliberately isn't contracts/backup.ts's canonical
   * `BackupSchema`). Prefers the OS share sheet, falls back to a download. Only bumps
   * `last_export_at` (which the quiet backup reminder reads) on an export the person
   * actually completed — not one they cancelled out of. */
  async exportBackup(): Promise<{ result: SaveResult; backup: AppBackup }> {
    const backup = buildBackup({ documents: Array.from(this.docsById.values()), deviceLabel: this.settingsDoc.device_label, now: now() });
    const result = await saveJsonFile(backupFileName(backup), JSON.stringify(backup, null, 2));
    if (result !== 'cancelled') {
      await this.updateSettings({ last_export_at: backup.exported_at });
    }
    return { result, backup };
  }

  /** Parses and validates a backup file's text (format, shape, and D-108's
   * refuse-if-newer version check) without writing anything — the caller shows counts
   * and asks for confirmation before calling `restoreFromBackup`. */
  previewBackup(text: string): ReturnType<typeof parseBackup> {
    return parseBackup(text);
  }

  /** Opens the OS file picker and previews whatever was chosen in one step — the only
   * way the UI reaches into `src/platform` for import, so `src/ui` never imports it
   * directly (tests/architecture.test.ts: ui -> app, contracts, domain only). Rejects
   * (caller shows the message) if nothing was picked or the file couldn't be read. */
  async pickAndPreviewBackup(): Promise<ReturnType<typeof parseBackup>> {
    const text = await pickJsonFile();
    return this.previewBackup(text);
  }

  /** Import: replaces every persisted document with the backup's, then fully re-runs
   * `init()` so pool/pack/engine state/snapshot are all rebuilt from what was just
   * written — the same code path a normal app launch uses, not a second, divergent
   * "apply a restore" path. Only ever called after the caller has already shown the
   * confirmation screen (D-107: "import replaces everything, with confirmation"). */
  async restoreFromBackup(backup: AppBackup): Promise<void> {
    await this.adapter.replaceAll(backup.documents as unknown as StoredDoc[]);
    await this.init();
  }

  /** Crash/error recovery: dumps whatever the adapter can still read, completely
   * unvalidated — deliberately bypassing every schema check above, since the point is to
   * get data OUT when something is corrupt enough that normal export can't run. Works
   * even when `init()` has failed and the store never reached 'ready'. */
  async exportRawData(): Promise<SaveResult> {
    const docs = await this.adapter.loadAll();
    const payload = { format: 'pto-raw-export', exported_at: now(), documents: docs };
    return saveJsonFile(`pto-raw-export_${now().replace(/[:.]/g, '-')}.json`, JSON.stringify(payload, null, 2));
  }

  // -------------------------------------------------------------------
  // STORAGE PERSISTENCE (§10.8) — thin platform proxy so the UI never imports
  // src/platform directly (tests/architecture.test.ts: ui -> app, contracts, domain)
  // -------------------------------------------------------------------

  requestStoragePersistence(): Promise<StoragePersistStatus> {
    return requestStoragePersistence();
  }

  getStoragePersistStatus(): Promise<StoragePersistStatus> {
    return getStoragePersistStatus();
  }
}

let singleton: AppStore | null = null;

/** The one AppStore for this app instance (real IndexedDB persistence), created on
 * first access. Exposed separately from the hook below so a top-level error boundary
 * can reach it (for "export raw data") even when the crash happened inside the
 * component tree that would normally call `useAppStore()`. Tests construct their own
 * AppStore(new MemoryAdapter()) directly instead of using this singleton. */
export function getAppStore(): AppStore {
  if (!singleton) {
    singleton = new AppStore();
    void singleton.init();
  }
  return singleton;
}

export function useAppStore(): { store: AppStore; snapshot: AppSnapshot } {
  const store = getAppStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { store, snapshot };
}
