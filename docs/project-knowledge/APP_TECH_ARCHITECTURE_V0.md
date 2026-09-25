---
file: APP_TECH_ARCHITECTURE_V0.md
class: TECHNICAL ARCHITECTURE (SYSTEM_DESIGN)
status: FINAL. Implementation contract, issued 2026-09-24. Supersedes the proposed draft of the same date.
decisions: D-096 to D-120 (§20), adopted with this contract.
needs_confirmation: ECR-02, EI-09, EI-10 (engine-facing) and D-111 (amends PRODUCT_UX_SPEC_V0 §7.1 step 2). Each has a provisional default isolated in one function or one data field (§21).
reads: PRODUCT_UX_SPEC_V0.md (canonical UX, D-080)
       ENGINE_WORKOUT_GENERATOR_V0_2_1.md (engine 0.2.1, config 0.2.0, D-063)
       GENERATOR_ACCEPTANCE_TESTS_V0_2.md + spec §W (AT-26 to AT-28)
       claude_v0-exercise-db_canonical_exercise_schema.json, claude_v0-exercise-db_system_metadata_schema.json
       equipment_library.json, exercise_equipment_availability.json
       PERSONAL_user_profile.yaml, PERSONAL_constraints.yaml
       DECISION_LOG addenda through D-095
companions: APP_DATA_CONTRACTS_V0.md, APP_BUILD_SEQUENCE_V0.md
engine_rules_changed: none
---

# APP TECH ARCHITECTURE V0: Personal Training OS

## 0. Summary

V0 is a single-page web app installed to the iPhone Home Screen (PWA), served as static files. All data lives on the device. The workout engine is a pure TypeScript library that runs on the device. There is no application server, database server, login, cloud function, or AI call at runtime.

Personal data and Alloy-derived text never ship in the deployed code. They arrive in a **datapack** file built on the development machine from the project files and imported on the phone. Training history is protected by a self-contained **backup** file exported through the iOS share sheet.

The whole running app has one state model: every stored record is loaded into memory at launch, and engine state is recomputed by replaying those records after every change. Nothing derived is persisted except a small summary used to show "what recalculated."

| Concern | V0 answer |
|---|---|
| Runs on | iPhone (primary), iPad, desktop; installed PWA |
| Server, database server, auth, cloud functions | None |
| AI at runtime | None. Generation is deterministic code (engine 0.2.1) |
| Storage | IndexedDB used as one key-value store of JSON documents, loaded fully into memory |
| Engine state | Recomputed in memory by replay; never a source of truth |
| Offline | Everything works offline after installation, including generation |
| Backup | JSON export via share sheet; import replaces and rebuilds |
| Runtime dependencies | `react`, `react-dom`, `zod`. Nothing else without a decision entry |
| Hosting and CI | Cloudflare Pages building from a private GitHub repo; the build command runs the test suite |

---

## 1. Review of the draft (maintainer's view)

The draft was reviewed as if by the engineer maintaining the app in six months. This section records what was removed and what was added, so the reasons survive.

### 1.1 Removed as unnecessary

| Draft element | Problem for a maintainer | Final |
|---|---|---|
| JSON Schema as canonical + generated TS types + Ajv precompiled validators | Three artifacts and a code-generation step that must stay in sync; codegen pipelines rot | **Zod schemas in TypeScript are the single source**; types are inferred; validation runs at trust boundaries (D-099) |
| `vite-plugin-pwa` / Workbox | Large configuration surface for a precache of one static build; the "never update mid-session" rule needed custom code anyway | **Hand-written service worker (~80 lines)** reading Vite's build manifest (D-109) |
| `idb` wrapper, 15 object stores, indexes | Index maintenance and IndexedDB version hooks for a dataset that stays under a few megabytes | **One key-value object store**; all documents loaded into memory; queries are array filters (D-104) |
| Persisted derived cache, `source_revision`, cache invalidation | A second copy of state that can silently diverge; a class of bugs with no benefit at this data size | **Replay after every write, in memory** (a year of data replays in milliseconds) (D-103) |
| Two completion paths (incremental `complete` + background replay check) | Two code paths for the same result | **One path: replay.** The per-workout reducer exists only inside replay |
| Optimistic concurrency (`rev`) on records | Guards against two writers; a standalone PWA has one window, and a Safari tab has separate storage | **Removed.** Writes are serialized through one promise queue |
| Persisted navigation and focused-set state | UI state that must be migrated and can go stale | **Derived from the workout document** (next unlogged set, last `logged_at` + rest) |
| PlanDraft store (pre-start swaps) | A persisted record for a few seconds of UI state | **In memory only**; lost on reload before Start (accepted limitation, §9) |
| MetadataOverlay for in-app `default_order` reordering | Two sources of truth for one engine input; drift whenever a pack adds rows | **Approval recorded in the metadata source**; the app shows the approved order (D-111, needs confirmation) |
| Separate GeneratedSession and GenerationRecord stores | Always written together, 1:1, both immutable | **One `generation` document** |
| Separate Alloy and Other session contracts | Two log models, two UIs, two import paths | **One `ExternalSession` contract** with `kind` ALLOY or OTHER (D-106) |
| Keeping the last three datapacks on device | Rollback UI and storage for something the source files already provide | **Only the active pack**, plus a small history of activated pack manifests (D-118) |
| Pre-migration snapshot store, diagnostics ring buffer | Stores that exist only for rare failures | **Migrations run in memory and write only if everything validates**; on failure the app opens read-only with "Export raw data" |
| SHA-256 payload hash and SHA-256 digests in the browser | Async hashing and canonicalization code for integrity the file format does not need | **Record counts** for import checks; **64-bit FNV-1a** for state and config digests (sync, shared with the seed code) |
| ULID library | A dependency for sortability we never use (records sort by their own timestamps) | **`crypto.randomUUID()`** with a type prefix |
| `fake-indexeddb`, `fast-check`, `axe-core`, dependency-cruiser | Test dependencies that each need upkeep | **Memory storage adapter** for integration tests; seeded random histories using the engine's own PRNG; a Vitest **architecture test** for module boundaries; manual VoiceOver pass |
| GitHub Actions CI and preview deployments | A second service with its own configuration and secrets | **Cloudflare Pages build command runs `npm test`**; Playwright runs locally before a release (D-113) |
| Datapack manifest fields `identity_changes`, `retired_exercise_ids` | App-side bookkeeping for a guarantee the build tool already enforces | **Tool-side guard**; exercises are retired with a status, never deleted (D-105) |
| Full evidence rows and equipment descriptions in the pack | The app displays only a few fields; the rest is research data | **Display projections** only; the research layer stays in the project |
| Separate `history/` and `io/` modules | Thin layers with one caller each | Folded into `app/` (selectors) and `store/` (backup) |

