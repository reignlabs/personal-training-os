---
file: ENGINE_WORKOUT_GENERATOR_V0_2.md
class: ENGINE
status: CANONICAL (frozen)
engine_version: 0.2.0
config_version: 0.2.0
updated: 2026-09-23
supersedes: ENGINE_WORKOUT_GENERATOR_V0_1.md (engine 0.1.1; retained as history)
review_basis: ENGINE_STRESS_TEST_LEDGER_v0_1.md (red-team), ENGINE_STRESS_TEST_RERUN_V0_2.md (rerun record)
acceptance: GENERATOR_ACCEPTANCE_TESTS_V0_2.md (an implementation is conforming only if every test passes)
decisions: D-001 to D-040 (existing), D-041 to D-060 (DECISION_LOG_addendum_D041-D060.md)
reads: PERSONAL_user_profile.yaml, PERSONAL_constraints.yaml, equipment_library.json,
       exercise_equipment_availability.json, claude_v0-exercise-db_exercise_dataset.json (evidence layer, read-only),
       EXERCISE_METADATA (contract Q.1; to be authored under §Q.1 criteria), CONFIG (§R)
change_control: any change to a FIXED rule requires a decision-log entry and an engine_version bump.
                PARAM changes require only a config_version bump.
---

# ENGINE: Workout Generator V0 (engine 0.2.0)

**What changed from 0.1.1.** Nineteen modifications (M-01 to M-19), each tied to a demonstrated failure in the red-team ledger or found while re-running it. Every changed rule carries a `[M-xx]` marker. The full record for each change (problem, old behavior, new behavior, reason, affected scenarios, new failure risk) is in **Part II, §V**. Rules without a marker are unchanged from 0.1.1.

| ID | Change in one line | Ledger item |
|---|---|---|
| M-01 | Ties in staleness break by who led least recently; the leading push/pull family alternates too | FL-01, FL-24 |
| M-02 | Same-exercise exclusion is "not on consecutive calendar days," not 48 hours | FL-02 |
| M-03 | Anchors are chosen from default order and preference only; a filtered day's pick is a substitute | FL-03 |
| M-04 | A new role line starts from the other role's known load | FL-04 |
| M-05 | `default_order` replaces harvest order; no seeded draw in PRIMARY/SECONDARY | FL-05 |
| M-06 | Families with no servable exercise are removed from planning | FL-07, FL-24 |
| M-07 | A core or carry family never appears twice in a session | FL-08 |
| M-08 | Mandatory `hand_support` field; undocumented plank positions are HELD | FL-09 (critical) |
| M-09 | "Right arm worse" gets a user choice; K3 reachable; right-side evidence rule scoped | FL-10 |
| M-10 | Right-arm fade no longer alters reps; one automatic REDUCE until success or review | FL-11 (critical) |
| M-11 | DISLIKE on an anchor rotates it (when an alternative exists) | FL-12 |
| M-12 | Station rule keeps anchors; two conflicting anchors run straight sets | FL-13 |
| M-13 | Equipment alternatives; implement changes are not evidence; substitution availability rule | FL-14, FL-23 |
| M-14 | Unknown increments stop at the confirmed maximum load | FL-18 |
| M-15 | Uncertain Alloy attendance counts for recovery (not staleness) | FL-16 |
| M-16 | Under-filled sessions are disclosed with a cause | FL-15 |
| M-17 | Metadata authoring criteria and load-time validators | FL-22 (critical), FL-05 |
| M-18 | Effort HARD with all reps met progresses like GOOD | found in rerun (S28a) |
| M-19 | `LOAD_UP_CONFIRMATIONS` 2 → 1 (PARAM) | FL-18 |

**Deliberately not changed:** FL-06 (residual cold-start novelty), FL-17 (fatigue model beyond the lower-body 24 h rule; weekly frequency tolerance stays UNRESOLVED for Phase 8), FL-19 (LIGHT exposures are never evidence), FL-20 (goal representation, blocked on B1/B2/UQ-G03), FL-21 (grip and unilateral load), FL-25 (aborted-session counter), PREFER behaviour. Reasons in §V.2.

---

# PART I. SPECIFICATION

## 0. Conventions

**Labels.** Every rule carries one label.

| Label | Meaning |
|---|---|
| **FIXED** | FIXED V0 RULE. Implement exactly. Changing it requires a decision-log entry. |
| **PARAM** | CONFIGURABLE PARAMETER. Named constant in §R. Default given. Tunable without code changes. |
| **FUTURE** | FUTURE FEATURE. Do not implement in V0. Listed so engineers do not invent it. |
| **UNRESOLVED** | Behavior depends on an open question. A V0 default is specified and must be implemented. |

**Determinism (FIXED).** Given identical inputs, engine state, config, and seed, the generator returns an identical session. No step uses wall-clock time except `now` supplied as an input. The only pseudo-random step is §E.4, which applies only to MOBILITY, CORE and CARRY selections, with a seed that is stable for the day. [M-05]

**Time (FIXED).** All timestamps are stored in UTC with the user's IANA time zone. "Local date" means the date in that zone. "Hours since X" = (now − X) in hours, as a real number. "Calendar days between" = difference of local dates. [M-02]

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
| Equipment | equipment_library + availability (contract Q.3) | yes | §D, §F, load increments, load caps |
| Exercise metadata | contract Q.1 (SYSTEM_METADATA layer), validated per §Q.1.2 | yes | everything in §C–§H |
| Supplemental exercises | contract Q.2 | no (empty by default) | GOAL_ACCESSORY and machine options |
| Config | §R | yes | all PARAM values |

The evidence dataset (`claude_v0-exercise-db_*`) is **not** read by the engine except for `canonical_name` display. Its `primary_pattern` and related fields are not used (known defects, RAW_MANIFEST R3). **FIXED**

### A.2 Logs (read at generation)

| Log | Contract | Used for |
|---|---|---|
| Apartment session logs | Q.5 | engine state (§B) |
| Alloy session logs | Q.6 | family timestamps, repeat rule, recovery (§L) |
| Other training logs (DailyArms, DailyAbs, walking) | Q.7 | **UNRESOLVED (B2).** V0 default: stored, not read. |
| User action events | Q.8 | anchors, holds, preferences, equipment (§B) |

### A.3 Check-in (per generation)

| ID | Question | Values | Required | Effect |
|---|---|---|---|---|
| R-01 | Minutes available | integer | **yes** | size tier (§C.3) |
| R-02 | Energy today | low / normal / high | no (default normal) | posture (§C.2) |
| R-03 | Sleep last night | poor / ok / good | no | **recorded only** (D-034) |
| R-04 | Right arm vs usual | worse / same / better | no (default same) | §E.1 K3 lead; §H.2 right-side evidence |
| R-04b | *Only if R-04 = worse:* "Press today as usual, or swap pressing for core?" | as_usual / swap | no (default as_usual, recorded as defaulted) | §C.4 push replacement [M-09] |
| R-05 | Too sore to load today? | multi-select: none / upper / lower / trunk | no (default none) | §D HF-05; §C.4 replacement |
| R-06 | Unwell or different from usual? | no / yes → choice: normal / lighter / skip | **yes** | posture or no session |
| R-07 | Ate per plan 2–3 h before? | yes / no | no | **recorded only** (D-034); sunset when OQ-02 closes |
| AL-? | "Did you train at Alloy on {day}?" (only if §L.2 triggers) | yes / no / not sure; dismissing = not answered | when asked | Alloy crediting and recovery (§L.2) [M-15] |
| EQ-? | Equipment issues today (optional) | list of equipment IDs | no | §D HF-06 |

R-05 replaces the profile's `specific_area` option with `trunk` so every answer maps to a filter without interpretation. **FIXED** (D-034)

R-04b chooses no SC-01 parameter: it is the user's own choice for the day, recorded like R-06's choice. **FIXED** [M-09]

### A.4 Defaults for pending profile questions (UNRESOLVED; implement these defaults)

| Question | V0 default |
|---|---|
| B1 goal ranking / build vs preserve | no goal weighting exists in V0; sets never progress (§H.1); session size never grows above the ≥ 45 tier (§G.5 underfill notice) |
| B2 apartment share of arm/shoulder goal; OTHER logs | `GOAL_ACCESSORY_ENABLED = false`; OTHER logs not read |
| B3 session length | tier table §C.3 as given |
| B4a HC-02 scope | rows with `hand_support = PLANK_POSITION_UNCONFIRMED` are HELD (HF-02) [M-08] |
| B4b/c/d push-ups, SC-03, SC-04 | not applied (D-013) |
| B5 right-triceps dosing, SC-02, SC-05 | §H.6 defaults; ELBOW_EXTENSION sub-target disabled; R-04b offered as a same-day user choice |
| B6 Alloy logging mode | both modes supported; SUMMARY expected |
| UQ-G01 chin-up/pull-up capability | chin-up/pull-up HELD (HF-08); VPULL therefore unservable (§C.4) |
| UQ-G02 adjustable cable pulley | cable-dependent rows HELD (HF-06 UNKNOWN) |
| UQ-G03 supplemental exercises | none approved; GOAL_ACCESSORY unfillable; machines EQ017–EQ021 have no rows |
| UQ-G04 load lists | DB increments unknown; `max_confirmed_load` from the equipment record applies (§H.5) |
| P-07 conditioning preference | `CONDITIONING_OPT_IN = false` |
| P-08 impact preference | exercises tagged `impact` HELD (HF-14) |

---

## B. State

### B.1 Engine state (persisted; rebuildable)

**FIXED:** engine state must be exactly reproducible by replaying Q.5, Q.6, Q.8 records and resolved check-in Alloy answers (Q.4 `alloy_answers`) in time order through §K and §L. It is a cache, never a source of truth.

```
engine_state:
  family_last_trained[family]         : timestamp | null      # §B.3
  parent_last_trained[parent]         : timestamp | null      # §B.3
  family_last_primary[family]         : timestamp | null      # §B.3  [M-01]
  parent_last_primary[PUSH|PULL]      : timestamp | null      # §B.3  [M-01]
  lower_last_trained                  : timestamp | null      # = parent_last_trained[LOWER]
  recovery_credits[]                  : timestamp list        # §L.2, recovery only  [M-15]
  exercise_last_used[exercise_id]     : timestamp | null      # apartment + Alloy FULL items with exercise_id
  anchors[(family, role, sub_target)] : {exercise_id, exposures_as_anchor, rotate_due: bool, rotate_cause, note}
  lines[(exercise_id, role, side)]    : progression line (§H.1)
  review_hold[exercise_id]            : {held: bool, cause: STOPPED_SYMPTOM | UNCOMFORTABLE_X2}
  uncomfortable_streak[exercise_id]   : int
  preference[exercise_id]             : PREFER | DISLIKE | null
  apartment_sessions_completed        : int
  history_start                       : timestamp | null      # first logged session of any environment
  alloy_resolved[scheduled_slot]      : LOGGED | SKIPPED | UNKNOWN
  equipment_overrides[equipment_id]   : {availability, loads, max_confirmed_load}   # from CONFIRM_EQUIPMENT
```

### B.2 Families (FIXED vocabulary)

| Family | Parent | Role when placed | Slot kinds |
|---|---|---|---|
| KD (knee dominant) | LOWER | PRIMARY / SECONDARY | main |
| HD (hip dominant) | LOWER | PRIMARY / SECONDARY | main |
| HPUSH | PUSH | PRIMARY / SECONDARY | main |
| VPUSH | PUSH | PRIMARY / SECONDARY | main |
| HPULL | PULL | PRIMARY / SECONDARY | main |
| VPULL | PULL | PRIMARY / SECONDARY | main |
| ANTI_EXT | CORE | CORE | C, F, replacement |
| ANTI_ROT | CORE | CORE | C, F, replacement |
| ANTI_LAT | CORE | CORE | C, F, replacement |
| CARRY | CARRY | CARRY | C, F |
| GOAL_ACCESSORY (sub-targets ELBOW_FLEXION, SHOULDER_ISOLATION, ELBOW_EXTENSION) | ACCESSORY | ACCESSORY | F |
| MOBILITY | MOBILITY | MOBILITY | PREP, F |
| CONDITIONING | CONDITIONING | CONDITIONING | F (opt-in) |
| ROTATION, POWER | — | — | **FUTURE** (no slots) |

Kettlebell swings and similar are HD exercises with the tag `ballistic`. Jumping exercises carry `impact`. **FIXED**

