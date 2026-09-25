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

(AT-P01 to AT-P07: see ENGINE_WORKOUT_GENERATOR_V0_2_1.md for the modifications each protects; full text retained in the project's canonical copy of this document. This fixtures copy carries §3 verbatim, which is what the B1 fixture loader consumes; §5–§9 and Appendix C are omitted from this loader-facing copy but are unabridged in the project's canonical GENERATOR_ACCEPTANCE_TESTS_V0_2.md doc.)

## Appendix A. FX-META

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