No backend, server API, or runtime AI call existed in the draft; none is added.

### 1.2 Added so future changes do not hit dead ends

| Future change | Gap in the draft | Added in the final contract |
|---|---|---|
| Adding exercises | No defined source format for EXERCISE_METADATA; no way to add a row without it entering the pool; deleting a row broke name lookups | **EXERCISE_METADATA.md** in the FX-META table encoding (one parser for fixtures and real data, D-119); per-row `status` ACTIVE / DRAFT / RETIRED; IDs can be retired, never deleted |
| Changing generator rules | Old "Why" text would re-render with new templates; no view of what an engine update changed | Rendered **Why text stored in each generation** (D-116); reason codes append-only; **state summary diff** after any app update, pack import, or edit |
| Adding a second gym | Equipment IDs were physical items in one gym, so a line built on apartment dumbbells would permanently re-base elsewhere (M-20); check-ins had no environment | **`implement_type`** on every catalog item and **`env_id`** on every check-in, generation, and workout now (no engine effect in V0); the migration path to per-environment generation is written down (§18.3) |
| Changing user goals | Goal-driven engine values were anonymous PARAMs; no record of which settings were active when | Config values carry **`set_by`** (engine default or the question that set them); **pack history** keeps every activated pack's manifest and config (D-118) |
| Importing training history | No landing place for sessions that are neither generated workouts nor Alloy classes | `ExternalSession` with `import_batch_id`; import is an **append-only path separate from backup restore**; rule: history is never faked as generated workouts (§18.5) |
| Accounts / cloud sync | Persistence API was store-specific; mutable records had no `updated_at` | **Storage adapter interface** (four methods) as the only persistence API, which a sync adapter can wrap; `created_at` / `updated_at` on every document; UUIDs; derived state means only source records sync |
| Richer periodization | No statement of how new planning inputs would enter the engine | Engine inputs are one extensible object; **MovementExposure** already carries dates, roles, and working-set counts needed for weekly targets; engine model changes need no data migration because state is derived (§18.7) |
| Robustness | A bad record could stop replay and brick the app | **Replay isolation**: an engine error disables generation only; logging, History, and export keep working (§10.6) |

---

## 2. What V0 requires

| Component | Needed? | Reasoning |
|---|---|---|
| Application server | No | The engine is deterministic and needs only local data (§B.1, §E.4). Nothing is shared between users or devices (UX §15) |
| Database server | No | About 300 sessions and a few hundred events per year, a few kilobytes each |
| Authentication | No | Nothing private is on the host (D-100) |
| Cloud functions | No | No scheduled jobs, notifications, or integrations |
| AI API at runtime | No | Engine determinism is FIXED (§0); dictated Alloy text is parsed by a line parser plus the alias table |
| Static HTTPS hosting | Yes | Required for service workers and installation |
| Build tooling | Yes | TypeScript, bundling |
| Datapack tool | Yes | Converts project files into a validated pack and strips health context (D-101) |
| Automated tests on every build | Yes | 49 acceptance tests define engine conformance |

---

## 3. Stack and dependency budget

| Concern | Choice | Why (and what was rejected) |
|---|---|---|
| Platform | PWA, static SPA | One codebase for all devices; offline; free hosting. Native iOS rejected (Mac, developer account, rewrite of engine and tests). Capacitor kept as the exit path if iOS storage proves unreliable |
| Language | TypeScript, strict | Same language for engine, app, tests, and tools |
| UI | React | The most widely known option, which matters because maintenance is AI-assisted and you are not a full-time engineer. Precached, so size does not affect launch. Preact is a drop-in alias if size ever matters |
| Build | Vite with `@vitejs/plugin-react` | Minimal configuration |
| Contracts and validation | Zod | One source for types and runtime checks. JSON Schema can be emitted from Zod later if another language ever needs the contracts |
| Storage | Raw IndexedDB, one object store, ~60-line promise adapter | See §10 |
| Service worker | Hand-written | See §12 |
| Routing and state | None beyond React state; one app store exposed with `useSyncExternalStore` | See §8 |
| Styling | CSS Modules (built into Vite), design tokens as CSS custom properties, system fonts, inline SVG icons | No runtime cost |
| Time | Internal module over `Intl.DateTimeFormat` | Three operations; DST-tested. Fallback `@date-fns/tz` only by decision entry if inverse conversion proves fragile |
| IDs | `crypto.randomUUID()` with type prefix | Built into Safari and Node |
| Tests | Vitest (unit, acceptance, integration, architecture); Playwright with WebKit (UI) | See §15 |
| Datapack tool | Node script; dev dependency `yaml` | Markdown-table and CSV parsers are small in-repo functions with their own tests |
| Hosting | Cloudflare Pages, git integration, build command `npm test && npm run build` | Free with private repos; no separate CI service |