`FAMILY_ORDER` (tie-break, PARAM): KD, HD, HPULL, HPUSH, VPULL, VPUSH, ANTI_EXT, ANTI_ROT, ANTI_LAT, CARRY, GOAL_ACCESSORY.
`PARENT_ORDER` (PARAM): PULL, PUSH.

### B.3 Last-trained and last-primary timestamps (FIXED)

A session **credits** family f when ≥ `MIN_SETS_FOR_CREDIT` working sets were completed in items whose `family` = f. Credit time = session end time. Only an exercise's own family is credited (no secondary crediting).

- `family_last_trained[f]` = latest credit time from apartment logs and Alloy FULL items tagged with f.
- `parent_last_trained[p]` = latest of (its families' `family_last_trained`, Alloy SUMMARY parent credits §L.3).
- `family_last_primary[f]` = end time of the latest **apartment** session that credited f through an item placed in role PRIMARY. `parent_last_primary[p]` = latest `family_last_primary` of p's families. Alloy logs never set these. [M-01]
- `recovery_credits[]` are never used for staleness (§L.2). [M-15]
- `null` sorts as the oldest possible value ("never").

### B.4 Derived at generation (not persisted)

`recovery_lower_at = max(lower_last_trained, recovery_credits)`; `hours_since_lower = now − recovery_lower_at` [M-15]; `history_days = (now − history_start) in days`; `servable[f]` (§C.4.1) [M-06]; `seed` (§E.4).

---

## C. Generation sequence

### C.1 Order of operations (FIXED)

1. Load and validate inputs (Q contracts). Run metadata validators V-00a to V-00g (§Q.1.2); rows failing any are removed from the pool and listed in the record. [M-17]
2. Resolve Alloy prompts (§L.2) and apply answers (logs and recovery credits) before step 3.
3. Process check-in → posture (C.2), sore regions, R-04/R-04b, today's equipment issues. R-06 = skip → return NO_SESSION(USER_SKIP).
4. Size tier (C.3). R-01 < `MIN_SESSION_MINUTES` → NO_SESSION(TOO_SHORT).
5. Servability (C.4.1), then family plan (C.4).
6. For each slot in order A1, A2, B1, B2, C1, C2: select exercise (§E) and enforce the station rule per block (§F). Then F (§C.5).
7. Build PREP (C.6).
8. Prescribe every item (§G, from §H state).
9. Fit duration and compute the underfill notice (§G.5).
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

**UNRESOLVED (B3):** thresholds will be replaced by the user's preferred/minimum/maximum lengths. Sessions are never enlarged above the ≥ 45 tier; the shortfall is disclosed (§G.5). [M-16]

### C.4 Family plan (FIXED)

#### C.4.1 Servability [M-06]

A family f is **servable** today if at least one exercise of f passes the *static* filters for f's role (PRIMARY or SECONDARY for main families, CORE for core families, CARRY for CARRY): HF-01, HF-02, HF-03, HF-04, HF-06 (NOT_AVAILABLE or UNKNOWN only, ignoring today's issues), HF-07, HF-08, HF-09, HF-14. Unservable families are removed from every planning pool below (lower, parent families, core, C, F, replacement, fallbacks) and listed once in the record as UNSERVABLE with their unblocking question. With current data VPULL (UQ-G01) and ANTI_LAT (no library row) are unservable.

#### C.4.2 Ordering keys [M-01]

- Lower families: `(family_last_trained asc, family_last_primary asc, FAMILY_ORDER)`; null first.
- Parents: `(parent_last_trained asc, parent_last_primary asc, PARENT_ORDER)`; null first.
- Family for a **PRIMARY** upper slot, within its parent: `(family_last_primary asc, family_last_trained asc, FAMILY_ORDER)`.
- Family for a **SECONDARY** upper slot, within its parent: `(family_last_trained asc, FAMILY_ORDER)` ("stalest").
- Core and carry families: `(family_last_trained asc, FAMILY_ORDER)`.

The second key decides only exact timestamp ties; staleness always decides first.

#### C.4.3 Plan

```
lower   = order([servable of KD, HD])
uppers  = order([PULL, PUSH])                       # parent keys
A1 = lower[0]                                   role PRIMARY
A2 = primary-key first family of uppers[0]      role PRIMARY
B1 = lower[1]                                   role SECONDARY
B2 = stalest servable family of uppers[1]       role SECONDARY
cores = servable of [ANTI_EXT, ANTI_ROT, ANTI_LAT]
C1 = stalest of cores                                                  role CORE
C2 = stalest of ([CARRY] if servable) + (cores minus C1)               role by family
```

Family reason codes: STALEST_LOWER / STALEST_UPPER_PARENT when timestamps differ; LOWER_ROLE_ALTERNATION / UPPER_ROLE_ALTERNATION when the second key decided (including cold start, where all are null); OTHER_UPPER_PARENT for B2.

**Replacement (FIXED).** Applied after the plan, before selection. Slots are replaced in order A1, B1 (if `lower` in R-05), A2, B2 (if `upper` in R-05), then any PUSH-family slot among A2/B2 not yet replaced (if R-04 = worse and R-04b = swap) [M-09]. Each replaced slot takes the stalest servable core family not already assigned to a replaced slot; if none remains the slot is empty. Then C is re-planned from the servable core families not used by replacements (C1 = stalest remaining; C2 = stalest of CARRY and the other remaining). Replaced slots keep their block's set count and use CORE role ranges. Reason codes SORENESS_REPLACEMENT or R04_SWAP. [M-06, M-07]
- `trunk` in R-05: families are not re-planned; exercise-level HF-05 removes trunk-tagged exercises and §C.7 fallbacks apply.

**Core-starvation swap (FIXED rule, PARAM values).** If the tier includes B but not C, `history_days ≥ CORE_STARVATION_DAYS` (7), and every servable core family has `family_last_trained` older than `CORE_STARVATION_DAYS` (or null), then block B is replaced by block C (C1, C2 as planned). Record reason CORE_STARVATION_SWAP.

### C.5 Finish plan (FIXED)

Only if the tier includes F. Evaluate `FINISH_PRIORITY` (PARAM, default order below); take the first that yields ≥ 1 eligible exercise.

| Priority | Condition | Slots |
|---|---|---|
| GOAL_ACCESSORY | `GOAL_ACCESSORY_ENABLED` and posture NORMAL and (`family_last_trained[GOAL_ACCESSORY]` null or older than `GOAL_ACCESSORY_MIN_HOURS`) | F1 = ELBOW_FLEXION, F2 = SHOULDER_ISOLATION (stated pairing preference). ELBOW_EXTENSION unused (**UNRESOLVED B5**) |
| CORE_OR_CARRY | posture NORMAL | F1 = stalest **servable** family of [CARRY, ANTI_EXT, ANTI_ROT, ANTI_LAT] with no item already in the session and ≥ 1 eligible exercise [M-06, M-07] |
| CONDITIONING | `CONDITIONING_OPT_IN` and posture NORMAL | F1 = CONDITIONING |
| MOBILITY | always | F1, F2 = MOBILITY |

Under LIGHT only MOBILITY is evaluated. If nothing is eligible, F is empty.

### C.6 PREP (FIXED structure)

1. **General warm-up**, `PREP_GENERAL_MINUTES` (3): first available of EQ002 spin bike, EQ015 treadmill (walk), EQ016 elliptical (config order). Not tracked for progression.
2. **Two MOBILITY items**, selected by §E with role MOBILITY (anchors are not used for MOBILITY; ordering keys K5 then K7; E.4 draw permitted).
3. **Ramp sets** for A1 and A2 when `load_mode = EXTERNAL_LOAD` and the prescription carries a load: 2 sets at roughly half and roughly three-quarters of today's load, rounded down to available weights (if no lighter weight is confirmed, one ramp set at the lightest confirmed weight below today's load, else none), at the low end of the rep range. Ramp sets are never logged as working sets. For CALIBRATE items the ramp is the calibration itself (no separate ramp).

All PREP items pass §D.

### C.7 Slot fallback when a family has no eligible exercise (FIXED)

For a main slot (A1, A2, B1, B2), in order, considering only servable families not already planned or selected in this session:
1. the other family of the same parent (e.g., HPUSH → VPUSH);
2. any main family on the same side (LOWER for A1/B1; PUSH/PULL for A2/B2), by stalest;
3. the stalest core family;
4. leave the slot empty.

For C and F slots: the stalest servable core family of [ANTI_EXT, ANTI_ROT, ANTI_LAT, CARRY] not already planned or selected in this session; else empty. [M-07]

Each fallback is recorded (FALLBACK_SIBLING, FALLBACK_SAME_SIDE, FALLBACK_CORE, FALLBACK_NEXT_IN_POOL, SLOT_EMPTY) with the family that failed and its unblocking question if one exists.

A block with one empty slot runs its remaining item as straight sets. A block with both slots empty is dropped.

**Invariant (FIXED):** no session contains two items of the same core or carry family, and no exercise appears twice (V-04). [M-07]

---

## D. Hard filters

Applied to every candidate for every slot (including PREP and F), in order. The first failing filter is the candidate's outcome. **FIXED** unless marked.

