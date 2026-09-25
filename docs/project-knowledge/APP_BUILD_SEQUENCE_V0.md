---
file: APP_BUILD_SEQUENCE_V0.md
class: DELIVERY PLAN (SYSTEM_DESIGN)
status: FINAL. Implementation contract, issued 2026-09-24. Supersedes the proposed draft of the same date. No implementation has started.
depends_on: APP_TECH_ARCHITECTURE_V0.md (final), APP_DATA_CONTRACTS_V0.md (final, contract 1.0.0),
            PRODUCT_UX_SPEC_V0.md (build order, Appendix A), ENGINE_WORKOUT_GENERATOR_V0_2_1.md §S,
            GENERATOR_ACCEPTANCE_TESTS_V0_2.md + §W
naming: build stages B0–B11. B11 is the project's "Phase 8" manual run (engine §S).
---

# APP BUILD SEQUENCE V0

## 0. Principles

1. **Useful early.** The first installed build logs Alloy classes, shows History, and manages Equipment. None of these need exercise metadata (UX Appendix A), so real Alloy history accumulates before the first generated session.
2. **Engine conformance before engine-dependent UI.** Today and focus mode are built only on an engine that passes the acceptance suite.
3. **Data safety before data volume.** Backup export and import exist before the first real record is stored.
4. **Every stage ends at a gate** that runs in `npm test` (and, for UI stages, `npm run test:ui`).
5. **No silent spec decisions.** An ambiguity found while building becomes an EI or ECR for your decision. Until decided, a provisional default lives in one named function.
6. **Working mode.** Implementation with Claude in the repository (Claude Code), one stage per working session or a few, with the three contract documents loaded. Engine work is test-first.

---

## 1. B0: Gate before code

### 1.1 Confirmations

None blocks the start of B1. Each has a provisional default (APP_TECH_ARCHITECTURE_V0.md §21).

| Item | Provisional default | Must be settled before |
|---|---|---|
| ECR-02 seed hash and draw | Pinned FNV-1a + mulberry32; DRAW assertions checked as membership | B5 exit |
| EI-09 anchor not in pool | `NOT_IN_POOL`, static, clears the anchor | B5 exit |
| EI-10 family used by replay | Family recorded on the log | B5 exit |
| D-111 order approval in the metadata file | T-00 step 2 read-only | B6 |
| ECR-01 / D-079 flag actions on zero-set and no-line items | Engine 0.2.1 as frozen (consequence text "Recorded") | B5 exit |
| EI-01 swap request carries today's issues and busy stations | As in UX §13.1 | B8 |
| D-081 normal-day shortcut answers R-06 | As in UX §4.2 | B7 |
| D-082 sleep and fueling off the default path | As in UX §4.3 | B7 |

### 1.2 Data work that blocks generation (not code)

| Item | Needed by |
|---|---|
| EXERCISE_METADATA.md authored under §Q.1.1; V-00 clean; family order approvals | B7 |
| EQUIPMENT_MODEL.md (implement types, concept IDs, ENV-APT baseline) | B2 (skeleton), B7 (loads, stations) |
| PROFILE_PROJECTION.yaml, ENGINE_CONFIG_0.2.0.json | B2 |
| UQ-G01, B3, B4a, B5, B6 answers | Optional; §A.4 defaults apply |

### 1.3 Setup

Private GitHub repository; Cloudflare Pages project with build command `npm test && npm run build`; a placeholder page deploys; decision log addendum D-096–D-120 added to the project.

**Exit B0:** repository builds and deploys a placeholder with one passing test.

---

## 2. Stage overview

| Stage | Goal | Depends on | Usable result |
|---|---|---|---|
| B0 | Gate, repo, hosting | — | — |
| B1 | Contracts, parsers, fixtures | B0 | — |
| B2 | Datapack tool and new source files | B1 | Real datapack (without metadata) |
| B3 | Store and data safety | B1 | — |
| B4 | Shell, PWA, first slice | B2, B3 | **Installed app: Log Alloy, History, Equipment, Profile, backup** |
| B5 | Engine and conformance | B1 | Engine library passing all acceptance tests |
| B6 | Metadata authoring and gym confirmation | B2 (parallel to B4–B5) | Real datapack with metadata |
| B7 | Today: check-in, generation, plan, Why | B4, B5, B6 | **Real planned sessions** |
| B8 | Focus mode and completion | B7 | **Full training loop** |
| B9 | Edits, reviews, pack updates | B8 | Maintenance flows |
| B10 | Hardening, release V0.1.0 | B9 | **V0** |
| B11 | Real-use trial ("Phase 8") | B10 | Evidence for tuning |