**Runtime dependencies:** `react`, `react-dom`, `zod`.
**Development dependencies:** `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@playwright/test`, `yaml`.
Adding any dependency requires a decision entry stating what it replaces.

---

## 4. System context

```
 PROJECT FILES (Claude Project / dev machine)                       STATIC HOST (code only)
 ┌───────────────────────────────────────────────┐                ┌──────────────────────────┐
 │ Evidence: claude_v0-exercise-db_* (unchanged) │                │ index.html, JS, CSS,     │
 │ EXERCISE_METADATA.md        (authored, new)   │   git push     │ manifest, sw.js          │
 │ EQUIPMENT_MODEL.md          (authored, new)   │ ─────────────▶ │ no personal data         │
 │ equipment_library.json      (unchanged)       │  tests + build │ no Alloy text            │
 │ PERSONAL_user_profile.yaml  (unchanged)       │                └────────────┬─────────────┘
 │ PERSONAL_constraints.yaml   (unchanged)       │                             │ install, updates
 │ PROFILE_PROJECTION.yaml     (authored, new)   │                             ▼
 │ ENGINE_CONFIG_0.2.0.json    (authored, new)   │  AirDrop /       ┌──────────────────────────┐
 │        │ tools/datapack                       │  iCloud Files    │ iPHONE (installed PWA)   │
 │        ▼                                      │ ───────────────▶ │ IndexedDB (documents)    │
 │ datapack_<version>.json                       │                  │ in-memory store + replay │
 └───────────────────────────────────────────────┘                  │ engine on device         │
 BACKUP FILES (iCloud Drive) ◀──── export (share sheet) ─────────── │ works offline            │
                             ───── import (replace) ──────────────▶ └──────────────────────────┘
```

Nothing flows from the phone to the host.

---

## 5. Principles (binding)

1. **The engine is pure.** No I/O, no `Date.now()`, no `Math.random()`, no globals. `now`, IDs, and data are arguments (engine §0).
2. **Source records are the only truth.** Engine state is recomputed by replay after every write (§B.1, D-075).
3. **The UI decides nothing the engine decides** (D-069). No ranking, filtering, dosing, crediting, or progression in components.
4. **In-session behavior is a pure reducer in `app/`** (UX §8.3–§8.6), not component state.
5. **Every tap is persisted** before the app treats it as done (D-078).
6. **Personal and Alloy-derived data enter only through the datapack** (D-100).
7. **Evidence discipline survives into code.** Provenance and evidence classes are data; no UI string attributes the app's rules to Alloy (a test scans the copy tables for forbidden phrases).
8. **Health minimization is enforced in data** (D-074, D-101).
9. **One source per value.** Every engine input has exactly one place it is edited.

---

## 6. Modules

### 6.1 Layout

```
/tools/datapack        Node: project files → datapack.json (profile/constraint projection, guards)
/src
  /contracts           Zod schemas + inferred types for every document, the datapack, the backup
  /domain              ids, time (Intl), canonical JSON, FNV-1a hashing, seeded PRNG
  /pack                load + validate a datapack; resolved exercises; equipment; profile; constraints; config
  /engine              PURE
    /rules             role table, HF-01..14, K0..K7, H.3, H.4, H.5, H.6, G.5, V-00, V-01..07
    /state             reducers: workout completion (§K), external sessions (§L), events (Q.8); replay (§B.1)
    /generate          C.1 pipeline, selection (§E), pairing (§F), prescription (§G)
    /explain           §J.1 record, §J.2 codes, §J.3 Why templates
    index.ts           facade (§7)
  /store               storage adapter interface; IndexedDB adapter; memory adapter; in-memory dataset;
                       write API; migrations; backup export/import
  /app                 use cases; session reducer; derived-state holder; selectors (History, exercise detail)
  /platform            wake lock, audio tone, share sheet, service worker registration, storage.persist()
  /ui                  screens, components, copy tables, design tokens
/public/sw.js          service worker
/tests                 unit, acceptance, integration, architecture, migrations, ui, fixtures
```

### 6.2 Required modules

| Module | Location | Owns | Must not |
|---|---|---|---|
| Exercise data | `pack/` from EXERCISE_METADATA.md and the evidence dataset | Resolved exercises, aliases, pool status | Merge SYSTEM_DESIGN fields into evidence |
| Equipment data | `pack/` from EQUIPMENT_MODEL.md and equipment_library.json | Catalog, environments, baseline state | Decide exercise availability (HF-06 does) |
| User profile | `pack/` from PROFILE_PROJECTION.yaml + PERSONAL files | Runtime profile, constraints, config | Hold health context |
| Workout history | `store/` (documents), `app/` selectors | Check-ins, generations, workouts, external sessions, events | Compute progression |
| Generator state | `engine/state` | Replay and reducers | Be stored as truth |
| Generator rules | `engine/rules` | Every FIXED rule and PARAM table | Read storage, clock, UI |
| Generator execution | `engine/generate` | The C.1 pipeline | Inline constants |
| Validation | `engine/rules` (V-00, V-01..07); `contracts/` (documents at boundaries) | Load, session, import validation | Be skipped on import |
| Persistence | `store/` | Adapter, write queue, migrations | Know rule semantics |
| UI | `ui/` | Rendering, input, copy | Import `engine`, `store`, or `pack` at runtime |
| Import/export | `store/backup`, `pack/` import | Backup, datapack import | Partially import |