| ID | Filter | Outcome | Anchor effect | Static? |
|---|---|---|---|---|
| HF-01 | Matches an ACTIVE hard constraint: HC-01 (tag `dip`); HC-02 (`hand_support = HIGH_PLANK`) [M-08] | EXCLUDED | clear | yes |
| HF-02 | Match to a constraint with scope pending: HC-02 via `hand_support = PLANK_POSITION_UNCONFIRMED` (B4a) [M-08] | HELD_PENDING_SCOPE | clear | yes |
| HF-03 | Matches an adopted candidate constraint set to HARD_EXCLUDE | EXCLUDED | clear | yes |
| HF-04 | On the profile avoidance list | EXCLUDED | clear | yes |
| HF-05 | `sore_regions` intersects today's R-05 selection | EXCLUDED_TODAY | keep (substitute) | no |
| HF-06 | Equipment, evaluated over `equipment_options` (§Q.1): passes if **any** option set is fully AVAILABLE and not in today's issues; the first such set is today's implement. Otherwise the outcome is the least severe of: EXCLUDED_TODAY (blocked only by today's issues) < HELD_EQUIPMENT_UNKNOWN < EXCLUDED (NOT_AVAILABLE) [M-13] | as stated | keep / clear / clear | NA and UNKNOWN only |
| HF-07 | `review_hold[exercise].held` | HELD_PENDING_REVIEW | clear | yes |
| HF-08 | `capability_prereq` not null and not satisfied by a user statement or a logged completion | HELD_CAPABILITY_UNKNOWN | clear | yes |
| HF-09 | Slot role not in `roles_allowed` | not a candidate | n/a | yes |
| HF-10 | Already selected in this session | EXCLUDED_TODAY | keep | no |
| HF-11 | Role ≠ MOBILITY and `exercise_last_used` local date ≥ (today's local date − `REPEAT_EXCLUSION_DAYS`) (default 1: used today or yesterday) [M-02] | EXCLUDED_TODAY | keep | no |
| HF-12 | `heavy_lower = true` and `hours_since_lower < HEAVY_LOWER_RECOVERY_HOURS` (24), where `hours_since_lower` uses `recovery_lower_at` (§B.4) [M-15] | EXCLUDED_TODAY | keep | no |
| HF-13 | posture LIGHT and (tagged `ballistic`, or never used while the same slot has at least one eligible previously used exercise) | EXCLUDED_TODAY | keep | no |
| HF-14 | Tagged `impact` (**UNRESOLVED P-08**) | HELD_PREFERENCE_UNKNOWN | clear | yes |


"Clear" means that if this exercise is the slot's anchor, the anchor is cleared at completion (§K) and a new anchor is chosen by §E.1. "Keep" means today's pick is a SUBSTITUTE and the anchor is unchanged.

**Today-only filters** (used by §E.1 and §C.4.1): HF-05, HF-06 when caused only by today's issues, HF-10, HF-11, HF-12, HF-13. [M-03]

Not filtered (FIXED): candidate constraints SC-02 to SC-05 while pending; any CONTEXT item; any preference other than the avoidance list. The record lists pending candidates as "not applied."

HELD exercises are never auto-selected but are offered in the user's manual swap list with their hold reason. EXCLUDED exercises are never offered.

---

## E. Selection (deterministic)

V0 has no numeric scores (D-030). Selection within a slot is by anchor, then by ordered sort keys.

### E.1 Anchor rule (FIXED) [M-03, M-09]

Anchor key = (family, role, sub_target or null). Roles PRIMARY and SECONDARY have separate anchors for the same family.

```
anchor = anchors[key]
eligible = candidates passing all filters today
if anchor exists and anchor in eligible and not anchor.rotate_due:
    if R-04 == worse and involvement(anchor) > min(involvement(e) for e in eligible):      # [M-09]
        pick first of order(eligible) with K3 moved to the front      reason SUBSTITUTE_FOR_ANCHOR(R-04)
    else:
        pick anchor                                                    reason ANCHOR
elif anchor exists and not anchor.rotate_due:                          # anchor blocked today
    if anchor's outcome is a today-only filter:
        pick first of order(eligible)                                  reason SUBSTITUTE_FOR_ANCHOR(HF-id)
    else:
        (anchor will be cleared)  → proceed as "no anchor" below       reason NEW_ANCHOR_BLOCKED(HF-id)
else:                                                                  # no anchor, or rotate_due
    unfiltered = candidates passing all filters except today-only filters (minus the rotating anchor if any alternative exists)
    candidate  = first of unfiltered by anchor order:
                   PRIMARY/SECONDARY: K0, K1, K2, K3, K6, K7        (history keys K4, K5 not used)
                   CORE/CARRY/ACCESSORY: K0–K7 with E.4 draw
    if candidate in eligible:
        pick candidate                     reason NEW_ANCHOR_NONE_PRIOR | NEW_ANCHOR_ROTATION(cause) | NEW_ANCHOR_BLOCKED(HF-id)
    else:
        pick first of order(eligible)      reason SUBSTITUTE_NO_ANCHOR(outcome of candidate)   # anchor stays unset / rotate_due stays
```

`involvement` maps `right_triceps_involvement` NONE = 0, SECONDARY = 1, PRIMARY = 2. MOBILITY and CONDITIONING do not use anchors.

Consequence (FIXED): only NEW_ANCHOR_* picks and USER_REPLACE events create anchors. Substitute picks (SUBSTITUTE_*, STATION_RESELECT, USER_SWAP) never change an anchor.

### E.2 Sort keys (FIXED order; applied to eligible candidates)

| Key | Sort | Applies to |
|---|---|---|
| K0 | Exercise that is the anchor of the same family in the other main role → last | PRIMARY, SECONDARY |
| K0b | Exercise that is the anchor being rotated away (rotate_due) → excluded if any alternative exists | all anchored roles |
| K1 | `preference = PREFER` first | all |
| K2 | `preference = DISLIKE` last | all |
| K3 | If R-04 = worse: `right_triceps_involvement` NONE, then SECONDARY, then PRIMARY | all |
| K4 | Has any progression line (known load) first | PRIMARY, SECONDARY only |
| K5 | `exercise_last_used` ascending, null first | all |
| K6 | `evidence_basis`: ALLOY_LIBRARY, then ALLOY_LIBRARY_ADAPTED, then SUPPLEMENTAL [M-13] | all |
| K7 | `default_order` ascending within the family (§Q.1) [M-05] | all |

Effect: substitutes prefer familiar exercises (K4) and rotate among them by least recent use; anchors come from preference and `default_order`; core and carry slots introduce never-used exercises at rotation time (K5 null first), one slot at a time.

### E.3 Selection reason codes (FIXED)

ANCHOR · SUBSTITUTE_FOR_ANCHOR(HF-id | R-04) · SUBSTITUTE_NO_ANCHOR(HF-id) · NEW_ANCHOR_NONE_PRIOR · NEW_ANCHOR_ROTATION(LOAD_CAPPED | EXPOSURES | DISLIKE | USER_REPLACE) · NEW_ANCHOR_BLOCKED(HF-id) · STATION_RESELECT · USER_SWAP · USER_REPLACE. Each non-anchor pick also records `decided_by` = the first key (K0–K7, ANCHOR_CANDIDATE, or DRAW) that separated it from the runner-up. [M-03, M-09, M-11, M-12]

### E.4 Limited variety (FIXED rule, PARAM switch) [M-05]

If `ENABLE_NOVEL_DRAW` (default true), the slot role is MOBILITY, CORE, CARRY or ACCESSORY, the top candidates tie on K0–K6, **and** all tied candidates have `exercise_last_used = null`, choose among them with a seeded draw instead of K7. **Never for PRIMARY or SECONDARY.**

`seed = hash(user_id, local_date, apartment_sessions_completed)`. Regenerating on the same day before completing a session returns the same session. Randomness never selects families, blocks, pairs, set counts, reps, rest, loads, or main-role exercises.

### E.5 Anchor rotation triggers (FIXED)

`rotate_due` is set at completion (§K) when:
- PRIMARY/SECONDARY: the anchor's line enters LOAD_CAPPED (§H.5);
- CORE/CARRY/ACCESSORY: `exposures_as_anchor ≥ ACCESSORY_ROTATION_EXPOSURES` (4) and at least one other statically eligible exercise exists in the family;
- any role: the anchor is flagged DISLIKE and at least one other statically eligible exercise exists in the family for that role; otherwise the anchor is kept and `note = NO_ALTERNATIVE_FOR_DISLIKE` is shown with the item [M-11];
- any role: a USER_REPLACE event.

Stalls never set `rotate_due` (D-036).

### E.6 User swap (FIXED)

At generation or mid-session, "swap" returns the next exercise in the same ordered list (skipping the current one, cycling), restricted to exercises whose station is compatible with the block (§F). A "show held" option lists HELD exercises with reasons. The user may mark a swap "replace permanently" → USER_REPLACE event (Q.8). Swaps never change families or blocks.

---

## F. Pairing

### F.1 Composition (FIXED)

Block composition is set by the family plan (§C.4): A and B are one lower + one upper; C is core + carry/core; F is one or two items. There is no pairing search.

### F.2 Station rule (FIXED) [M-12]

Each exercise has `station` = NONE or a station group ID (Q.1, Q.3). A block may contain at most one item with a non-NONE station, unless both items have the identical station group.

Enforcement, applied as soon as both slots of a block are selected:
1. if exactly one item was picked with reason ANCHOR, keep it and re-select the other slot from its ordered list, skipping candidates that violate the rule;
2. if both items are ANCHOR picks, keep both and mark the block STRAIGHT_SETS;
3. if neither is an anchor pick: keep slot 1 and re-select slot 2; if none qualifies, keep slot 2 and re-select slot 1;
4. if no re-selection works, keep the original picks and mark the block STRAIGHT_SETS (all sets of item 1, then all sets of item 2). Duration is recomputed (§G.5).

A re-selected item records reason STATION_RESELECT with the conflicting exercise and stations. It is a substitute: it never creates or changes an anchor (§E.1).

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
| none, and no line in the other main role | CALIBRATE: target = range min; load guidance "choose a weight where the target reps feel GOOD; you may change weight between sets" |
| none, but the same exercise and side has a line with a load in the other main role | SEEDED: target = this role's range_min at that line's `next_load` (§H.7) [M-04] |
| BUILDING | `next_load` × `next_target` |
| LOAD_CAPPED | `next_load` × `next_target` (extended target) |
| RETURN (gap, §H.7) | last load × last target |
| any state, but today's implement differs from the line's `implement` | IMPLEMENT_CHANGED: last load × last target as guidance ("same weight if the implement allows; log what you use") [M-13] |

Bodyweight exercises show target only. If the equipment's increment list is unknown, the engine shows "next heavier available weight" on a load increase (subject to `max_confirmed_load`, §H.5) and records the load actually used.

Tempo is always "controlled." Explicit tempo is **FUTURE** unless entered by the user or trainer as an exercise note.

Effort instruction (FIXED): "Aim for HARD on the last set, with every rep in good form. Stop the set if form breaks." HARD with every rep completed counts as success (§H.3) [M-18]. Whether sets must always stop short of failure is candidate SC-05 (**UNRESOLVED B5**); the engine does not add a failure rule.

### G.4 Right-arm items (FIXED)

Items with `per_side_logging = true` show left and right fields and the fade-rep field. Prescription is identical for both sides unless `ALLOW_UNEVEN_SIDE_DOSING = true` (**UNRESOLVED B5**, default false).

### G.5 Duration estimate, fitting, underfill notice (FIXED formula, PARAM constants)

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

**Underfill notice [M-16].** If `R-01 − session_min > UNDERFILL_NOTICE_MINUTES` (10), the record carries `underfill = {planned_min, available_min, cause}` and the session screen shows one sentence (§J.3). `cause` is the first that applies:

| cause | condition |
|---|---|
| FIRST_SESSIONS | `apartment_sessions_completed < FIRST_SESSIONS_NO_FINISH` and R-01 ≥ `TIER_ABCF_MINUTES` |
| LIGHT_POSTURE | posture LIGHT |
| SLOTS_EMPTY | at least one planned A–C slot is empty after fallback |
| TIER_MAXIMUM | R-01 ≥ `TIER_ABCF_MINUTES` (session size does not grow above this tier, B1/B3) |
| TIER_BOUNDARY | otherwise |

No volume is added to close the gap (FIXED until B1 and B3 are answered).

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
  implement: equipment option set used when the line was created   [M-13]
  top_confirmations: int                    # consecutive qualifying exposures at range_max with GOOD or HARD
  extended: bool                            # rep ceiling extended once (H.5)
  consecutive_holds: int                    # for stall flag only
  reduce_locked: bool                       # set by REDUCE (H.3)  [M-10]
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
- not an IMPLEMENT_CHANGED exposure (§G.3) [M-13];
- for a RIGHT side under R-04 = worse that day, **only if the exercise's `right_triceps_involvement` ≠ NONE**: not qualifying (hold) [M-09];
- for per-side items: the side's data is present.

A SEEDED first exposure is qualifying (its load is known). [M-04]

Non-qualifying exposures produce decision NOT_EVIDENCE (with reasons) and change nothing, except the flag actions in §H.4.

### H.3 Decision table (FIXED; evaluated top to bottom on qualifying exposures)

Let `met` = every set reached `next_target`; `short2` = at least two sets fell short of target by ≥ 2 reps (or ≥ 2 steps for time).

| # | Condition | Decision | Effect on next exposure |
|---|---|---|---|
| 1 | (effort TOO_HARD, or short2) and not `reduce_locked` | REDUCE | `next_load` = next lower available load (bodyweight/time: `next_target` = max(range_min, target − 2 steps)); `top_confirmations` = 0; `reduce_locked` = true |
| 1b | (effort TOO_HARD, or short2) and `reduce_locked` | HOLD(REDUCE_LIMIT) | no change; `consecutive_holds` += 1; record flags "reduced once already; please review" [M-10] |
| 2 | effort TOO_EASY and met | LOAD_UP | §H.5 increase |
| 3 | effort GOOD or HARD, met, `next_target < range_max` | REPS_UP | `next_target` += step [M-18] |
| 4 | effort GOOD or HARD, met, `next_target ≥ range_max` | CONFIRM_TOP | `top_confirmations` += 1; if ≥ `LOAD_UP_CONFIRMATIONS` (1) → §H.5 increase [M-18, M-19] |
| 5 | otherwise (short by less than short2) | HOLD | no change; `consecutive_holds` += 1 |

Any decision other than HOLD and HOLD(REDUCE_LIMIT) resets `consecutive_holds` to 0. REPS_UP, CONFIRM_TOP, LOAD_UP, EXTEND_RANGE, and a user CLEAR_REVIEW event (Q.8) set `reduce_locked` = false. REDUCE never goes below the lightest available load; at the lightest load, REDUCE becomes HOLD with reason AT_MINIMUM. The TECHNIQUE_DIFFICULTY step-down (§H.4) is not limited by `reduce_locked`.

### H.4 Flag actions (FIXED; apply on any exposure)

| Flag | Action |
|---|---|
| TECHNIQUE_DIFFICULTY | next exposure: REDUCE one load step (AF-09); exposure not evidence |
| UNCOMFORTABLE | HOLD; `uncomfortable_streak` += 1; at 2 consecutive → `review_hold` (HF-07) |
| STOPPED_SYMPTOM | `review_hold` immediately; recorded, never interpreted |
| TOO_HARD with UNCOMFORTABLE | treated as UNCOMFORTABLE only (tolerance, not load) |
| RIGHT_ARM_FADE (rep n) | recorded for monitoring only; counted reps are the reps logged [M-10] |
| DISLIKE / PREFER | preference update; DISLIKE may set `rotate_due` (§E.5) [M-11]; no load effect |
| EQUIPMENT_ISSUE | no exercise effect; exposure not evidence if load was changed because of it |

### H.5 Load increase (FIXED) [M-14]

```
if the equipment has a confirmed load list:
    heavier = next listed load above next_load
elif max_confirmed_load is known:
    heavier = next_load + nominal step, only if ≤ max_confirmed_load
else:
    heavier = "next heavier available" (exists)
if heavier exists:
    next_load = heavier; next_target = range_min; top_confirmations = 0
elif not extended:
    range_max += LOAD_CAP_EXTRA (3 reps or 3 steps); extended = true;
    next_target += step                              decision EXTEND_RANGE
else:
    state = LOAD_CAPPED                              decision LOAD_CAPPED
```

The load source is today's implement (§D HF-06). Nominal step (PARAM): 5 lb. A CONFIRM_EQUIPMENT event (Q.8) may raise `max_confirmed_load` or supply a load list. Bodyweight lines have no heavier load: they go straight to the `extended` branch. LOAD_CAPPED sets the anchor's `rotate_due` for PRIMARY/SECONDARY (§E.5). For bodyweight lines, LOAD_CAPPED is also flagged in the record as "ready for a harder variant: your choice" (complexity progression is **FUTURE**).

### H.6 Right side (FIXED)

- Per-side items are evaluated per side with that side's data only. Left-side evidence never changes the right side (D-018).
- If `ALLOW_UNEVEN_SIDE_DOSING = false` (default, **UNRESOLVED B5**), the decision applied to both sides is the more conservative of the two, in the order REDUCE < HOLD(REDUCE_LIMIT) < HOLD / NOT_EVIDENCE < REPS_UP < CONFIRM_TOP < LOAD_UP.
- Bilateral implements (both hands at once, e.g., two dumbbells): load increases only when both sides qualify for it.

### H.7 Calibration, seeding, gaps, stalls (FIXED)

- **CALIBRATE** (first exposure in a role, no line in the other main role): create the line with `next_load` = load of the last completed working set, `next_target` = clamp(minimum reps achieved across sets, range_min, range_max), `implement` = today's implement. Within-session load changes are allowed and do not violate §I. Not evidence.
- **SEEDED** [M-04]: if the same exercise and side has a line with a load in the other main role, the new line is created before evaluation with `next_load` = that line's `next_load`, `next_target` = this role's range_min, state BUILDING; the exposure is then evaluated by §H.2–§H.3 like any other.
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
| V-02 | Equipment: every item has an available option set today; station rule (§F.2) holds or block is STRAIGHT_SETS | replace per §F.2 |
| V-03 | `session_min ≤ R-01` (after §G.5) | §G.5 fitting |
| V-04 | No exercise appears twice; no core or carry family appears twice [M-07] | replace later occurrence |
| V-05 | Every load prescription follows §G.3/§H (≤ one load step from last exposure, except CALIBRATE; IMPLEMENT_CHANGED shows last load) | recompute from line; if still invalid, prescribe last load (HOLD) |
| V-06 | Block A has ≥ 1 item | NO_SESSION(NO_BLOCK_A) |
| V-07 | Record complete (§J.1 fields present for every item) | fill from pipeline data; engine error if impossible |

Metadata validators V-00a to V-00g run at load, not per session (§Q.1.2). [M-17]

Repairs are applied in validator order, then validators V-01 to V-06 run once more. If any still fails, return NO_SESSION with the failing validator IDs. **FIXED**: the engine never returns a session that fails V-01, V-02, or V-04.

### I.2 NO_SESSION reasons (FIXED)

USER_SKIP · TOO_SHORT · NO_BLOCK_A (with UNFILLABLE and UNSERVABLE families and unblocking questions) · VALIDATION_FAILED(ids). Each carries a user-facing sentence (§J.3).

---

## J. Explainability

### J.1 Generation record (FIXED fields)

Session level:
```
generation_id, engine_version, config_version, generated_at (= now), seed
input_versions: {profile, constraints, equipment, metadata, supplemental}
metadata_rejected: [{exercise_id, validator}]                       # V-00  [M-17]
check_in: all answers, including recorded-only R-03, R-07, and R-04b with defaulted flag
posture, posture_reason
tier, blocks_included, finish_choice + reason
unservable: [{family, unblocking_question}]                         # C.4.1  [M-06]
family_plan: [{slot, family, role, reason_code, family_last_trained, family_last_primary,
               parent_last_trained, parent_last_primary, source_of_timestamp}]
alloy: {prompts_asked[], answers[], credits_applied[], recovery_credits_applied[]}
unfillable: [{family, reason, unblocking_question}]
constraints_applied: [{id, filter, items_affected[]}]
constraints_not_applied: [{id, status}]            # pending candidates
context_items_shown: [ids]                          # display only
validators: [{id, result, repairs[]}]
duration_estimate, trims_applied[]
underfill: {planned_min, available_min, cause} | null               # G.5  [M-16]
```

Per item:
```
slot, exercise_id, evidence_basis, role
family_reason_code
implement: [equipment_ids]                                          # [M-13]
selection: {reason_code, decided_by, anchor_before, anchor_candidate_if_substitute, anchor_after_if_performed, note}
alternatives: [{exercise_id, outcome: LOST(key) | HF-id}]   # the next 3 in order + every HELD/EXCLUDED in the family
recent_training: [{what, when, source}]                     # family timestamp, last use, consecutive-day / 24 h rules hit
prescription: {sets, target, unit, load, rest, per_side, line_state}
progression: {line_state, last_decision, why_this_load, reduce_locked}
constraint_effects: [{id, effect}]
station: {group, block_mode: PAIRED | STRAIGHT_SETS, reselect_detail}
```

### J.2 Reason codes (FIXED enumerations)

Family: STALEST_LOWER · STALEST_UPPER_PARENT · LOWER_ROLE_ALTERNATION · UPPER_ROLE_ALTERNATION · OTHER_UPPER_PARENT · STALEST_CORE · STALEST_C2 · SORENESS_REPLACEMENT · R04_SWAP · CORE_STARVATION_SWAP · FALLBACK_SIBLING · FALLBACK_SAME_SIDE · FALLBACK_CORE · FALLBACK_NEXT_IN_POOL · SLOT_EMPTY · FINISH_GOAL_ACCESSORY · FINISH_CORE_OR_CARRY · FINISH_CONDITIONING · FINISH_MOBILITY.
Selection: §E.3. Progression: CALIBRATE · SEEDED · RETURN · IMPLEMENT_CHANGED · NOT_EVIDENCE · REDUCE · HOLD · HOLD(REDUCE_LIMIT) · REPS_UP · CONFIRM_TOP · LOAD_UP · EXTEND_RANGE · LOAD_CAPPED · AT_MINIMUM.
Underfill: FIRST_SESSIONS · LIGHT_POSTURE · SLOTS_EMPTY · TIER_MAXIMUM · TIER_BOUNDARY.

### J.3 "WHY THIS EXERCISE?" (FIXED templates; plain language, no codes)

Line 1 (movement), from family reason, e.g.:
- STALEST_LOWER: "Hinging is your least recently trained lower-body pattern (last: {when}, {source})."
- LOWER_ROLE_ALTERNATION: "Squat and hinge were last trained together ({when}); hinging led less recently, so it leads today." Cold start: "First session: squatting leads by default." [M-01]
- UPPER_ROLE_ALTERNATION: "Pushing and pulling were last trained together ({when}); pushing led less recently, so it leads today." [M-01]
- SORENESS_REPLACEMENT: "You said your lower body is too sore to load today, so this slot is core work."
- R04_SWAP: "You chose to swap pressing for core today because your right arm feels worse." [M-09]
- CORE_STARVATION_SWAP: "Short session, and no core work for {n} days, so core replaced the second strength pair."

Line 2 (exercise), from selection reason, e.g.:
- ANCHOR: "This is your current {family} exercise; keeping it lets us track progress."
- SUBSTITUTE_FOR_ANCHOR(HF-11): "You did {anchor} yesterday, so this stands in today." [M-02]
- SUBSTITUTE_FOR_ANCHOR(HF-12): "Your legs were trained {n} hours ago, so we're skipping heavier options like {anchor}."
- SUBSTITUTE_FOR_ANCHOR(R-04): "Your right arm feels worse, so today uses an option that loads it less than {anchor}."
- SUBSTITUTE_NO_ANCHOR(HF-id): "{candidate} will become your regular {family} exercise, but it's not a good fit today ({reason}), so this stands in." [M-03]
- STATION_RESELECT: "{other} and {first choice} use different stations, so this keeps the pair together." [M-12]
- NEW_ANCHOR_ROTATION(LOAD_CAPPED): "You've outgrown the heaviest weight available for {old}, so we're moving on."
- NEW_ANCHOR_ROTATION(DISLIKE): "You marked {old} as disliked, so we've switched." [M-11]
- note NO_ALTERNATIVE_FOR_DISLIKE: "You marked this as disliked, but it's the only {family} option available here right now."

Line 3 (today's dose), from progression code, e.g.:
- REPS_UP: "Same weight, one more rep: you hit every rep last time."
- HOLD: "Same as last time: you were a rep short."
- HOLD(REDUCE_LIMIT): "Same as last time. We already lowered this once; tell us if it needs a review."
- CALIBRATE: "First time: pick a weight where {target} reps feel GOOD."
- SEEDED: "Starting from your {load} from the {other role} version, at {target} reps."
- IMPLEMENT_CHANGED: "Different equipment today, so use a similar weight; this won't count toward progression."

Underfill sentence (§G.5), e.g. TIER_MAXIMUM: "This session is planned for about {planned} of your {available} minutes. Longer sessions aren't set up yet." FIRST_SESSIONS: "Early sessions are kept short while we learn your weights."

---

## K. State updates after workout completion

Triggered when the user finishes or ends a session. **FIXED**, in this order:

1. Persist the session log (Q.5) with `performed_at` = started_at and `ended_at`. Items with zero completed working sets are "skipped" and have no effect beyond being recorded.
2. `apartment_sessions_completed` += 1 (only if ≥ 1 working set was completed). Set `history_start` if null.
3. For each performed item: `exercise_last_used[exercise] = ended_at`.
4. Family credit (§B.3) → update `family_last_trained`, then recompute parents; for items placed in role PRIMARY with ≥ `MIN_SETS_FOR_CREDIT` working sets, set `family_last_primary` and `parent_last_primary` (PUSH/PULL) = `ended_at`. [M-01]
5. For each performed item with a line role: apply §H.7 (CALIBRATE / SEEDED / RETURN) or §H.2–H.6; write `last_decision`.
6. Flags (§H.4): review holds, uncomfortable streaks, preferences.
7. Anchors: for each performed item in an anchored role:
   - if the pick was ANCHOR: `exposures_as_anchor` += 1;
   - if NEW_ANCHOR_*: set anchor = this exercise, `exposures_as_anchor` = 1, `rotate_due` = false;
   - if SUBSTITUTE_* or STATION_RESELECT: no anchor change [M-03, M-12];
   - if USER_SWAP: no anchor change; if USER_REPLACE: anchor = this exercise.
   Then evaluate rotation triggers (§E.5), including DISLIKE [M-11].
8. Record SESSION_CAPACITY (monitoring; makes the session's exposures non-evidence if below_usual, already applied in step 5).

Generated sessions that are never started change nothing. A session regenerated after partial completion is not supported in V0 (**FUTURE**); the user ends the session and generates a new one, which sees the logged items.

User action events (Q.8) apply at their `event_at`: CLEAR_HOLD, CLEAR_REVIEW (clears `reduce_locked` on a line) [M-10], SET_PREFERENCE (DISLIKE may set `rotate_due`, §E.5), USER_REPLACE, CONFIRM_CAPABILITY (satisfies HF-08), CONFIRM_EQUIPMENT (updates availability, load list, `max_confirmed_load`).

---

## L. Externally logged Alloy sessions

### L.1 Principle (FIXED)

Alloy sessions count toward family timestamps and the repeat rule (D-016). They never create or change progression lines, anchors, preferences, or holds (D-025). What Nelson's coach modifies for him is TRAINER-sourced personal input (D-015), recorded in PERSONAL files, never used as Alloy research evidence.

### L.2 Missing-session prompt (FIXED) [M-15]

`ALLOY_SCHEDULE` (PARAM; default Mon, Wed, Fri at 16:00 local, from profile). At check-in, for each scheduled slot in the last `ALLOY_PROMPT_LOOKBACK_HOURS` (72) whose `alloy_resolved` is not LOGGED or SKIPPED and which has no Alloy log on that local date, ask AL-?: "Did you train at Alloy on {day}?"

Let `recovery_end = scheduled start + ALLOY_DEFAULT_DURATION_MINUTES (55) + ALLOY_TIME_UNCERTAINTY_HOURS (2)`.

- yes → create an Alloy SUMMARY log: focus = full, `performed_at` = scheduled time, `ended_at` = + `ALLOY_DEFAULT_DURATION_MINUTES`, `source = CHECKIN_PROMPT` (staleness credit at `ended_at`, §L.3); **and** add `recovery_end` to `recovery_credits`.
- no → `alloy_resolved = SKIPPED`.
- not sure, or the prompt is dismissed without an answer → `alloy_resolved = UNKNOWN`; no staleness credit; add `recovery_end` to `recovery_credits` (once per slot). UNKNOWN slots are asked again at later check-ins within the lookback.

`recovery_credits` are used only by HF-12 (through `recovery_lower_at`, §B.4). They never change family or parent timestamps, the repeat rule, or `apartment_sessions_completed`. A later user-entered log for that date (with its real times) replaces the prompt log and its recovery credit.

At most `ALLOY_MAX_PROMPTS` (3) prompts per check-in, newest first.

### L.3 Crediting (FIXED)

| Log mode | Credit |
|---|---|
| SUMMARY focus = full | `parent_last_trained` for LOWER, PUSH, PULL = `ended_at` |
| SUMMARY focus = upper | PUSH, PULL |
| SUMMARY focus = lower | LOWER |
| FULL | summary credit per its focus field, **plus** `family_last_trained[f]` for each family f tagged on ≥ 1 item (sets unknown counts as credited); `exercise_last_used` for items carrying a library `exercise_id` |

CORE, CARRY, GOAL_ACCESSORY, MOBILITY, and CONDITIONING are never credited from summaries. FULL items without a family tag credit nothing beyond the summary. Alloy logs never set `family_last_primary` (§B.3).

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
| No history at all | all timestamps null → FAMILY_ORDER / PARENT_ORDER decide; anchors come from `default_order`; all exercises CALIBRATE; no finish for the first 2 sessions (underfill notice FIRST_SESSIONS) |
| Sparse history (< 7 days) | normal logic; core-starvation swap disabled (needs `history_days ≥ 7`) |
| Long gap (> GAP_DAYS since an exercise) | RETURN exposure (§H.7); anchors and lines persist |
| Effort rating missing | exposure NOT_EVIDENCE |
| Reps/seconds missing on any working set | NOT_EVIDENCE |
| Load missing (external load) | line not updated; record notes it |
| One side missing on a per-side item | NOT_EVIDENCE for both sides |
| R-02, R-04, R-04b, R-05 unanswered | defaults: normal, same, as_usual, none (recorded as defaulted) |
| R-01 or R-06 unanswered | cannot generate; ask |
| Equipment availability UNKNOWN | HF-06 HELD |
| Equipment increments unknown | "next heavier available weight" guidance, capped by `max_confirmed_load` when known; actual load recorded |
| Exercise metadata incomplete or failing V-00 | exercise removed from pool; listed in record |
| Alloy class not logged | §L.2 prompt; "not sure" or no answer → recovery credit only |
| OTHER training (DailyArms etc.) | not read (**UNRESOLVED B2**) |
| Profile PENDING values | §A.4 defaults |

Missing data never counts as evidence and never produces progression.

---

## N. Fallback behavior (FIXED)

| Situation | Behavior |
|---|---|
| Minutes below minimum | NO_SESSION(TOO_SHORT). **FUTURE:** mobility-only session offer. |
| User chose skip at R-06 | NO_SESSION(USER_SKIP) |
| A family has no eligible exercise today | §C.7 fallback chain; UNFILLABLE recorded with its unblocking question |
| A family has no servable exercise at all | removed from planning (§C.4.1); UNSERVABLE recorded once |
| Block A cannot be formed | NO_SESSION(NO_BLOCK_A) listing held/excluded reasons and questions |
| Two stations in one block | §F.2 (anchor kept, other re-selected; two anchors → STRAIGHT_SETS) |
| Station busy mid-session | swap (§E.6) restricted to exercises whose station is free or NONE; else skip the item |
| Preferred implement missing | next option set in `equipment_options`; IMPLEMENT_CHANGED (§G.3) |
| User rejects an exercise | swap (§E.6); no randomness |
| Session runs long in practice | user ends session; only performed items count (§K) |
| All accessory candidates for GOAL_ACCESSORY missing | finish falls to the next priority (§C.5) |
| Regenerate the same day | identical session (same seed and inputs) unless inputs changed |

---

## O. Evidence classification

All rules: `class: SYSTEM_DESIGN`. Verification reflects the Phase 0 findings register (no finding source_verified yet; RB-01 pending). `raw_only` findings cannot support a rule; such rules stand on design merit. None of the v0.2 modifications is derived from Alloy evidence; each was introduced because simulation testing of this engine showed a defect.

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
| Staleness family ordering; role alternation tie-break [M-01] | FIXED | NONE | — | n/a |
| Servability; no repeated core/carry family [M-06, M-07] | FIXED | NONE | — | n/a |
| Anchors / continuity; anchor candidate rule [M-03] | FIXED | NONE | AF-07 (objective kept, tool changes) informs; not claimed | citation_resolved |
| `default_order` [M-05] | FIXED (content PARAM) | NONE | — | n/a |
| Consecutive-day repeat rule [M-02]; 24 h heavy-lower rule | FIXED / PARAM | NONE | Q-07 (no Alloy evidence exists) | n/a |
| Posture (energy, unwell gate) | FIXED | PERSONAL | profile R-02, R-06; D-017 | n/a |
| R-04b same-day choice [M-09] | FIXED | PERSONAL | profile R-04, SC-01 | n/a |
| Sleep, fueling recorded only | FIXED | PERSONAL | D-014, D-034 | n/a |
| Hard filters HF-01 to HF-05, HF-07; `hand_support` [M-08] | FIXED | PERSONAL | PERSONAL_constraints, D-006, D-013 | n/a |
| HELD vs EXCLUDED | FIXED | NONE | D-024 | n/a |
| Equipment options, implement change, substitution availability [M-13] | FIXED | NONE | — | n/a |
| Role table ranges, rest, sets | PARAM | NONE (conventional) | — | n/a |
| Load up when easy; down when technique degrades | FIXED | ALLOY_DOCUMENTED | AF-09 | citation_resolved |
| Double progression thresholds, confirmations, caps; HARD counts as success; REDUCE lock [M-10, M-18, M-19] | PARAM / FIXED | NONE | — | n/a |
| Per-side right-arm logging and progression; fade as monitoring [M-10] | FIXED | PERSONAL | SC-01, D-018 | n/a |
| Alloy crediting method; recovery credits [M-15] | FIXED | PERSONAL (D-016) + NONE (method) | — | n/a |
| Station rule (anchor-protecting) [M-12] | FIXED | NONE | — | n/a |
| Underfill notice [M-16] | FIXED | NONE | — | n/a |
| Metadata authoring criteria and validators [M-17] | FIXED | NONE | — | n/a |
| Supplemental layer | FIXED | NONE | AF-10 (Alloy not machine-centric; supplemental ranks after library, K6) | citation_resolved |
| Seeded tie-break (MOBILITY/CORE/CARRY only) | FIXED | NONE | D-007 | n/a |

**Not used anywhere:** Q-01 to Q-04, Q-06, Q-08 (as a rule), Q-10, Q-13; AF-17 (FUTURE: weekly heavy/medium/light variation); AF-18 (statistic; our 4 main + 2 core/carry slots are a design choice, not derived from it); AF-12 (unilateral emphasis; no unilateral rule in V0), AF-15 (power/compound sets: FUTURE), AF-19 (posterior-chain chain: FUTURE progression links).

---

## P. Pseudocode (language-neutral)

```
function GENERATE(inputs, state, config, now):
    pool = LOAD_AND_VALIDATE(inputs)                     # C.1 step 1, V-00a..g
    APPLY_ALLOY_PROMPTS(inputs.check_in, state, now)     # L.2 (logs + recovery credits)
    if check_in.R06 == yes and check_in.R06_choice == skip: return NO_SESSION(USER_SKIP)
    posture = POSTURE(check_in)                          # C.2
    tier = TIER(check_in.R01, state)                     # C.3
    if tier == NONE: return NO_SESSION(TOO_SHORT)
    servable = SERVABILITY(pool, state)                  # C.4.1
    plan = FAMILY_PLAN(state, tier, servable, check_in)  # C.4: keys, replacement, R-04b swap, starvation
    if tier.includes_F: plan.F = FINISH_PLAN(state, posture, plan, servable)   # C.5
    seed = HASH(user_id, LOCAL_DATE(now), state.apartment_sessions_completed)

    session = empty
    for block in [A, B, C, F] if block in plan:
        for slot in block.slots:
            item = SELECT(slot, pool, state, check_in, posture, session, seed, now)
            if item == none: item = FALLBACK(slot, plan, servable, ...)   # C.7
            session.add(slot, item)
        ENFORCE_STATION_RULE(block, session, ...)                      # F.2 (anchor-protecting)
    session.prep = BUILD_PREP(session, pool, state, ...)               # C.6
    for item in session: item.rx = PRESCRIBE(item, state.lines, posture, item.implement)   # G
    FIT_DURATION(session, check_in.R01); UNDERFILL_NOTICE(session)     # G.5
    result = VALIDATE_AND_REPAIR(session)                              # I
    if result.failed: return NO_SESSION(result.reason)
    record = BUILD_RECORD(session, plan, ...)                          # J
    return session, record

function SELECT(slot, pool, state, check_in, posture, session, seed, now):
    candidates = [e in pool where e.family == slot.family
                  and e.sub_target == slot.sub_target and slot.role in e.roles_allowed]
    for e in candidates: outcome[e] = FIRST_FAILING_FILTER(e, ...)     # HF-01..HF-14 in order
    eligible = [e where outcome[e] == PASS]
    if eligible empty: return none
    anchor = state.anchors.get((slot.family, slot.role, slot.sub_target))   # not for MOBILITY/CONDITIONING
    if anchor and anchor.exercise in eligible and not anchor.rotate_due:
        if check_in.R04 == worse and INVOLVEMENT(anchor) > MIN_INVOLVEMENT(eligible):
            return (first of SORT(eligible, K3 first, then K0..K7), SUBSTITUTE_FOR_ANCHOR(R-04))
        return (anchor.exercise, ANCHOR)
    ordered = SORT(eligible, keys K0..K7)                # E.2; E.4 draw only outside PRIMARY/SECONDARY
    if anchor and not anchor.rotate_due and outcome[anchor] in TODAY_ONLY:
        return (ordered[0], SUBSTITUTE_FOR_ANCHOR(outcome[anchor]))
    unfiltered = [e in candidates passing all filters except TODAY_ONLY], minus rotating anchor if alternatives
    candidate = first of SORT(unfiltered, ANCHOR_ORDER(slot.role))     # E.1: no K4/K5 for main roles
    if candidate in eligible: return (candidate, NEW_ANCHOR_*(cause))
    return (ordered[0], SUBSTITUTE_NO_ANCHOR(outcome[candidate]))

function COMPLETE(session_log, state, config):            # K
    persist(session_log)
    if session_log.working_sets_completed >= 1: state.apartment_sessions_completed += 1
    for item in session_log.performed_items:
        state.exercise_last_used[item.exercise] = session_log.ended_at
    CREDIT_FAMILIES(session_log, state)                  # B.3, incl. family_last_primary
    for item in performed items with a role line:
        for side in item.sides:
            decision = PROGRESS(item, side, state.lines, session_log)   # H.2–H.7
        APPLY_SIDE_POLICY(item, decisions, config)       # H.6
        APPLY_FLAGS(item, state)                         # H.4
        UPDATE_ANCHOR(item, state)                       # K step 7, E.5 (incl. DISLIKE)

function PROGRESS(item, side, lines, log):
    line = lines.get((item.exercise, item.role, side))
    if line is none:
        other = lines.get((item.exercise, OTHER_MAIN_ROLE(item.role), side))
        if other and other.next_load: line = SEED(other, item.role)     # H.7 SEEDED, then evaluate
        else: return CALIBRATE(...)
    if line.last_exposure_at older than GAP_DAYS: return RETURN(...)
    if not QUALIFYING(item, side, log): return NOT_EVIDENCE(reasons)   # incl. implement changed
    evaluate H.3 rows 1, 1b, 2..5 in order; apply H.5 when increasing
```

---

## Q. Data contracts (minimum fields; types indicative)

### Q.1 EXERCISE_METADATA (SYSTEM_METADATA layer; one row per usable exercise)

| Field | Type / values | Required |
|---|---|---|
| exercise_id | EX### or SX### | yes |
| display_name | string | yes |
| family | §B.2 family (null not allowed; see Q.1.1) | yes |
| sub_target | ELBOW_FLEXION / SHOULDER_ISOLATION / ELBOW_EXTENSION / null | GOAL_ACCESSORY only |
| roles_allowed | subset of PRIMARY, SECONDARY, CORE, CARRY, ACCESSORY, MOBILITY, CONDITIONING | yes |
| laterality | BILATERAL / UNILATERAL / ALTERNATING | yes |
| per_side_logging | bool (true if unilateral upper or right triceps involved) | yes |
| load_mode | EXTERNAL_LOAD / BODYWEIGHT / TIME / TIME_WITH_LOAD | yes |
| equipment_options | ordered list of option sets; each set is a list of EQ### that must all be available; first = preferred; `[[]]` = bodyweight [M-13] | yes |
| station | NONE or station group ID (§F.2) | yes |
| heavy_lower | bool (derived rule, Q.1.1) | yes |
| right_triceps_involvement | NONE / SECONDARY / PRIMARY | yes |
| hand_support | NONE / FOREARM / QUADRUPED / HIGH_PLANK / PLANK_POSITION_UNCONFIRMED [M-08] | yes |
| position_tags | list: straight_arm_weight_bearing, supine_press, overhead_press, dip, impact, ballistic, floor | yes (may be empty) |
| sore_regions | subset of UPPER, LOWER, TRUNK | yes |
| capability_prereq | text or null | yes |
| evidence_basis | ALLOY_LIBRARY / ALLOY_LIBRARY_ADAPTED / SUPPLEMENTAL [M-13] | yes |
| default_order | integer, unique within family; 1 = first choice (Q.1.1) [M-05] | yes |
| library_order | integer (harvest order; display only) | no |
| executed_as | text (for ALLOY_LIBRARY_ADAPTED: how the substitute equipment is used) | if ADAPTED |
| demo_ref | link or illustration ID (UX; profile presentation preference) | no |

The engine never reads subjective ratings (difficulty, fatigue tier, grip demand). **FIXED** (D-033)

#### Q.1.1 Authoring criteria (FIXED) [M-17]

These criteria are SYSTEM_DESIGN. They make metadata decisions explicit and reviewable; they are not claims about how Alloy classifies exercises.

- **family.** One family per row. A library item that combines patterns (a complex, e.g., squat-to-press) gets no family and is not in the pool; it is listed in `metadata_rejected` as NO_FAMILY. It can return later as SUPPLEMENTAL rows, one per pattern.
- **roles_allowed.** PRIMARY only when `load_mode = EXTERNAL_LOAD` (exception: bodyweight vertical pulls, family VPULL, where body weight is the load) and the row has neither `ballistic` nor `impact`. Bodyweight lower-body rows are SECONDARY at most. Ballistic rows may be SECONDARY. MOBILITY rows are MOBILITY only.
- **heavy_lower** = (family ∈ {KD, HD}) and `laterality = BILATERAL` and `load_mode = EXTERNAL_LOAD` and not `ballistic`. "BILATERAL" here means both feet working together with the load held by both hands, on the back, or in a front rack; a load held in one hand makes the row UNILATERAL for this purpose.
- **hand_support.** NONE when the hands do not bear body weight. FOREARM, QUADRUPED, or HIGH_PLANK only when the exercise's documented demonstration shows that position. Any row where the hands bear weight and the demonstration does not settle the position is PLANK_POSITION_UNCONFIRMED (held under HC-02 scope B4a). Knee-supported planks count as plank positions.
- **sore_regions.** MOBILITY rows whose hands bear body weight include UPPER.
- **right_triceps_involvement.** PRIMARY for elbow-extension-dominant rows (dips, triceps extensions); SECONDARY for any press or push-up; NONE otherwise. K3 can differentiate only what this field differentiates.
- **equipment_options.** List every implement set the exercise can honestly be performed with as the same exercise (e.g., goblet squat: [[EQ009], [EQ010]]). Do not list a substitute that turns it into a different library row (Q.3).
- **default_order** (per family, applied in order): (1) external load held by both hands or racked, before single-hand load; (2) station NONE before station-bound; (3) loaded before bodyweight; (4) non-ballistic before ballistic; (5) ALLOY_LIBRARY before ALLOY_LIBRARY_ADAPTED; (6) the user's review. The first row of each family becomes that family's starting anchor in one role and the second in the other role (K0). The ordering must be shown to the user for approval before first use.

#### Q.1.2 Load-time validators (FIXED) [M-17]

| ID | Check | On failure |
|---|---|---|
| V-00a | Every required field present with a value from its vocabulary (incl. `hand_support`) | row rejected |
| V-00b | `family` not null | row rejected (NO_FAMILY) |
| V-00c | PRIMARY in `roles_allowed` ⇒ (EXTERNAL_LOAD, or family VPULL) and no `ballistic`/`impact` | PRIMARY removed from the row's roles; recorded |
| V-00d | `heavy_lower` equals the Q.1.1 formula | row rejected |
| V-00e | Within each family, `default_order` values are unique | engine refuses to load (configuration error) |
| V-00f | `equipment_options` non-empty; every EQ ID exists in Q.3 | row rejected |
| V-00g | role MOBILITY and `hand_support` ≠ NONE ⇒ UPPER ∈ `sore_regions` | row rejected |

Rejected rows are listed in every generation record (`metadata_rejected`) until fixed.

### Q.2 SUPPLEMENTAL_EXERCISE

Q.1 fields plus `source: SYSTEM_DESIGN`, `added_because`, `approved_by_user_on` (required before the exercise enters the pool). Never carries an Alloy evidence class.

### Q.3 EQUIPMENT_STATE

`equipment_id`, `availability` (AVAILABLE / NOT_AVAILABLE / UNKNOWN), `loads` (confirmed list, e.g., KB [25, 30, 35, 40, 45]; or null = unknown), `max_confirmed_load` (number or null; e.g., dumbbells 50 per the equipment record) [M-14], `station_group`, `confirmed_on`.

**Substitution availability rule (FIXED) [M-13].** Where the availability source says an exercise is available only with substitute equipment:
1. if performing it with the substitute is the same as another library row (e.g., trap-bar deadlift with a straight barbell = barbell deadlift), the exercise is NOT_AVAILABLE;
2. otherwise it is available through an option set that uses the substitute, its `evidence_basis` is ALLOY_LIBRARY_ADAPTED, and `executed_as` states the substitution (e.g., "box = flat bench EQ005").

### Q.4 CHECK_IN

`check_in_id`, `created_at`, `R01`…`R07` (§A.3), `R04b` [M-09], `R06_choice`, `equipment_issues[]`, `alloy_answers[]` (including `not_sure` and `unanswered`), `defaulted_fields[]`.

### Q.5 SESSION_LOG (apartment)

```
session_id, generation_id, started_at, ended_at, session_capacity (below_usual|usual|above_usual|null)
items[]: {slot, exercise_id, role, anchor_pick_reason, implement (option set used) [M-13],
          swapped_from|null, swap_type (USER_SWAP|USER_REPLACE|null),
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

`event_id`, `event_at`, `type` (CLEAR_HOLD | CLEAR_REVIEW [M-10] | SET_PREFERENCE | USER_REPLACE | CONFIRM_CAPABILITY | CONFIRM_EQUIPMENT | ALLOY_SKIPPED), `payload`.

### Q.9 ENGINE_STATE

§B.1 (cache; rebuildable from Q.5, Q.6, Q.8 and resolved check-in Alloy answers).

### Q.10 GENERATED_SESSION

`generation_id`, `prep[]`, `blocks[]: {block_id, mode (PAIRED|STRAIGHT_SETS), items[]: {slot, exercise_id, role, implement, sets, target, unit, load|CALIBRATE|SEEDED|null, rest_after_pair_s, per_side, notes}}`, `finish`, `duration_estimate_min`, `underfill|null`.

### Q.11 GENERATION_RECORD

§J.1.

### Q.12 CONFIG

`config_version` and every §R constant.

---

## R. Configurable values and constants (all PARAM unless stated)

| Constant | Default | Used in | v0.2 |
|---|---|---|---|
| MIN_SESSION_MINUTES | 15 | C.3 (UNRESOLVED B3) | |
| TIER_AB_MINUTES | 25 | C.3 | |
| TIER_ABC_MINUTES | 35 | C.3 | |
| TIER_ABCF_MINUTES | 45 | C.3, G.5 | |
| PREP_MINUTES_SHORT / PREP_MINUTES | 4 / 6 | C.3, G.5 | |
| PREP_GENERAL_MINUTES | 3 | C.6 | |
| FIRST_SESSIONS_NO_FINISH | 2 | C.3, G.5 | |
| FAMILY_ORDER / PARENT_ORDER | §B.2 | C.4 | |
| CORE_STARVATION_DAYS | 7 | C.4 | |
| FINISH_PRIORITY | [GOAL_ACCESSORY, CORE_OR_CARRY, CONDITIONING, MOBILITY] | C.5 | |
| GOAL_ACCESSORY_ENABLED | false (UNRESOLVED B2, UQ-G03) | C.5 | |
| GOAL_ACCESSORY_MIN_HOURS | 24 | C.5 | |
| CONDITIONING_OPT_IN | false (UNRESOLVED P-07) | C.5 | |
| CONDITIONING_FORMAT | 8 min on a non-impact machine: 30 s harder / 30 s easy | G.1 | |
| MIN_SETS_FOR_CREDIT | 2 | B.3 | |
| REPEAT_EXCLUSION_DAYS | 1 (used today or on the previous local date) | HF-11 | replaces REPEAT_EXCLUSION_HOURS 48 [M-02] |
| HEAVY_LOWER_RECOVERY_HOURS | 24 | HF-12 | |
| ACCESSORY_ROTATION_EXPOSURES | 4 | E.5 | |
| ENABLE_NOVEL_DRAW | true (MOBILITY, CORE, CARRY, ACCESSORY only) | E.4 | scope narrowed [M-05] |
| Role table | §G.1 | G.1 | |
| PAIR_SET_MINUTES | PRIMARY 3.0, SECONDARY 2.75, other 2.0 | G.5 | |
| UNILATERAL_ADD_MINUTES | 0.5 | G.5 | |
| BLOCK_SETUP_MINUTES | 1.0 | G.5 | |
| RAMP_MINUTES | 2.0 | G.5 | |
| STRAIGHT_SETS_ADD_MINUTES | 1.0 | G.5 | |
| FINISH_MINUTES | 6 | G.5 | |
| DURATION_TOLERANCE_MINUTES | 3 | G.5 | |
| UNDERFILL_NOTICE_MINUTES | 10 | G.5 | new [M-16] |
| LOAD_UP_CONFIRMATIONS | 1 | H.3 | was 2 [M-19] |
| NOMINAL_LOAD_STEP | 5 lb | H.5 | new [M-14] |
| LOAD_CAP_EXTRA | 3 (reps or steps) | H.5 | |
| GAP_DAYS | 14 | H.7 | |
| STALL_FLAG_EXPOSURES | 4 | H.7 | |
| ALLOW_UNEVEN_SIDE_DOSING | false (UNRESOLVED B5) | G.4, H.6 | |
| ALLOY_SCHEDULE | Mon, Wed, Fri 16:00 local | L.2 | |
| ALLOY_PROMPT_LOOKBACK_HOURS | 72 | L.2 | |
| ALLOY_MAX_PROMPTS | 3 | L.2 | |
| ALLOY_DEFAULT_DURATION_MINUTES | 55 | L.2 | |
| ALLOY_TIME_UNCERTAINTY_HOURS | 2 | L.2 | new [M-15] |
| Station groups | §F.2 defaults (UNRESOLVED: confirm on site) | F.2 | |
| Equipment load lists, `max_confirmed_load` | Q.3 (UNRESOLVED UQ-G04) | G.3, H.5 | max added [M-14] |
| `default_order` content | Q.1.1 (user approval required) | E.2 K7 | new [M-05] |

---

## S. Register of FUTURE features and UNRESOLVED items

**FUTURE (do not implement):** weekly family-frequency targets; weekly heavy/medium/light variation (AF-17); compound sets and power blocks (AF-15); ROTATION family; tempo, ROM, and complexity progression; progression trees (AF-16, AF-19 links); set progression; session-size growth above the 45-minute tier; automatic duration calibration; forward-looking use of Alloy schedule or program; mobility-only sessions; resuming a partially completed generated session; multiple gyms; reading OTHER training logs; upper-body and weekly fatigue model (FL-17); grip and unilateral load balancing (FL-21).

**UNRESOLVED (defaults implemented per §A.4):** B1, B2, B3, B4a–d, B5, B6, UQ-G01 (vertical pull capability), UQ-G02 (adjustable cable pulley), UQ-G03 (supplemental approval, including machine rows EQ017–EQ021), UQ-G04 (load lists), UQ-G05 (rack bar path, incline bench), station groups, P-07 conditioning, P-08 impact, and **weekly training-frequency tolerance**: whether the V0 recovery rules (consecutive-day repeat, 24 h heavy-lower, energy, soreness) are sufficient when Alloy and apartment sessions total 5–6 per week. The Phase 8 manual run must review SESSION_CAPACITY and effort trends specifically for this question, and also the progression pace set by M-19.

**Newly exposed by v0.2 (answer before or during Phase 8):** B4c/B5 take on more weight because pressing now leads half of all sessions at 6–10 reps, including overhead pressing (M-01); B4a decides whether the held plank-position rows (EX003, EX075, EX085, EX092 and others) return (M-08).

**Before implementation begins (not engine rules, but blocking):** author EXERCISE_METADATA (Q.1) for every usable library exercise under Q.1.1 and pass V-00a to V-00g; user approval of `default_order`; confirm equipment load lists, `max_confirmed_load`, and station groups; answer B3, B4a, B5, B6, UQ-G01.

---

# PART II. CHANGE REGISTER (0.1.1 → 0.2.0)

## V.1 Modifications

Scenario IDs refer to ENGINE_STRESS_TEST_LEDGER_v0_1.md. "Before" figures are from that ledger; "after" figures are from the v0.2 rerun (ENGINE_STRESS_TEST_RERUN_V0_2.md). Both runs used the same reference simulator, the same fixture metadata (with the v0.2 fields added), and the same histories. The simulator is a test harness, not the application.

### M-01 Role alternation on ties (FL-01, FL-24) · D-041

- **Problem.** Every family trained in a session is credited at the same `ended_at`, and an Alloy SUMMARY credits LOWER, PUSH and PULL at one timestamp. Ties were broken by the fixed FAMILY_ORDER / PARENT_ORDER, so squat and pull led every session (18 of 18 over six weeks) while hinge and press never did. The record still said "least recently trained," which was false.
- **Old behavior.** Lower and parent order by `last_trained`, then fixed order. A2 = stalest family of the leading parent.
- **New behavior.** Second key `last_primary` (when the family or parent last held a PRIMARY slot in an apartment session). Within the leading upper parent, the PRIMARY family is the one that least recently held PRIMARY. New reason codes LOWER_ROLE_ALTERNATION / UPPER_ROLE_ALTERNATION with truthful sentences (§C.4.2, §J.3).
- **Reason.** Staleness remains the first signal. The new key only decides what the old rule decided by alphabet, using data the engine already logs.
- **Affected scenarios.** S04b, S26, S02, S24, baseline. Six weeks: A1 KD 9 / HD 9 (was 18 / 0); A2 HPULL 9, VPUSH 5, HPUSH 4 (was PULL 18 / 0).
- **New failure risk.** Pressing now leads half of all sessions in the 6–10 rep PRIMARY range, including overhead pressing (EX015), while the right-triceps dosing questions (B4c, B5) are open. A push family can appear in two consecutive sessions (SECONDARY then PRIMARY, different exercises via K0). A first version of this fix alternated parents only and produced a new lock (overhead press PRIMARY 9/9, bench SECONDARY 9/9); the PRIMARY-family key was added after the rerun found it.

### M-02 Repeat exclusion by calendar day (FL-02) · D-042

- **Problem.** HF-11 excluded an exercise for 48 hours. Nelson's apartment sessions are about 48 hours apart, so a 30-minute shift in generation time swapped three main lifts, and anchors were used in only 15 of 32 baseline picks.
- **Old behavior.** Excluded if `exercise_last_used` within 48 h.
- **New behavior.** Excluded if last used today or on the previous local date (`REPEAT_EXCLUSION_DAYS` = 1).
- **Reason.** Keeps the intent (not on consecutive days) and moves the threshold to midnight, where sessions rarely fall.
- **Affected scenarios.** S25 (no HF-11 substitutions over two weeks), sensitivity check (18:20 and 18:50 identical, AT-04), baseline (ANCHOR 21 and SUBSTITUTE 4 of 40 picks, all four HF-12 on Saturday mornings; was ANCHOR 15 vs SUBSTITUTE 17).
- **New failure risk.** A 22:30 session followed by a 06:00 session two days later (31.5 h) is allowed; an exercise can recur every other day (Mon/Wed/Fri), since weekly frequency is still unmodeled (FL-17). The J.3 sentence now says "yesterday" rather than hours.

### M-03 Anchor candidate; substitutes never become anchors (FL-03) · D-043

- **Problem.** When a slot had no anchor, whatever was picked became the long-term anchor even if a one-day filter shaped the pick (S04a: a single-leg deadlift became the primary hinge). After the first fix, the rerun showed a second path: a day-2 substitute accumulated a progression line and later won anchorship through K4 ("has a line").
- **Old behavior.** No anchor or rotation due → first of the ordered eligible list → NEW_ANCHOR.
- **New behavior.** The anchor candidate is the first exercise by K0, K1, K2, K3, K6, K7 (no history keys) among exercises that pass every filter except the today-only ones. If it is eligible today, it is picked and becomes the anchor. If not, today's pick is a substitute (SUBSTITUTE_NO_ANCHOR) and the anchor stays unset (§E.1). CORE/CARRY keep the full key order, since their anchors rotate every four exposures by design.
- **Reason.** A long-lived choice should come from preference and a reviewed default order, not from what one bad day allowed.
- **Affected scenarios.** S02, S04a, S24; cold-start sequence 09-22 → 09-27 (AT-06): day-2 substitutes EX073 and EX013 no longer become the HD/PRIMARY and KD/SECONDARY anchors; EX065 and EX018 do.
- **New failure risk.** A user who only ever trains on filtered days (for example, always the morning after Alloy) never gets an anchor in that slot. Substitutes stay stable in practice (K4 favours the familiar one), but are labelled substitutes indefinitely. Anchor quality now depends entirely on `default_order` authoring (M-17).

### M-04 Seeded lines across roles (FL-04) · D-044

- **Problem.** Lines are per role. When an exercise moved between PRIMARY and SECONDARY its known load was ignored and it recalibrated (S24: four main lifts recalibrated). M-01 makes role changes routine.
- **Old behavior.** First exposure in a role → CALIBRATE.
- **New behavior.** If the same exercise and side has a line with a load in the other main role, the new line starts at that load with target = this role's range_min (SEEDED, §G.3, §H.7), and the exposure counts as evidence.
- **Reason.** A known load is better information than a calibration guess.
- **Affected scenarios.** S17, S24, S33 (EX069 PRIMARY shows SEEDED 6 @ 30 lb, AT-07).
- **New failure risk.** PRIMARY → SECONDARY at the same load asks for more reps (8 vs 6) and may be too hard for one exposure; the REDUCE path (limited by M-10) handles it.

### M-05 `default_order`; no seeded draw in main roles (FL-05) · D-045

- **Problem.** At cold start every main slot tied on never-used candidates, so a seeded draw picked the long-term anchors. The same state on eight dates gave five different primary squats and, for hinge, a KB clean or two-arm swing. Among used exercises the final tie-break was harvest order, which is arbitrary.
- **Old behavior.** K7 = `library_order`; E.4 draw in any slot whose top candidates were never used.
- **New behavior.** Q.1 field `default_order` (authored under Q.1.1 criteria, user-approved) is K7. The draw applies only to MOBILITY, CORE, CARRY and ACCESSORY.
- **Reason.** Starting exercises are a programming decision and must be explainable and reviewable. Variety among equivalents is kept where it is harmless (mobility, core rotation).
- **Affected scenarios.** S01, S30 (eight dates → one main session: EX012, EX066, EX011, EX054), S02.
- **New failure risk.** A poor `default_order` affects every start; cold-start variety in main lifts is gone by design.

### M-06 Unservable families removed from planning (FL-07, FL-24) · D-046

- **Problem.** ANTI_LAT has no library row and VPULL is held pending UQ-G01. Their timestamps stay null, so they are always "stalest": C1 was planned as ANTI_LAT every session and soreness replacement assigned it first, producing empty slots and a fallback chain in every record.
- **Old behavior.** All families sorted; empty families resolved by fallback each time.
- **New behavior.** A family with no row passing the static filters is unservable: removed from all planning pools and listed once with its unblocking question (§C.4.1).
- **Reason.** A family that cannot be served today should not steer the plan or clutter the record.
- **Affected scenarios.** S06, S07, S29b, S12, every C block.
- **New failure risk.** When a family becomes servable (e.g., UQ-G01 answered) it enters with a null timestamp and leads immediately (intended catch-up, but abrupt). If every core family became unservable, replacement slots would be empty and visible only as SLOTS_EMPTY underfill.

### M-07 No repeated core or carry family in a session (FL-08) · D-047

- **Problem.** The C/F fallback "next family in that slot's pool" could pick a family already planned, giving two or three anti-extension items in one session, and two items then wrote the same anchor.
- **Old behavior.** Fallback ignored what was already planned; C2 tie-break favoured ANTI_EXT over CARRY.
- **New behavior.** C/F fallback takes the stalest servable core/carry family not already planned or selected; C2 excludes C1; V-04 checks family repetition (§C.7, §I.1).
- **Reason.** Duplication was an unintended consequence of an underspecified fallback.
- **Affected scenarios.** S04a, S12, S29b (AT-P03).
- **New failure risk.** On sore or trunk-limited days, C can end up empty rather than duplicated (accepted; disclosed as SLOTS_EMPTY).

### M-08 Mandatory `hand_support`; undocumented plank positions HELD (FL-09, CRITICAL) · D-048

- **Problem.** HC-02 (no push-up-position planks) is an active hard constraint. HF-02 used a fixed list, so Bird Dog Plank, Spider Crawl and Inchworm, usually performed from a push-up position but not documented as such, were auto-selected (S01, S02, S06, S07, S15, S29b, S30).
- **Old behavior.** HF-01 on tag `high_plank`; HF-02 on a hard-coded ID list.
- **New behavior.** Required Q.1 field `hand_support`. HIGH_PLANK → HF-01 EXCLUDED. PLANK_POSITION_UNCONFIRMED (any hand weight bearing whose position is not documented) → HF-02 HELD pending B4a. MOBILITY rows with hand weight bearing carry UPPER soreness (V-00g).
- **Reason.** An active hard constraint cannot depend on remembering to add IDs to a list. A required field forces a decision on every row, and HELD is the existing pattern for scope-pending constraints.
- **Affected scenarios.** S01, S02, S06, S07, S15, S29b, S30; AT-09 (EX003, EX075, EX085, EX092 held and never selected).
- **New failure risk.** Over-holding: Knee Plank is held too, so ANTI_EXT has two rows (rollout, deadbug) until B4a is answered. Protection still depends on authoring every row honestly.

### M-09 "Right arm worse" becomes actionable (FL-10) · D-049

- **Problem.** R-04 = worse had no effect on selection (the anchor returned before K3 ran) or dose, and it voided right-side evidence even for rows and carries with no triceps involvement.
- **Old behavior.** K3 unreachable while the anchor was eligible; right-side non-evidence for every per-side item.
- **New behavior.** (a) Follow-up R-04b: press as usual, or swap pressing for core (swap replaces PUSH slots like upper soreness, reason R04_SWAP). (b) With R-04 = worse, if the anchor has more right-triceps involvement than an eligible alternative, K3 leads the order and the pick is SUBSTITUTE_FOR_ANCHOR(R-04). (c) Right-side non-evidence only for rows with `right_triceps_involvement` ≠ NONE.
- **Reason.** Gives the user a same-day choice without the engine inventing an SC-01 dosing rule (B5 is open).
- **Affected scenarios.** S20 (a: bench kept, right side NOT_EVIDENCE, rows progress; b: B2 becomes core, no pressing).
- **New failure risk.** The default (as_usual) leaves pressing identical, so protection depends on the user choosing swap. Part (b) does nothing until metadata differentiates involvement (in the fixture every press is SECONDARY; AT-12 uses a variant). One extra tap on worse days.

### M-10 Right-arm fade is monitoring only; one automatic REDUCE (FL-11, CRITICAL) · D-050

- **Problem.** A fade at rep n counted the set as n − 1 reps, which triggered REDUCE; the conservative side merge reduced both arms; REDUCE reset the stall counter, so no review appeared. DB Bench fell 30 → 5 lb in five exposures.
- **Old behavior.** Fade altered counted reps; REDUCE unlimited.
- **New behavior.** Fade is recorded, never counted. After a REDUCE the line is locked: another REDUCE becomes HOLD(REDUCE_LIMIT) with a review flag until a success or a CLEAR_REVIEW event (§H.3, §H.4).
- **Reason.** The profile says fade is recorded, not interpreted. A ratchet with no floor except the lightest weight is unsafe in the other direction: it silently erodes training.
- **Affected scenarios.** S28 (worst case now 30 → 25 once, then held with review flag; fade with all reps completed now progresses), AT-13 to AT-15.
- **New failure risk.** A genuinely too-heavy load stays one step down until the user reviews. The right arm now progresses whenever it completes its reps, since no B5 dosing rule exists.

### M-11 DISLIKE rotates the anchor (FL-12) · D-051

- **Problem.** DISLIKE only affected sort key K2, which never runs while the anchor is eligible, so a disliked anchor was served indefinitely.
- **Old behavior.** No rotation trigger for DISLIKE.
- **New behavior.** DISLIKE on an anchor sets `rotate_due` (cause DISLIKE) when another statically eligible exercise exists; otherwise the anchor stays and a NO_ALTERNATIVE_FOR_DISLIKE note is shown (§E.5). PREFER unchanged.
- **Reason.** An explicit dislike is the user's programming input; honouring it is cheap and explainable.
- **Affected scenarios.** S19 (EX012 → EX053 at the next KD/PRIMARY session, AT-16), AT-17 (only carry exercise: kept, noted). AT-17 initially failed: the first version rotated even without an alternative and mislabelled the pick as a new anchor.
- **New failure risk.** Disliking a well-progressing anchor discards its continuity (user's choice). The disliked exercise can still appear as a substitute (last by K2).

### M-12 Station rule protects anchors (FL-13) · D-052

- **Problem.** The station rule always kept slot 1 and re-selected slot 2, so a lower substitute on RACK_AREA evicted a BENCH_2 press or row anchor (HPUSH/SECONDARY anchor used 3 of 18 times), and two conflicting anchors starved slot 2 permanently. There was no reason code.
- **Old behavior.** Keep slot 1; re-select slot 2; else slot 1; else STRAIGHT_SETS.
- **New behavior.** Keep the ANCHOR pick and re-select the other; two anchors → STRAIGHT_SETS; neither → old order. Reason STATION_RESELECT; never changes anchors (§F.2).
- **Reason.** Continuity of anchors is the purpose of anchors; the non-anchor is the flexible item.
- **Affected scenarios.** S14, S21, S33 (block A STRAIGHT_SETS, both anchors kept), AT-18.
- **New failure risk.** STRAIGHT_SETS is priced at +1 minute, which understates it; pairs of anchors on different stations run straight sets every time until station groups are confirmed on site.

### M-13 Equipment options, implement changes, substitution availability (FL-14, FL-23) · D-053

- **Problem.** Equipment was AND-only (no "kettlebell or dumbbell"), so a dumbbell-only room had no squat pattern; "available with substitution" had no mapping, which made the trap-bar deadlift a duplicate barbell deadlift under a second ID; substituted executions kept the ALLOY_LIBRARY label.
- **Old behavior.** `equipment_ids` all required; substitution mapped to AVAILABLE.
- **New behavior.** `equipment_options` (ordered alternatives); first available set is today's implement; a different implement from the line's is IMPLEMENT_CHANGED (last load shown, not evidence). Substitution rule: if the substitute turns it into another library row → NOT_AVAILABLE; otherwise ALLOY_LIBRARY_ADAPTED with `executed_as`, ranked after ALLOY_LIBRARY (K6).
- **Reason.** The gym's real flexibility is kettlebell/dumbbell interchange; the model must express it without corrupting progression or evidence labels.
- **Affected scenarios.** S14 (anchors kept with dumbbells, not evidence), S15 (squat pattern via DB), S16, AT-19 to AT-21.
- **New failure risk.** Load guidance across implements is approximate (DB denominations unconfirmed). Machines are still invisible without approved supplemental rows (UQ-G03), so S16 remains data-blocked.

### M-14 Unknown increments stop at the confirmed maximum (FL-18 part) · D-054

- **Problem.** With unknown dumbbell increments the engine assumed a heavier weight always exists, so DB lines never capped and could prescribe past the confirmed 50 lb rack.
- **Old behavior.** Unknown increments → heavier exists.
- **New behavior.** Q.3 `max_confirmed_load`; unknown increments allow an increase only up to it; CONFIRM_EQUIPMENT can raise it (§H.5).
- **Reason.** Uses a fact already in the equipment record.
- **Affected scenarios.** S18; AT-22 (DB bench stops at 50, LOAD_CAPPED, rotation due).
- **New failure risk.** If the rack actually goes heavier, dumbbell anchors rotate early until the user confirms.

### M-15 Uncertain Alloy attendance counts for recovery (FL-16) · D-055

- **Problem.** "Not sure" gave no credit, and a prompt-created log assumed 16:00. Both disabled the 24-hour heavy-lower rule exactly when the user had just trained (S22a; S22c where the class really ended 18:55).
- **Old behavior.** Not sure → nothing; prompt "yes" → credit at scheduled time.
- **New behavior.** Not sure or no answer → recovery credit only, at scheduled start + 55 min + 2 h; prompt "yes" keeps its staleness credit and adds the same recovery credit. HF-12 uses the latest of real and recovery credits; staleness ignores recovery credits (§L.2).
- **Reason.** Uncertainty should resolve toward rest for the one binary recovery rule, without distorting what the plan thinks was trained.
- **Affected scenarios.** S22a, S22c, AT-23, AT-24.
- **New failure risk.** Dismissing prompts by habit blocks heavy lower lifts more often (more substitutes). Real 16:00 classes near the 24-hour mark substitute up to two hours longer than necessary.

### M-16 Underfill disclosure (FL-15) · D-056

- **Problem.** A 60-minute request produced the same ~38-minute session as 45 minutes, silently; cold start and LIGHT also left 10–15 minutes unused without saying so.
- **Old behavior.** Silent.
- **New behavior.** When available minus planned exceeds 10 minutes, the record and screen state it with a cause (§G.5). No volume is added.
- **Reason.** Adding sets or exercises is a goal and session-length decision (B1, B3) the user has not made. Honesty costs nothing.
- **Affected scenarios.** S13 (TIER_MAXIMUM), S01/S02 (FIRST_SESSIONS), S06/S07/S29b (SLOTS_EMPTY), S08 (LIGHT_POSTURE), AT-25.
- **New failure risk.** None to training. The user may read the notice as the app ignoring the time available until B3 is answered.

### M-17 Metadata authoring criteria and load-time validators (FL-22, CRITICAL; FL-05) · D-057

- **Problem.** The engine cannot run on canonical data: Q.1 metadata does not exist, and `heavy_lower`, `roles_allowed` and complexes had no authoring criteria, so any implementation would invent them. The red-team needed twelve assumptions (A1–A12) to run at all.
- **Old behavior.** Fields listed without criteria; `library_order` as ordering.
- **New behavior.** Q.1.1 criteria for family, roles, heavy_lower (formula), hand_support, sore regions, triceps involvement, equipment options and default order; validators V-00a to V-00g reject or repair rows at load (§Q.1.2).
- **Reason.** Converts the assumptions that decided test outcomes into explicit, checkable rules, and blocks silent authoring errors on safety-relevant fields.
- **Affected scenarios.** All (the fixture metadata in the acceptance tests follows these criteria).
- **New failure risk.** The criteria are our judgment (SYSTEM_DESIGN), not Alloy's classification. The heavy_lower formula makes single-hand loaded lifts non-heavy, so day-after sessions lean unilateral (FL-21 unchanged). Authoring is still a blocking prerequisite; FL-22 is resolved at the specification level only.

### M-18 HARD with all reps met progresses (found during rerun) · D-058

- **Problem.** §G.3 tells the user to "aim for HARD on the last set," but §H.3 held on HARD. A user who follows the instruction never progresses. The red-team performer always rated GOOD, which hid it; the rerun of S28 showed HOLD six times with all reps completed.
- **Old behavior.** Rows 3–4 required GOOD; HARD → HOLD.
- **New behavior.** GOOD or HARD with every rep met → REPS_UP / CONFIRM_TOP. HOLD only when short by less than two reps.
- **Reason.** The profile defines HARD as the intended top end of effort, not a problem. The instruction and the decision table must agree.
- **Affected scenarios.** S28a (now REPS_UP, then LOAD_UP after the top), S26 (performer rating HARD progresses the same as GOOD).
- **New failure risk.** Faster progression for users who rate HARD at a true limit; the short2/TOO_HARD path and M-10 bound the downside.

### M-19 `LOAD_UP_CONFIRMATIONS` 2 → 1 (PARAM; FL-18) · D-059

- **Problem.** With roles alternating (M-01), each (family, role) anchor is met about once a week. Needing two top-of-range confirmations meant no lower-body load increase in six weeks of perfect compliance (S26 before and after M-01).
- **Old behavior.** Two consecutive qualifying exposures at the top of the range.
- **New behavior.** One.
- **Reason.** Reaching the top of the range with every rep at GOOD or HARD is already the signal; the second confirmation added about a week per step without new information.
- **Affected scenarios.** S26: every lower anchor +5 lb within six weeks (goblet squat 35 → 40, KB deadlift 35 → 40, KB front squat 35 → 40, DB RDL 30 → 35); kettlebell lifts reach the 45 lb cap around week 12.
- **New failure risk.** One good day at the top triggers an increase; an over-reach comes back through one REDUCE at the next exposure. This value is to be reviewed in Phase 8 with real logs.

## V.2 Ledger items deliberately not changed

| Item | Why not changed |
|---|---|
| FL-06 cold-start novelty | M-03/M-05 removed its worst part (random anchors, day-2 substitutes becoming anchors). Training on consecutive days at cold start still introduces substitutes; forcing familiarity would need a rule the evidence does not justify. Residual: S02 QUESTIONABLE. |
| FL-17 fatigue beyond the lower-body 24 h rule | Any upper-body or weekly-frequency rule would be a guess. It is declared UNRESOLVED and assigned to Phase 8 with SESSION_CAPACITY and effort trends. Residual: S03, S05, S21 QUESTIONABLE. |
| FL-19 LIGHT exposures never count | Deliberately conservative; low severity. Residual: S08, S32 QUESTIONABLE. |
| FL-20 goal representation | Blocked on B1, B2 and UQ-G03 (supplemental approval). The engine cannot invent goal weighting. S23 remains FAIL (disclosed, not critical). |
| FL-21 grip and unilateral load | Low severity; measuring it needs a subjective metadata field removed by D-033. Residual: S27 QUESTIONABLE. |
| FL-25 aborted-session counter | Low severity; no observed harm beyond one consumed no-finish allowance. |
| PREFER behaviour | PREFER already wins at rotation and the manual "replace permanently" swap exists. Making PREFER override anchors would add churn. S18 QUESTIONABLE by design. |
| FL-18 pace beyond M-14/M-19 | Remaining pace questions need real logs (Phase 8). |

## V.3 Verification summary

- Every scenario classified QUESTIONABLE or FAIL in the ledger was rerun (33 runs including variants), plus the five GOOD scenarios as regressions. Result: 21 GOOD, 11 QUESTIONABLE, 1 FAIL (S23, blocked on user decisions, disclosed). All five regressions remain GOOD. Details: ENGINE_STRESS_TEST_RERUN_V0_2.md.
- Critical ledger items: FL-09 resolved (M-08); FL-11 resolved (M-10); FL-22 resolved at specification level (M-17), still a blocking authoring task. No unresolved critical engine failure remains.
- Three defects in the first draft of these changes were found by the rerun or the acceptance tests and corrected before freezing: the push sub-family lock (M-01), the K4 anchor-promotion path (M-03), and DISLIKE without alternatives (M-11). The HARD/HOLD contradiction (M-18) was found in the same pass.
- GENERATOR_ACCEPTANCE_TESTS_V0_2.md: 7 property tests, 25 targeted tests, 5 regression tests. All 37 pass against the reference simulator.
