---
file: ENGINE_WORKOUT_GENERATOR_V0_1.md
class: ENGINE
status: CANONICAL (frozen)
engine_version: 0.1.1
updated: 2026-09-23
supersedes: ENGINE_GENERATOR_SPEC_v0_1.md (retained as history; not implementable)
audit: ENGINE_GENERATOR_AUDIT_v0_1.md
decisions: D-001 to D-018 (existing), D-019 to D-029 (as amended), D-030 to D-040
reads: PERSONAL_user_profile.yaml, PERSONAL_constraints.yaml, equipment_library.json,
       exercise_equipment_availability.json, claude_v0-exercise-db_exercise_dataset.json (evidence layer, read-only),
       EXERCISE_METADATA (contract Q.1; to be authored), CONFIG (§R)
change_control: any change to a FIXED rule requires a decision-log entry and an engine_version bump.
                PARAM changes require only a config_version bump.
---

# ENGINE: Workout Generator V0 (engine 0.1.1)

## 0. Conventions

**Labels.** Every rule carries one label.

| Label | Meaning |
|---|---|
| **FIXED** | FIXED V0 RULE. Implement exactly. Changing it requires a decision-log entry. |
| **PARAM** | CONFIGURABLE PARAMETER. Named constant in §R. Default given. Tunable without code changes. |
| **FUTURE** | FUTURE FEATURE. Do not implement in V0. Listed so engineers do not invent it. |
| **UNRESOLVED** | Behavior depends on an open question. A V0 default is specified and must be implemented. |

**Determinism (FIXED).** Given identical inputs, engine state, config, and seed, the generator returns an identical session. No step uses wall-clock time except `now` supplied as an input. The only pseudo-random step is §E.4, with a seed that is stable for the day.

**Time (FIXED).** All timestamps are stored in UTC with the user's IANA time zone. "Local date" means the date in that zone. "Hours since X" = (now − X) in hours, as a real number.

**Evidence (FIXED).** Every rule is `class: SYSTEM_DESIGN` (D-002). §O gives each rule's `basis` and `verification`. No output of this engine may describe any rule as Alloy's programming.

**Health (FIXED).** The engine never reads diagnoses, medications, or CONTEXT items for any decision. It reads only constraints (PERSONAL_constraints.yaml), check-in answers, and logged feedback. CONTEXT items and pending candidate constraints are copied into the generation record for display only.

**Units (FIXED).** Loads in the unit of the equipment record (lb for the apartment gym). Reps are integers. Time-based sets in seconds.

---

## A. Inputs

### A.1 Static inputs (read at generation)

| Input | Source | Required | Used for |
|---|---|---|---|
| Constraints | PERSONAL_constraints.yaml | yes | §D filters |
| Profile | PERSONAL_user_profile.yaml | yes | preferences, avoidances, Alloy schedule, pending-question defaults (A.4) |
| Equipment | equipment_library + availability (contract Q.3) | yes | §D, §F, load increments |
| Exercise metadata | contract Q.1 (SYSTEM_METADATA layer) | yes | everything in §C–§H |
| Supplemental exercises | contract Q.2 | no (empty by default) | GOAL_ACCESSORY and machine options |
| Config | §R | yes | all PARAM values |

The evidence dataset (`claude_v0-exercise-db_*`) is **not** read by the engine except for `canonical_name` display. Its `primary_pattern` and related fields are not used (known defects, RAW_MANIFEST R3). **FIXED**

### A.2 Logs (read at generation)

| Log | Contract | Used for |
|---|---|---|
| Apartment session logs | Q.5 | engine state (§B) |
| Alloy session logs | Q.6 | family timestamps, 48 h repeat rule (§L) |
| Other training logs (DailyArms, DailyAbs, walking) | Q.7 | **UNRESOLVED (B2).** V0 default: stored, not read. |
| User action events | Q.8 | anchors, holds, preferences (§B) |

### A.3 Check-in (per generation)

| ID | Question | Values | Required | Effect |
|---|---|---|---|---|
| R-01 | Minutes available | integer | **yes** | size tier (§C.3) |
| R-02 | Energy today | low / normal / high | no (default normal) | posture (§C.2) |
| R-03 | Sleep last night | poor / ok / good | no | **recorded only** (D-034) |
| R-04 | Right arm vs usual | worse / same / better | no (default same) | §E key K3; progression hold (§H.6) |
| R-05 | Too sore to load today? | multi-select: none / upper / lower / trunk | no (default none) | §D HF-05 |
| R-06 | Unwell or different from usual? | no / yes → choice: normal / lighter / skip | **yes** | posture or no session |
| R-07 | Ate per plan 2–3 h before? | yes / no | no | **recorded only** (D-034); sunset when OQ-02 closes |
| AL-? | "Did you train at Alloy on {day}?" (only if §L.2 triggers) | yes / no / not sure | when asked | Alloy crediting (§L.2) |
| EQ-? | Equipment issues today (optional) | list of equipment IDs | no | §D HF-06 |

R-05 replaces the profile's `specific_area` option with `trunk` so every answer maps to a filter without interpretation. **FIXED** (D-034)

### A.4 Defaults for pending profile questions (UNRESOLVED; implement these defaults)

| Question | V0 default |
|---|---|
| B1 goal ranking / build vs preserve | no goal weighting exists in V0; sets never progress (§H.1) |
| B2 apartment share of arm/shoulder goal; OTHER logs | `GOAL_ACCESSORY_ENABLED = false`; OTHER logs not read |
| B3 session length | tier table §C.3 as given |
| B4a HC-02 scope | position-dependent matches HELD (HF-02) |
| B4b/c/d push-ups, SC-03, SC-04 | not applied (D-013) |
| B5 right-triceps dosing, SC-02, SC-05 | §H.6 defaults; ELBOW_EXTENSION sub-target disabled |
| B6 Alloy logging mode | both modes supported; SUMMARY expected |
| UQ-G01 chin-up/pull-up capability | chin-up/pull-up HELD (HF-08) |
| UQ-G03 supplemental exercises | none approved; GOAL_ACCESSORY unfillable |
| P-07 conditioning preference | `CONDITIONING_OPT_IN = false` |
| P-08 impact preference | exercises tagged `impact` HELD (HF-14) |

---

## B. State

### B.1 Engine state (persisted; rebuildable)

**FIXED:** engine state must be exactly reproducible by replaying Q.5, Q.6, and Q.8 records in `performed_at` / `event_at` order through §K. It is a cache, never a source of truth.

```
engine_state:
  family_last_trained[family]         : timestamp | null      # §B.3
  parent_last_trained[parent]         : timestamp | null      # §B.3
  lower_last_trained                  : timestamp | null      # = parent_last_trained[LOWER]
  exercise_last_used[exercise_id]     : timestamp | null      # apartment + Alloy FULL items with exercise_id
  anchors[(family, role, sub_target)] : {exercise_id, exposures_as_anchor, rotate_due: bool, rotate_cause}
  lines[(exercise_id, role, side)]    : progression line (§H.1)
  review_hold[exercise_id]            : {held: bool, cause: STOPPED_SYMPTOM | UNCOMFORTABLE_X2}
  uncomfortable_streak[exercise_id]   : int
  preference[exercise_id]             : PREFER | DISLIKE | null
  apartment_sessions_completed        : int
  history_start                       : timestamp | null      # first logged session of any environment
  alloy_resolved[scheduled_slot]      : LOGGED | SKIPPED | UNKNOWN
```

### B.2 Families (FIXED vocabulary)