### 6.3 Boundaries (enforced by `tests/architecture.test.ts`)

```
ui        → app, contracts (types), domain
app       → engine, pack, store, platform, contracts, domain
engine    → contracts (types), domain
pack      → contracts, domain
store     → contracts, domain
platform  → domain
domain    → nothing
```

The test also fails if any file in `src/engine` references `Date.now`, `new Date(` without an argument, `Math.random`, `localeCompare`, `window`, `indexedDB`, or `navigator`.

---

## 7. Engine boundary

### 7.1 Facade

```ts
validatePack(pack: Datapack): PackValidation
  // V-00a..g, family approvals, constraint bindings → { pool, rejected[], notReady[] } ; V-00e → fatal

replay(pack: LoadedPack, docs: SourceDocuments): Derived
  // EI-04, EI-08. Processes check-in Alloy answers, workouts, external sessions, events in time order.
  // → { state (§B.1), decisions (per workout item and side), exposures, recoveryCredits, errors[] }

promptsDue(pack, derived, settings, now): AlloyPrompt[]              // §L.2, read-only
generate(pack, derived, checkIn, ctx: { now, generationId, userId }): GenerationResult   // EI-02
swapOptions(pack, derived, generation, req: { slot, todayIssues, busyStations, now }): SwapOptions  // EI-01
servability(pack, derived): ServabilityReport                          // EI-07
equipmentImpact(derived, equipmentId): LineRef[]                       // EI-06
```

EI-03 (COMPLETE) is the per-workout reducer inside `replay`; it is exported for tests only. EI-05 (Alloy effect preview) is `replay` with the draft log included, followed by a diff of exposures and recovery credits in `app/`; it needs no engine function.

### 7.2 Implementation rules that keep behavior identical to the spec

- **Alloy prompt answers before generation (§C.1 step 2).** The app writes the check-in and any prompt logs first, replays, then calls `generate`. Same order as the spec, with the side effect outside the pure function.
- **Stable ordering.** Code-point comparison only; explicit final tie-breaks (FAMILY_ORDER, `default_order`, `exercise_id`).
- **Numbers.** Duration arithmetic in integer hundredths of a minute; records store two decimals (acceptance tolerance 0.01).
- **Time.** UTC instants; local dates in `settings.tz` (D-073).
- **Seed and draw.** Per ECR-02 (§21), implemented in `domain/seed.ts` only.
- **Versions.** `ENGINE_VERSION = '0.2.1'`; a pack whose `engine_compat` excludes it is refused. PARAMs come from the pack config, never from code.
- **Traceability.** Each rule function carries its spec reference in a doc comment (`/** §H.3 row 1b [M-10] */`).

---

## 8. Runtime state model

There are exactly two kinds of state at runtime:

1. **Dataset:** every stored document, loaded at launch into memory and mirrored to IndexedDB on every write.
2. **Derived:** `replay(pack, dataset)` output, recomputed after every write.

The `app/` layer holds both in one store object and exposes a snapshot to React through `useSyncExternalStore`. UI state that must survive a reload is derived from documents:

| UI state | Derived from |
|---|---|
| Today state (UX §8.1) | today's check-ins, generations, workouts, local date |
| Focused item and set | the IN_PROGRESS workout: first planned set not yet logged, in execution order (§F.3) |
| Rest state and remaining time | last logged set's `logged_at` + `rest_after_pair_s` when a pair just completed |
| Warm-up step done | `warmup_completed` on the workout |
| Unfinished session | IN_PROGRESS workout with `plan_local_date` < today |

---

## 9. Runtime flows

**A. Launch.** Service worker serves the shell → store opens IndexedDB, reads all documents → migrations if `meta.app_schema_version` is older (§10.7) → load active pack → `validatePack` → `replay` → compare with the stored state summary only when the trigger warrants a diff (app update, pack import) → render.

**B. Check-in and generate.** Minutes tap (D-081) → write CheckIn and any Alloy prompt logs in one transaction → replay → `generate` → write the Generation document → Today shows PLAN. Pre-start swaps are held in memory and applied at Start; a reload before Start discards them (accepted limitation).

**C. Start and log.** Start → write the Workout (IN_PROGRESS, prescriptions copied, pre-start swaps applied, pre-start USER_REPLACE events already written at tap time) → wake lock, audio unlock → session reducer. Each Done tap → reducer → optimistic render → persist the whole Workout document. A failed write raises the blocking banner (D-092).

**D. Finish.** Capacity answer or Skip → `ended_at`, COMPLETED → replay → summary from the replay's decisions (UX §4.5).

**E. Log Alloy or other.** Upsert the ExternalSession (Alloy keyed by date) → replay → effect line from the exposure diff (EI-05).

**F. Swap.** `swapOptions` → apply → item SWAPPED_OUT and new item → optional chips write flags or events (D-088).

**G. Edit or delete a past record.** Write → replay → diff against the stored state summary → "What recalculated" (D-075) → store the new summary. Generations are never altered.