```
B0 ─▶ B1 ─┬─▶ B2 ─┬─▶ B4 ─────────────────┐
          │       └─▶ B6 (data track) ────┤
          ├─▶ B3 ──────▶ B4               ├─▶ B7 ─▶ B8 ─▶ B9 ─▶ B10 ─▶ B11
          └─▶ B5 (engine, test-first) ────┘
```

Critical path: B0 → B1 → B5 → B7 → B8 → B10.

---

## 3. Stages

### B1. Contracts, parsers, fixtures

**Build**
- Zod schemas for every declaration in APP_DATA_CONTRACTS_V0.md §4–§10, with inferred types exported from `src/contracts`.
- `domain`: time module (UTC ↔ local, DST), canonical JSON, FNV-1a (32 and 64), mulberry32, `newId(prefix)`.
- Markdown-table parser (shared by fixtures and EXERCISE_METADATA.md / EQUIPMENT_MODEL.md) and the FX-META / FX-EQUIP cell decoders (`[EQ009] or [EQ010]`, `EQ005+EQ010`, `[]`, `PS`, tag lists).
- Fixture loader that reads FX-CONFIG, FX-EQUIP, FX-META, FX-K3 **directly from GENERATOR_ACCEPTANCE_TESTS_V0_2.md** (copied into `tests/fixtures/` unchanged) and builds fixture datapacks.
- `tests/architecture.test.ts` (boundaries and engine purity, APP_TECH_ARCHITECTURE_V0.md §6.3).

**Tests:** schema accept/reject samples per contract; DST cases (2026-11-01, 2027-03-14, America/Los_Angeles); seed known-answer vectors; parser and decoder cases; fixture pack has 81 FX-META rows.

**Exit:** green. **Not in scope:** runtime app code.

### B2. Datapack tool and new source files

**Build**
- Author the skeletons of EQUIPMENT_MODEL.md (implement types, catalog additions incl. DQ-01 concept IDs, environments, ENV-APT baseline with known values and UNKNOWN elsewhere), PROFILE_PROJECTION.yaml (DQ-03), ENGINE_CONFIG_0.2.0.json (§R values with `set_by`).
- `tools/datapack`: reads the sources listed in APP_DATA_CONTRACTS_V0.md §5.8 from a git-ignored path; builds display projections, metadata (empty allowed), equipment, profile and constraints through the projection whitelist, config; writes `datapack_<version>.json` and prints a summary.
- Guards: I-07 whitelist, I-08 bindings, I-09 ID stability against the previous pack, family order hashes, unknown equipment IDs.

**Tests:** whitelist (compiled key sets equal the whitelist; no evidence labels, `source_reference`, or CONTEXT content); determinism (identical inputs → identical content hash); each guard fails as specified; CSV parser for the alias and sources files.

**Exit:** a real datapack builds with `exercise_metadata = []`.

### B3. Store and data safety

**Build**
- `StorageAdapter` interface; `IndexedDbAdapter` (one store `docs`); `MemoryAdapter`.
- In-memory dataset, typed accessors per document type, serialized write queue, no update path for generations and events (I-06).
- Backup export (envelope, embedded pack, pack history, counts, digest) and import (validate, migrate or refuse, confirm, replace).
- Migration runner with a synthetic test-only `m0_to_1` proving the mechanism; read-only mode with "Export raw data" on migration failure.

**Tests (MemoryAdapter):** write and reload; I-03, I-04, I-06; export → wipe → import → identical documents; newer version refused; malformed document refused with nothing written; migration preserves every user value; failed migration writes nothing.

**Exit:** green.

### B4. Shell, PWA, first usable slice

**Build**
- Vite + React app; `public/sw.js` and manifest (D-109); safe areas; light/dark; text-size behavior; standalone detection; `storage.persist()` request.
- App store with `useSyncExternalStore`; tab navigation and sheets (not persisted).
- Datapack import screen (preview without engine: counts, versions); first-run steps 1 (confirm at the gym → CONFIRM_EQUIPMENT), 3 (Alloy schedule), 4 (time zone, units). Today shows NOT_READY with Log Alloy.
- **Log Alloy** (quick log, names-first grid, alias search, dose and weight chips, coach notes, type or dictate). Effect line placeholder until B5.
- **Log other session** (E-04).
- **History** feed, external session detail, search, recent exercises.
- **Equipment** E-01–E-04 with "Unavailable today" and "Gone for good" (impact warning reads "No progress lines yet" until B5).
- **Profile** P-01–P-05, P-07, P-08 read-only; **P-09** versions, export, import, persistence status.
- Backup reminder line.
- Deploy; install on iPhone.