| Family | Parent | Role when placed | Slot kinds |
|---|---|---|---|
| KD (knee dominant) | LOWER | PRIMARY in A, SECONDARY in B | main |
| HD (hip dominant) | LOWER | PRIMARY / SECONDARY | main |
| HPUSH | PUSH | PRIMARY / SECONDARY | main |
| VPUSH | PUSH | PRIMARY / SECONDARY | main |
| HPULL | PULL | PRIMARY / SECONDARY | main |
| VPULL | PULL | PRIMARY / SECONDARY | main |
| ANTI_EXT | CORE | CORE | C, F |
| ANTI_ROT | CORE | CORE | C, F |
| ANTI_LAT | CORE | CORE | C, F |
| CARRY | CARRY | CARRY | C, F |
| GOAL_ACCESSORY (sub-targets ELBOW_FLEXION, SHOULDER_ISOLATION, ELBOW_EXTENSION) | ACCESSORY | ACCESSORY | F |
| MOBILITY | MOBILITY | MOBILITY | PREP, F |
| CONDITIONING | CONDITIONING | CONDITIONING | F (opt-in) |
| ROTATION, POWER | — | — | **FUTURE** (no slots) |

Kettlebell swings and similar are HD exercises with the tag `ballistic`. Jumping exercises carry `impact`. **FIXED**

`FAMILY_ORDER` (tie-break, PARAM): KD, HD, HPULL, HPUSH, VPULL, VPUSH, ANTI_EXT, ANTI_ROT, ANTI_LAT, CARRY, GOAL_ACCESSORY.
`PARENT_ORDER` (PARAM): PULL, PUSH.

### B.3 Last-trained timestamps (FIXED)

A session **credits** family f when ≥ `MIN_SETS_FOR_CREDIT` working sets were completed in items whose `family` = f. Credit time = session end time. Only an exercise's own family is credited (no secondary crediting).