**H. Equipment change.** Impact warning from `equipmentImpact` → "Gone for good" writes CONFIRM_EQUIPMENT; "Only today" becomes a today's-issue input (D-066).

**I. Datapack import.** Parse → Zod validation → compatibility (`engine_compat`, `contract_version`) → `validatePack` → preview (exercises added, retired, reclassified; rejections; constraint and config changes; lines affected) → confirm → replace the active pack, append its manifest and config to pack history → replay → diff.

**J. Backup export and import.** Export: envelope with every source document, the active pack, and pack history → `navigator.share` with a `File`, fallback download. Import: parse → validate → migrate if older, refuse if newer → counts check → confirm → `replaceAll` → replay → diff.

**K. App update.** New service worker installs and waits. On launch, if no workout is IN_PROGRESS, the app tells it to activate and reloads once; otherwise it waits (D-109). Data migrations then run in flow A.

---

## 10. Persistence

### 10.1 Storage adapter (the only persistence API)

```ts
interface StorageAdapter {
  loadAll(): Promise<StoredDoc[]>;
  putMany(docs: StoredDoc[]): Promise<void>;     // one transaction; all or nothing
  deleteMany(ids: string[]): Promise<void>;
  replaceAll(docs: StoredDoc[]): Promise<void>;  // one transaction (import, migration)
}
```

Implementations: `IndexedDbAdapter` (production), `MemoryAdapter` (tests). A future sync layer wraps this interface without touching the rest of the app (§18.6).

### 10.2 IndexedDB layout

Database `pto`, IndexedDB version 1 (it never needs to change: all shape changes are data migrations), one object store `docs` with key path `id`. Every document carries `id`, `type`, `created_at`, `updated_at` (APP_DATA_CONTRACTS_V0.md §6).

### 10.3 Source documents and derived output

| Class | Document types | In backup |
|---|---|---|
| Source | `check_in`, `workout`, `external_session`, `event`, `settings` | Yes |
| Immutable output | `generation` | Yes |
| Input | `datapack` (active only), `pack_history` | Yes |
| Diff baseline | `state_summary` | No (recomputed) |
| System | `meta` | No (recreated) |

### 10.4 Write path

A single promise queue serializes writes. A write is `putMany` of the changed documents, followed by the in-memory update and a replay. The "Saved on this device" indicator reflects the queue.

### 10.5 Replay cost

Replay over one year of data is expected to take well under 100 ms on an iPhone 12-class device. Budget: 300 ms (§16). If it is ever exceeded, memoize by prefix (state at the end of each completed month); that is an internal optimization of `replay`, not a design change.

### 10.6 Replay isolation

If `replay` reports errors (a record the engine cannot process), the app keeps logging, History, Equipment, and export working, disables generation, and shows "Training state couldn't be calculated" with the record ID and an export button. The engine never partially applies a failed record.

### 10.7 Schema versions and migrations

- `meta.app_schema_version` (integer) versions the stored document shapes and the backup format.
- Migrations are pure functions `m<n>_to_<n+1>(docs) → docs`, run in memory on launch or import. The result is validated against the current contracts; only if everything validates is it written with `replaceAll`. Otherwise nothing is written and the app opens read-only with "Export raw data."
- Migrations never drop user-entered values; unmappable values move to a `legacy` object on the same document.
- Downgrades are refused.
- Every released schema version has a golden backup fixture used by migration tests.

### 10.8 Storage durability on iOS

Facts checked 2026-09-24 (Appendix): WebKit can evict website data under storage pressure or inactivity; `navigator.storage.persist()` is supported from Safari 17 and granted by heuristics that include Home Screen installation; the seven-day inactivity purge counts Safari use, while Home Screen web apps keep their own usage counter. A Safari tab and the installed app should be treated as separate data stores.

Mitigations: use only the installed app (setup detects a Safari tab and says so); request persistence on first interaction and show the status in P-09; a quiet backup reminder on Today after 3 completed sessions or 7 days since the last export (never in focus mode, never a dialog); self-contained backups; Capacitor as the exit path if eviction is ever observed.

### 10.9 Backup

One JSON file, `pto-backup_<YYYY-MM-DD>_<HHmm>.json` (APP_DATA_CONTRACTS_V0.md §9). Export through the share sheet (iCloud Drive, Files, AirDrop); download on desktop. Import replaces everything, with confirmation. Backups are not encrypted in V0 (a lost passphrase would mean a lost history); keep them in your private iCloud Drive.

### 10.10 When the exercise database changes

Exercise IDs are never reused and never deleted (retire with `status: RETIRED`). Logs store the ID and a name snapshot. State is derived, so metadata changes take effect by replay, with a diff shown before and after activation. The full matrix is in APP_DATA_CONTRACTS_V0.md §11.

---

## 11. Offline

After installation, everything works offline: check-in, generation, focus mode, logging, History, export to local Files. The first load needs the network once. No request is made during a session.

---

## 12. iOS and PWA specifics