**Tests:** integration: Alloy upsert by date, prompt log replaced by user log, Other session stored. UI (Playwright WebKit): Alloy summary ≤ 2 taps; six known names ≤ 9 taps; offline Alloy logging; reload mid-entry keeps entries.

**Exit:** on-device checklist part 1 (install, persistence status, export to iCloud Drive, restore on a clean install); you log real Alloy classes for one week.

### B5. Engine and conformance (test-first)

Order of work; the tests listed become runnable at each step, and all must pass at the stage exit.

| Step | Build | Tests |
|---|---|---|
| E1 | Pack loader: resolved exercises, pool status, V-00a–g, family approvals, bindings, effective equipment state, config | AT-M01–AT-M08 |
| E2 | Hard filters HF-01–HF-14, today-only classification, servability | Unit per filter |
| E3 | Reducers: workout completion (§K without progression), external sessions (§L.2–§L.4), events; replay ordering; replay isolation | Unit |
| E4 | Progression §H.1–§H.8 incl. M-20, M-21 | AT-13, AT-14, AT-15, AT-22 (EXPOSE) |
| E5 | Harness verbs, performers P-DEFAULT and P-HARD, histories H-COLD, H-BASE, H-LONG, H-30, H-47, H-LW, H-E2, H-D, H-F1 | Harness self-tests |
| E6 | Family plan, PREP, fallback (§C.2–§C.7) | AT-02, AT-03, AT-08, AT-11, AT-R03, AT-R04 |
| E7 | Selection §E incl. draw (ECR-02 default), station rule §F.2 | AT-01, AT-06, AT-07, AT-12, AT-16–AT-21, AT-P05, AT-P07 |
| E8 | Prescription §G, duration and fitting, underfill, validation §I, NO_SESSION | AT-25, AT-P03, AT-P04, AT-R02 |
| E9 | Record §J.1, codes §J.2, Why §J.3 (rendered text), facade, `promptsDue`, `swapOptions`, `servability`, `equipmentImpact` | AT-H01, AT-P01, AT-P02, AT-P06, AT-04, AT-05, AT-09, AT-10, AT-23, AT-24, AT-R01, AT-R05, AT-26–AT-28 |
| E10 | Property suite: seeded random histories; invariants P02–P07; determinism; replay idempotence | Property |

Rules: ECR-01, if adopted before E3, makes this engine 0.2.2 with AT-29–AT-31. EI-09 and EI-10 defaults sit in `engine/rules/pool.ts#anchorOutcomeWhenNotInPool` and `engine/state/credit.ts#familyForCredit`. The harness prints every assertion relaxed under the ECR-02 default.

**Exit:** all 49 acceptance tests pass (relaxed DRAW assertions listed); property suite green; B4's effect line and impact warning switched to the engine.

### B6. Metadata authoring and gym confirmation (data track)

**Do**
- Author EXERCISE_METADATA.md family by family (KD, HD, HPUSH, HPULL, VPUSH, VPULL, core, carry, mobility), status DRAFT until reviewed, `authoring_note` on judgment calls; complexes get no family (NO_FAMILY).
- Review table with you: `family`, `roles_allowed`, `hand_support`, `right_triceps_involvement`, `equipment_options` for every row. Then set ACTIVE.
- `default_order` per family by §Q.1.1 criteria; you approve; approval dates and hashes recorded (D-111).
- On-site gym check: rack bar path, adjustable pulley, incline, dumbbell top weight and increments, plates, station groups → EQUIPMENT_MODEL.md (or T-00 step 1).
- Update PERSONAL files with any answers; rebuild the pack.

**Exit:** real datapack imported on the phone; servability report reviewed; ten generations from a synthetic two-week history on the real pack reviewed with you (smoke, not conformance).

### B7. Today

**Build**
- T-00 step 2 (approved starting exercises, read-only, with How-to).
- Today states per UX §8.1 with midnight expiry; normal-day check-in (D-081); Something's different; Alloy prompt cards (answers written before generation); plan view with notices, underfill, unservable line, Change; Details (Why from the stored text, How-to, last times); pre-start swaps in memory; NO_SESSION states; "Plan made before your Alloy log. Update plan?"

**Tests:** UI: normal-day check-in = 1 tap; Change keeps answers; plan → Start visible. Integration: identical answers → identical plan; generation document complete (I-05, record fields present); plan view renders the generated items in order with no filtering.

**Exit:** you review three real plans and their Why text.

### B8. Focus mode and completion

**Build**
- Session reducer (UX §8.3–§8.6) and resume derivation (APP_TECH_ARCHITECTURE_V0.md §8).
- Focus UI: warm-up step; Done with debounce and Undo; weight chips with carry-forward; final-set effort (per-side rows); automatic rest with overrun; timed sets; Report and symptom stop; Swap (options, context chips, held list, post-swap chips); finish step; End session; Unfinished session (finish later or discard).
- Wake lock, audio unlock, landscape bench layout, iPad centered layout.
- Summary from replay decisions with inline effort chips.

