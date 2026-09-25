---
file: HISTORY_ALLOY_EQUIPMENT_PROFILE_BUILD_STATUS.md
class: BUILD STATUS (not a spec — a progress record)
covers: LOG ALLOY SESSION (prioritized), EQUIPMENT availability management, PROFILE display/editing (non-medical fields), and HISTORY review — built on top of claude/UI_CORE_LOOP_BUILD_STATUS.md's core loop, per explicit instruction
updated: 2026-09-24
---

# LOG ALLOY SESSION / HISTORY / EQUIPMENT / PROFILE build status

Built on top of the B5 engine and the V0 core-loop UI (`claude/UI_CORE_LOOP_BUILD_STATUS.md`), which left these four screens explicitly out of scope. This pass closes that gap in the priority order requested: LOG ALLOY SESSION first (with the explicit requirement that it accept incomplete historical information gracefully and genuinely update the same movement/exercise history the generator reads), then EQUIPMENT, PROFILE, and HISTORY, with an explicit test proving equipment/profile changes affect subsequent generation.

## What was already there, reused as-is

No new engine code was needed. Two mechanisms already built in earlier passes did the real work:

- **`engine/alloy.ts`'s `creditAlloyLog(state, log)`** (§L.3): credits parent patterns (LOWER/PUSH/PULL) from `focus` always, and — for FULL-mode logs (items present) — the specific families tagged and `exercise_last_used` per item. Never touches progression lines, anchors, preferences, or holds (§L.1, D-025).
- **`engine/completion.ts`'s `applyUserActionEvent`** + the `CONFIRM_EQUIPMENT` event (engine contract Q.8): writes into `GeneratorState.equipment_overrides`, which `effectiveEquipmentMap()` layers over `Datapack.equipment_baseline` on every filter/prescription read.

## New architecture: a persisted, editable Datapack copy

The one real architectural addition this pass: `AppStore.init()` now persists a mutable copy of the Datapack into IndexedDB as a `'datapack'`-type document (id `"datapack"`, matching `DatapackSchema`'s literal id) on first run, and loads/validates that persisted copy on every subsequent run (`loadOrSeedDatapack`), falling back to the bundled `dev-data/seed-datapack.json` only if the persisted copy is missing or fails `DatapackSchema.safeParse`. PROFILE and EQUIPMENT edits mutate this persisted copy, never the bundled file. This is deliberately the smallest persistence change that makes "changes affect subsequent generation" true — not B2's still-unbuilt datapack-authoring tool.

## `src/app/sessionLogic.ts` additions (pure, testable, no I/O)

- **`AlloyItemInput` / `buildAlloySession` / `buildExternalItem`**: builds a real `ExternalSession(kind=ALLOY)` document. Every item field (sets/reps/load/dose_text/family_tag) is independently nullable end to end — a bare "I went" with zero items is a complete, valid SUMMARY log; `log_mode` is derived from whether anything was itemized, never required up front. Manual entry (no library match) falls back to `free_text` (placeholder `"Unnamed exercise"` if nothing was typed) plus an optional user-chip `family_tag`.
- **`lookupExercise(pool, query)`**: exercise lookup by display name (substring, case-insensitive) or exact id, over the already-loaded pool — the manual-entry fallback above is what covers "not in the library yet."
- **`deriveAlloyCreditInput` / `creditFromAlloySession`**: derives `AlloyLogForCrediting` from a persisted `ExternalSession` and calls the engine's real `creditAlloyLog`. **Documented, honest limitation**: editing or deleting a Alloy log applies credit forward-only — it cannot retract credit a prior version already granted, since that requires a full `GeneratorState` replay (`replay()`, still not implemented — same gap noted in the B5 and core-loop status docs). Safe/idempotent because every credit write is a max-of-timestamps operation (`latestTs`), but not fully reversible. The UI says so on the edit screen and again on the delete-confirmation sheet, rather than claiming false correctness (this project's evidence-discipline instruction).
- **`buildConfirmEquipmentEvent`**: constructs a real `CONFIRM_EQUIPMENT` `UserActionEvent`.
- **`EditableProfileFields` / `applyProfilePatch` / `addAvoidance` / `removeAvoidance`**: `EditableProfileFields` is `display_name`, `alloy_schedule_default`, `avoidances`, `goals_display`, `presentation_preferences` — the fields `UserProfileSchema` itself defines as non-medical (its own header comment excludes diagnoses, medications, recovery factors, clinical grades, body metrics, and performance baselines from the shape entirely), minus the structural fields (`user_id`, `units`, `generation_env_id`, `profile_version`/`constraints_version`, `pending_questions`, `context_item_ids`) that must stay fixed or belong to a future authoring tool. Avoidances are HF-04 movement exclusions — always an explicit user-stated constraint per this project's HEALTH_CONSTRAINT_RULE, never an app-inferred diagnosis.

## `src/app/store.ts` additions

`saveAlloySession` / `updateAlloySession` / `deleteAlloySession` / `getAlloySession`, `confirmEquipment`, `updateProfile` / `addAvoidance` / `removeAvoidance`, plus `refreshHistoryLists()` and the extended `AppSnapshot` (`workouts`, `externalSessions`, `profile`, `equipmentBaseline`, `equipmentOverrides`) that the new screens read. Each Alloy-session save persists the document, applies its credit to `GeneratorState`, and persists that too — a log is real history the moment it's saved, not a cosmetic record.