| Topic | Design |
|---|---|
| Manifest | Static `manifest.webmanifest`: `display: standalone`, portrait-first with landscape allowed, light/dark theme colors, icon set |
| Service worker | `public/sw.js`, hand-written. Install: cache every file listed in Vite's `manifest.json` plus `index.html` under a cache named by build ID. Activate: delete other caches. Fetch: cache-first for same-origin GET; navigations return cached `index.html`. Waits for an explicit message to activate (D-109) |
| Wake lock | Requested at Start; works in Home Screen web apps from iOS 18.4; re-requested on `visibilitychange`; failure is silent, and timing stays correct because it is timestamp-based |
| Audio | Web Audio oscillator tone; unlocked by the Start tap (UX §12.1). Verify on device whether the silent switch mutes it; the countdown is the primary signal (D-086) |
| Timers | Derived from stored timestamps; nothing runs in the background |
| Vibration, push, background alarms | Not used |
| Text size | Root font `-apple-system-body` so text follows the iOS setting; fixed minimums for reps, weight, countdown (UX §12.1). Verify on device |
| Safe areas | `viewport-fit=cover` and `env(safe-area-inset-*)` |
| Taps | `touch-action: manipulation` on controls |

---

## 13. Security and privacy

- The deployed bundle contains no personal data and no Alloy text. The build fails if `dist/` contains any exercise cue text, Alloy URL, or identifier from the PERSONAL files (a denylist generated from the current datapack at build time on the development machine; skipped on the host where the pack is absent).
- The datapack tool copies only whitelisted profile and constraint fields (D-101). CONTEXT items travel as IDs only.
- Content Security Policy: `default-src 'self'`; no inline scripts; no third-party origins.
- No telemetry, analytics, or crash reporting (D-114).
- Three runtime dependencies, pinned, lockfile committed.

---

## 14. Explainability

- Each Generation stores the §J.1 record verbatim, the rendered Why lines for every item (D-116), the datapack ID, config version and hash, engine version, and a state digest.
- History shows Why as generated, even after templates or rules change.
- Reason codes are append-only; copy tables keep entries for retired codes.
- Any past generation can be reproduced from a backup: restore, replay records dated before the check-in, `generate` with the recorded `now` and ID, compare. This is an integration test.
- The state summary diff explains every recalculation (edit, pack import, app update).

---

## 15. Testing strategy

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Unit | Vitest | `domain` (DST, seed vectors, canonical JSON), every rule function, reducers, `pack` validation and bindings, datapack tool (whitelist, determinism, ID guards, Markdown and CSV parsers), session reducer transitions | Every build |
| Acceptance (conformance gate) | Vitest | All 49 tests of GENERATOR_ACCEPTANCE_TESTS_V0_2.md + §W through a harness implementing `NEW`, `LOAD`, `ALLOY`, `GEN`, `COMPLETE`, `APT`, `EXPOSE`, `INJECT` on the facade; FX fixtures parsed directly from the test document's Markdown tables (no transcription) | Every build |
| Property | Vitest | Seeded random histories (engine PRNG) asserting AT-P02–P07 invariants, determinism, replay idempotence | Every build |
| Integration | Vitest + MemoryAdapter | Use cases end to end: check-in → generate → start → log → finish; Alloy after plan; unfinished session; edits with diff; equipment scopes; pack import scenarios; backup round trip; reproduction of a past generation; write failure; replay isolation | Every build |
| Architecture | Vitest | Module boundaries and engine purity (§6.3); forbidden copy phrases | Every build |
| Migration | Vitest | Golden backups per schema version → migrate → validate → replay; idempotence; value preservation; newer version refused | Every build |
| UI | Playwright, WebKit, iPhone viewport | Interaction budgets of UX §2.2 as tap counts; no dialogs in focus mode except the held-exercise choice; target sizes and bottom-60% reach (D-093); offline session; reload during set, rest, and timed set; debounce; real IndexedDB adapter | Locally before each release |
| On device | Manual checklist | Install; persistence status; wake lock across 60 min; audio and silent switch; share-sheet export and clean-install restore; landscape; text size; VoiceOver on focus mode and rest; one real session | Each release |

Draw-dependent acceptance assertions follow ECR-02 (§21).

---

## 16. Performance budgets (iPhone 12-class)

| Measure | Budget |
|---|---|
| First load, uncached | ≤ 200 KB JS gzip |
| Installed cold launch to interactive | ≤ 1.0 s |
| Minutes tap → plan shown | ≤ 300 ms |
| Done tap → visual confirmation | ≤ 50 ms; persisted ≤ 200 ms |
| Replay, one year of data | ≤ 300 ms |
| Datapack import incl. validation and replay | ≤ 2 s |

If `generate` or `replay` exceed budget, move them to a Web Worker; engine purity makes that a packaging change.

---

## 17. Deployment and maintenance

- **Repository:** private GitHub repository containing code, tests, the datapack tool, and fixtures. Personal source files and datapacks are read from a folder outside the repository (path in a local, git-ignored config).
- **Build and deploy:** Cloudflare Pages git integration on `main`; build command `npm test && npm run build`. A failing test blocks the deploy.
- **Release:** `npm run test:ui` locally, on-device checklist, then merge to `main`.
- **Versions:** app (semver, shown in P-09), engine (0.2.1), config (0.2.0), contracts (1.0.0), `app_schema_version` (1), datapack (`pack_version` + content hash).
- **Change control:** FIXED rule → ECR, decision entry, engine version bump, tests. PARAM → new config version in a datapack. Stored shape → migration + golden fixture + contract version.
- **Routine maintenance:** dependency update once a quarter; on-device checklist after each major iOS release.

---

## 18. Extension paths

How each anticipated change is made without rework.