**Tests:** reducer transitions. UI: every UX §2.2 in-session budget; zero dialogs except the held-exercise choice; D-093 sizes and reach; offline session; reload during set, rest, and timed set; double tap logs once; partner stopped → straight sets. Integration: summary decisions equal a fresh replay.

**Exit:** one real apartment session with the phone on a bench; "Next time" lines checked against engine decisions.

### B9. Edits, reviews, pack updates

**Build**
- Edit and delete for workouts and external sessions; "What recalculated" from the state summary diff.
- Exercise detail (H-04); Needs review (P-06: CLEAR_HOLD with confirmation, CLEAR_REVIEW); Coach notes (P-08); Open questions (P-07, CONFIRM_CAPABILITY).
- Equipment impact warning with Gone for good / Only today; heavier-weight message for capped lines.
- Datapack update with engine-backed preview (APP_TECH_ARCHITECTURE_V0.md §9 I) and pack history.

**Tests:** integration for each edit type and Q.8 event; every row of APP_DATA_CONTRACTS_V0.md §11 as a fixture scenario; confirmations only where D-092 allows.

**Exit:** all §11 scenarios pass; one real edit and one pack update done on the phone.

### B10. Hardening and release

**Do:** full on-device checklist (APP_TECH_ARCHITECTURE_V0.md §15); performance budgets on your iPhone (Web Worker only if one fails); golden backup fixture for `app_schema_version 1`; VoiceOver pass; copy scan; restore drill on a clean install; tag `v0.1.0`.

**Exit:** Definition of Done (§5).

### B11. Real-use trial ("Phase 8")

Train with the app for the agreed period. Analyze exported backups with small offline scripts (no in-app dashboards): OBS-01–OBS-06, SESSION_CAPACITY and effort trends for weekly frequency tolerance, progression pace under M-19, duration constants against logged times, unrated-effort rate, share of sets logged exactly at target. Output: a new config version (datapack) and any ECRs with decision entries.

---

## 4. Data track timing

| When | Data work |
|---|---|
| B1–B2 | DQ-01 to DQ-03; skeleton source files; pack without metadata |
| B4–B5 | Metadata by family; gym visit |
| Before B7 | Order approvals recorded |
| Any time | PERSONAL answers → pack rebuild, no code change |

---

## 5. Definition of Done for V0

1. All 49 acceptance tests pass on the engine version adopted (0.2.1, or 0.2.2 with AT-29–AT-31), with any ECR-02 relaxation or re-baselining recorded.
2. Every UX §2.2 interaction budget passes as a UI test.
3. No dialogs in focus mode except the held-exercise choice.
4. A full check-in, session, completion, and Alloy log work with no network, automated and on device.
5. Export → clean install → import reproduces the same state digest on device.
6. No personal data or Alloy text in the deployed bundle.
7. The compiled profile contains only whitelisted fields.
8. Every generation stores a complete §J.1 record and rendered Why text; a past generation reproduces from a backup.
9. The architecture test passes: engine purity and module boundaries.
10. Runtime dependencies are exactly `react`, `react-dom`, `zod`, or each addition has a decision entry.
11. The decision log reflects every architecture choice made during the build.

---

## 6. Checkpoints with you

| After | You review | Decision |
|---|---|---|
| B0 | Confirmations in §1.1 | Confirm or amend |
| B4 | A week of Alloy logging on the installed app | Friction to fix before continuing |
| B6 | Metadata review table, order approvals, servability | Corrections; approvals |
| B7 | Three real plans with Why | Plans read correctly |
| B8 | First real session | In-gym friction against the budgets |
| B10 | Release checklist | Go / no-go |
| B11 | Trial findings | Config and engine changes |

---

## 7. Change control during the build

- **FIXED engine rule:** stop; ECR (problem, old, new, reason, affected tests); decision entry; engine version bump; tests.
- **PARAM:** new config version in ENGINE_CONFIG; datapack rebuild; no code change.
- **Contract:** update APP_DATA_CONTRACTS_V0.md and `contract_version`; if the stored shape changes, `app_schema_version`, migration, and golden fixture.
- **New dependency:** decision entry naming what it replaces.
- **UX budget cannot be met:** record the measured count and cause; propose a design change to PRODUCT_UX_SPEC_V0.md rather than relaxing the test.
- **Alloy knowledge learned during the build:** goes to the research layer with its evidence class; never into rule code as an Alloy claim.
