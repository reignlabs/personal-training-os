---
file: UI_CORE_LOOP_BUILD_STATUS.md
class: BUILD STATUS (not a spec — a progress record)
covers: the V0 mobile-first UI for the core workout loop (TODAY / readiness / warm-up / training blocks / exercise cards / set completion / load+reps logging / rest timer / effort / discomfort / why this exercise / swap / completion), built ahead of APP_BUILD_SEQUENCE_V0.md's normal B4/B6 ordering per explicit instruction, against PRODUCT_UX_SPEC_V0.md
updated: 2026-09-24
---

# UI core-loop build status

Built on top of the B5 engine (`claude/B5_GENERATOR_BUILD_STATUS.md`) and the existing `src/store` StorageAdapter/IndexedDbAdapter. Scope was explicit: TODAY, pre-workout readiness, workout overview, warm-up, training blocks, exercise cards, set completion, load/reps logging, rest timer, effort/difficulty, discomfort input, WHY THIS EXERCISE, exercise swap, and workout completion — wired to real persistence and the real engine, not mock data. Log Alloy, History, Equipment, Profile, and first-run setup (T-00) were explicitly out of scope and are not built.

## Architecture (new: `src/app`, `src/ui`)

- **`src/app/datapack.ts`** — loads/validates the dev seed datapack (unchanged from the prior pass).
- **`src/app/sessionLogic.ts`** — the pure, testable bridge between `src/engine` and the app's persisted documents. No React, no I/O, `now` always an argument. Builds `CheckIn` (full form + D-081 "normal day" shortcut), a deliberately simplified `StoredGeneration` wrapper around the engine's own `GenerateResult` (see Documented decisions), a real `WorkoutSchema`-conformant `Workout` from a generated session, the Focus-mode flat step sequence (`buildFlatSteps`/`currentStepIndex`, §8.3's step machine as a pure function of already-persisted data — no separate mutable "current step" state), set logging, discomfort flags, exercise swap (recomputing prescription via the real `determineLineStatus`/`computeTargetLoad`/`computeSets`), and workout completion (mapping logged `WorkoutExercise[]` to `completion.ts`'s real `PerformedItemInput[]`/`SideExposureInput[]` and calling the real `completeWorkout()`/`applyFlags()`).
- **`src/app/store.ts`** — the React-facing layer: owns the in-memory document index (StorageAdapter has no querying), exposes async actions (`startNormalDay`/`startDifferentDay`, `logSet`, `skipItem`, `addFlag`, `setItemNote`, `getSwapOptions`/`applySwap`, `completeWarmup`, `finishWorkout`) and a `useAppStore()` hook via `useSyncExternalStore` — no state-management dependency needed for this scope.
- **`src/ui/*`** — `App` (routing), `Today` (readiness form), `Overview`, `Warmup`, `Focus` (the step-machine orchestrator), `ExerciseCard`, `Finish`, plus `WhySheet`/`SwapSheet`/`DiscomfortSheet` and shared primitives (`components/Primitives.tsx`, `LoadPicker.tsx`, `RepsStepper.tsx`, `RestTimer.tsx`). `styles.css` is mobile-first with two `min-width` breakpoints for iPad/desktop.
- Two new `DocTypeSchema` entries (app-internal extensions, not canonical §4–10 types, documented at their declaration in `document.ts`): `engine_state` (the persisted `GeneratorState`, carried forward incrementally after every completion rather than rebuilt via the still-unbuilt `replay()`) and `stored_generation` (see below).

Module boundaries (`tests/architecture.test.ts`) hold: `ui -> app, contracts, domain` only — the UI never imports `src/engine` directly, even for types (e.g. `EffectiveEquipment`/`SwapOptions` are re-exported from `sessionLogic.ts`). `app -> engine, pack, store, platform, contracts, domain`.

## Documented decisions (SYSTEM_DESIGN, not Alloy fact)