### 18.1 Adding an exercise
Add or edit a row in EXERCISE_METADATA.md (status DRAFT while authoring, ACTIVE when reviewed) → update the family's approval date if its order changed (the tool enforces this) → rebuild the datapack → import on the phone → preview shows the change → replay. No code change. A user-proposed exercise uses an SX ID with `approved_by_user_on` (Q.2). A free-text Alloy item can later be mapped to the new ID by editing that log.

### 18.2 Changing generator rules
PARAM: new ENGINE_CONFIG version → datapack. FIXED rule: ECR and decision entry → code in `engine/rules` → new and updated acceptance tests → engine version bump → app release. On first launch after the update, replay recomputes everything and the state summary diff shows what changed. Old generations keep their stored Why text. No data migration is needed, because logs are engine-agnostic facts.

### 18.3 Adding a second gym
Already in place: environments, per-environment equipment state, `env_id` on check-ins, generations, and workouts, `implement_type` on equipment. Remaining work (an engine change under D-065's reasoning): (1) equipment options and line implements move from equipment IDs to implement types, a mechanical mapping because each current ID has one type; (2) generation takes the check-in's `env_id` and that environment's equipment state; (3) a line re-bases only when its implement type has no available item in that environment. This needs an ECR, an engine version bump, and new acceptance tests; stored logs need no migration because they already carry `env_id` and implements.

### 18.4 Changing user goals
Goals stay in PERSONAL_user_profile.yaml (Health Project remains authoritative for medical context). Answers to B-questions change config values whose `set_by` names the question (e.g., `GOAL_ACCESSORY_ENABLED` set by B2) → new config version → datapack. Pack history records when each configuration became active, so History and later analysis can tell which settings produced which sessions. Goal weighting itself (B1) is a future engine feature that will read a new pack section.

### 18.5 Importing training history
A separate path from backup restore: a `tools/history-import` script maps an outside source (spreadsheet, another app's export) to ExternalSession documents with an `import_batch_id` and exercise IDs resolved through the alias table, producing an import bundle (APP_DATA_CONTRACTS_V0.md §10). The app appends by ID (idempotent) after a preview. Imported Alloy classes are ExternalSessions of kind ALLOY and count as the spec says (§L). Other imported sessions are kind OTHER and are stored, not read (B2). Known past loads must never be injected by fabricating generated workouts; seeding progression lines from baselines would be a new event type decided by an ECR.

### 18.6 Accounts and cloud sync
Seams already present: one storage adapter interface; UUID document IDs; `updated_at` on every document; append-only events; immutable generations; derived state (only source documents sync). A sync implementation adds a server and authentication, a `SyncingAdapter` wrapping the local adapter, deletion tombstones (added then; nothing earlier needs them because sync starts from the current dataset), and last-writer-wins per document, which is adequate for one person. The datapack could then be delivered from the account instead of a file.

### 18.7 Richer periodization
The engine's inputs are one object built in `app/`; a new input such as a training block plan (phase, dates, weekly family targets) is an additive pack section read by a future engine version. MovementExposure already records dates, roles, and working-set counts, which weekly targets need. Because state is derived, adding set progression or new line fields changes only the engine, never stored data. Generations record the datapack and config, so the phase active at any generation is recoverable.

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| iOS evicts IndexedDB | Installed-only use, `persist()`, reminders, self-contained backups, Capacitor exit path |
| Draw hash cannot reproduce reference values | ECR-02; membership assertions until decided |
| Metadata not yet authored | Build order delivers Alloy logging, History, Equipment first |
| Spec ambiguity found while coding | Raise as EI or ECR; never resolve silently |
| Playwright WebKit differs from iOS Safari | On-device checklist is a release gate |
| Both a Safari tab and the installed app used | Detection notice; one device of record (D-110) |
| Replay error from an unexpected record | Replay isolation (§10.6) |
| Backups contain personal notes | Naming, private storage guidance; encryption FUTURE |

---

## 20. Decisions (SYSTEM_DESIGN, adopted with this contract)

To be appended to the project as DECISION_LOG_addendum_D096-D120.md.

| ID | Decision | Rejected alternatives |
|---|---|---|
| D-096 | V0 is an installable PWA served as static files: no application server, database server, authentication, cloud functions, or runtime AI calls. | Native iOS; server app with database; no-code tools; LLM-generated workouts |
| D-097 | Stack: TypeScript strict, React, Vite, Zod, raw IndexedDB, Vitest, Playwright (WebKit). Runtime dependencies limited to `react`, `react-dom`, `zod`; any addition needs a decision entry. | Svelte, Solid, vanilla; Dexie or `idb`; SQLite-WASM; Workbox; state and router libraries |
| D-098 | The engine is a pure library running on the device and, unchanged, in Node for tests. | Engine behind an API; logic in UI hooks |
| D-099 | Contracts are Zod schemas (types inferred) validated at trust boundaries: datapack import, backup import, history import, and in tests. | JSON Schema + generated types + Ajv |
| D-100 | The deployed code contains no personal data and no Alloy-derived text; data enters only through an imported datapack. | Bundling data; fetching data from the host |
| D-101 | The datapack tool copies only whitelisted profile and constraint fields, driven by PROFILE_PROJECTION.yaml; health context never enters the pack. | Filtering only in screens |
| D-102 | Constraints carry engine bindings (filter, outcome, match on metadata fields only); the tool fails if an active hard constraint has no binding. | Hard-coding constraint IDs in rules; free-text matching |
| D-103 | Source documents are the only truth; engine state is recomputed in memory by full replay after every write and is not persisted, except a state summary used for change diffs. | Persisted state cache; incremental updates |
| D-104 | Persistence is one IndexedDB object store of JSON documents behind a four-method storage adapter; all documents are loaded into memory at launch. | Multiple stores with indexes; localStorage; SQLite-WASM |
| D-105 | Document IDs are type-prefixed `crypto.randomUUID()` values (Alloy sessions keyed by local date); domain IDs are never reused and exercises are retired by status, never deleted. | ULID; auto-increment; deleting rows |
| D-106 | Alloy and other outside sessions share one ExternalSession contract with `kind`; the engine reads kind ALLOY per §L and stores kind OTHER without reading it (B2 default). | Separate contracts and UIs |
| D-107 | Backups are self-contained JSON exports via the share sheet with a quiet reminder after 3 sessions or 7 days; import replaces with confirmation. History import is a separate append-only path. | Automatic cloud backup; merge-import of backups |
| D-108 | Stored shapes are versioned by an integer `app_schema_version`; migrations are pure, run in memory, and write only if the result validates; downgrades are refused. | IndexedDB version hooks; partial migration |
| D-109 | A hand-written service worker precaches the build; a new version activates only at launch when no workout is in progress. | Workbox; auto-reload on update |
| D-110 | V0 has one device of record; other devices may read a restored copy. | Sync in V0 |
| D-111 | `default_order` approval is recorded per family in EXERCISE_METADATA.md and enforced by the pack loader (generation NOT_READY for unapproved families); T-00 step 2 shows the approved order read-only. Amends UX §7.1 step 2 (in-app reordering removed). **Needs confirmation.** | In-app reordering stored as a device overlay |
| D-112 | The Alloy schedule is a device setting defaulting from the pack; it affects only which prompts are asked, never replay. | Schedule as a PARAM requiring a pack rebuild |
| D-113 | Cloudflare Pages builds from the private repository with `npm test && npm run build`; no separate CI service; Playwright and the device checklist run locally before release. | GitHub Actions; preview deployments |
| D-114 | No telemetry, analytics, or crash reporting. | Analytics or crash SDKs |
| D-115 | In-session behavior is pure reducers in `app/`; UI state that must survive reload is derived from documents. | Component state machines; persisted UI state |
| D-116 | Each generation stores rendered Why text; reason codes are append-only. | Re-rendering old records with current templates |
| D-117 | Equipment catalog items carry `implement_type`; check-ins, generations, and workouts carry `env_id`. No engine effect in V0. | Adding both when a second gym arrives (would require data migration) |
| D-118 | The app keeps the manifest and config of every activated datapack (pack history); config values carry `set_by`. | Keeping only the active pack with no history |
| D-119 | EXERCISE_METADATA.md and EQUIPMENT_MODEL.md use the Markdown-table encoding of the acceptance fixtures; one parser serves fixtures and real data. | CSV or JSON authoring files |
| D-120 | Module boundaries and engine purity are enforced by an architecture test in the test suite. | Lint plugins or dependency-graph tools |

---

## 21. Items needing your confirmation

Each has a provisional default so implementation is not blocked; each default lives in one function or one field so switching costs little.

| ID | Type | Issue | Provisional default until confirmed |
|---|---|---|---|
| ECR-02 | Engine change request (engine 0.2.2 together with ECR-01 if adopted) | §E.4 fixes the seed inputs, not the hash or draw procedure; the reference simulator's hash is unrecorded, so draw-decided expectations may not be reproducible | `seed = FNV-1a-32("user_id|local_date|apartment_sessions_completed")`; per slot `r = mulberry32(FNV-1a-32(seed + "|" + slot))()`; tied candidates sorted by `exercise_id`; index `floor(r × n)`. Acceptance assertions decided by DRAW are checked as membership in the tied set and listed |
| EI-09 | Interface clarification | An anchor whose exercise is not in the validated pool (RETIRED, DRAFT, or rejected by V-00) is not covered by §E.1 | Outcome `NOT_IN_POOL`, static, anchor effect "clear" |
| EI-10 | Interface clarification | §B.3 does not say whether replay uses the family on the log or in current metadata | Replay uses the family recorded on the workout item (as Alloy items already do with `family_tag`) |
| D-111 | UX amendment | Removes in-app reordering of starting exercises | As stated in §20 |

Still pending from UX §16.3: ECR-01 (D-079), EI-01, D-081, D-082 (APP_BUILD_SEQUENCE_V0.md §1).

---

## 22. Not in V0 (technical)

Sync and accounts; merge-import of backups; history import tool; encrypted backups; any server component; push notifications; native wrapper; Web Worker (unless budgets fail); telemetry; datapack download from a URL; in-app editing of metadata, profile, constraints, or config; localization.

---

## Appendix. Platform facts checked (2026-09-24)

| Fact | Source |
|---|---|
| Screen Wake Lock works in Home Screen web apps from Safari / iOS 18.4 | webkit.org/blog/16574/webkit-features-in-safari-18-4/ ; web-platform-dx.github.io/web-features-explorer/features/screen-wake-lock/ |
| WebKit evicts per origin under storage pressure or inactivity; persistent-mode origins are excluded; `navigator.storage.persist()` supported from Safari 17 and granted by heuristics including Home Screen installation | webkit.org/blog/14403/updates-to-storage-policy/ |
| The seven-day inactivity purge counts days of Safari use; Home Screen web apps have their own counter | WebKit statement quoted in github.com/near/near-wallet/issues/479 ; MDN "Storage quotas and eviction criteria" |

Re-verify on device after each major iOS release (§15).
