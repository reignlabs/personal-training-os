---
file: GENERATOR_ACCEPTANCE_TESTS_V0_2.md
class: TEST_SPECIFICATION
status: CANONICAL (frozen with engine 0.2.0)
engine_version_under_test: 0.2.0
config_version_under_test: 0.2.0
updated: 2026-09-23
spec: ENGINE_WORKOUT_GENERATOR_V0_2.md
executed_against: reference simulator (test harness, not the application), 2026-09-23: 39 executable tests pass (AT-H01, AT-P01–P07, AT-01–25, AT-R01–R05, AT-M08); AT-M01–M07 are loader specification tests
---

# Generator Acceptance Tests, V0.2

## 1. Purpose and conformance

An implementation of engine 0.2.0 is **conforming** only if every test in §4 to §7 passes with the fixtures in §3. Tests are written so they can be automated without interpretation: each has fixed inputs, a fixed sequence of operations, and assertions on named fields with exact expected values.

Expected values were produced by executing each test against the reference simulator used for the red-team and the rerun. The observed values are listed in Appendix C. The fixture metadata in Appendix A is **test data**: it follows the §Q.1.1 authoring criteria but is not the canonical EXERCISE_METADATA, which has not been authored yet. When canonical metadata exists, these tests still run on FX-META; a separate test run on canonical data is a Phase 8 activity, not part of conformance.

Evidence discipline: every behavior tested here is `class: SYSTEM_DESIGN`. Nothing in this document describes Alloy's programming.

## 2. Conventions

### 2.1 Operations (test harness verbs)

| Operation | Meaning |
|---|---|
| `NEW()` | Empty engine state (§B.1) with FX-CONFIG, FX-EQUIP, FX-META loaded. |
| `LOAD(H)` | Engine state after replaying history H (§3.5). |
| `ALLOY(date[, mode, focus, items])` | Add an Alloy log: `performed_at` date 16:00, `ended_at` 16:55, source USER_ENTRY. Defaults: SUMMARY, focus full, no items. |
| `GEN(t, CI)` | Generate at local time `t` with check-in `CI`. Returns session `S` and generation record `G`. State is not changed except by Alloy prompt answers (§L.2). |
| `COMPLETE(P[, opts])` | Complete the last generated session with performer P (§3.4). `started_at = t + 5 min`; `ended_at = started_at + S.duration_estimate_min`. Returns completion decisions `C`. |
| `APT(t, CI[, P])` | `GEN(t, CI)` then `COMPLETE(P or P-DEFAULT)`. |
| `EXPOSE(e, role, n, P, every)` | Progression-only harness: n completions of a one-item session containing exercise e in role, prescribed from the current line, first at 2026-09-22 18:00 and then every `every` days; §K steps 3, 5, 6, 7 apply. |
| `INJECT(path = value)` | Test-only direct state edit (used where a scenario needs a state the schedule would take weeks to reach). |

