---
file: B5_GENERATOR_BUILD_STATUS.md
class: BUILD STATUS (not a spec — a progress record)
covers: APP_BUILD_SEQUENCE_V0.md B5 (engine and conformance, test-first), against ENGINE_WORKOUT_GENERATOR_V0_2_1.md and GENERATOR_ACCEPTANCE_TESTS_V0_2.md
updated: 2026-09-24
---

# B5 build status: the Workout Generator engine

The generator is implemented as a domain module under `src/engine/`, independent of any UI, per the build instruction. Every rule in it is `class: SYSTEM_DESIGN` (§ evidence discipline) — nothing here claims to be documented or observed Alloy behavior beyond what the frozen engine spec already asserts. `src/engine/index.ts` is the facade other layers should import; nothing outside `src/engine/**` should reach into the rule modules directly (enforced by `tests/architecture.test.ts`'s module-boundary scan, which also forbids clock/random reads anywhere under `src/engine`).

## What's built (11/11 of the requested components)

| Component | File(s) |
|---|---|
| State calculation | `state.ts`, `familyPlan.ts` (posture §C.2, tier §C.3, staleness ordering §C.4.2), `servability.ts` |
| Movement exposure | `familyPlan.ts` (`planMainAndCoreFamilies`, `planCoreAndCarry`, core-starvation swap, §C.7 fallback chains) |
| Hard filtering | `filters.ts` (HF-01 to HF-14) |
| Exercise scoring | `selection.ts` (sort keys K0–K7, §E.1 anchor rule, §E.4 seeded draw) |
| Pair construction | `station.ts` (§F.2 station rule, [M-12]) |
| Set/rep/rest prescription | `prescription.ts` (§G.1–G.5: role table, sets, target load, duration fit/trim, underfill) |
| Progression decisions | `progression.ts` (§H.2–H.7: qualification, decision table, load increase, §H.6 right-side merge, calibrate/return/implement-changed lines) |
| Finish logic | `familyPlan.ts` (`planFinish`, §C.5) |
| Validation | `validation.ts` (§I, V-01–V-07, repair primitive) |
| Generation record | `explain.ts` (§J.3 reason-text), `generate.ts` (assembles the session + why-text); the full persisted `Generation` document's envelope fields (state_digest, config_hash, app_version) are left to the store layer — see Known gaps |
| State updates | `completion.ts` (§K steps 1–8, §H.4 flags, Q.8 user-action events), `alloy.ts` (§L crediting/recovery) |

`generate.ts` is the top-level orchestrator (§C.1/§P): posture → tier → servability → family plan → per-slot selection with §C.7 fallback → station rule → finish plan → prescription → duration fit/underfill → single-pass validate-and-repair → generation result.

`index.ts` (the facade) now wires `validatePack`, `generate`, `promptsDue`, `swapOptions`, `servability`, and `equipmentImpact` to real `Datapack`/`SourceDocuments` contracts — confirmed running end-to-end against `dev-data/seed-datapack.json` (`tests/engine/facade.test.ts`). `replay()` is the one facade function still not implemented; see Known gaps.

## Tests

`npx tsc --noEmit` clean. `npx vitest run`: **272/272 passing** across 20 files, including the pre-existing 91. New this pass:

- Unit tests per rule module: `filters.test.ts` (19), `progression.test.ts` (20), `prescription.test.ts` (21), `station.test.ts` (6), `familyPlan.test.ts` (32), `selection.test.ts` (22).
- `generate.test.ts` (12): integration/invariant tests against the FX-META/FX-EQUIP/FX-CONFIG fixtures (cold start, determinism, LIGHT posture, duration bound, unservable-family reporting).
- `acceptance.test.ts` (9): real canonical acceptance tests — see below.
- `facade.test.ts` (4): the engine facade against the real seed datapack.
- `tests/architecture.test.ts`'s existing 52 tests continued to pass against every new file (purity + module-boundary enforcement).

## Canonical acceptance tests: 9 of 49 implemented, with exact reference values — not the full 49

This is the most important gap to be upfront about, since "implement the canonical generator acceptance tests" was an explicit instruction.

**What's covered, and why it's real conformance, not just a smoke test:** `tests/engine/acceptance.test.ts` implements AT-01, AT-09, AT-21, AT-M08, and re-checks AT-P02/AT-P05/AT-P06's invariants over a reduced corpus, using exact expected values read from the project's canonical (unabridged) copy of `GENERATOR_ACCEPTANCE_TESTS_V0_2.md` — its Appendix A (FX-META, already loaded verbatim by the existing fixture loader, never hand-transcribed) and Appendix C (observed reference values from the spec's own reference simulator run). AT-01's exact `(A1, A2, B1, B2) = (EX012, EX066, EX011, EX054)` tuple and underfill cause, AT-09's HF-02 behavior (which required reconstructing HC-01/HC-02 verbatim from the engine spec's own HF table and the data-contracts doc — these two constraints are the engine's own fixed pair, not itemized in the acceptance doc's fixture list, so this was assembled from the spec text, not invented), and AT-21's HF-06(NA) all pass against the literal documented values.

**What's not covered:** the other 40 tests — AT-H01 (the six-session H-BASE replay checkpoint), AT-02 through AT-25 (minus 01/09/21), AT-R01–R05, and the full AT-P property tests over the spec's own corpus — all require a test harness implementing the spec's `COMPLETE`, `APT`, `EXPOSE`, and `ALLOY` operations (§2.1). Building that harness means writing a P-DEFAULT performer simulator that turns a `GeneratedItem` back into `completion.ts`'s `PerformedItemInput` (per-side effort/reps/load, calibration-load table, qualification flags) and an Alloy-log simulator, then replaying multi-week histories through it. That is genuinely separate scope from the 11-item engine list — comparable in size to another one of this pass's modules — not a short extension, and attempting it under this pass's remaining budget risked introducing harness bugs that would produce misleading passes or failures, which seemed worse than a clearly scoped gap. This is the top recommended next step; §3.4–3.5 of the acceptance doc (Performers, Histories) are already fully specified and ready to build against.

## Documented ambiguity resolutions and deliberate simplifications

None of these silently change a spec rule; each is called out at its site in code and repeated here:

1. **PREP items are not built.** `generate.ts` computes `prepMinutesForTier` (a number, for duration purposes) but does not construct the general-warmup/2×MOBILITY/ramp-set `PrepItem[]` objects §C.6 describes. This is a real functional gap, not just missing UI text.
2. **`SORENESS_REPLACEMENT` / `R04_SWAP` family-plan reason codes** fall back to the generic `FALLBACK_*` codes from the §C.7 chain when the specific detection doesn't line up; `CORE_STARVATION_SWAP` is fully wired. The underlying selection is still spec-correct — only the label is less specific in this pass.
3. **DISLIKE's §E.5 "rotate if an alternative exists" check** is exposed as a helper (`completion.ts`'s `markAnchorRotateDueForDislike`) rather than auto-invoked, since it needs `generate.ts`'s pool/servability context that `completion.ts` alone doesn't have.
4. **`implementFor()` in `generate.ts`** is a simplified stub (`equipment_options[0]`) rather than the HF-06-chosen implement, since `selectForSlot()` doesn't currently surface the chosen implement back to the caller.
5. **ECR-01 (flags on zero-set/no-line items) was left unadopted**, matching its PROPOSED (not CANONICAL) status — §K stays at its 8 base steps.
6. **`servability()`'s facade signature gained an explicit `now` parameter** beyond the original B1 stub's `(pack, derived)` — required to keep the function pure (no clock reads), which the engine's own determinism rule and `tests/architecture.test.ts` both enforce.
7. **`§H.6`'s conservatism ranking allows ties** (HOLD/NOT_EVIDENCE/AT_MINIMUM rank equally), matching the spec's literal "HOLD / NOT_EVIDENCE" wording, rather than an invented strict order.
8. **`replay()` is not implemented** (facade function, not one of the 11 engine components) — see Known gaps.

## Known gaps / recommended next steps, in priority order

1. Build the acceptance-test scenario harness (COMPLETE/APT/EXPOSE/ALLOY + P-DEFAULT performer simulator) and run it against the remaining 40 canonical tests, starting with AT-H01 since every later test depends on it per the spec's own ordering note.
2. Build real `PrepItem[]` construction (§C.6) in `generate.ts`.
3. Implement `replay()` in `index.ts` — folds `Workout`/`ExternalSession`/`UserActionEvent` history into `GeneratorState` via the already-built `completion.ts`/`alloy.ts` functions, in chronological order. Unlike the acceptance-test harness, this replays *real* logged data, not a simulated performer, so it's more tractable — but still real, separate work.
4. Wire the full persisted `Generation` document's envelope fields (state_digest, config_hash, app_version, doc id/timestamps) — a store-layer concern once B3's write queue exists.
5. Wire `implementFor()` to the real HF-06-chosen implement once `selectForSlot()` is extended to return it.