- `family_last_trained[f]` = latest credit time from apartment logs and Alloy FULL items tagged with f.
- `parent_last_trained[p]` = latest of (its families' `family_last_trained`, Alloy SUMMARY parent credits §L.3).
- `null` sorts as the oldest possible value ("never trained").

### B.4 Derived at generation (not persisted)

`hours_since_lower = now − lower_last_trained`; `history_days = (now − history_start) in days`; `seed` (§E.4).

---

## C. Generation sequence

### C.1 Order of operations (FIXED)

1. Load and validate inputs (Q contracts). Exercises with a missing required metadata field are removed from the candidate pool and listed in the record.
2. Resolve Alloy prompts (§L.2) and apply answers as Alloy SUMMARY logs before step 3.
3. Process check-in → posture (C.2), sore regions, today's equipment issues. R-06 = skip → return NO_SESSION(USER_SKIP).
4. Size tier (C.3). R-01 < `MIN_SESSION_MINUTES` → NO_SESSION(TOO_SHORT).
5. Family plan (C.4).
6. For each slot in order A1, A2, B1, B2, C1, C2, F1, F2: select exercise (§E) and enforce the station rule per block (§F).
7. Build PREP (C.6).
8. Prescribe every item (§G, from §H state).
9. Fit duration (§G.5).
10. Validate and repair (§I).
11. Write the generation record (§J). Return the session.

### C.2 Posture (FIXED)

```
posture = LIGHT  if R-06 == "yes" and choice == "lighter"
        = LIGHT  if R-02 == "low"
        = NORMAL otherwise
```
R-03 and R-07 never affect posture. R-06 "yes" + "normal" → NORMAL (recorded).

LIGHT effects: every block 2 sets; never-used exercises only when the slot has no familiar option (HF-13); no `ballistic` exercises (HF-13); no progression from this exposure (§H.2); finish is MOBILITY or none (C.5). LIGHT never adds, removes, or reorders blocks A–C.

### C.3 Size tier (PARAM thresholds, FIXED structure)

| R-01 minutes | Blocks included | PREP minutes |
|---|---|---|
| < `MIN_SESSION_MINUTES` (15) | none → NO_SESSION | — |
| 15 to < `TIER_AB_MINUTES` (25) | A | `PREP_MINUTES_SHORT` (4) |
| 25 to < `TIER_ABC_MINUTES` (35) | A, B | `PREP_MINUTES` (6) |
| 35 to < `TIER_ABCF_MINUTES` (45) | A, B, C | `PREP_MINUTES` |
| ≥ 45 | A, B, C, F | `PREP_MINUTES` |

F is also omitted when `apartment_sessions_completed < FIRST_SESSIONS_NO_FINISH` (2). **FIXED** (limits novelty at cold start)

**UNRESOLVED (B3):** thresholds will be replaced by the user's preferred/minimum/maximum lengths.

### C.4 Family plan (FIXED)

Sort key for a family: `(family_last_trained[f] ascending with null first, FAMILY_ORDER index)`.
Sort key for a parent: `(parent_last_trained[p] ascending with null first, PARENT_ORDER index)`.
"Stalest" = first in that order.

```
lower   = sort([KD, HD])
uppers  = sort([PULL, PUSH])                      # by parent key
A1 = lower[0]                     role PRIMARY
A2 = stalest family of uppers[0]  role PRIMARY
B1 = lower[1]                     role SECONDARY
B2 = stalest family of uppers[1]  role SECONDARY
C1 = stalest of [ANTI_EXT, ANTI_ROT, ANTI_LAT]                        role CORE
C2 = stalest of [CARRY] + ([ANTI_EXT, ANTI_ROT, ANTI_LAT] minus C1)   role by family
```

**Soreness replacement (FIXED).** Applied after the plan, before selection.
- `lower` in R-05: A1 and B1 are re-assigned, in order, to the stalest families from `REPLACEMENT_POOL_LOWER_SORE` = [ANTI_EXT, ANTI_ROT, ANTI_LAT] not already planned; then C is re-planned from what remains (C2 may become empty).
- `upper` in R-05: A2 and B2 are re-assigned the same way from [ANTI_EXT, ANTI_ROT, ANTI_LAT].
- `trunk` in R-05: families are not re-planned; exercise-level HF-05 removes trunk-tagged exercises and §C.7 fallbacks apply.
- Replaced slots keep their block's set count and use the new family's role ranges.

**Core-starvation swap (FIXED rule, PARAM values).** If the tier includes B but not C, `history_days ≥ CORE_STARVATION_DAYS` (7), and every core family has `family_last_trained` older than `CORE_STARVATION_DAYS` (or null), then block B is replaced by block C (C1, C2 as planned). Record reason CORE_STARVATION_SWAP.

### C.5 Finish plan (FIXED)

Only if the tier includes F. Evaluate `FINISH_PRIORITY` (PARAM, default order below); take the first that yields ≥ 1 eligible exercise.

| Priority | Condition | Slots |
|---|---|---|
| GOAL_ACCESSORY | `GOAL_ACCESSORY_ENABLED` and posture NORMAL and (`family_last_trained[GOAL_ACCESSORY]` null or older than `GOAL_ACCESSORY_MIN_HOURS`) | F1 = ELBOW_FLEXION, F2 = SHOULDER_ISOLATION (stated pairing preference). ELBOW_EXTENSION unused (**UNRESOLVED B5**) |
| CORE_OR_CARRY | posture NORMAL | F1 = stalest of [CARRY, ANTI_EXT, ANTI_ROT, ANTI_LAT] not already in the session |
| CONDITIONING | `CONDITIONING_OPT_IN` and posture NORMAL | F1 = CONDITIONING |
| MOBILITY | always | F1, F2 = MOBILITY |

Under LIGHT only MOBILITY is evaluated. If nothing is eligible, F is empty.

### C.6 PREP (FIXED structure)

1. **General warm-up**, `PREP_GENERAL_MINUTES` (3): first available of EQ002 spin bike, EQ015 treadmill (walk), EQ016 elliptical (config order). Not tracked for progression.
2. **Two MOBILITY items**, selected by §E with role MOBILITY (anchors are not used for MOBILITY; ordering keys K5 then K7 only).
3. **Ramp sets** for A1 and A2 when `load_mode = external_load` and the line has a load: 2 sets at roughly half and roughly three-quarters of today's load, rounded down to available weights, at the low end of the rep range. Ramp sets are never logged as working sets. For CALIBRATE items the ramp is the calibration itself (no separate ramp).

All PREP items pass §D.

### C.7 Slot fallback when a family has no eligible exercise (FIXED)

For a main slot (A1, A2, B1, B2), in order:
1. the other family of the same parent (e.g., VPULL → HPULL), if not already planned;
2. any main family on the same side (LOWER for A1/B1; PUSH/PULL for A2/B2) not already planned, by stalest;
3. the stalest core family not already planned;
4. leave the slot empty.

For C and F slots: the next family in that slot's pool; else empty. Each fallback is recorded (FALLBACK_SIBLING, FALLBACK_SAME_SIDE, FALLBACK_CORE, SLOT_EMPTY) and every family that failed is recorded as UNFILLABLE with its unblocking question if one exists.

A block with one empty slot runs its remaining item as straight sets. A block with both slots empty is dropped.

---

## D. Hard filters

Applied to every candidate for every slot (including PREP and F), in order. The first failing filter is the candidate's outcome. **FIXED** unless marked.

| ID | Filter | Outcome | Anchor effect |
|---|---|---|---|
| HF-01 | Matches an ACTIVE hard constraint (HC-01 dips; HC-02 documented high-plank position, e.g., EX040) via `position_tags` or explicit exercise list | EXCLUDED | clear |
| HF-02 | Position-dependent match to a constraint with scope pending (HC-02: EX025, EX032, EX034, EX076 unless variant tagged `forearm_plank`, EX077, EX078, EX079) | HELD_PENDING_SCOPE | clear |
| HF-03 | Matches an adopted candidate constraint set to HARD_EXCLUDE | EXCLUDED | clear |
| HF-04 | On the profile avoidance list | EXCLUDED | clear |
| HF-05 | `sore_regions` intersects today's R-05 selection | EXCLUDED_TODAY | keep (substitute) |
| HF-06 | Any required equipment NOT_AVAILABLE → EXCLUDED; UNKNOWN → HELD_EQUIPMENT_UNKNOWN; listed in today's equipment issues → EXCLUDED_TODAY | as stated | clear / clear / keep |
| HF-07 | `review_hold[exercise].held` | HELD_PENDING_REVIEW | clear |
| HF-08 | `capability_prereq` not null and not satisfied by a user statement or a logged completion | HELD_CAPABILITY_UNKNOWN | clear |
| HF-09 | Slot role not in `roles_allowed` | not a candidate | n/a |
| HF-10 | Already selected in this session | EXCLUDED_TODAY | keep |
| HF-11 | `exercise_last_used` within `REPEAT_EXCLUSION_HOURS` (48) and role ≠ MOBILITY | EXCLUDED_TODAY | keep |
| HF-12 | `heavy_lower = true` and `hours_since_lower < HEAVY_LOWER_RECOVERY_HOURS` (24) | EXCLUDED_TODAY | keep |
| HF-13 | posture LIGHT and (tagged `ballistic`, or never used while the same slot has at least one eligible previously used exercise) | EXCLUDED_TODAY | keep |
| HF-14 | Tagged `impact` (**UNRESOLVED P-08**) | HELD_PREFERENCE_UNKNOWN | clear |

"Clear" means that if this exercise is the slot's anchor, the anchor is cleared at completion (§K) and today's pick becomes the new anchor. "Keep" means today's pick is a SUBSTITUTE and the anchor is unchanged.

Not filtered (FIXED): candidate constraints SC-02 to SC-05 while pending; any CONTEXT item; any preference other than the avoidance list. The record lists pending candidates as "not applied."

HELD exercises are never auto-selected but are offered in the user's manual swap list with their hold reason. EXCLUDED exercises are never offered.

---

## E. Scoring (deterministic selection order)

V0 has no numeric scores (D-030). Selection within a slot is by anchor, then by ordered sort keys.

### E.1 Anchor rule (FIXED)

Anchor key = (family, role, sub_target or null). Roles PRIMARY and SECONDARY have separate anchors for the same family, so KD in block A and KD in block B can use different exercises, each with its own progression line.

```
anchor = anchors[key]
if anchor exists and anchor passes all filters and not anchor.rotate_due:
    pick anchor                           reason ANCHOR
else:
    pick first of ordered(eligible, key)  reason per E.3
```

MOBILITY and CONDITIONING do not use anchors.

### E.2 Sort keys (FIXED order; applied to eligible candidates)

| Key | Sort | Applies to |
|---|---|---|
| K0 | Exercise that is the anchor of the same family in the other main role → last | PRIMARY, SECONDARY |
| K0b | Exercise that was the anchor being rotated away (rotate_due) → excluded if any alternative exists | all anchored roles |
| K1 | `preference = PREFER` first | all |
| K2 | `preference = DISLIKE` last | all |
| K3 | If R-04 = worse: `right_triceps_involvement` NONE, then SECONDARY, then PRIMARY | all |
| K4 | Has any progression line (known load) first | PRIMARY, SECONDARY only |
| K5 | `exercise_last_used` ascending, null first | all |
| K6 | `evidence_basis` ALLOY_LIBRARY before SUPPLEMENTAL | all |
| K7 | `library_order` ascending (or E.4 draw) | all |

Effect: main slots prefer familiar exercises (K4) and rotate among them by least recent use; accessory, core, and carry slots introduce never-used exercises at rotation time (K5 null first), one slot at a time.

### E.3 Selection reason codes (FIXED)

ANCHOR · SUBSTITUTE_FOR_ANCHOR(HF-id) · NEW_ANCHOR_NONE_PRIOR · NEW_ANCHOR_ROTATION(cause) · NEW_ANCHOR_BLOCKED(HF-id) · USER_SWAP · USER_REPLACE. Each non-anchor pick also records `decided_by` = the first key (K0–K7 or DRAW) that separated it from the runner-up.

### E.4 Limited variety (FIXED rule, PARAM switch)

If `ENABLE_NOVEL_DRAW` (default true) and the top candidates tie on K0–K6 **and** all tied candidates have `exercise_last_used = null`, choose among them with a seeded draw instead of K7.

`seed = hash(user_id, local_date, apartment_sessions_completed)`. Regenerating on the same day before completing a session returns the same session. Randomness never selects families, blocks, pairs, set counts, reps, rest, or loads.

### E.5 Anchor rotation triggers (FIXED)

`rotate_due` is set at completion (§K) when:
- PRIMARY/SECONDARY: the anchor's line enters LOAD_CAPPED (§H.5);
- CORE/CARRY/ACCESSORY: `exposures_as_anchor ≥ ACCESSORY_ROTATION_EXPOSURES` (4) and at least one other eligible exercise exists in the family;
- any role: a USER_REPLACE event.

Stalls never set `rotate_due` (D-036).

### E.6 User swap (FIXED)

At generation or mid-session, "swap" returns the next exercise in the same ordered list (skipping the current one, cycling), restricted to exercises whose station is compatible with the block (§F). A "show held" option lists HELD exercises with reasons. The user may mark a swap "replace permanently" → USER_REPLACE event (Q.8). Swaps never change families or blocks.

---

## F. Pairing

### F.1 Composition (FIXED)

Block composition is set by the family plan (§C.4): A and B are one lower + one upper; C is core + carry/core; F is one or two items. There is no pairing search.

### F.2 Station rule (FIXED)

Each exercise has `station` = NONE or a station group ID (Q.1, Q.3). A block may contain at most one item with a non-NONE station, unless both items have the identical station group.

Enforcement, applied as soon as both slots of a block are selected:
1. keep slot 1 (A1, B1, C1, F1); re-select slot 2 from its ordered list, skipping candidates that violate the rule;
2. if none qualifies, keep slot 2's original pick and re-select slot 1 the same way;
3. if neither works, keep the original picks and mark the block STRAIGHT_SETS (all sets of item 1, then all sets of item 2). Duration is recomputed (§G.5).

Default station groups (PARAM, **UNRESOLVED** until confirmed on site): RACK_AREA = {EQ004 rack and pull-up bar, EQ005 flat bench, EQ006 barbell}; BENCH_2 = {EQ011}; each machine EQ017–EQ021 its own group; DIP = {EQ003}. Dumbbells, kettlebells, stability balls, mats, and floor space are station NONE.

### F.3 Execution order (FIXED)

Paired blocks alternate item 1 and item 2 each set, moving directly between them, then rest `REST_AFTER_PAIR[role]` (§G.1) after each pair. Blocks run A → B → C → F.

---

## G. Prescription

### G.1 Role table (PARAM values; FIXED structure)

These are conventional strength and hypertrophy ranges (`basis: NONE`). They are not derived from Alloy.

| Role | Unit | Range (min–max) | Step | Default sets | Rest after pair |
|---|---|---|---|---|---|
| PRIMARY | reps | 6–10 | 1 | 3 | 90 s |
| SECONDARY | reps | 8–12 | 1 | 3 | 75 s |
| CORE (rep-based) | reps (per side if unilateral) | 8–12 | 1 | 2 | 45 s |
| CORE (time-based) | seconds | 20–40 | 5 | 2 | 45 s |
| CARRY | seconds | 30–45 | 5 | 2 | 45 s |
| ACCESSORY | reps | 10–15 | 1 | 2 | 45 s |
| MOBILITY | seconds or reps/side | 30–45 s or 6–8 | — | 1 | none |
| CONDITIONING | fixed format `CONDITIONING_FORMAT` | — | — | 1 | — |

Unit comes from the exercise's `load_mode` (time-based exercises use seconds). Unilateral exercises: range applies per side.

### G.2 Sets (FIXED)

`sets = default sets for role`, then: posture LIGHT → 2 for every item; replaced slots (§C.4) use their block's default (3 in A and B); then §G.5 trimming.

### G.3 Targets and load (FIXED)

From the line for (exercise, role, side):

| Line state | Prescription shown |
|---|---|
| none (never done in this role) | CALIBRATE: target = range min; load guidance "choose a weight where the target reps feel GOOD; you may change weight between sets" |
| BUILDING | `next_load` × `next_target` |
| LOAD_CAPPED | `next_load` × `next_target` (extended target) |
| RETURN (gap, §H.7) | last load × last target |

Bodyweight exercises show target only. If the equipment's increment list is unknown, the engine shows "next heavier available weight" on a load increase and records the load actually used.

Tempo is always "controlled." Explicit tempo is **FUTURE** unless entered by the user or trainer as an exercise note.

Effort instruction (FIXED): "Aim for HARD on the last set, with every rep in good form. Stop the set if form breaks." Whether sets must always stop short of failure is candidate SC-05 (**UNRESOLVED B5**); the engine does not add a failure rule.

### G.4 Right-arm items (FIXED)

Items with `per_side_logging = true` show left and right fields and the fade-rep field. Prescription is identical for both sides unless `ALLOW_UNEVEN_SIDE_DOSING = true` (**UNRESOLVED B5**, default false).

### G.5 Duration estimate and fitting (FIXED formula, PARAM constants)

```
pair_set_min(role) = PAIR_SET_MINUTES[role] + UNILATERAL_ADD_MINUTES × (number of unilateral items in block)
block_min          = BLOCK_SETUP_MINUTES + sets × pair_set_min(role of slot 1)
                     + (RAMP_MINUTES if block A and any ramp)
straight-sets block: add STRAIGHT_SETS_ADD_MINUTES
session_min        = prep_min + Σ block_min + (FINISH_MINUTES if F present)
```

Defaults (PARAM): PAIR_SET_MINUTES = PRIMARY 3.0, SECONDARY 2.75, CORE/CARRY/ACCESSORY 2.0; UNILATERAL_ADD_MINUTES 0.5; BLOCK_SETUP_MINUTES 1.0; RAMP_MINUTES 2.0; STRAIGHT_SETS_ADD_MINUTES 1.0; FINISH_MINUTES 6.

If `session_min > R-01`, apply in order until it fits:
1. drop F;
2. reduce the last remaining block's sets by 1, down to 2, working backward (C, then B, then A);
3. drop C, then B.

If it still does not fit with A at 2 sets, return the session anyway only if `session_min ≤ R-01 + DURATION_TOLERANCE_MINUTES` (3); otherwise NO_SESSION(TOO_SHORT).

**PARAM note:** these constants are to be recalibrated in Phase 8 from logged `started_at` / `ended_at`. **FUTURE:** automatic calibration from logs.

---

## H. Progression

### H.1 Line (FIXED)

```
line[(exercise_id, role, side)]:
  side: BILATERAL | LEFT | RIGHT
  range_min, range_max, step, unit          # from role table at creation
  state: BUILDING | LOAD_CAPPED
  next_load | null, next_target
  top_confirmations: int                    # consecutive qualifying exposures at range_max with GOOD
  extended: bool                            # rep ceiling extended once (H.5)
  consecutive_holds: int                    # for stall flag only
  last_exposure_at
  last_decision: {code, reasons[]}
```

Sets are never a progression dimension in V0 (fat-loss phase, B1 default). **FIXED**

### H.2 Evidence (FIXED)

An exposure is **qualifying** only if all hold:
- posture was NORMAL;
- the item's effort rating is present;
- every prescribed working set has reps (or seconds) logged, at the prescribed load;
- no TECHNIQUE_DIFFICULTY, UNCOMFORTABLE, or STOPPED_SYMPTOM on the item;
- session SESSION_CAPACITY ≠ below_usual;
- not a CALIBRATE exposure and not a RETURN exposure (§H.7);
- for a RIGHT side under R-04 = worse that day: not qualifying (hold);
- for per-side items: the side's data is present.

Non-qualifying exposures produce decision NOT_EVIDENCE (with reasons) and change nothing, except the flag actions in §H.4.

### H.3 Decision table (FIXED; evaluated top to bottom on qualifying exposures)

Let `met` = every set reached `next_target`; `short2` = at least two sets fell short of target by ≥ 2 reps (or ≥ 2 steps for time).

| # | Condition | Decision | Effect on next exposure |
|---|---|---|---|
| 1 | effort TOO_HARD, or short2 | REDUCE | `next_load` = next lower available load (bodyweight/time: `next_target` = max(range_min, target − 2 steps)); `top_confirmations` = 0 |
| 2 | effort TOO_EASY and met | LOAD_UP | §H.5 increase |
| 3 | effort GOOD and met and `next_target < range_max` | REPS_UP | `next_target` += step |
| 4 | effort GOOD and met and `next_target ≥ range_max` | CONFIRM_TOP | `top_confirmations` += 1; if ≥ `LOAD_UP_CONFIRMATIONS` (2) → §H.5 increase |
| 5 | otherwise (HARD, or short by less than short2) | HOLD | no change; `consecutive_holds` += 1 |

Any decision other than HOLD resets `consecutive_holds` to 0. REDUCE never goes below the lightest available load; at the lightest load, REDUCE becomes HOLD with reason AT_MINIMUM.

### H.4 Flag actions (FIXED; apply on any exposure)

| Flag | Action |
|---|---|
| TECHNIQUE_DIFFICULTY | next exposure: REDUCE one load step (AF-09); exposure not evidence |
| UNCOMFORTABLE | HOLD; `uncomfortable_streak` += 1; at 2 consecutive → `review_hold` (HF-07) |
| STOPPED_SYMPTOM | `review_hold` immediately; recorded, never interpreted |
| TOO_HARD with UNCOMFORTABLE | treated as UNCOMFORTABLE only (tolerance, not load) |
| RIGHT_ARM_FADE (rep n) | right side's reps for that set are counted as n − 1 for `met`; fade rep recorded (monitoring) |
| DISLIKE / PREFER | preference update; no load effect |
| EQUIPMENT_ISSUE | no exercise effect; exposure not evidence if load was changed because of it |

### H.5 Load increase (FIXED)

```
if a heavier load exists in the equipment's confirmed list (or increments unknown):
    next_load = next heavier load; next_target = range_min; top_confirmations = 0
elif not extended:
    range_max += LOAD_CAP_EXTRA (3 reps or 3 steps); extended = true;
    next_target += step                              decision EXTEND_RANGE
else:
    state = LOAD_CAPPED                              decision LOAD_CAPPED
```

Bodyweight lines have no heavier load: they go straight to the `extended` branch. LOAD_CAPPED sets the anchor's `rotate_due` for PRIMARY/SECONDARY (§E.5). For bodyweight lines, LOAD_CAPPED is also flagged in the record as "ready for a harder variant: your choice" (complexity progression is **FUTURE**).

### H.6 Right side (FIXED)

- Per-side items are evaluated per side with that side's data only. Left-side evidence never changes the right side (D-018).
- If `ALLOW_UNEVEN_SIDE_DOSING = false` (default, **UNRESOLVED B5**), the decision applied to both sides is the more conservative of the two, in the order REDUCE < HOLD / NOT_EVIDENCE < REPS_UP < CONFIRM_TOP < LOAD_UP.
- Bilateral implements (both hands at once, e.g., two dumbbells): load increases only when both sides qualify for it.

### H.7 Calibration, gaps, stalls (FIXED)

- **CALIBRATE** (first exposure in a role): create the line with `next_load` = load of the last completed working set, `next_target` = clamp(minimum reps achieved across sets, range_min, range_max). Within-session load changes are allowed and do not violate §I. Not evidence.
- **RETURN**: if `last_exposure_at` is older than `GAP_DAYS` (14), the next exposure repeats the last load and target and is not evidence.
- **STALL**: when `consecutive_holds ≥ STALL_FLAG_EXPOSURES` (4), the record shows "stalled; consider reviewing." No automatic action (D-036).

### H.8 Exclusions (FIXED)

Alloy logs never create or change lines (D-025). MOBILITY and CONDITIONING have no lines.

---

## I. Validation

### I.1 Validators (FIXED; run once on the assembled session)

| ID | Check | On failure |
|---|---|---|
| V-01 | Every item (PREP, blocks, F) passes HF-01 to HF-08 and HF-14 | replace item with next candidate (§E.2); if none, slot empty (§C.7) |
| V-02 | All equipment available; station rule (§F.2) holds or block is STRAIGHT_SETS | replace per §F.2 |
| V-03 | `session_min ≤ R-01` (after §G.5) | §G.5 fitting |
| V-04 | No exercise appears twice | replace later occurrence |
| V-05 | Every load prescription follows §G.3/§H (≤ one load step from last exposure, except CALIBRATE) | recompute from line; if still invalid, prescribe last load (HOLD) |
| V-06 | Block A has ≥ 1 item | NO_SESSION(NO_BLOCK_A) |
| V-07 | Record complete (§J.1 fields present for every item) | fill from pipeline data; engine error if impossible |

Repairs are applied in validator order, then validators V-01 to V-06 run once more. If any still fails, return NO_SESSION with the failing validator IDs. **FIXED**: the engine never returns a session that fails V-01, V-02, or V-04.

### I.2 NO_SESSION reasons (FIXED)

USER_SKIP · TOO_SHORT · NO_BLOCK_A (with UNFILLABLE families and unblocking questions) · VALIDATION_FAILED(ids). Each carries a user-facing sentence (§J.3).

---

## J. Explainability

### J.1 Generation record (FIXED fields)

Session level:
```
generation_id, engine_version, config_version, generated_at (= now), seed
input_versions: {profile, constraints, equipment, metadata, supplemental}
check_in: all answers, including recorded-only R-03, R-07
posture, posture_reason
tier, blocks_included, finish_choice + reason
family_plan: [{slot, family, role, reason_code, family_last_trained, parent_last_trained, source_of_timestamp}]
alloy: {prompts_asked[], credits_applied[]}
unfillable: [{family, reason, unblocking_question}]
constraints_applied: [{id, filter, items_affected[]}]
constraints_not_applied: [{id, status}]            # pending candidates
context_items_shown: [ids]                          # display only
validators: [{id, result, repairs[]}]
duration_estimate, trims_applied[]
```

Per item:
```
slot, exercise_id, evidence_basis, role
family_reason_code
selection: {reason_code, decided_by, anchor_before, anchor_after_if_performed}
alternatives: [{exercise_id, outcome: LOST(key) | HF-id}]   # the next 3 in order + every HELD/EXCLUDED in the family
recent_training: [{what, when, source}]                     # family timestamp, last use, 48 h / 24 h rules hit
prescription: {sets, target, unit, load, rest, per_side}
progression: {line_state, last_decision, why_this_load}
constraint_effects: [{id, effect}]
station: {group, block_mode: PAIRED | STRAIGHT_SETS}
```

### J.2 Reason codes (FIXED enumerations)

Family: STALEST_LOWER · STALEST_UPPER_PARENT · OTHER_UPPER_PARENT · STALEST_CORE · STALEST_C2 · SORENESS_REPLACEMENT · CORE_STARVATION_SWAP · FALLBACK_SIBLING · FALLBACK_SAME_SIDE · FALLBACK_CORE · FINISH_GOAL_ACCESSORY · FINISH_CORE_OR_CARRY · FINISH_CONDITIONING · FINISH_MOBILITY.
Selection: §E.3. Progression: CALIBRATE · RETURN · NOT_EVIDENCE · REDUCE · HOLD · REPS_UP · CONFIRM_TOP · LOAD_UP · EXTEND_RANGE · LOAD_CAPPED · AT_MINIMUM.

### J.3 "WHY THIS EXERCISE?" (FIXED templates; plain language, no codes)

Line 1 (movement), from family reason, e.g.:
- STALEST_LOWER: "Hinging is your least recently trained lower-body pattern (last: {when}, {source})."
- SORENESS_REPLACEMENT: "You said your lower body is too sore to load today, so this slot is core work."
- CORE_STARVATION_SWAP: "Short session, and no core work for {n} days, so core replaced the second strength pair."

Line 2 (exercise), from selection reason, e.g.:
- ANCHOR: "This is your current {family} exercise; keeping it lets us track progress."
- SUBSTITUTE_FOR_ANCHOR(HF-11): "Your usual {anchor} was done {n} hours ago, so this stands in today."
- SUBSTITUTE_FOR_ANCHOR(HF-12): "Your legs were trained {n} hours ago, so we're skipping heavier options like {anchor}."
- NEW_ANCHOR_ROTATION(LOAD_CAPPED): "You've outgrown the heaviest weight available for {old}, so we're moving on."

Line 3 (today's dose), from progression code, e.g.:
- REPS_UP: "Same weight, one more rep: you rated it GOOD and hit every rep."
- HOLD: "Same as last time: you rated it HARD."
- CALIBRATE: "First time: pick a weight where {target} reps feel GOOD."

---

## K. State updates after workout completion

Triggered when the user finishes or ends a session. **FIXED**, in this order:

1. Persist the session log (Q.5) with `performed_at` = started_at and `ended_at`. Items with zero completed working sets are "skipped" and have no effect beyond being recorded.
2. `apartment_sessions_completed` += 1 (only if ≥ 1 working set was completed). Set `history_start` if null.
3. For each performed item: `exercise_last_used[exercise] = ended_at`.
4. Family credit (§B.3) → update `family_last_trained`, then recompute parents.
5. For each performed item with a line role: apply §H.7 (CALIBRATE / RETURN) or §H.2–H.6; write `last_decision`.
6. Flags (§H.4): review holds, uncomfortable streaks, preferences.
7. Anchors: for each performed item in an anchored role:
   - if the pick was ANCHOR: `exposures_as_anchor` += 1;
   - if NEW_ANCHOR_*: set anchor = this exercise, `exposures_as_anchor` = 1, `rotate_due` = false;
   - if SUBSTITUTE_FOR_ANCHOR: no anchor change;
   - if USER_SWAP: no anchor change; if USER_REPLACE: anchor = this exercise.
   Then evaluate rotation triggers (§E.5).
8. Record SESSION_CAPACITY (monitoring; makes the session's exposures non-evidence if below_usual, already applied in step 5).

Generated sessions that are never started change nothing. A session regenerated after partial completion is not supported in V0 (**FUTURE**); the user ends the session and generates a new one, which sees the logged items.

User action events (Q.8) apply at their `event_at`: CLEAR_HOLD, SET_PREFERENCE, USER_REPLACE, CONFIRM_CAPABILITY (satisfies HF-08), CONFIRM_EQUIPMENT (updates availability).

---

## L. Externally logged Alloy sessions

### L.1 Principle (FIXED)

Alloy sessions count toward family timestamps and the repeat rule (D-016). They never create or change progression lines, anchors, preferences, or holds (D-025). What Nelson's coach modifies for him is TRAINER-sourced personal input (D-015), recorded in PERSONAL files, never used as Alloy research evidence.

### L.2 Missing-session prompt (FIXED)

`ALLOY_SCHEDULE` (PARAM; default Mon, Wed, Fri at 16:00 local, from profile). At check-in, for each scheduled slot in the last `ALLOY_PROMPT_LOOKBACK_HOURS` (72) whose `alloy_resolved` is not LOGGED or SKIPPED and which has no Alloy log on that local date, ask AL-?: "Did you train at Alloy on {day}?"
- yes → create an Alloy SUMMARY log: focus = full, `performed_at` = scheduled time, `ended_at` = + `ALLOY_DEFAULT_DURATION_MINUTES` (55), `source = CHECKIN_PROMPT`.
- no → `alloy_resolved = SKIPPED`.
- not sure → `alloy_resolved = UNKNOWN`; no credit; recorded.

At most `ALLOY_MAX_PROMPTS` (3) prompts per check-in, newest first.

### L.3 Crediting (FIXED)

| Log mode | Credit |
|---|---|
| SUMMARY focus = full | `parent_last_trained` for LOWER, PUSH, PULL = `ended_at` |
| SUMMARY focus = upper | PUSH, PULL |
| SUMMARY focus = lower | LOWER |
| FULL | summary credit per its focus field, **plus** `family_last_trained[f]` for each family f tagged on ≥ 1 item (sets unknown counts as credited); `exercise_last_used` for items carrying a library `exercise_id` |

CORE, CARRY, GOAL_ACCESSORY, MOBILITY, and CONDITIONING are never credited from summaries. FULL items without a family tag credit nothing beyond the summary.

### L.4 Data hygiene (FIXED)

- `performed_at` is the class time, never the entry time. If the user does not change it, it defaults to the scheduled time for that date.
- Two Alloy logs on the same local date merge: FULL wins over SUMMARY; the later `ended_at` is kept.
- An Alloy log entered after a generation does not alter that generated session; the next generation sees it.
- Alloy sessions are not counted in `apartment_sessions_completed`.

**UNRESOLVED (B6):** whether the Alloy program is visible in advance. **FUTURE:** using a known upcoming Alloy program.

---

## M. Handling incomplete data (FIXED)

| Missing | Behavior |
|---|---|
| No history at all | all timestamps null → FAMILY_ORDER / PARENT_ORDER decide; all exercises CALIBRATE; no finish for the first 2 sessions |
| Sparse history (< 7 days) | normal logic; core-starvation swap disabled (needs `history_days ≥ 7`) |
| Long gap (> GAP_DAYS since an exercise) | RETURN exposure (§H.7); anchors and lines persist |
| Effort rating missing | exposure NOT_EVIDENCE |
| Reps/seconds missing on any working set | NOT_EVIDENCE |
| Load missing (external load) | line not updated; record notes it |
| One side missing on a per-side item | NOT_EVIDENCE for both sides |
| R-02, R-04, R-05 unanswered | defaults: normal, same, none (recorded as defaulted) |
| R-01 or R-06 unanswered | cannot generate; ask |
| Equipment availability UNKNOWN | HF-06 HELD |
| Equipment increments unknown | "next heavier available weight" guidance; actual load recorded |
| Exercise metadata incomplete | exercise removed from pool; listed in record |
| Alloy class not logged | §L.2 prompt; "not sure" → no credit |
| OTHER training (DailyArms etc.) | not read (**UNRESOLVED B2**) |
| Profile PENDING values | §A.4 defaults |

Missing data never counts as evidence and never produces progression.

---

## N. Fallback behavior (FIXED)

| Situation | Behavior |
|---|---|
| Minutes below minimum | NO_SESSION(TOO_SHORT). **FUTURE:** mobility-only session offer. |
| User chose skip at R-06 | NO_SESSION(USER_SKIP) |
| A family has no eligible exercise | §C.7 fallback chain; UNFILLABLE recorded with its unblocking question |
| Block A cannot be formed | NO_SESSION(NO_BLOCK_A) listing held/excluded reasons and questions |
| Two stations in one block | §F.2 re-selection; else STRAIGHT_SETS |
| Station busy mid-session | swap (§E.6) restricted to exercises whose station is free or NONE; else skip the item |
| User rejects an exercise | swap (§E.6); no randomness |
| Session runs long in practice | user ends session; only performed items count (§K) |
| All accessory candidates for GOAL_ACCESSORY missing | finish falls to the next priority (§C.5) |
| Regenerate the same day | identical session (same seed and inputs) unless inputs changed |

---

## O. Evidence classification

All rules: `class: SYSTEM_DESIGN`. Verification reflects the Phase 0 findings register (no finding source_verified yet; RB-01 pending). `raw_only` findings cannot support a rule; such rules stand on design merit.

| Rule group | Label | Basis | Inspired by | Verification |
|---|---|---|---|---|
| Template: prep → paired strength blocks → optional individualized finish | FIXED | ALLOY_DOCUMENTED | AF-04, AF-05 | citation_resolved (AF-05 one location) |
| Full-body structure every apartment session (lower, push, pull) | FIXED | NONE | AF-01, AF-03 (2–3 sessions/week context) | citation_resolved; applying it at 5–6 sessions/week is ours |
| Lower + upper pairs; core + carry pairs | FIXED | ALLOY_OBSERVED | AF-11 | citation_resolved (partial) |
| Anti-movement core families; carry family | FIXED | NONE (design merit) | AF-13, AF-14 | raw_only |
| Horizontal/vertical subdivision | FIXED | NONE | R2 notes Alloy does not establish it | n/a |
| GOAL_ACCESSORY family and finish priority | UNRESOLVED | NONE; finish-per-goal concept ALLOY_DOCUMENTED | AF-05, AF-21 (Q-13 not cited) | citation_resolved |
| No universal metabolic finisher | FIXED | ALLOY_DOCUMENTED | AF-05; Q-08 contradicted | citation_resolved |
| PREP contents (general warm-up, joint mobility) | FIXED | ALLOY_DOCUMENTED | AF-20 | citation_resolved (one location) |
| Ramp sets | FIXED | NONE | (R1 claim quarantined, not cited) | n/a |
| Staleness family ordering | FIXED | NONE | — | n/a |
| Anchors / continuity | FIXED | NONE | AF-07 (objective kept, tool changes) informs; not claimed | citation_resolved |
| 48 h repeat; 24 h heavy-lower rule | FIXED / PARAM | NONE | Q-07 (no Alloy evidence exists) | n/a |
| Posture (energy, unwell gate) | FIXED | PERSONAL | profile R-02, R-06; D-017 | n/a |
| Sleep, fueling recorded only | FIXED | PERSONAL | D-014, D-034 | n/a |
| Hard filters HF-01 to HF-05, HF-07 | FIXED | PERSONAL | PERSONAL_constraints, D-006, D-013 | n/a |
| HELD vs EXCLUDED | FIXED | NONE | D-024 | n/a |
| Role table ranges, rest, sets | PARAM | NONE (conventional) | — | n/a |
| Load up when easy; down when technique degrades | FIXED | ALLOY_DOCUMENTED | AF-09 | citation_resolved |
| Double progression thresholds, confirmations, caps | PARAM | NONE | — | n/a |
| Per-side right-arm logging and progression | FIXED | PERSONAL | SC-01, D-018 | n/a |
| Alloy crediting method | FIXED | PERSONAL (D-016) + NONE (method) | — | n/a |
| Station rule | FIXED | NONE | — | n/a |
| Supplemental layer | FIXED | NONE | AF-10 (Alloy not machine-centric; supplemental ranks after library, K6) | citation_resolved |
| Seeded tie-break | FIXED | NONE | D-007 | n/a |

**Not used anywhere:** Q-01 to Q-04, Q-06, Q-08 (as a rule), Q-10, Q-13; AF-17 (FUTURE: weekly heavy/medium/light variation); AF-18 (statistic; our 4 main + 2 core/carry slots are a design choice, not derived from it); AF-12 (unilateral emphasis; no unilateral rule in V0), AF-15 (power/compound sets: FUTURE), AF-19 (posterior-chain chain: FUTURE progression links).

---

## P. Pseudocode (language-neutral)

```
function GENERATE(inputs, state, config, now):
    pool = LOAD_AND_VALIDATE(inputs)                     # C.1 step 1
    APPLY_ALLOY_PROMPTS(inputs.check_in, state, now)     # L.2
    if check_in.R06 == yes and check_in.R06_choice == skip: return NO_SESSION(USER_SKIP)
    posture = POSTURE(check_in)                          # C.2
    tier = TIER(check_in.R01, state)                     # C.3
    if tier == NONE: return NO_SESSION(TOO_SHORT)
    plan = FAMILY_PLAN(state, tier, check_in.R05)        # C.4, incl. soreness and starvation
    if tier.includes_F: plan.F = FINISH_PLAN(state, posture, plan)   # C.5
    seed = HASH(user_id, LOCAL_DATE(now), state.apartment_sessions_completed)

    session = empty
    for block in [A, B, C, F] if block in plan:
        for slot in block.slots:
            item = SELECT(slot, pool, state, check_in, posture, session, seed, now)
            if item == none: item = FALLBACK(slot, plan, ...)          # C.7
            session.add(slot, item)
        ENFORCE_STATION_RULE(block, session, ...)                      # F.2
    session.prep = BUILD_PREP(session, pool, state, ...)               # C.6
    for item in session: item.rx = PRESCRIBE(item, state.lines, posture)   # G
    FIT_DURATION(session, check_in.R01)                                # G.5
    result = VALIDATE_AND_REPAIR(session)                              # I
    if result.failed: return NO_SESSION(result.reason)
    record = BUILD_RECORD(session, plan, ...)                          # J
    return session, record

function SELECT(slot, pool, state, check_in, posture, session, seed, now):
    candidates = [e in pool where e.family == slot.family
                  and e.sub_target == slot.sub_target and slot.role in e.roles_allowed]
    eligible = []
    for e in candidates:
        outcome = FIRST_FAILING_FILTER(e, ...)           # HF-01..HF-14 in order
        record outcome
        if outcome == PASS: eligible.append(e)
    key = (slot.family, slot.role, slot.sub_target)
    anchor = state.anchors.get(key)                      # not used for MOBILITY/CONDITIONING
    if anchor and anchor.exercise in eligible and not anchor.rotate_due:
        return (anchor.exercise, ANCHOR)
    ordered = SORT(eligible, keys K0..K7)                # E.2
    if config.ENABLE_NOVEL_DRAW and TOP_TIE_ALL_NEVER_USED(ordered):
        pick = SEEDED_CHOICE(top_tie, seed, slot.id)
    else:
        pick = ordered[0]
    reason = REASON(anchor, filters_hit_by_anchor, rotate_cause)   # E.3
    return (pick, reason)

function COMPLETE(session_log, state, config):            # K
    persist(session_log)
    if session_log.working_sets_completed >= 1: state.apartment_sessions_completed += 1
    for item in session_log.performed_items:
        state.exercise_last_used[item.exercise] = session_log.ended_at
    CREDIT_FAMILIES(session_log, state)                  # B.3
    for item in performed items with a role line:
        for side in item.sides:
            decision = PROGRESS(item, side, state.lines, session_log)   # H.2–H.7
        APPLY_SIDE_POLICY(item, decisions, config)       # H.6
        APPLY_FLAGS(item, state)                         # H.4
        UPDATE_ANCHOR(item, state)                       # K step 7, E.5

function PROGRESS(item, side, lines, log):
    line = lines.get((item.exercise, item.role, side))
    if line is none: return CALIBRATE(...)
    if line.last_exposure_at older than GAP_DAYS: return RETURN(...)
    if not QUALIFYING(item, side, log): return NOT_EVIDENCE(reasons)
    evaluate H.3 rows 1..5 in order; apply H.5 when increasing
```

---

## Q. Data contracts (minimum fields; types indicative)

### Q.1 EXERCISE_METADATA (SYSTEM_METADATA layer; one row per usable exercise)

| Field | Type / values | Required |
|---|---|---|
| exercise_id | EX### or SX### | yes |
| display_name | string | yes |
| family | §B.2 family | yes |
| sub_target | ELBOW_FLEXION / SHOULDER_ISOLATION / ELBOW_EXTENSION / null | GOAL_ACCESSORY only |
| roles_allowed | subset of PRIMARY, SECONDARY, CORE, CARRY, ACCESSORY, MOBILITY, CONDITIONING | yes |
| laterality | BILATERAL / UNILATERAL / ALTERNATING | yes |
| per_side_logging | bool (true if unilateral upper or right triceps involved) | yes |
| load_mode | EXTERNAL_LOAD / BODYWEIGHT / TIME / TIME_WITH_LOAD | yes |
| equipment_ids | list of EQ### (empty = bodyweight) | yes |
| increment_source | EQ### whose load list applies, or null | if EXTERNAL_LOAD |
| station | NONE or station group ID (§F.2) | yes |
| heavy_lower | bool | yes |
| right_triceps_involvement | NONE / SECONDARY / PRIMARY | yes |
| position_tags | list: high_plank, forearm_plank, quadruped, straight_arm_weight_bearing, supine_press, overhead_press, dip, impact, ballistic, floor | yes (may be empty) |
| sore_regions | subset of UPPER, LOWER, TRUNK | yes |
| capability_prereq | text or null | yes |
| evidence_basis | ALLOY_LIBRARY / SUPPLEMENTAL | yes |
| library_order | integer, unique | yes |
| demo_ref | link or illustration ID (UX; profile presentation preference) | no |

The engine never reads subjective ratings (difficulty, fatigue tier, grip demand). **FIXED** (D-033)

### Q.2 SUPPLEMENTAL_EXERCISE

Q.1 fields plus `source: SYSTEM_DESIGN`, `added_because`, `approved_by_user_on` (required before the exercise enters the pool). Never carries an Alloy evidence class.

### Q.3 EQUIPMENT_STATE

`equipment_id`, `availability` (AVAILABLE / NOT_AVAILABLE / UNKNOWN), `loads` (confirmed list, e.g., KB [25, 30, 35, 40, 45]; or null = unknown), `station_group`, `confirmed_on`.

### Q.4 CHECK_IN

`check_in_id`, `created_at`, `R01`…`R07` (§A.3), `R06_choice`, `equipment_issues[]`, `alloy_answers[]`, `defaulted_fields[]`.

### Q.5 SESSION_LOG (apartment)

```
session_id, generation_id, started_at, ended_at, session_capacity (below_usual|usual|above_usual|null)
items[]: {slot, exercise_id, role, anchor_pick_reason, swapped_from|null, swap_type (USER_SWAP|USER_REPLACE|null),
          effort (per exercise; per side if per_side_logging): TOO_EASY|GOOD|HARD|TOO_HARD|null,
          flags[]: {code, side|null, rep|null, text|null},
          sets[]: {set_no, side (BILATERAL|LEFT|RIGHT), load|null, reps|null, seconds|null, is_working: bool}}
```

### Q.6 ALLOY_SESSION_LOG

```
alloy_session_id, local_date, performed_at, ended_at, source (USER_ENTRY|CHECKIN_PROMPT),
log_mode (SUMMARY|FULL), focus (full|upper|lower), perceived_effort (optional), notes,
items[] (FULL only): {exercise_id|null, free_text|null, family_tag|null, sets|null, reps|null, load|null}
```

### Q.7 OTHER_TRAINING_LOG (**UNRESOLVED B2**; stored, not read)

`session_id`, `program`, `performed_at`, `focus_tags[]`, optional sets.

### Q.8 USER_ACTION_EVENT

`event_id`, `event_at`, `type` (CLEAR_HOLD | SET_PREFERENCE | USER_REPLACE | CONFIRM_CAPABILITY | CONFIRM_EQUIPMENT | ALLOY_SKIPPED), `payload`.

### Q.9 ENGINE_STATE

§B.1 (cache; rebuildable from Q.5, Q.6, Q.8).

### Q.10 GENERATED_SESSION

`generation_id`, `prep[]`, `blocks[]: {block_id, mode (PAIRED|STRAIGHT_SETS), items[]: {slot, exercise_id, role, sets, target, unit, load|CALIBRATE|null, rest_after_pair_s, per_side, notes}}`, `finish`, `duration_estimate_min`.

### Q.11 GENERATION_RECORD

§J.1.

### Q.12 CONFIG

`config_version` and every §R constant.

---

## R. Configurable values and constants (all PARAM unless stated)

| Constant | Default | Used in |
|---|---|---|
| MIN_SESSION_MINUTES | 15 | C.3 (UNRESOLVED B3) |
| TIER_AB_MINUTES | 25 | C.3 |
| TIER_ABC_MINUTES | 35 | C.3 |
| TIER_ABCF_MINUTES | 45 | C.3 |
| PREP_MINUTES_SHORT / PREP_MINUTES | 4 / 6 | C.3, G.5 |
| PREP_GENERAL_MINUTES | 3 | C.6 |
| FIRST_SESSIONS_NO_FINISH | 2 | C.3 |
| FAMILY_ORDER / PARENT_ORDER | §B.2 | C.4 |
| CORE_STARVATION_DAYS | 7 | C.4 |
| FINISH_PRIORITY | [GOAL_ACCESSORY, CORE_OR_CARRY, CONDITIONING, MOBILITY] | C.5 |
| GOAL_ACCESSORY_ENABLED | false (UNRESOLVED B2, UQ-G03) | C.5 |
| GOAL_ACCESSORY_MIN_HOURS | 24 | C.5 |
| CONDITIONING_OPT_IN | false (UNRESOLVED P-07) | C.5 |
| CONDITIONING_FORMAT | 8 min on a non-impact machine: 30 s harder / 30 s easy | G.1 |
| MIN_SETS_FOR_CREDIT | 2 | B.3 |
| REPEAT_EXCLUSION_HOURS | 48 | HF-11 |
| HEAVY_LOWER_RECOVERY_HOURS | 24 | HF-12 |
| ACCESSORY_ROTATION_EXPOSURES | 4 | E.5 |
| ENABLE_NOVEL_DRAW | true | E.4 |
| Role table | §G.1 | G.1 |
| PAIR_SET_MINUTES | PRIMARY 3.0, SECONDARY 2.75, other 2.0 | G.5 |
| UNILATERAL_ADD_MINUTES | 0.5 | G.5 |
| BLOCK_SETUP_MINUTES | 1.0 | G.5 |
| RAMP_MINUTES | 2.0 | G.5 |
| STRAIGHT_SETS_ADD_MINUTES | 1.0 | G.5 |
| FINISH_MINUTES | 6 | G.5 |
| DURATION_TOLERANCE_MINUTES | 3 | G.5 |
| LOAD_UP_CONFIRMATIONS | 2 | H.3 |
| LOAD_CAP_EXTRA | 3 (reps or steps) | H.5 |
| GAP_DAYS | 14 | H.7 |
| STALL_FLAG_EXPOSURES | 4 | H.7 |
| ALLOW_UNEVEN_SIDE_DOSING | false (UNRESOLVED B5) | G.4, H.6 |
| ALLOY_SCHEDULE | Mon, Wed, Fri 16:00 local | L.2 |
| ALLOY_PROMPT_LOOKBACK_HOURS | 72 | L.2 |
| ALLOY_MAX_PROMPTS | 3 | L.2 |
| ALLOY_DEFAULT_DURATION_MINUTES | 55 | L.2 |
| Station groups | §F.2 defaults (UNRESOLVED: confirm on site) | F.2 |
| Equipment load lists | Q.3 (UNRESOLVED UQ-G04) | G.3, H.5 |

---

## S. Register of FUTURE features and UNRESOLVED items

**FUTURE (do not implement):** weekly family-frequency targets; weekly heavy/medium/light variation (AF-17); compound sets and power blocks (AF-15); ROTATION family; tempo, ROM, and complexity progression; progression trees (AF-16, AF-19 links); set progression; automatic duration calibration; forward-looking use of Alloy schedule or program; mobility-only sessions; resuming a partially completed generated session; multiple gyms; reading OTHER training logs.

**UNRESOLVED (defaults implemented per §A.4):** B1, B2, B3, B4a–d, B5, B6, UQ-G01 (vertical pull capability), UQ-G02 (adjustable cable pulley), UQ-G03 (supplemental approval), UQ-G04 (load lists), UQ-G05 (rack bar path, incline bench), station groups, P-07 conditioning, P-08 impact, and **weekly training-frequency tolerance**: whether the V0 recovery rules (48 h repeat, 24 h heavy-lower, energy, soreness) are sufficient when Alloy and apartment sessions total 5–6 per week. The Phase 8 manual run must review SESSION_CAPACITY and effort trends specifically for this question.

**Before implementation begins (not engine rules, but blocking):** author EXERCISE_METADATA (Q.1) for every usable library exercise; confirm equipment load lists and station groups; answer B3, B4a, B5, B6, UQ-G01.