Check-in `CI` lists only non-default answers. Defaults: R-02 normal, R-04 same, R-04b as_usual, R-05 none, R-06 no, EQ-? empty. **Every Alloy prompt is answered "no" unless the test states otherwise** (the engine's own default for a dismissed prompt is "unanswered", tested in AT-23).

### 2.2 Assertion paths

| Prefix | Object | Examples |
|---|---|---|
| `S.` | GENERATED_SESSION (Q.10) | `S.items[A1].exercise_id`, `S.items[A1].rx.line_state`, `S.items[A1].rx.target`, `S.items[A1].rx.load`, `S.items[A1].rx.sets`, `S.items[A1].implement`, `S.blocks[A].mode`, `S.prep[]` |
| `G.` | GENERATION_RECORD (Q.11, §J.1) | `G.family_plan[A1].family`, `G.family_plan[A1].reason_code`, `G.items[A1].selection.reason_code`, `G.items[A1].selection.decided_by`, `G.items[A1].alternatives[EX012].outcome`, `G.underfill.cause`, `G.unservable[].family`, `G.finish_choice` |
| `E.` | ENGINE_STATE after the last operation (§B.1) | `E.anchors[HD,PRIMARY].exercise_id`, `E.anchors[..].rotate_due`, `E.anchors[..].rotate_cause`, `E.anchors[..].note`, `E.lines[EX054,SECONDARY,RIGHT].next_load`, `.next_target`, `.last_decision`, `.state`, `.reduce_locked`, `E.recovery_credits[]`, `E.family_last_trained[KD]`, `E.parent_last_trained[LOWER]` |
| `C.` | Completion decisions of the last COMPLETE | `C[B2].RIGHT`, `C[B2].LEFT`, `C[A2].BILATERAL` |

Reason codes are compared as exact strings including the argument, e.g., `SUBSTITUTE_NO_ANCHOR(HF-12)`. A decision merged from the other side (§H.6) may carry a suffix `(merged)`; assertions written `starts with` accept it. Durations are compared to 0.01 min.

### 2.3 Test types

- **Property tests (AT-P)** assert invariants over a corpus of generated sessions. The corpus is every session generated while building H-BASE, H-LONG, H-30 and H-47 (§3.5), unless the test adds more.
- **Targeted tests (AT-01 to AT-25)** exercise one modification each (traceability in §8).
- **Regression tests (AT-R)** protect 0.1.1 behavior that the red-team classified GOOD.
- **Metadata tests (AT-M)** exercise the load-time validators V-00a to V-00g on synthetic rows.
- **History checkpoints (AT-H)** confirm the fixtures were built correctly; run them first, since every later test depends on them.

## 3. Fixtures

### 3.1 FX-CONFIG

All §R defaults of config 0.2.0. Time zone America/Los_Angeles; all times below are local. `user_id = "nelson"` (seed input). In particular: REPEAT_EXCLUSION_DAYS 1, HEAVY_LOWER_RECOVERY_HOURS 24, LOAD_UP_CONFIRMATIONS 1, UNDERFILL_NOTICE_MINUTES 10, ALLOY_TIME_UNCERTAINTY_HOURS 2, ALLOY_DEFAULT_DURATION_MINUTES 55, ALLOY_SCHEDULE Mon/Wed/Fri 16:00, FIRST_SESSIONS_NO_FINISH 2, CORE_STARVATION_DAYS 7, ACCESSORY_ROTATION_EXPOSURES 4, GAP_DAYS 14, GOAL_ACCESSORY_ENABLED false, CONDITIONING_OPT_IN false, ENABLE_NOVEL_DRAW true.

### 3.2 FX-EQUIP

| Equipment | Availability | Loads | max_confirmed_load | Station group |
|---|---|---|---|---|
| EQ001–EQ003, EQ008, EQ013, EQ015, EQ016, EQ022 | AVAILABLE | — | — | NONE (EQ003: DIP) |
| EQ002 spin bike | AVAILABLE | — | — | NONE |
| EQ004 rack + pull-up bar, EQ005 flat bench, EQ006 barbell, EQ007 plates | AVAILABLE | EQ006/EQ007 unknown | — | RACK_AREA |
| EQ009 kettlebells | AVAILABLE | [25, 30, 35, 40, 45] | 45 | NONE |
| EQ010 dumbbells | AVAILABLE | unknown | 50 | NONE |
| EQ011 adjustable bench (flat) | AVAILABLE | — | — | BENCH_2 |
| EQ011_INCLINE (incline setting) | UNKNOWN | — | — | BENCH_2 |
| EQ017–EQ021 machines | AVAILABLE | — | — | own group each (no rows in FX-META) |
| EQ_CABLE_ADJ (adjustable pulley) | UNKNOWN | — | — | — |
| EQ_SUSP, EQ_BAND, EQ_WHEEL, EQ_ROLLER, EQ_TRAPBAR | NOT_AVAILABLE | — | — | — |

### 3.3 FX-META

81 rows, listed in Appendix A. Summary of what matters to the tests: KD `default_order` begins EX012 Goblet Squat, EX018 KB Front Squat, EX053 Racked KB Squat; HD begins EX011 KB Deadlift, EX065 DB RDL; HPUSH EX054 DB Bench, EX041 DB Floor Press; VPUSH EX015 KB OHP, EX071; HPULL EX066 DB Bent-Over Row, EX069 Chest-Supported Row. VPULL rows (EX048, EX067) require a capability not confirmed (HF-08), so VPULL is unservable; ANTI_LAT has no rows. EX003, EX075, EX085, EX092 and seven others have `hand_support = PLANK_POSITION_UNCONFIRMED`. EX050 Trap Bar Deadlift needs EQ_TRAPBAR (NOT_AVAILABLE). Every press has `right_triceps_involvement = SECONDARY`.

**FX-K3 (variant used only by AT-12):** FX-META with EX041 `right_triceps_involvement = NONE`.

### 3.4 Performers

**P-DEFAULT.** For every performed item: all prescribed working sets; reps (or seconds) = prescribed target (CALIBRATE and SEEDED: the role's range_min); load = the prescribed load, or for CALIBRATE the calibration load below; effort GOOD on every side; no flags; SESSION_CAPACITY usual.

Calibration load by the first implement of the row's first equipment option: EQ009 → 35 lb (25 lb when the family is HPUSH, VPUSH or HPULL; 45 lb for CARRY); EQ010 → 30 lb; EQ006 → 135 lb; bodyweight or time → none.

**Overrides** (per exercise): `effort`, `right_effort`, `reps_delta` (added to target on every set, both sides), `right_reps_delta` (right side only), `flags[]`. Example: `{EX054: right_reps_delta −2, right_effort HARD}`.

### 3.5 Histories

| ID | Definition |
|---|---|
| H-COLD | `NEW()`. |
| H-BASE | From `NEW()`, for each day 2026-09-07 (Mon) to 2026-09-20 (Sun): on Mon/Wed/Fri `ALLOY(day)`; on Tue and Thu `APT(day 18:00, {R-01 45})`; on Sat `APT(day 10:00, {R-01 45})`. Six apartment sessions. |
| H-LONG | As H-BASE for 42 days, 2026-09-07 to 2026-10-18. Eighteen apartment sessions. |
| H-30 | As H-BASE with R-01 30. |
| H-47 | As H-BASE with apartment sessions Tue 18:00, Thu 17:30, Sat 17:00. |

## 4. History checkpoints

### AT-H01 · H-BASE builds as specified

**Given** H-COLD. **When** H-BASE is replayed. **Then** the six generated sessions contain exactly the items in Appendix B (slot → exercise_id) and duration estimates to 0.01 min; after the replay: `E.anchors[KD,PRIMARY].exercise_id = EX012`, `E.anchors[HD,PRIMARY] = EX065`, `E.anchors[KD,SECONDARY] = EX018`, `E.anchors[HD,SECONDARY] = EX011`, `E.anchors[HPULL,PRIMARY] = EX066`, `E.anchors[HPULL,SECONDARY] = EX069`, `E.anchors[HPUSH,SECONDARY] = EX054`, `E.anchors[HPUSH,PRIMARY] = EX041`, `E.anchors[VPUSH,PRIMARY] = EX015`, `E.anchors[VPUSH,SECONDARY] = EX071`; `E.lines[EX054,SECONDARY,RIGHT].next_load = 30`, `.next_target = 9`.

*Status: executed via the scenario runner (Appendix B is its output).*

## 5. Property tests

### AT-P01 · Determinism and same-day regeneration
- Rules: §0 Determinism, §E.4.
- **Given** H-COLD; separately H-BASE.
- **When** `GEN(2026-09-22 18:00, {R-01 45})` and `GEN(2026-09-22 18:05, {R-01 45})` on identical copies of each state.
- **Then** for each history: `S.items` (all slots), `S.prep[]` and every `S.items[*].rx` are identical between the two generations.

### AT-P02 · No HELD or EXCLUDED exercise is ever auto-selected
- Rules: §D, V-01.
- **Given/When** the corpus (§2.3).
- **Then** for every item of every session (including PREP and F), the static filters (HF-01 to HF-04, HF-06 NOT_AVAILABLE/UNKNOWN, HF-07, HF-08, HF-09, HF-14) pass. Count of violations = 0.

### AT-P03 · No exercise twice; no core or carry family twice
- Rules: V-04, §C.7 invariant [M-07].
- **Given** the corpus plus four sessions from H-BASE + `ALLOY(2026-09-21)` at `GEN(2026-09-22 18:00)` with R-05 = {upper}, {lower}, {} and {upper, lower}.
- **Then** in every session: all `S.items[*].exercise_id` distinct (violations 0); among items whose family ∈ {ANTI_EXT, ANTI_ROT, ANTI_LAT, CARRY}, families distinct (violations 0).

### AT-P04 · Station rule holds or the block is STRAIGHT_SETS
- Rules: §F.2, V-02 [M-12].
- **Then** for every block with two items and `S.blocks[b].mode = PAIRED`: not (both stations ≠ NONE and stations differ). Violations 0.

### AT-P05 · Main-role picks are never decided by a draw
- Rules: §E.4 [M-05].
- **Then** for every item in slots A1, A2, B1, B2: `G.items[slot].selection.decided_by` does not start with `DRAW`. Violations 0.

### AT-P06 · Unservable families are never planned
- Rules: §C.4.1 [M-06].
- **Then** no `G.family_plan[*].family` ∈ {VPULL, ANTI_LAT} in any session; every record lists both in `G.unservable[]`.

### AT-P07 · Substitute picks never change an anchor
- Rules: §E.1, §K step 7 [M-03, M-12].
- **Given** `NEW()`. **When** for 28 days from 2026-09-07: `ALLOY` on Mon/Wed/Fri; `APT` Tue/Thu 18:00 and Sat 10:00 (R-01 45), recording `E.anchors` before each COMPLETE.
- **Then** for every item whose reason starts with `SUBSTITUTE` or equals `STATION_RESELECT`, the anchor for (its family, its role) is identical before and after COMPLETE. Violations 0.

## 6. Targeted tests

### AT-01 · Cold start: anchors come from default_order, not the seed [M-05]
- **Given** H-COLD.
- **When** `GEN(d 18:00, {R-01 45})` for each d in 2026-09-22 … 2026-09-29 (eight dates, fresh state each time).
- **Then**
  - the tuple (`S.items[A1]`, `[A2]`, `[B1]`, `[B2]`) is identical on all eight dates;
  - it equals (EX012, EX066, EX011, EX054);
  - on 2026-09-22: `G.blocks_included` excludes F; `G.underfill.cause = FIRST_SESSIONS`.

### AT-02 · Role alternation after a full session [M-01]
- **Given** H-COLD; `APT(2026-09-22 18:00, {R-01 45})`.
- **When** `GEN(2026-09-24 18:00, {R-01 45})`.
- **Then** `G.family_plan[A1].family = HD` and `.reason_code = LOWER_ROLE_ALTERNATION`; `G.family_plan[A2].family ∈ {HPUSH, VPUSH}`; `G.family_plan[B1].family = KD`.

### AT-03 · Six-week balance of leading roles [M-01]
- **Given/When** H-LONG.
- **Then** over its 18 sessions: count of `G.family_plan[A1].family` = {KD: 9, HD: 9}; count of `G.family_plan[A2].family`: HPULL = 9, HPUSH ≥ 4, VPUSH ≥ 4 (observed HPUSH 4, VPUSH 5).

### AT-04 · Repeat exclusion is calendar-based (no clock cliff) [M-02]
- **Given** H-BASE; `ALLOY(2026-09-21)`; `APT(2026-09-22 18:00, {R-01 45})`; `ALLOY(2026-09-23)`.
- **When** `GEN(2026-09-24 18:20, {R-01 45})` and, on an identical copy, `GEN(2026-09-24 18:50, {R-01 45})`.
- **Then** `S.items` identical between the two; no slot in A1, A2, B1, B2 has `G.items[slot].selection.reason_code = SUBSTITUTE_FOR_ANCHOR(HF-11)`.

### AT-05 · Previous calendar day is excluded, including Alloy FULL items [M-02, §L.3]
- **Given** H-BASE; `ALLOY(2026-09-21, FULL, focus full, items [{exercise_id EX012, family_tag KD}])`.
- **When** `GEN(2026-09-22 18:00, {R-01 45})`; separately (same state) `GEN(2026-09-23 18:00, {R-01 45})`.
- **Then** 09-22: in the KD slot's record, `G.items[slot].alternatives[EX012].outcome = HF-11`; 09-23: that outcome ≠ HF-11.

### AT-06 · A pick shaped by a today-only filter never becomes the anchor [M-03]
- **Given** H-COLD; `APT(2026-09-22 18:00, {R-01 45})`.
- **When** `APT(2026-09-23 07:00, {R-01 45})`; then `APT(2026-09-25 18:00, {R-01 45})`; then `GEN(2026-09-27 18:00, {R-01 45})`.
- **Then**
  - at 09-23: `S.items[A1] = EX073`, `G.items[A1].selection.reason_code = SUBSTITUTE_NO_ANCHOR(HF-12)`;
  - after that completion: `E.anchors[HD,PRIMARY]` does not exist;
  - at 09-27: `S.items[A1] = EX065`, reason `NEW_ANCHOR_NONE_PRIOR` (EX073, which has a line, does not win: history keys are not used for anchor choice).

### AT-07 · A new role line is seeded from the other role; two anchors on different stations run straight sets [M-04, M-12]
- **Given** H-BASE; `ALLOY(2026-09-21)`; `INJECT(E.anchors[KD,PRIMARY] = {EX051, exposures 2})`; `INJECT(E.anchors[HPULL,PRIMARY] = {EX069, exposures 2})`; `INJECT(E.exercise_last_used[EX051] = E.exercise_last_used[EX069] = 2026-09-17 19:00)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45})`.
- **Then** `S.items[A2] = EX069`; `S.items[A2].rx.line_state = SEEDED`, `.target = 6`, `.load = 30`; `S.blocks[A].mode = STRAIGHT_SETS`.

### AT-08 · Soreness replacement uses servable core families [M-06, M-07]
- **Given** H-BASE; `ALLOY(2026-09-21)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45, R-05 {upper}})`; separately `GEN(…, {R-01 45, R-05 {lower}})`.
- **Then**
  - upper: `G.family_plan[A2].family = ANTI_EXT`, `G.family_plan[B2].family = ANTI_ROT`, both slots filled; no selected item has UPPER in `sore_regions` (so CARRY is absent);
  - lower: `G.family_plan[A1].family = ANTI_EXT`, `G.family_plan[B1].family = ANTI_ROT`, both filled; `G.underfill.cause = SLOTS_EMPTY`.

### AT-09 · Undocumented plank positions are HELD and never selected [M-08]
- **Given** `NEW()`, `now` = 2026-09-22 18:00, no soreness, no equipment issues.
- **When** the filter chain is evaluated for EX003, EX075, EX085, EX092, each in its first allowed role.
- **Then** each outcome = HF-02 (HELD_PENDING_SCOPE); across the corpus none of the four appears in any `S.items` or `S.prep`.

### AT-10 · Right arm worse, pressing as usual: evidence scoped to triceps-involved rows [M-09]
- **Given** H-BASE; `ALLOY(2026-09-21)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45, R-04 worse, R-04b as_usual})`; `COMPLETE(P-DEFAULT)` with R-04 worse.
- **Then** `S.items[B2] = EX054`, reason `ANCHOR`; `C[B2].RIGHT = NOT_EVIDENCE`; `C[B2].LEFT` starts with `NOT_EVIDENCE`; `C[A2].BILATERAL = REPS_UP` (EX066, involvement NONE).

### AT-11 · Right arm worse, swap pressing for core [M-09]
- **Given** as AT-10. **When** `GEN(2026-09-22 18:00, {R-01 45, R-04 worse, R-04b swap})`.
- **Then** `G.family_plan[B2].family = ANTI_EXT`, `.reason_code = R04_SWAP`; no selected item has family HPUSH or VPUSH.

### AT-12 · With R-04 worse, K3 leads when a lower-involvement option exists [M-09]
- **Given** FX-K3; H-BASE; `ALLOY(2026-09-21)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45, R-04 worse, R-04b as_usual})`; on a copy, `GEN(2026-09-22 18:00, {R-01 45})`.
- **Then** first: `S.items[B2] = EX041`, reason `SUBSTITUTE_FOR_ANCHOR(R-04)`; second: `S.items[B2] = EX054` (the anchor). Anchor after either generation unchanged.

### AT-13 · RIGHT_ARM_FADE does not change counted reps [M-10, M-18]
- **Given** H-BASE (`E.lines[EX054,SECONDARY,*]` = 30 lb × 9).
- **When** `EXPOSE(EX054, SECONDARY, 4, {flags [RIGHT_ARM_FADE]}, every 2 days)`.
- **Then** each `E.lines[EX054,SECONDARY,RIGHT].last_decision` ∈ {REPS_UP, CONFIRM_TOP, LOAD_UP}; never REDUCE or HOLD.

### AT-14 · At most one automatic REDUCE until success or review [M-10]
- **Given** as AT-13.
- **When** `EXPOSE(EX054, SECONDARY, 4, {flags [RIGHT_ARM_FADE], right_reps_delta −2, right_effort HARD}, every 2 days)`.
- **Then** RIGHT decisions in order: REDUCE, HOLD(REDUCE_LIMIT), HOLD(REDUCE_LIMIT), HOLD(REDUCE_LIMIT); after every exposure `next_load` = 25 on RIGHT and LEFT; the record carries the review flag from exposure 2 onward.

### AT-15 · REDUCE lock clears after a qualifying success [M-10]
- **Given** as AT-13.
- **When** three exposures (every 2 days): (1) `{right_reps_delta −2, right_effort HARD}`, (2) P-DEFAULT, (3) `{right_reps_delta −2, right_effort HARD}`.
- **Then** RIGHT decisions: REDUCE, REPS_UP, REDUCE.

### AT-16 · DISLIKE rotates the anchor at the next exposure of that slot [M-11]
- **Given** H-BASE; `ALLOY(2026-09-21)`; `GEN(2026-09-22 18:00, {R-01 45})` (A1 = EX012, KD/PRIMARY anchor); `COMPLETE(P-DEFAULT + {EX012: flags [DISLIKE]})`.
- **Then (state)** `E.anchors[KD,PRIMARY].rotate_due = true`, `.rotate_cause = DISLIKE`.
- **When** `ALLOY(2026-09-23)`; `APT(2026-09-24 18:00, {R-01 45})`; `ALLOY(2026-09-25)`; `GEN(2026-09-26 18:00, {R-01 45})`.
- **Then** `S.items[A1] = EX053`, reason `NEW_ANCHOR_ROTATION(DISLIKE)`; EX012 not in `S.items`.

### AT-17 · DISLIKE with no alternative keeps the exercise [M-11]
- **Given** H-BASE; `ALLOY(2026-09-21)`; `GEN(2026-09-22 18:00, {R-01 45})`; `COMPLETE(P-DEFAULT + {EX046: flags [DISLIKE]})` (EX046 is the only CARRY row).
- **Then (state)** `E.anchors[CARRY,CARRY].rotate_due = false`; `.note = NO_ALTERNATIVE_FOR_DISLIKE`.
- **When** `ALLOY(2026-09-23)`; `GEN(2026-09-24 18:00, {R-01 45})`.
- **Then** EX046 is selected; its `selection.reason_code = ANCHOR`.

### AT-18 · Station conflict keeps the anchor and re-selects the non-anchor [M-12]
- **Given** H-BASE; `ALLOY(2026-09-21, FULL, focus full, items [{exercise_id EX011, family_tag HD}])`; `INJECT(E.lines[EX082,SECONDARY,BILATERAL] = {next_load 135, next_target 9, state BUILDING, implement [EQ006+EQ007]})`.
- **When** `GEN(2026-09-22 18:00, {R-01 45})`.
- **Then** exactly one of B1, B2 has reason `STATION_RESELECT` and the other has reason `ANCHOR`; `S.blocks[B].mode = PAIRED`. (Observed: B1 EX082 on RACK_AREA conflicted with the B2 anchor EX054 on BENCH_2 and was re-selected; B2 kept.)

### AT-19 · Implement alternative keeps the anchor; changed implement is not evidence [M-13]
- **Given** H-BASE; `ALLOY(2026-09-21)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45, EQ-? [EQ009]})`; `COMPLETE(P-DEFAULT)`.
- **Then** `S.items[A1] = EX012`, reason `ANCHOR`, `S.items[A1].implement = [EQ010]`, `S.items[A1].rx.line_state = IMPLEMENT_CHANGED`; `C[A1].BILATERAL = NOT_EVIDENCE`.

### AT-20 · Dumbbell-only room still yields a squat pattern [M-13]
- **Given** H-BASE; `ALLOY(2026-09-21)`.
- **When** `GEN(2026-09-22 18:00, {R-01 45, EQ-? [every equipment ID except EQ010 and EQ013]})`.
- **Then** `G.family_plan[A1].family = KD` and `S.items[A1] = EX012` with implement [EQ010].

### AT-21 · Available only as another library row → NOT_AVAILABLE [M-13]
- **When** the filter chain is evaluated for EX050 in HD/PRIMARY at 2026-09-22 18:00 (`NEW()`).
- **Then** outcome = `HF-06(NA)`.

### AT-22 · Unknown increments stop at the confirmed maximum [M-14]
- **Given** H-BASE. **When** `EXPOSE(EX054, SECONDARY, 30, {effort TOO_EASY}, every 3 days)` with implement [EQ010+EQ011].
- **Then** `E.lines[EX054,SECONDARY,LEFT].next_load = 50`, `.state = LOAD_CAPPED`; `E.anchors[HPUSH,SECONDARY].rotate_due = true`. `next_load` never exceeded 50 at any exposure.

### AT-23 · Uncertain Alloy attendance counts for recovery only [M-15]
- **Given** H-BASE (no Alloy log for 2026-09-21).
- **When** `GEN(2026-09-22 08:00, {R-01 45})` three times on separate copies with AL answer for 2026-09-21 = `not sure`, `unanswered`, `no`.
- **Then**
  - `not sure`: `G.items[A1].selection.reason_code = SUBSTITUTE_FOR_ANCHOR(HF-12)`; `E.recovery_credits` contains 2026-09-21 18:55;
  - `unanswered`: same as `not sure`;
  - `no`: `S.items[A1] = EX012`, reason `ANCHOR`;
  - `E.parent_last_trained[LOWER]` is identical in the `not sure` and `no` cases (staleness unaffected).

### AT-24 · Prompt-created Alloy log uses a conservative recovery end [M-15]
- **Given** H-BASE. **When** `GEN(2026-09-22 17:30, {R-01 45})` with AL answer 2026-09-21 = `yes`.
- **Then** `E.recovery_credits` contains 2026-09-21 18:55; `G.items[A1].selection.reason_code = SUBSTITUTE_FOR_ANCHOR(HF-12)` (22.6 h since the recovery end).

### AT-25 · Underfill is disclosed with a cause [M-16]
- **Given** H-BASE; `ALLOY(2026-09-21)`. **When** `GEN(2026-09-22 18:00, CI)` for CI = {R-01 60}, {R-01 45}, {R-01 20}, {R-01 45, R-02 low}.
- **Then** 60 → `G.underfill.cause = TIER_MAXIMUM`; 45 → `G.underfill` null; 20 → null; 45 + low → `LIGHT_POSTURE`.

## 7. Regression and metadata tests

### AT-R01 · Travel gap → RETURN; nothing recalibrated (§H.7)
- **Given** H-BASE. **When** `GEN(2026-10-06 18:00, {R-01 45})`.
- **Then** `S.items[A1…B2].rx.line_state = RETURN` for all four; each reason `ANCHOR`.

### AT-R02 · LIGHT posture (§C.2, §H.2)
- **Given** H-BASE; `ALLOY(2026-09-21)`. **When** `GEN(2026-09-22 18:00, {R-01 45, R-02 low})`; `COMPLETE(P-DEFAULT)`.
- **Then** every A–C item `rx.sets = 2`; `G.finish_choice = MOBILITY`; every decision in `C` starts with `NOT_EVIDENCE`.

### AT-R03 · Core-starvation swap on a 30-minute history (§C.4)
- **Given/When** H-30. **Then** the session generated at 2026-09-15 18:00 contains C1 and C2 and no B items.

### AT-R04 · Partial session crediting drives the next plan (§B.3, §C.4)
- **Given** H-BASE; `ALLOY(2026-09-21)`; `GEN(2026-09-22 18:00, {R-01 45})`; `COMPLETE(P-DEFAULT, performed slots A1, A2, B1 only, B1 = 1 set, ended_at = started_at + 20 min)`.
- **When** `GEN(2026-09-24 18:00, {R-01 45})`.
- **Then** `G.family_plan[A1] = HD / STALEST_LOWER`; `G.family_plan[A2].family = HPUSH`; no A/B item is CALIBRATE unless that exercise has never been performed in any role.

### AT-R05 · Untagged Alloy FULL items credit only the summary (§L.3)
- **Given** H-BASE; `ALLOY(2026-09-21, FULL, focus full, items [{free_text "sled push"}, {free_text "landmine press"}])`.
- **When** `GEN(2026-09-22 08:00, {R-01 45})`.
- **Then** `G.items[A1].selection.reason_code = SUBSTITUTE_FOR_ANCHOR(HF-12)`; `E.family_last_trained[KD]` still falls on Saturday 2026-09-19.

### AT-M01 to AT-M07 · Metadata validators (§Q.1.2) [M-17]

Each test loads FX-META plus one synthetic row (or one modification) and asserts the loader's result.

| Test | Input | Expected |
|---|---|---|
| AT-M01 | row SX901 without `hand_support` | rejected by V-00a; listed in `G.metadata_rejected` |
| AT-M02 | row SX902 "KB Squat to Press", family null | rejected by V-00b (NO_FAMILY) |
| AT-M03 | row SX903 KD, BODYWEIGHT, roles [PRIMARY, SECONDARY] | accepted with roles [SECONDARY]; V-00c recorded |
| AT-M04 | row SX904 HD, BILATERAL, EXTERNAL_LOAD, tag ballistic, `heavy_lower = true` | rejected by V-00d (formula gives false) |
| AT-M05 | FX-META with EX012 and EX018 both `default_order = 1` in KD | engine refuses to load (V-00e) |
| AT-M06 | row SX906 with `equipment_options = [[EQ999]]` | rejected by V-00f |
| AT-M07 | row SX907 MOBILITY, `hand_support = QUADRUPED`, `sore_regions = []` | rejected by V-00g |
| AT-M08 | FX-META unmodified | loads with zero rejections |

AT-M08 was executed against the fixture (zero violations of V-00b to V-00g). AT-M01 to AT-M07 define loader behavior that the reference simulator does not implement (it has no loader); their expected results follow directly from the §Q.1.2 table.

## 8. Traceability

| Modification | Tests |
|---|---|
| M-01 role alternation | AT-02, AT-03, AT-H01 |
| M-02 calendar-day repeat rule | AT-04, AT-05 |
| M-03 anchor candidate | AT-06, AT-P07 |
| M-04 seeded lines | AT-07 |
| M-05 default_order, draw scope | AT-01, AT-P05 |
| M-06 servability | AT-P06, AT-08 |
| M-07 no repeated core/carry family | AT-P03, AT-08 |
| M-08 hand_support | AT-09, AT-P02 |
| M-09 R-04 / R-04b | AT-10, AT-11, AT-12 |
| M-10 fade, REDUCE lock | AT-13, AT-14, AT-15 |
| M-11 DISLIKE | AT-16, AT-17 |
| M-12 station rule | AT-18, AT-07, AT-P04, AT-P07 |
| M-13 equipment options | AT-19, AT-20, AT-21 |
| M-14 max_confirmed_load | AT-22 |
| M-15 Alloy uncertainty | AT-23, AT-24 |
| M-16 underfill | AT-25, AT-01, AT-08 |
| M-17 metadata criteria | AT-M01 to AT-M08 |
| M-18 HARD progresses | AT-13 (fade tests use GOOD); AT-14 confirms HARD with short2 still reduces. S28a in the rerun record |
| M-19 confirmations = 1 | AT-22 (reaches cap), S26 in the rerun record |

| Ledger item | Now protected by |
|---|---|
| FL-01, FL-24 | AT-02, AT-03 |
| FL-02 | AT-04 |
| FL-03 | AT-06, AT-P07 |
| FL-04 | AT-07 |
| FL-05 | AT-01, AT-P05 |
| FL-07, FL-08 | AT-P03, AT-P06, AT-08 |
| FL-09 | AT-09, AT-P02 |
| FL-10 | AT-10 to AT-12 |
| FL-11 | AT-13 to AT-15 |
| FL-12 | AT-16, AT-17 |
| FL-13 | AT-18, AT-P04 |
| FL-14, FL-23 | AT-19 to AT-21 |
| FL-15 | AT-25 |
| FL-16 | AT-23, AT-24 |
| FL-18 | AT-22 |
| FL-22 | AT-M01 to AT-M08 |

Not covered by design (unchanged in 0.2.0, see spec §V.2): FL-06, FL-17, FL-19, FL-20, FL-21, FL-25.

## 9. Execution record

Run on 2026-09-23 against the reference simulator with the fixtures above: AT-H01 and the 37 executable tests AT-P01 to AT-P07, AT-01 to AT-25, AT-R01 to AT-R05 pass; AT-M08 passes; AT-M01 to AT-M07 are specification tests for the loader (§7). Three draft rules failed during development and were corrected before freezing (spec §V.3): AT-12 (K3 outranked by K0), AT-17 (DISLIKE without alternative), and a sub-family lock caught by the AT-03 counts.

---

# Appendix A. FX-META

Columns: roles P = PRIMARY, S = SECONDARY, C = CORE, Y = CARRY, M = MOBILITY; laterality B/U/A; load EXT = EXTERNAL_LOAD, BW = BODYWEIGHT, T = TIME, TL = TIME_WITH_LOAD; equipment_options: alternatives separated by "or", "+" joins equipment required together, [] = none; heavy Y/N; rtri = right_triceps_involvement; ord = `default_order` within the family. `per_side_logging` = true for every row with rtri ≠ NONE and for unilateral upper-body rows.

| id | name | fam | roles | lat | load | equipment_options | station | heavy | rtri | hand_support | tags | sore | prereq | basis | ord |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EX012 | Goblet Squat | KD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 1 |
| EX018 | Kettlebell Front Squat | KD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 2 |
| EX053 | Racked Kettlebell Squat | KD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 3 |
| EX074 | Double-Kettlebell Squat | KD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 4 |
| EX013 | Goblet Split Squat | KD | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 5 |
| EX017 | Kettlebell Suitcase Lunge | KD | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 6 |
| EX051 | Box Squat | KD | PS | B | EXT | [EQ005+EQ009] or [EQ005+EQ010] | RACK_AREA | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY_ADAPTED | 7 |
| EX052 | Step-Up | KD | PS | U | EXT | [EQ005+EQ010] | RACK_AREA | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY_ADAPTED | 8 |
| EX031 | Reverse Lunges | KD | S | A | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 9 |
| EX058 | Banded Split Squat | KD | S | U | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY_ADAPTED | 10 |
| EX004 | Touch Down Squats | KD | S | B | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 11 |
| EX061 | Elevator Squat | KD | S | B | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 12 |
| EX020 | Speed Squat | KD | S | B | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 13 |
| EX007 | Overhead Squat | KD | S | B | BW | [] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 14 |
| EX097 | Single-Leg Squat to Box | KD | S | U | BW | [EQ005] | RACK_AREA | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY_ADAPTED | 15 |
| EX002 | Jump Lunges | KD | S | A | BW | [] | NONE | N | NONE | NONE | impact | LOWER | - | ALLOY_LIBRARY | 16 |
| EX027 | Assisted Squats | KD | S | B | BW | [EQ_SUSP] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 17 |
| EX042 | Jump Squat | KD | S | B | BW | [] | NONE | N | NONE | NONE | impact | LOWER | - | ALLOY_LIBRARY | 18 |
| EX011 | Kettlebell Deadlift | HD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 1 |
| EX065 | Dumbbell Romanian Deadlift | HD | PS | B | EXT | [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 2 |
| EX081 | Limited-ROM Kettlebell Deadlift | HD | PS | B | EXT | [EQ009] or [EQ010] | NONE | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 3 |
| EX082 | Barbell Deadlift | HD | PS | B | EXT | [EQ006+EQ007] | RACK_AREA | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 4 |
| EX073 | Kettlebell Suitcase Deadlift | HD | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 5 |
| EX047 | Contralateral Single Leg Deadlift | HD | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 6 |
| EX056 | Single-Leg Deadlift | HD | PS | U | EXT | [EQ010] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 7 |
| EX080 | Box Hip Bridge | HD | S | B | BW | [EQ005] | RACK_AREA | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY_ADAPTED | 8 |
| EX089 | Single-Leg Hip Bridge | HD | S | U | BW | [] | NONE | N | NONE | NONE | floor | LOWER | - | ALLOY_LIBRARY | 9 |
| EX064 | Kettlebell Swing (Two-Arm) | HD | S | B | EXT | [EQ009] | NONE | N | NONE | NONE | ballistic | LOWER | - | ALLOY_LIBRARY | 10 |
| EX008 | Single-Arm Kettlebell Swing | HD | S | U | EXT | [EQ009] | NONE | N | NONE | NONE | ballistic | LOWER | - | ALLOY_LIBRARY | 11 |
| EX009 | Single-Arm Kettlebell Clean | HD | S | U | EXT | [EQ009] | NONE | N | NONE | NONE | ballistic | LOWER | - | ALLOY_LIBRARY | 12 |
| EX028 | Suspension Hip Bridge to Leg Curl | HD | S | B | BW | [EQ_SUSP] | NONE | N | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 13 |
| EX050 | Trap Bar Deadlift | HD | PS | B | EXT | [EQ_TRAPBAR] | RACK_AREA | Y | NONE | NONE | - | LOWER | - | ALLOY_LIBRARY | 14 |
| EX054 | Dumbbell Bench Press | HPUSH | PS | B | EXT | [EQ010+EQ011] | BENCH_2 | N | SECONDARY | NONE | supine_press | UPPER | - | ALLOY_LIBRARY | 1 |
| EX041 | Dumbbell Floor Press | HPUSH | PS | B | EXT | [EQ010+EQ013] | NONE | N | SECONDARY | NONE | floor | UPPER | - | ALLOY_LIBRARY | 2 |
| EX096 | Single-Arm Dumbbell Bench Press | HPUSH | PS | U | EXT | [EQ010+EQ011] | BENCH_2 | N | SECONDARY | NONE | supine_press | UPPER | - | ALLOY_LIBRARY | 3 |
| EX001 | Push-Up | HPUSH | S | B | BW | [] | NONE | N | SECONDARY | NONE | - | UPPER | - | ALLOY_LIBRARY | 4 |
| EX062 | Deficit Push-Up | HPUSH | S | B | BW | [EQ003] | DIP | N | SECONDARY | NONE | - | UPPER | - | ALLOY_LIBRARY | 5 |
| EX063 | Explosive Push-Up | HPUSH | S | B | BW | [] | NONE | N | SECONDARY | NONE | impact | UPPER | - | ALLOY_LIBRARY | 6 |
| EX070 | See-Saw Incline Dumbbell Press | HPUSH | PS | A | EXT | [EQ010+EQ011_INCLINE] | BENCH_2 | N | SECONDARY | NONE | supine_press | UPPER | - | ALLOY_LIBRARY | 7 |
| EX015 | Kettlebell Overhead Press | VPUSH | PS | B | EXT | [EQ009] or [EQ010] | NONE | N | SECONDARY | NONE | overhead_press | UPPER | - | ALLOY_LIBRARY | 1 |
| EX071 | Half-Kneeling SA KB Overhead Press | VPUSH | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | SECONDARY | NONE | overhead_press | UPPER | - | ALLOY_LIBRARY | 2 |
| EX066 | Dumbbell Bent-Over Row | HPULL | PS | B | EXT | [EQ010] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 1 |
| EX069 | Chest-Supported Row | HPULL | PS | B | EXT | [EQ010+EQ011] | BENCH_2 | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 2 |
| EX014 | Kettlebell Bent Over Row | HPULL | PS | U | EXT | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 3 |
| EX055 | 3-Point Row | HPULL | PS | U | EXT | [EQ010] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 4 |
| EX068 | 2-Point Row | HPULL | PS | U | EXT | [EQ010] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 5 |
| EX059 | Batwing Row | HPULL | PS | B | EXT | [EQ010] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 6 |
| EX033 | Box Row | HPULL | S | B | EXT | [EQ005+EQ010] | RACK_AREA | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY_ADAPTED | 7 |
| EX034 | Renegade Row | HPULL | S | A | EXT | [EQ010] | NONE | N | SECONDARY | PLANK_POSITION_UNCONFIRMED | straight_arm_weight_bearing | UPPER,TRUNK | - | ALLOY_LIBRARY | 8 |
| EX044 | TRX Row | HPULL | S | B | BW | [EQ_SUSP] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 9 |
| EX048 | Chin Up | VPULL | PS | B | BW | [EQ004] | RACK_AREA | N | NONE | NONE | - | UPPER | chin-up capability | ALLOY_LIBRARY | 1 |
| EX067 | Pull-Up | VPULL | PS | B | BW | [EQ004] | RACK_AREA | N | NONE | NONE | - | UPPER | pull-up capability | ALLOY_LIBRARY | 2 |
| EX039 | Single-Arm Suspension Pull Up | VPULL | S | U | BW | [EQ_SUSP] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 3 |
| EX095 | Half-Kneeling Pulldown | VPULL | PS | U | EXT | [EQ_BAND] | NONE | N | NONE | NONE | - | UPPER | - | ALLOY_LIBRARY | 4 |
| EX090 | Deadbug | ANTI_EXT | C | A | BW | [EQ013] | NONE | N | NONE | NONE | floor | TRUNK | - | ALLOY_LIBRARY | 1 |
| EX029 | Stability Ball Rollout | ANTI_EXT | C | B | BW | [EQ008] | NONE | N | NONE | NONE | - | TRUNK | - | ALLOY_LIBRARY | 2 |
| EX075 | Knee Plank | ANTI_EXT | C | B | T | [EQ013] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | floor | TRUNK | - | ALLOY_LIBRARY | 3 |
| EX032 | Mountain Climbers | ANTI_EXT | C | A | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 4 |
| EX060 | Power Wheel Rollout | ANTI_EXT | C | B | BW | [EQ_WHEEL] | NONE | N | NONE | NONE | - | TRUNK | - | ALLOY_LIBRARY | 5 |
| EX076 | Traditional Plank | ANTI_EXT | C | B | T | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | floor | TRUNK | - | ALLOY_LIBRARY | 6 |
| EX077 | Marching Plank | ANTI_EXT | C | A | T | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 7 |
| EX098 | Kettlebell Halo | ANTI_ROT | C | B | BW | [EQ009] | NONE | N | NONE | NONE | - | TRUNK,UPPER | - | ALLOY_LIBRARY | 1 |
| EX083 | Quadruped Isometric Hold | ANTI_ROT | C | B | T | [] | NONE | N | NONE | QUADRUPED | straight_arm_weight_bearing | TRUNK | - | ALLOY_LIBRARY | 2 |
| EX003 | Bird Dog Plank | ANTI_ROT | C | A | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 3 |
| EX084 | Bear Crawl | ANTI_ROT | C | A | T | [] | NONE | N | NONE | QUADRUPED | straight_arm_weight_bearing | TRUNK | - | ALLOY_LIBRARY | 4 |
| EX085 | Spider Crawl | ANTI_ROT | C | A | T | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | straight_arm_weight_bearing | TRUNK | - | ALLOY_LIBRARY | 5 |
| EX022 | Half Kneeling Low to High Chop | ANTI_ROT | C | U | BW | [EQ_CABLE_ADJ] | NONE | N | NONE | NONE | - | TRUNK | - | ALLOY_LIBRARY | 6 |
| EX025 | Plank With Shoulder Touch | ANTI_ROT | C | A | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 7 |
| EX040 | Suspension Halo | ANTI_ROT | C | B | BW | [EQ_SUSP] | NONE | N | NONE | HIGH_PLANK | - | TRUNK | - | ALLOY_LIBRARY | 8 |
| EX078 | Plank with a Reach | ANTI_ROT | C | A | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 9 |
| EX079 | Around-the-World Plank | ANTI_ROT | C | A | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | TRUNK | - | ALLOY_LIBRARY | 10 |
| EX091 | Pallof Press | ANTI_ROT | C | U | BW | [EQ_CABLE_ADJ] | NONE | N | NONE | NONE | - | TRUNK | - | ALLOY_LIBRARY | 11 |
| EX046 | Farmer's Carry | CARRY | Y | B | TL | [EQ009] or [EQ010] | NONE | N | NONE | NONE | - | UPPER,LOWER,TRUNK | - | ALLOY_LIBRARY | 1 |
| EX101 | Ankle Rocks | MOBILITY | M | U | BW | [] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 1 |
| EX102 | Hip Circles | MOBILITY | M | U | BW | [] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 2 |
| EX036 | Standing External Rotation Hip Stretch | MOBILITY | M | U | T | [] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 3 |
| EX038 | Spiderman Stretch | MOBILITY | M | U | T | [] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 4 |
| EX021 | Assisted Single-Leg Lowering | MOBILITY | M | U | BW | [] | NONE | N | NONE | NONE | floor | - | - | ALLOY_LIBRARY | 5 |
| EX092 | Inchworm | MOBILITY | M | B | BW | [] | NONE | N | NONE | PLANK_POSITION_UNCONFIRMED | - | UPPER | - | ALLOY_LIBRARY | 6 |
| EX023 | Lateral Band Walk | MOBILITY | M | A | BW | [EQ_BAND] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 7 |
| EX037 | Quad Cross-Body Foam Roller Stretch | MOBILITY | M | U | T | [EQ_ROLLER] | NONE | N | NONE | NONE | - | - | - | ALLOY_LIBRARY | 8 |

# Appendix B. H-BASE checkpoint (AT-H01)

Sessions generated while building H-BASE (P-DEFAULT completions). Slot values are exercise IDs; "—" = slot not present. PREP mobility items are drawn (§E.4) and are not part of the checkpoint.

| generated | A1 | A2 | B1 | B2 | C1 | C2 | F1 | estimate (min) |
|---|---|---|---|---|---|---|---|---|
| Tue 2026-09-08 18:00 | EX012 | EX066 | EX011 | EX054 | EX090 | EX098 | — | 30.25 |
| Thu 2026-09-10 18:00 | EX065 | EX015 | EX018 | EX069 | EX090 | EX046 | — | 30.25 |
| Sat 2026-09-12 10:00 | EX013 | EX066 | EX073 | EX054 | EX098 | EX090 | EX046 | 41.25 |
| Tue 2026-09-15 18:00 | EX065 | EX041 | EX018 | EX069 | EX090 | EX098 | EX046 | 38.25 |
| Thu 2026-09-17 18:00 | EX012 | EX066 | EX011 | EX071 | EX029 | EX098 | EX046 | 39.75 |
| Sat 2026-09-19 10:00 | EX073 | EX015 | EX013 | EX069 | EX029 | EX083 | EX046 | 41.25 |

Anchor reasons in these six sessions: ANCHOR 21, NEW_ANCHOR_NONE_PRIOR 13, SUBSTITUTE_FOR_ANCHOR(HF-12) 4 (both Saturday 10:00 sessions, 17 h after Friday's Alloy class), NEW_ANCHOR_ROTATION(EXPOSURES) 2 (core).

# Appendix C. Observed values from the reference run

One row per executable test; values appear in the order of the test's assertion groups.

| Test | Result | Observed values (one per assertion group, in order) |
|---|---|---|
| AT-P01 | PASS | [True, True] |
| AT-P02 | PASS | 0 |
| AT-P03 | PASS | 0<br>0 |
| AT-P04 | PASS | 0 |
| AT-P05 | PASS | 0 |
| AT-P06 | PASS | 0<br>True |
| AT-P07 | PASS | 0 |
| AT-01 | PASS | {('EX012', 'EX066', 'EX011', 'EX054')}<br>('EX012', 'EX066', 'EX011', 'EX054')<br>['A', 'B', 'C'] {'planned': 30.2, 'available': 45, 'cause': 'FIRST_SESSIONS'} |
| AT-02 | PASS | ('HD', 'PRIMARY', 'LOWER_ROLE_ALTERNATION')<br>VPUSH<br>KD |
| AT-03 | PASS | {'KD': 9, 'HD': 9}<br>{'HPULL': 9, 'VPUSH': 5, 'HPUSH': 4} |
| AT-04 | PASS | True<br>[] |
| AT-05 | PASS | HF-11<br>PASS |
| AT-06 | PASS | EX073 SUBSTITUTE_NO_ANCHOR(HF-12)<br>None<br>EX065 NEW_ANCHOR_NONE_PRIOR |
| AT-07 | PASS | ('BILATERAL', 'SEEDED', 6, 30)<br>STRAIGHT_SETS |
| AT-08 | PASS | ANTI_EXT ANTI_ROT EX029 EX083<br>[]<br>ANTI_EXT ANTI_ROT {'planned': 28.0, 'available': 45, 'cause': 'SLOTS_EMPTY'} |
| AT-09 | PASS | {'EX003': 'HF-02', 'EX075': 'HF-02', 'EX085': 'HF-02', 'EX092': 'HF-02'}<br>0 |
| AT-10 | PASS | EX054 ANCHOR<br>{'LEFT': 'NOT_EVIDENCE(merged)', 'RIGHT': 'NOT_EVIDENCE'}<br>{'BILATERAL': 'REPS_UP'} |
| AT-11 | PASS | ('ANTI_EXT', 'CORE', 'R04_SWAP')<br>[] |
| AT-12 | PASS | EX041 SUBSTITUTE_FOR_ANCHOR(R-04)<br>EX054 (anchor EX054) |
| AT-13 | PASS | ['REPS_UP', 'REPS_UP', 'REPS_UP', 'LOAD_UP'] |
| AT-14 | PASS | ['REDUCE', 'HOLD(REDUCE_LIMIT)', 'HOLD(REDUCE_LIMIT)', 'HOLD(REDUCE_LIMIT)']<br>[('REDUCE', 25, 25), ('HOLD(REDUCE_LIMIT)', 25, 25), ('HOLD(REDUCE_LIMIT)', 25, 25), ('HOLD(REDUCE_LIMIT)', 25, 25)] |
| AT-15 | PASS | ['REDUCE', 'REPS_UP', 'REDUCE'] |
| AT-16 | PASS | {'ex': 'EX012', 'exposures': 3, 'rotate_due': True, 'cause': 'DISLIKE'}<br>EX053 NEW_ANCHOR_ROTATION(DISLIKE) |
| AT-17 | PASS | ['F1']<br>ANCHOR |
| AT-18 | PASS | {'A1': 'EX012', 'A2': 'EX066', 'B1': 'EX073', 'B2': 'EX054', 'C1': 'EX029', 'C2': 'EX083', 'F1': 'EX046'} ['STATION_RESELECT', 'ANCHOR']<br>PAIRED |
| AT-19 | PASS | EX012 ANCHOR ('EQ010',)<br>[('BILATERAL', 'IMPLEMENT_CHANGED', 7, 35)]<br>{'BILATERAL': 'NOT_EVIDENCE'} |
| AT-20 | PASS | KD EX012 ('EQ010',) |
| AT-21 | PASS | HF-06(NA) |
| AT-22 | PASS | 50 LOAD_CAPPED True |
| AT-23 | PASS | ('EX013', 'SUBSTITUTE_FOR_ANCHOR(HF-12)')<br>('EX013', 'SUBSTITUTE_FOR_ANCHOR(HF-12)')<br>('EX012', 'ANCHOR')<br>2026-09-19 10:46:15 |
| AT-24 | PASS | [datetime.datetime(2026, 9, 21, 18, 55)]<br>SUBSTITUTE_FOR_ANCHOR(HF-12) |
| AT-25 | PASS | {'planned': 38.2, 'available': 60, 'cause': 'TIER_MAXIMUM'}<br>None None<br>{'planned': 32.5, 'available': 45, 'cause': 'LIGHT_POSTURE'} |
| AT-R01 | PASS | ['RETURN', 'RETURN', 'RETURN', 'RETURN'] ['ANCHOR', 'ANCHOR', 'ANCHOR', 'ANCHOR'] |
| AT-R02 | PASS | [2, 2, 2, 2, 2, 2] MOBILITY<br>{'NOT_EVIDENCE'} |
| AT-R03 | PASS | ['A1', 'A2', 'C1', 'C2'] |
| AT-R04 | PASS | ('HD', 'PRIMARY', 'STALEST_LOWER') ('HPUSH', 'PRIMARY', 'STALEST_UPPER_PARENT')<br>{'A1': 'BUILDING', 'A2': 'BUILDING', 'B1': 'BUILDING', 'B2': 'BUILDING'} |
| AT-R05 | PASS | SUBSTITUTE_FOR_ANCHOR(HF-12) Sat 09-19 10:46 |