1. **`StoredGeneration` is a deliberately simplified wrapper**, not the full canonical `Generation`/`GenerationRecordSchema` document (§6.2) — it holds the engine's own `GenerateResult` verbatim plus doc-envelope fields. Building the full record (state_digest, config_hash, app_version, `alternatives[]`, `family_plan[]`, `validators[]`, …) was already flagged as store-layer scope in the B5 status doc. `swapOptions()` needs the full `Generation` TS type for one read (`generation.session.{posture,items}`); `computeSwapOptions()` constructs just that shape and casts, rather than fabricating an unread `GenerationRecord`.
2. **`Workout` is real**, not simplified — it's the actual persisted training history, so it's built to fully satisfy `WorkoutSchema`.
3. **Equipment resolution for progression** (`resolveEquipForImplement`): neither `generate.ts` nor `completion.ts` resolves a single `EffectiveEquipment` from a multi-id `implement` set (e.g. dumbbell + bench) — `increaseLoad`/`lowerAvailableLoad` take one `EffectiveEquipment | undefined`, but the engine's own generate/facade code never calls them; completion is the first real caller. The app layer prefers the load-bearing piece (known `loads`/`max_confirmed_load`), falling back to the implement's first id.
4. **A user-initiated swap is treated like a §C.7 fallback-filled slot** for the A/B 3-set rule (`computeSets`'s `isReplacedSlot`) — a reasonable, documented extension of §G.2 to a case the canonical rule doesn't explicitly name.
5. **Rest has no Skip button** (D-086): the rest overlay's one action ("Log next set") is what ends rest, matching "ends when the next set is logged" rather than being a bypass.
6. **Swap reasons and discomfort flags are optional post-action chips**, never a blocking dialog (D-088/D-089); the symptom stop is 2 taps and applies immediately.
7. **Warm-up is a generic, honestly-labeled prompt**, not a fabricated PREP list — `generate.ts`'s own SCOPE NOTE says §C.6 PREP item construction isn't built yet, and the UI doesn't claim otherwise.
8. **"WHY THIS EXERCISE" for a swapped-in item is synthesized** from the same §J.3 templates (`engine/explain.ts`) the generator itself uses for original picks, since a user swap isn't a generation-time decision with pre-rendered why-text.

## Tests

`npx tsc --noEmit` clean. `npx vitest run`: **291/291 passing** (was 278; +13: `tests/app/sessionLogic.test.ts`'s 3 new tests, `tests/architecture.test.ts` grew from 55 to 68 checking the new `src/app`/`src/ui` files).

- **`tests/app/sessionLogic.test.ts`**: an integration test running the real GENERATE → START → LOG SETS → SWAP IF NEEDED → COMPLETE → UPDATE HISTORY loop against the real 8-exercise dev seed datapack (no mocks of engine logic), plus a synthetic-pool unit test isolating `applySwap`'s mapping (the dev pool has only one exercise per family, so the real pool never offers a swap candidate — the synthetic test exercises that path directly).
- **`tests/ui/coreLoop.spec.ts`** (Playwright): the same loop driven through the real browser UI against real IndexedDB persistence, run on all three configured projects — **iphone / ipad / desktop, 3/3 passing**, including a no-horizontal-scroll assertion at each viewport. (Environment note: this sandbox only has Chromium installed, not WebKit — `playwright.config.ts` pins `browserName: 'chromium'` with an explicit `executablePath` and borrows only the viewport/UA/touch emulation from Playwright's iPhone/iPad/Desktop-Safari device presets; §15's WebKit requirement should be re-verified in an environment with WebKit available.)

## Known gaps / recommended next steps

1. **Re-run `tests/ui/coreLoop.spec.ts` under real WebKit** once available, per APP_TECH_ARCHITECTURE_V0.md §15.
2. **Build the excluded screens** (Log Alloy, History, Equipment, Profile, first-run setup) — deliberately out of scope for this pass.
3. **§C.6 PREP items** are still not built in the engine (per B5's gap #2); the Warm-up screen is generic until that lands.
4. **`replay()`** is still not implemented; `engine_state` is carried forward incrementally instead, which is correct steady-state behavior but means a corrupted/edited history can't currently be rebuilt from scratch.
5. The 8-row dev seed pool means most families have exactly one exercise, so swap has no real candidates in practice today — worth re-testing the swap loop once a fuller `exercise_metadata` set exists (B6).