## `src/ui/*` additions

- **`AlloySessionForm.tsx`** — the shared LOG ALLOY SESSION form (used for both create and edit): date/time (converted to UTC via `domain/time.ts`'s `localDateTimeToUtc`, respecting the profile's tz), duration (unknown-defaults-to-55min or a known value), focus, program, optional overall effort, a repeatable exercise-item editor (slot label for A1/A2-style pairing, exercise search-or-manual-fallback, sets/reps/load/dose text, finisher flag, coach-modified + coach note), notes, and coach notes. Nothing is required except local date and focus.
- **`LogAlloy.tsx`** — thin wrapper around the form for a fresh entry.
- **`History.tsx`** — lists completed workouts and external sessions (newest first); tapping an Alloy/Other session opens the same form pre-filled for editing, with delete (behind a confirmation sheet that states the non-retraction limitation).
- **`Equipment.tsx`** — lists the equipment catalog with current effective state (availability/loads/max confirmed load, via `store.getEquip()`); expanding an item edits it through `confirmEquipment`. `station_group` is deliberately not exposed here: the override plumbing exists, but `effectiveEquipmentMap()` doesn't merge it into what generation reads in V0, so surfacing an editor for it would imply an effect it doesn't have.
- **`Profile.tsx`** — display name, avoidances (search-and-add / remove, feeding HF-04 directly), Alloy class schedule, goals, and presentation preferences.
- **`App.tsx`** — a top tab bar (Today / Log Alloy / History / Equipment / Profile), hidden during Focus mode and on the post-completion screen (one-thing-at-a-time hard rule).

All new UI files stay within `tests/architecture.test.ts`'s module boundaries (`ui -> app, contracts, domain` only) — no `src/engine` import from `src/ui`.

## Tests

`npx tsc --noEmit` clean. `npm run build` clean. `npx vitest run`: **339/339 passing** (was 291; +48: 26 new sessionLogic unit tests in `tests/app/alloyProfileEquipment.test.ts`, 17 new AppStore integration tests in `tests/app/store.test.ts`, `tests/architecture.test.ts` grew from 68 to 73 checking the 5 new `src/ui` files). Playwright: **6/6 passing** across iphone/ipad/desktop (the original `coreLoop.spec.ts` plus a new `historyAlloyEquipmentProfile.spec.ts`).

- **`tests/app/alloyProfileEquipment.test.ts`**: `lookupExercise`, `buildAlloySession` (SUMMARY vs FULL, duration defaulting, exercise-match vs manual-fallback tagging, A1/A2 slot labels, independent sets/reps/load optionality, notes/coach fields, edit id/created_at preservation, canonical id derivation), `creditFromAlloySession` (parent-pattern-only for SUMMARY, added family+exercise credit for FULL, the excluded-family list, never touching lines/holds/preferences, OTHER-kind sessions never credited, idempotent re-crediting), `buildConfirmEquipmentEvent`, and `applyProfilePatch`/`addAvoidance`/`removeAvoidance`.
- **`tests/app/store.test.ts`**: persisted-datapack seed/reuse across a fresh `AppStore` over the same adapter; Alloy session save/edit/delete and history ordering; equipment override persistence and reload; profile persistence and reload. **The explicitly required proof** is its own describe block: a cold-start GENERATE on the dev seed pool reliably anchors EX012 (Goblet Squat) into slot A1; adding a PROFILE avoidance for EX012 removes it from every subsequent GENERATE call (and removing the avoidance restores it); marking both of EX012's equipment options (`EQ009`, `EQ010`) `NOT_AVAILABLE` removes it from generation the same way (HF-06). All three assertions run against the real `AppStore` API (`addAvoidance`/`removeAvoidance`/`confirmEquipment`/`startNormalDay`), not a direct engine call, so they prove the whole stack, not just the engine mechanism underneath it.
- **`tests/ui/historyAlloyEquipmentProfile.spec.ts`** (Playwright): logs a bare SUMMARY Alloy session through the real UI, confirms it in History, edits it, changes an equipment item's availability and confirms the effective state updates, adds and removes a Profile avoidance — real browser, real IndexedDB, all three viewports, no horizontal scroll.

## Known gaps / recommended next steps

1. **Non-retraction on Alloy log edit/delete** (documented above and in-UI) — fixing it requires `replay()`, still not implemented anywhere in the app (same gap as the B5 and core-loop status docs).
2. **`station_group` equipment overrides** are plumbed through `buildConfirmEquipmentEvent`/`applyUserActionEvent` but not surfaced in the Equipment screen, since `effectiveEquipmentMap()` doesn't read them back in V0 — worth revisiting if station-group logic starts consuming overrides.
3. **First-run setup (T-00)** is still out of scope, as in the core-loop pass.
4. **§L.2's missing-session prompt** (`promptsDue`/`resolveAlloyPrompt` in `engine/alloy.ts`) is built at the engine level but has no UI surface yet — Today doesn't currently ask "did you go to your scheduled Alloy class?".
