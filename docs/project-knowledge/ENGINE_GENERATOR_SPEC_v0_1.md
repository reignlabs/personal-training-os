---
file: ENGINE_GENERATOR_SPEC_v0_1.md
class: ENGINE
status: DRAFT v0.1 (design only; no code; not yet run)
updated: 2026-09-23
phase: combines planned Phase 5 (rule registry), Phase 6 (progression/readiness), Phase 7 (generator spec)
depends_on: PERSONAL_user_profile.yaml (USER_PROFILE_V0), PERSONAL_constraints.yaml, equipment_library.csv/json,
            exercise_equipment_availability.csv/json, claude_v0-exercise-db_* (exercise evidence layer),
            CANON_ALLOY_FINDINGS.md (AF-/Q- IDs), DECISION_LOG.md (D-001 to D-018)
proposes_decisions: D-019 to D-029 (see DECISION_LOG_addendum_D019-D029.md)
---

# WORKOUT GENERATOR v0.1: Engine Specification

## 0. How to read this document

**What this is.** The design of the engine that produces one apartment-gym workout at a time. It defines stages, state, rules, parameters, records, and data contracts. It generates no workout.

**Evidence convention (reconciles your tagging request with D-002).**
Every engine rule is `class: SYSTEM_DESIGN`. That is fixed (D-002): a rule is something we chose. What varies is what the rule rests on, recorded in two fields:

| Field | Values | Meaning |
|---|---|---|
| `basis` | ALLOY_DOCUMENTED · ALLOY_OBSERVED · SUPPORTED_PATTERN · PERSONAL · NONE | The strongest evidence class of the findings that inspired the rule. PERSONAL = implements a user/clinician/trainer input (Alloy classes never apply to personal data). NONE = pure design. |
| `verification` | citation_resolved · raw_only · n/a | Status of the cited finding in the Phase 0 findings register. Per CANON_EVIDENCE_POLICY §4, `citation_resolved` findings may support V0 rules **provisionally and flagged**; `raw_only` findings may not support a rule, so any rule citing one is marked `stands_on_design_merit: true`. |

So "RULE-041, basis ALLOY_OBSERVED" means: *we* decided to prefer lower+upper pairs, inspired by pairings observed in public Alloy workouts. It never means "Alloy's pairing logic is X."

**Numbers.** Every threshold, weight, and target in this document is a tunable SYSTEM_DESIGN placeholder, listed once in §15 (Parameter register) with a `P-` ID. None is a claim about Alloy or about physiology. They are starting values for the Phase 8 manual run.

**Blocking inputs.** Several behaviors depend on open profile questions (B1–B6). Each such place states the default used until the answer exists. §16 lists what must be answered before the Phase 8 manual run.

---

## 1. Architecture

### 1.1 One archetype (decision D-019)

V0 needs **one** session archetype. The situations that tempt a second archetype (the day after an Alloy session, a short day, a low-energy day, a sore day) are all handled by three derived parameters applied to one template:

| Parameter | Derived from | Controls | Never controls |
|---|---|---|---|
| `session_size` (T0–T4) | minutes available (R-01) | number of blocks and sets | which families are required |
| `load_posture` (STANDARD / MODERATED / LIGHT) | readiness check-in, recent-session proximity | set counts on later blocks, whether progression is attempted, power/conditioning eligibility | session architecture |
| family priorities | rolling exposure state, goals, fatigue, soreness | which movement families fill the slots | block structure |

**Emergent complement behavior.** Nelson's Alloy sessions (Mon/Wed/Fri) are full-body and count fully toward exposure (D-016). Because slot families are chosen by 7-day deficits and recent fatigue, an apartment session that follows Alloy will naturally lean toward whatever Alloy under-covered (for example carries, specific core subtypes, vertical pulling, goal accessories) and away from what Alloy just loaded heavily. That is the "complement day" without a separate archetype. If the Phase 8 run shows this is not enough, a second archetype becomes a v0.2 decision.

Deferred to v0.2: heavy/medium/light weekly variation (AF-17), compound sets (power → strength same pattern, AF-15), alternative formats (EMOM, ladders, intervals), multi-week blocks (Q-05, D-005).

### 1.2 Session template (configurable)

```
PREP      movement preparation (built last, from the chosen A/B patterns)
BLOCK A   primary paired strength       A1 / A2
BLOCK B   secondary paired strength     B1 / B2
BLOCK C   optional pair: core / carry / priority work     C1 / C2
FINISH    optional individualized finish (or none)
```

Inspired by AF-04 (paired supersets), AF-05 (warm-up → strength supersets → individualized finish; one location, 2026). This is our template; it is not presented as Alloy's session template (D-004).

### 1.3 Pipeline

Deterministic stages. Randomness appears only in stage 11, among candidates already tied within tolerance (D-007).

| # | Stage | Input | Output | Can stop the run? |
|---|---|---|---|---|
| 0 | Load | profile, constraints, equipment, library + metadata, logs, parameters | in-memory snapshot | yes (missing required contract) |
| 1 | Check-in | R-01 to R-07 | session-scoped constraints, readiness flags | yes (R-06 → user chose skip) |
| 2 | Rolling state | logs (apartment, Alloy, other) | L1 / L3 / D7 windows, family exposure, region fatigue, exercise recency, progression lines (§3) | no |
| 3 | Session size + load posture | R-01, readiness flags, L1 proximity | T-tier, posture (§5.2–5.3) | yes (below minimum minutes) |
| 4 | Family eligibility + priority | rolling state, goals, constraints, posture | eligible families with priority scores (§5.4) | no |
| 5 | Slot plan | size, family priorities, coverage rules | family per slot (A1…C2), role per slot (§5.5) | no |
| 6 | Candidate generation | slot families, library + metadata | candidate list per slot | no |
| 7 | Hard filters | candidates, constraints, equipment, state, posture | EXCLUDED / HELD / ELIGIBLE per candidate (§6) | no (empty slot handled in 12) |
| 8 | Exercise scoring | eligible candidates, state, preferences | ranked list per slot (§7) | no |
| 9 | Pairing | top candidates per slot | block assignments (§8) | no |
| 10 | Prescription | roles, posture, progression state | sets, reps/time, rest, tempo, load guidance (§9, §10) | no |
| 11 | Tie-break | ties within tolerance | final pick, seed logged (§7.4) | no |
| 12 | Prep + finish | chosen blocks, remaining time | PREP items, FINISH or none (§11) | no |
| 13 | Validation + repair | draft session | valid session or NO_SESSION (§12) | yes (unrepairable) |
| 14 | Records | everything above | generation record + WHY summaries (§13) | no |

Stage order implements your hierarchy: safety constraints (1, 7) → recent state (2) → goals (4) → session requirements (3, 5) → movement requirements (5) → equipment (7) → candidates (6) → scoring (8) → pairing (9) → prescription (10) → validation (13) → limited variety (11).

---

## 2. Inputs and how each is consumed

| Input | Source | Stage | Effect | If missing / UNKNOWN |
|---|---|---|---|---|
| Hard constraints HC-01, HC-02 | PERSONAL_constraints.yaml | 7 | EXCLUDE matching exercises everywhere (prep, main, finish) | n/a (active) |
| HC-02 position-dependent matches | same (scope pending B4a) | 7 | HELD (not auto-selected, not excluded) | stays HELD until B4a |
| Soft constraint SC-01 (active, params pending) | same | 8, 9, 10 | scoring penalty when R-04 = worse; pairing rule; per-side logging and progression | parameter defaults in §9.6 until B5 |
| Candidate SC-02 to SC-05 | same | none until adopted | recorded in generation record as "candidate, not applied" (D-013) | not applied |
| Goals G-01 to G-07 | profile | 4, 8, 11 | family goal weights; priority-fit scores; finish choice | B1 default: G-01 rank 1, all others equal |
| Strength/movement priorities | profile MOVEMENT_PROFILE, STRENGTH_PRIORITIES | 4, 8 | shoulders (G-04) → V-push weight; biceps (G-05) → goal accessory and priority fit | as stated; nothing inferred |
| Exercise preferences | profile EXERCISE_PREFERENCES + PREFER/DISLIKE logs | 8, 9 | score bonus/penalty; biceps+shoulder pairing preference | neutral |
| Exercise avoidances | profile EXERCISE_AVOIDANCES | 7 | EXCLUDE | none |
| Equipment | equipment_library + availability + today's EQUIPMENT_ISSUE flags | 7, 9, 10 | eligibility, station logistics, load increments | UNKNOWN availability → HELD |
| Previous workout (L1) | all logs | 2 → 3, 4, 7, 8 | proximity posture floor, recent-heavy penalties, 48 h repetition filter | none → no L1 effects |
| Previous 3 workouts (L3) | all logs | 2 → 4, 8 | unilateral/power/conditioning counts, continuity, redundancy | shorter history used as-is |
| Previous 7 days (D7) | all logs incl. Alloy (D-016) | 2 → 4, 11 | family deficits (touches), weekly balance, goal-accessory touches | cold start (§3.5) |
| Performance history | apartment session logs | 10 | load/reps prescription, progression state | CALIBRATION state |
| Movement exposure | derived | 4 | family priority | cold start |
| Exercise recency | derived | 7, 8 | repetition filter, recency penalty, continuity bonus | none |
| Readiness R-02, R-03, R-07 | check-in | 3 | load posture | treated as "normal/ok/yes" only if user skips and confirms |
| Right arm R-04 | check-in | 8, 10 | SC-01 penalty and dose | "same" |
| Soreness R-05 | check-in | 7, 4 | "too sore to load" = session-scoped hard exclusion | none |
| Unwell R-06 | check-in | 1, 3 | user chooses normal / lighter / skip (D-017) | must be answered |
| Minutes R-01 | check-in | 3, 13 | session size, duration validator | must be answered |

CONTEXT items (D-014) are copied into the generation record for explanation only. They never enter any stage's logic.

---

## 3. State model

State is **derived** from logs at every generation. Nothing in §3 is hand-edited. This keeps the history the single source of truth.

### 3.1 Windows

| Window | Definition | Includes | Used for |
|---|---|---|---|
| L1 | most recent completed session of any environment | apartment, Alloy, OTHER (if B2 says OTHER counts) | proximity, recent-heavy regions, 48 h repetition |
| L3 | three most recent completed sessions | same | unilateral, power, conditioning counts; continuity; redundancy |
| D7 | rolling 168 hours before now | same | exposure touches, deficits, weekly balance, right-triceps set count |
| H14 | rolling 14 days | apartment only | continuity (active progression lines) |

Windows are timestamp-based, never weekday-based (apartment days are flexible; user instruction).

### 3.2 Rolling state object (computed each run)

```
rolling_state:
  generated_at
  l1: {session_id, env, ended_at, hours_since, fatigue_summary, full_body: bool, log_mode: FULL|SUMMARY}
  next_known_session: {env: ENV-ALLOY, starts_at, hours_until} | null      # Alloy M/W/F 16:00 is known in advance
  family_exposure[family]: {touches_d7, sets_d7, last_touch_at, touches_assumed_d7}
  region_fatigue[region]:  {status: FRESH|RECENT_24|RECENT_48, source_sessions[], assumed: bool}
  exercise_recency[exercise_id]: {last_used_at, uses_l3, uses_h14}
  progression_line[exercise_id][side]: (see §10.1)
  counts_l3: {unilateral_lower_sessions, power_sessions, conditioning_sessions, high_fatigue_lower_sessions}
  right_triceps_sets_d7: {left, right}          # monitoring; dosing cap only once SC-01 params exist
  goal_accessory_touches_d7: {elbow_flexion, elbow_extension, shoulder_isolation}
  flags: [STOPPED_SYMPTOM_pending_review[], UNCOMFORTABLE_recent[], TECHNIQUE_DIFFICULTY_recent[]]
  cold_start: bool
```

### 3.3 Regions (for local fatigue)

A small fixed list, SYSTEM_DESIGN vocabulary: `quads_glutes`, `posterior_chain`, `chest_front_delt_triceps`, `upper_back_lats_biceps`, `shoulders_overhead`, `grip`, `trunk`. Each exercise's metadata lists which regions it loads at which level (C1, §17).

A region is RECENT_24 if, in a session ending less than 24 h ago (P-10), it received ≥ P-11 working sets from exercises with `fatigue_tier` MODERATE or HIGH. RECENT_48 is the same test at 24–48 h. This is a bookkeeping rule, not a recovery model.

### 3.4 Alloy and other sessions (D-016, D-021)

| Log mode | What the generator credits | Flag |
|---|---|---|
| Alloy FULL (exercise-level, mapped to library IDs or free text with a family tag) | exactly like an apartment session, except loads never feed progression (§10.8) | none |
| Alloy SUMMARY (date, time, perceived focus: full/upper/lower, perceived effort) | an **assumed exposure vector**: one touch each to parent families LOWER, PUSH, PULL, CORE (for "full"; subsets for "upper"/"lower"); regions marked RECENT per timing at MODERATE fatigue | `assumed: true` on every credited value |
| Alloy not logged but scheduled and past | nothing credited; generation record warns "possible unlogged Alloy session" | warning |
| OTHER (DailyArms, DailyAbs, walking) | pending B2; if counted: credits goal_accessory_touches and core touches only | `source: OTHER` |

Assumed vectors credit **parent** families only, never subtypes, because a summary cannot say whether pulling was vertical or horizontal. Subtype deficits are therefore computed from known logs only and marked `coverage_uncertain` when a SUMMARY session sits inside D7.

### 3.5 Cold start

With fewer than 3 logged sessions in D7 (any environment), `cold_start: true`: deficits are computed as if all targets are unmet, all exercises start in CALIBRATION, continuity bonuses are zero, and the validator requires the full-body coverage rule (RULE-015) strictly.

---

## 4. Movement families and the exposure model

### 4.1 Family hierarchy (SYSTEM_DESIGN vocabulary)

| Parent | Family (slot-fillable) | Default in V0 | Notes |
|---|---|---|---|
| LOWER | KNEE_DOMINANT (KD) | required parent | bilateral and unilateral are attributes, not families |
| LOWER | HIP_DOMINANT (HD) | required parent | kettlebell swing is HD with a `ballistic` tag |
| PUSH | HORIZONTAL_PUSH (HPUSH) | required parent | SC-01 involvement on most members |
| PUSH | VERTICAL_PUSH (VPUSH) | required parent | G-04 shoulders weight |
| PULL | HORIZONTAL_PULL (HPULL) | required parent | |
| PULL | VERTICAL_PULL (VPULL) | required parent | apartment coverage depends on capability (UQ-G01) |
| CARRY | CARRY | weekly target | also credits ANTI_LAT when single-sided |
| CORE | ANTI_EXTENSION | weekly target | |
| CORE | ANTI_ROTATION | weekly target | |
| CORE | ANTI_LATERAL_FLEXION | weekly target | |
| — | ROTATION | optional | no target in V0 |
| — | POWER | optional, gated | impact-power HELD pending P-08 preference; non-impact ballistic lives inside HD |
| — | CONDITIONING | opt-in finish only | no conditioning goal stated (P-04, P-07 unknown) |
| — | MOBILITY | prep (always); finish (conditional) | no target |
| — | GOAL_ACCESSORY | added family (D-023) | elbow flexion, elbow extension, shoulder isolation; serves G-04/G-05 |

Inspired by AF-03 (squat, hinge, push, pull, carry as priority patterns; corporate adds step and rotate), AF-13 (carries as a recurring family), AF-14 (anti-movement core), AF-15 (power in small doses). The horizontal/vertical split is **our** vocabulary: R2 notes public evidence does not establish that Alloy subdivides push/pull this way.

GOAL_ACCESSORY is not an Alloy family. R1's "emotional/hotspot" concept (Q-13) is quarantined and is **not** cited. The slot is justified by AF-05 and AF-21 (finish or added work may serve an individual goal; one location, documented) plus your stated goals.

### 4.2 Exposure accounting

Two measures, deliberately coarse so they work with incomplete Alloy logs:

- **Touch:** a session in which a family received ≥ P-12 working sets (default 2) from exercises whose `family_primary` is that family. Secondary families receive a touch only at ≥ P-13 working sets (default 3) with `family_secondary` credit. One touch per family per session maximum.
- **Working sets:** counted for fatigue and monitoring only (region fatigue, right-triceps sets). Not used for weekly targets in V0.

Warm-up and ramp sets never count.

### 4.3 Weekly targets (D7 touches, all environments)

| Family | Target touches / 7 days (P-20) | Why a target exists |
|---|---|---|
| KD | ≥ 2 | full-body strength base (AF-01, AF-03); G-01 lean-mass floor |
| HD | ≥ 2 | same |
| HPUSH | ≥ 1 | push parent coverage |
| VPUSH | ≥ 1 | push parent coverage; G-04 |
| HPULL | ≥ 1 | pull parent coverage |
| VPULL | ≥ 1 | pull parent coverage (may be UNFILLABLE, §6) |
| CARRY | ≥ 1 | AF-13 (raw_only → design merit) |
| ANTI_EXT / ANTI_ROT / ANTI_LAT | ≥ 1 each | AF-14 (raw_only → design merit); G-07 |
| GOAL_ACCESSORY | ≥ P-21 (default 2) direct touches | G-04/G-05; only if B2 says the apartment generator shares the arm/shoulder goal |
| Unilateral lower (attribute) | ≥ 1 exercise | AF-12 (raw_only → design merit) |
| Balance check | PULL touches ≥ PUSH touches (soft) | common coaching convention; SYSTEM_DESIGN, basis NONE |

Deficit(f) = max(0, target(f) − touches_d7(f)). Compound pulls and presses do **not** count toward GOAL_ACCESSORY (avoids double counting; UQ-G09).

### 4.4 How recent training influences today (the explicit logic)

| Signal | Window | Rule | Effect | Rule ID |
|---|---|---|---|---|
| Proximity | L1 | L1 ended < P-14 h ago (18 h) **and** was full-body or had ≥1 HIGH-fatigue lower exercise | load_posture floor = MODERATED | RULE-012 |
| Forward look | next known Alloy | Alloy session starts in < P-15 h (20 h) | −P-36 priority on families whose top candidates are HIGH fatigue; no progression attempts on HIGH-fatigue lower | RULE-013 |
| Volume | D7 | touches only; no weekly volume ramping in V0 | set counts come from role/posture, never from "catching up" | RULE-014 |
| Movement exposure | D7 | deficit drives family priority | undertrained families rise | RULE-020 |
| Exercise repetition | L1/48 h | same exercise with fatigue_tier ≥ MODERATE used < 48 h ago | HARD filter (HF-08) | RULE-028 |
| Exercise repetition | 72 h | same exercise used 48–72 h ago | −2 score (REC) | RULE-036 |
| Exercise repetition | H14 | exercise has an active progression line | +3 score (CONT); continuity beats novelty (D-022) | RULE-031 |
| High-fatigue work | L1 | region RECENT_24 | family priority −4; HIGH-fatigue candidates in that region HELD from A slot | RULE-021, RULE-029 |
| High-fatigue work | L3 | ≥ 2 HIGH-fatigue lower sessions in L3 | lower slots limited to MODERATE-fatigue candidates | RULE-022 |
| Unilateral work | L3 | unilateral lower in ≥ 2 of L3 | no unilateral-lower bonus; otherwise +1 if weekly unilateral target unmet | RULE-023 |
| Power | L3 | power in last 48 h | POWER not eligible; ballistic HD candidates −2 | RULE-024 |
| Conditioning | L1 | conditioning in last 24 h | no conditioning finish | RULE-025 |
| Soreness (mild, not "too sore") | today | region reported sore but loadable | family priority −2; candidates in region −3 | RULE-026 |

"Mild" soreness exists only if the check-in later distinguishes it. The current R-05 question asks what is **too sore to load**, which is a session-scoped hard exclusion (HF-04). Until the check-in has a mild level, RULE-026 is dormant.

---

## 5. Session requirements and slot planning

### 5.1 Coverage rules (every session)

- **RULE-015 Full-body coverage.** Main slots (A, B) include ≥ 1 LOWER, ≥ 1 PUSH, ≥ 1 PULL, unless a parent is excluded by a session-scoped hard constraint or has no eligible exercise. Every waiver is recorded. Inspired by AF-01, AF-03 (citation_resolved).
- **RULE-016 Main-lift count.** Default 2 LOWER + 2 UPPER main slots. LOWER main slots = 1 if any LOWER region is RECENT_24; 0 if lower is "too sore" today. UPPER mirrors this. A freed main slot becomes a CORE or GOAL_ACCESSORY slot in block B (strength + core pairing, AF-11).

### 5.2 Session size from minutes (R-01)

| Tier | Minutes | PREP | A | B | C | FINISH | Est. total |
|---|---|---|---|---|---|---|---|
| — | < P-01 (15) | no session generated; offer skip or mobility-only | | | | | |
| T0 | 15–19 | 3 min | 2–3 sets | — | — | — | ≤ 19 |
| T1 | 20–29 | 4 | 3 sets | 2 sets | — | — | ≤ 29 |
| T2 | 30–39 | 5 | 3 | 3 | 2 sets | — | ≤ 39 |
| T3 | 40–49 | 6 | 3 | 3 | 2–3 | ≤ 6 min | ≤ 49 |
| T4 | ≥ 50 | 7 | 3 | 3 | 3 | ≤ 8 min | capped at P-02 (55) |

Sessions do not grow past T4 when more time is available. The cap is inspired by AF-06 (about 50 minutes; documented, multi-location). B3 will replace the P-01 minimum and may reshape tiers.

### 5.3 Load posture (RULE-011)

Readiness "down flags": R-02 = low (1), R-03 = poor (1), R-07 = no (1, sunset when OQ-02 closes). R-06 = yes → user chooses normal / lighter / skip; "lighter" forces LIGHT.

| Down flags | Posture | Also floored by |
|---|---|---|
| 0 | STANDARD | RULE-012 proximity → MODERATED |
| 1 | MODERATED | |
| ≥ 2 | LIGHT | R-06 "lighter" |

| Effect | STANDARD | MODERATED | LIGHT |
|---|---|---|---|
| Set counts | per tier | −1 set on B and C (min 2) | 2 sets everywhere |
| Progression attempts | allowed if gates pass | none (hold) | none (hold; load may drop one increment if user asks) |
| New exercises (first exposure) | allowed | only low skill tier | none |
| POWER / CONDITIONING finish | eligible per rules | not eligible | not eligible |
| Architecture | unchanged | unchanged | unchanged |

Readiness never changes architecture (APP_V0_SCOPE; D-028). R-04 (right arm) is not a down flag: it acts only on right-triceps-involved exercises (§7, §9.6).

### 5.4 Family eligibility and priority

Each family gets an eligibility state, then a priority score.

| State | Meaning |
|---|---|
| ELIGIBLE | has ≥ 1 eligible exercise after hard filters |
| RESTRICTED_TODAY | session-scoped exclusion (too sore, user choice) |
| NOT_ENABLED | preference-gated (impact power, conditioning) or posture-gated |
| UNFILLABLE | no exercise survives filters (e.g., VPULL if capability unknown); recorded, surfaced as a question |

**Family priority FP(f)** (RULE-020), integers, tunable:

```
FP(f) =  3 × min(deficit(f), 2)                # P-30: undertrained
       + goal_weight(f)                        # P-31: 0–2 from goals
       − 4 × [any region of f is RECENT_24]    # P-32
       − 2 × [any region of f is RECENT_48]    # P-33
       − 2 × [region mildly sore]              # P-34 (dormant until mild level exists)
       − 1 × forward_look_high_fatigue(f)      # P-36
```

Default goal weights until B1 (P-31): all main families +1 (G-01 lean mass); VPUSH +1 extra (G-04 shoulders); each CORE subtype +1 (G-07); GOAL_ACCESSORY +2 if B2 allows, else family NOT_ENABLED. Nothing else is weighted, because nothing else is stated.

### 5.5 Slot planning (RULE-017)

1. Decide LOWER and UPPER main-slot counts (RULE-016).
2. **Block A:** the LOWER family with the highest FP whose best candidate can carry the PRIMARY role, plus the UPPER family with the highest FP whose best candidate can carry the PRIMARY role. Ties: prefer the family with the older `last_touch_at`.
3. **Block B:** the other LOWER family, plus the best UPPER family from the **other** upper parent (if A has PUSH, B takes PULL). If that parent is ineligible, the next-best upper family. Freed slots per RULE-016 become CORE (highest-FP subtype) or GOAL_ACCESSORY.
4. **Block C (T2+):** highest-FP CORE subtype, plus the highest of CARRY / GOAL_ACCESSORY / ROTATION / next CORE subtype, subject to the pairing rules.
5. **Finish (T3+):** §11.
6. Re-check RULE-015; if violated, swap the lowest-FP main slot for the missing parent's best family.

Families pick slots; exercises never pick families. Undertraining is a family-level signal only (D-020).

---

## 6. Hard filters (eligibility before scoring)

Applied in order. Outcome is EXCLUDED (never selectable) or HELD (not auto-selected; the user can choose it manually; surfaced as a question). A candidate's first failing filter is recorded as its elimination reason.

| ID | Filter | Outcome | Source of truth | Basis |
|---|---|---|---|---|
| HF-01 | Conflicts with an ACTIVE hard constraint (HC-01 dips; HC-02 documented high-plank match, e.g., EX040) | EXCLUDED | PERSONAL_constraints.yaml, `position_tags` | PERSONAL |
| HF-02 | Position-dependent match to a constraint whose scope is pending (HC-02: EX025, EX076 unspecified, EX077–EX079, EX034, EX032) | HELD_PENDING_SCOPE | same | PERSONAL (D-024) |
| HF-03 | Adopted candidate constraint set to HARD_EXCLUDE (SC-03, SC-04 when adopted) | EXCLUDED | same | PERSONAL |
| HF-04 | Session-scoped exclusion: region "too sore to load" (R-05) | EXCLUDED today | check-in | PERSONAL |
| HF-05 | Explicit avoidance list | EXCLUDED | profile | PERSONAL |
| HF-06 | Required equipment NOT_AVAILABLE; or UNKNOWN (held until confirmed); or EQUIPMENT_ISSUE flagged today | EXCLUDED / HELD_EQUIPMENT_UNKNOWN / EXCLUDED today | availability file, check-in | NONE |
| HF-07 | STOPPED_SYMPTOM on this exercise not yet reviewed by the user; or UNCOMFORTABLE on 2 consecutive exposures | HELD_PENDING_REVIEW | logs | PERSONAL (profile DURING_WORKOUT_FEEDBACK) |
| HF-08 | Same exercise, fatigue_tier ≥ MODERATE, used < 48 h ago (P-16); or already in this session | EXCLUDED today | rolling state | NONE (Q-07: no Alloy evidence exists) |
| HF-09 | Capability prerequisite not established (e.g., bodyweight chin-up/pull-up with no logged or stated rep capability) | HELD_CAPABILITY_UNKNOWN | metadata `capability_prereq`, profile | NONE (D-024) |
| HF-10 | Posture incompatibility: POWER or `impact` tag under MODERATED/LIGHT; first exposure under LIGHT; skill tier HIGH under LIGHT | EXCLUDED today | posture | NONE |
| HF-11 | Duration incompatibility: exercise time cost at role dose exceeds the slot's time budget (e.g., long setup, high per-side time in T0/T1) | EXCLUDED today | metadata `est_seconds_per_set`, `setup_seconds` | NONE |
| HF-12 | Region RECENT_24 and candidate is HIGH fatigue in that region, for A-slot (PRIMARY) role only | EXCLUDED from A today | rolling state | NONE |
| HF-13 | Preference-gated family not enabled (impact POWER until P-08; CONDITIONING until opt-in) | NOT_ENABLED | profile preferences | NONE |

Things deliberately **not** filtered: candidate soft constraints SC-02 to SC-05 while pending (D-013); CONTEXT health items (D-014); anything the system might infer from a diagnosis. The generation record lists each pending candidate as "not applied".

---

## 7. Exercise scoring (within a slot)

### 7.1 Principle

Scoring ranks eligible exercises **inside a family that has already been chosen**. It is a short additive list of integer terms, each with a readable reason string. No term represents "undertrained," because that belongs to the family level.

### 7.2 Terms (RULE-030 to RULE-039)

| Term | Value (P-40…) | Condition |
|---|---|---|
| CONT continuity | +3 | active progression line in this role within H14, not rotation-due, no negative flags |
| PRIO priority fit | +2 | directly trains a stated priority target (e.g., shoulders for VPUSH under G-04; supinated elbow flexion for G-05 in GOAL_ACCESSORY) |
| PREF preference | +2 / −3 | PREFER flag / DISLIKE flag (DISLIKE never lowers load) |
| ALLOY evidence basis | +1 | exercise exists in the Alloy-evidence library (vs supplemental layer) |
| ROLE fit | +1 | can deliver the slot's role at available increments (e.g., PRIMARY needs a progressable load; an exercise already at the top available load and rated TOO_EASY gets 0) |
| UNI unilateral | +1 | lower slot, weekly unilateral target unmet, RULE-023 allows |
| REC recency | −2 | same exercise used 48–72 h ago |
| FAT fatigue conflict | −3 | loads a region that is RECENT_48 (or mildly sore, dormant) |
| SOFT soft constraint | −4 | right-triceps involvement PRIMARY/SECONDARY when R-04 = worse (SC-01); other adopted SOFT constraints per their parameters |
| CMPX complexity | −2 | skill tier above demonstrated level; or first exposure under MODERATED |
| ROT rotation due | −2 | exposures in current line ≥ P-50 (6), or line STALLED (§10.6) |
| UNC discomfort | −3 | UNCOMFORTABLE on the most recent exposure |
| RED redundancy | −2 | same sub-pattern and implement as an exercise already placed this session |

Typical range is about −8 to +9. The terms were kept to what changes a real choice for Nelson; more can be added only when a Phase 8 session shows a wrong pick that an existing term cannot fix.

### 7.3 Why these and not others

- *Goal relevance* is mostly handled at family level; PRIO keeps only the part that differs between exercises.
- *Equipment convenience* depends on the partner exercise, so it lives in pairing (§8), not here.
- *Useful variation* is ROT: variation earns points only when continuity has run its course, never for novelty (D-022).
- *ALLOY* is small on purpose. It keeps the system Alloy-flavored without letting evidence provenance override fit, preference, or safety.

### 7.4 Tie-break (RULE-090)

Candidates within P-44 (1 point) of the top eligible score form the tie set. One is chosen by a seeded pseudo-random draw. Seed = hash(user, generation timestamp, session count), logged with the tie set (D-007). Randomness never selects families, slots, pairs, block count, sets, reps, rest, or loads.

---

## 8. Pairing engine

### 8.1 Evidence separation

| What | Classification | Our use |
|---|---|---|
| Strength work organized as paired supersets | ALLOY_DOCUMENTED (AF-04; one current location + historical corporate) | A/B/C are pairs |
| Lower + upper, strength + core, hinge + pull, loaded carry + KB hinge are common | ALLOY_OBSERVED / partial SUPPORTED_PATTERN (AF-11; pending ≥ 2 verified workouts per pattern) | default pair preferences |
| Explosive → strength same-pattern compound sets | ALLOY_OBSERVED + documented rationale (AF-15) | deferred to v0.2 |
| "Pairs let one movement recover while another is coached" | REASONABLE INFERENCE in R2; not a finding | not cited as Alloy |
| Everything in 8.2–8.4 (conflict costs, grip, right triceps, stations) | SYSTEM_DESIGN | ours |

### 8.2 Hard pairing rules (RULE-040 to RULE-044)

- **RULE-040** Never pair two exercises that both load the same region at MODERATE+ fatigue (no same-muscle supersets in V0).
- **RULE-041** Never pair two right-triceps-involved exercises (`right_triceps_involvement` PRIMARY or SECONDARY) in the same block.
- **RULE-042** Never pair two exercises that need the same single-unit station unless they are done on it back to back without re-setup.
- **RULE-043** Never pair two HIGH skill-tier exercises.
- **RULE-044** Default composition per block: A and B = one LOWER + one UPPER; C = CORE + (CARRY | GOAL_ACCESSORY | ROTATION | CORE). Inspired by AF-11.

### 8.3 Soft pairing cost (RULE-045)

When more than one legal assignment exists (e.g., which lower goes with which upper, or the top-2 candidates in two slots produce different pairs), choose the assignment with the lowest total cost:

| Cost | Value (P-60…) | Condition |
|---|---|---|
| GRIP_STACK | 2 | both exercises `grip_demand` HIGH (e.g., heavy hinge + heavy carry) |
| TRUNK_STACK | 2 | both `trunk_demand` HIGH (e.g., heavy carry + rollout) |
| UNI_STACK | 1 | both unilateral (doubles block time) |
| ZONE_SPLIT | 1 | different station zones (rack / DB-KB area / machines / floor) |
| SHARED_STATION | 1 | one exercise ties up a single-unit shared station (rack, bench, machine) |
| SYSTEMIC_STACK | 2 | both `fatigue_tier` HIGH |
| PREFERENCE_PAIR | −2 | pair matches a stated pairing preference ("biceps with shoulder work", profile PR) |

If the lowest-cost assignment would demote an exercise more than P-46 (3) score points below its slot's top candidate, keep the higher-scoring exercises and accept the cost; exercise fit outranks logistics.

### 8.4 Procedure

1. For each block, take the top K = 3 candidates per slot (after tie-break ordering).
2. Enumerate legal pairs (8.2). Score = sum of exercise scores − pairing cost.
3. Pick the best pair; ties → better A-slot exercise score → seeded draw.
4. Resolve blocks in order A → B → C so later blocks see earlier choices (RED term, station use).
5. Record every rejected legal pair with its cost breakdown.

---

## 9. Set / rep / rest engine

### 9.1 Roles

| Role | Where | Sets (STANDARD) | Reps | Rest after pair | Effort target |
|---|---|---|---|---|---|
| PRIMARY | A1, A2 | 3 | 6–10 | 90 s (P-70) | last set HARD, others GOOD–HARD |
| SECONDARY | B1, B2 | 3 | 8–12 | 75 s (P-71) | same |
| ACCESSORY / GOAL_ACCESSORY | C, finish | 2–3 | 10–15 | 45–60 s | GOOD–HARD |
| CORE | C, finish | 2–3 | 20–40 s holds or 6–10 reps/side | 30–45 s | controlled, no form breakdown |
| CARRY | C, finish | 2–3 | 30–45 s (distance once carry lane known) | 45–60 s | GOOD–HARD grip, upright |

Unilateral: reps per side. Within-pair transition target 15–30 s.

Ranges draw on prescriptions observed in public Alloy workouts and one historical documented example (for example squat 3×6, push-up 3×10, Pallof 3×12; supersets at 4×8; 5×5 days), but the choice of these particular ranges for Nelson's lean-mass-preservation goal is SYSTEM_DESIGN (basis ALLOY_OBSERVED for the range of values, NONE for the assignment). The 5×5-at-85%-1RM claim is quarantined (Q-06) and unused.

"HARD" is the top of the logging scale, meaning intended hard effort, not failure. Whether sets must always stop short of failure is candidate SC-05 (pending B5). Until adopted, the default target is simply "HARD, not TOO_HARD, all reps with good form."

### 9.2 Modifiers

| Modifier | Effect |
|---|---|
| Tier T0/T1 | A: 2–3 sets, B: 2 sets |
| MODERATED | −1 set on B and C (min 2); no progression; load = last qualifying load |
| LIGHT | 2 sets everywhere; load = last qualifying load, or one increment lower if the user chooses |
| G-01 deficit phase (RF-01) | no set additions for progression while B1 says "preserve"; failure to progress logged as HELD, not regression (profile PROGRESSION_GATES context modifier) |

### 9.3 Time estimation (used by HF-11 and V-03)

```
block_minutes = setup + Σ_sets [ work(A1) + transition + work(A2) + rest_after_pair ] / 60
work(x)       = est_seconds_per_set(x) × (2 if unilateral and per-side else 1)
transition    = 20 s same zone, 45 s different zone          (P-72, P-73)
setup         = 60 s per block + 90 s for PRIMARY ramp sets   (P-74, P-75)
session       = prep + Σ blocks + finish,   validated against R-01 with 10 % buffer (P-76)
```

`est_seconds_per_set` defaults: 40 s bilateral rep sets, 35 s per side unilateral, hold time for isometrics, carry time for carries (C1 field).

### 9.4 Load guidance without 1RM

No one-rep maxima are estimated or used; no V0 decision needs one.

| Progression state | Load prescription |
|---|---|
| CALIBRATION (no history) | "Start light. Pick the weight where the target reps feel GOOD. If set 1 is TOO_EASY, go up one step for set 2." Within-session adjustment allowed only in calibration. Resulting load logged with confidence LOW. |
| BUILDING / HOLD | last qualifying load and rep target from §10 |
| REDUCE | one available increment below last load |
| Recalled number from user (not logged) | used as a calibration ceiling, confidence LOW, until re-logged (profile record_schema) |

Increment source is the equipment record: kettlebells in 5 lb steps from 25 to 45 lb as confirmed (lighter end unknown); hex dumbbells confirmed to 50 lb (light end and anything above 50 unknown); stack/plate increments unknown. If the next step is larger than P-77 (15 %) of the current load, extend the rep target by +2 before the jump (§10.4).

### 9.5 Tempo (only when it earns its place)

Explicit tempo is prescribed only when:
1. first two exposures of a new exercise (controlled 3 s lowering, for learning), or
2. load progression is blocked by increments or top available load (tempo as the progression lever), or
3. the user or a trainer specified it.

Inspired by AF-07 (tempo is a documented adjustment lever). Otherwise tempo reads "controlled."

### 9.6 Right-triceps handling (SC-01, parameters pending B5)

Rules that hold regardless of B5 answers (PERSONAL basis, D-018):
- Every right-triceps-involved exercise is logged per side, including the fade rep.
- Right-side progression uses right-side evidence only. For bilateral implements (both hands at once), the load progresses only when both sides qualify.
- `right_triceps_sets_d7` is tracked and shown in the generation record, not interpreted.

Behaviors held open until B5 (defaults shown):

| Parameter | Options (from profile) | V0 default until answered |
|---|---|---|
| Uneven per-side dosing allowed? | yes / no | no: same prescription both sides; unilateral exercises may log different reps |
| Right-side set termination (SC-02) | adopt / not | not applied |
| Weekly right-triceps set cap | number / none | none; monitoring only |
| Day-of R-04 = worse | score penalty only / skip involved exercises / reduce dose | score penalty −4 (SOFT) and RULE-041 pairing; no exclusion |

---

## 10. Progression

### 10.1 Progression line (state per exercise, per side where applicable)

```
progression_line:
  exercise_id, side (bilateral|left|right), role
  state: CALIBRATION | BUILDING | HOLD | REDUCE | STALLED | ROTATE_DUE | HELD_REVIEW
  current: {load, load_unit, rep_target, rep_range, tempo, rom}
  exposures_in_line, qualifying_exposures, consecutive_top_of_range, consecutive_held
  last_feedback: {effort per set, flags}
  last_decision: {dimension, from, to, reason, gates_passed[], gates_failed[]}
```

### 10.2 Qualifying exposure (evidence rule, RULE-060)

An exposure counts as evidence only if **none** of these apply (from profile PROGRESSION_GATES.global_overrides): R-06 = yes or R-02 = low that day; SESSION_CAPACITY = below_usual; TECHNIQUE_DIFFICULTY on the exercise; UNCOMFORTABLE or STOPPED_SYMPTOM on the exercise; posture ≠ STANDARD. Non-qualifying exposures neither progress nor regress the line; they are recorded as "not evidence."

### 10.3 Decision table (RULE-061 to RULE-066)

| Evidence on last qualifying exposure(s) | Decision | Dimension |
|---|---|---|
| CALIBRATION, 1 exposure logged with GOOD/HARD at target reps | → BUILDING at logged load | none |
| All sets TOO_EASY (once) | increase load one increment | load (AF-09: increase when the last set looks easy) |
| All sets reached top of rep range with GOOD/TOO_EASY on P-51 (2) consecutive qualifying exposures | increase load one increment; reps reset to bottom of range | load |
| Reps completed within range, effort GOOD | rep target +1 (up to top of range) | reps |
| Effort HARD at target, reps met | hold | none |
| TOO_HARD on ≥ 2 sets **without** UNCOMFORTABLE, or reps missed by ≥ 2 on ≥ 2 sets | REDUCE one increment | load (AF-09: decrease when technique degrades) |
| TECHNIQUE_DIFFICULTY | REDUCE one increment, or documented regression if already at lowest load | load / variant |
| TOO_HARD + UNCOMFORTABLE | hold load; mark tolerance problem; −3 UNC next time; HF-07 on second consecutive | none (not a load problem, per profile disambiguation) |
| STOPPED_SYMPTOM | HELD_REVIEW until the user reviews it | none |
| TOO_HARD on most exercises + SESSION_CAPACITY below_usual | no per-exercise change (general fatigue, not load) | none |

Only one dimension changes per exposure. Load never changes by more than one available increment per exposure.

### 10.4 Dimension order (RULE-067)

reps within range → load → (only if the next load step is unavailable or > P-77) extended reps (+2 above range) → tempo → ROM (only with explicit user confirmation of comfort; never assumed) → exercise variant (complexity).

Sets are **not** a V0 progression dimension while the deficit-phase intent is "preserve" (B1). Inspired by AF-07 (levers), AF-09 (technique before load), and R2's reconstructed hierarchy (a REASONABLE INFERENCE in R2, not a finding: cited as context only).

### 10.5 Complexity progression (RULE-068)

A harder variant is considered only when **all** hold:
- the current line is load-blocked (top available load reached, or increments too large) or STALLED;
- prerequisite variant stable for P-52 (3) qualifying exposures, no TECHNIQUE_DIFFICULTY in the last 2;
- the target variant passes every hard filter and equipment check;
- the target is linked in the progression tree (documented Alloy progressions where they exist, e.g., AF-16 plank chain, AF-19 posterior-chain chain; otherwise a SYSTEM_DESIGN link in the metadata layer).

Novelty is never a reason. A variant change starts a new line in CALIBRATION.

### 10.6 Maintain, regress, stall

- **Maintain** is the correct outcome for: non-qualifying exposures; HARD at target; MODERATED/LIGHT days; the deficit phase when no gate passes.
- **Regress** only per 10.3 (load) or TECHNIQUE_DIFFICULTY at lowest load (variant).
- **STALLED:** P-53 (3) consecutive qualifying HOLDs. Effect: ROT −2 next time so a sibling can win; the line is kept for return.

### 10.7 Right side

Right-side lines follow the same table using right-side data only. RIGHT_ARM_FADE before the target rep makes the right side non-qualifying for load increase (profile gate). The fade rep is recorded and never interpreted. Left-side success never triggers right-side progression (D-018).

### 10.8 Alloy logs and progression (D-025)

Alloy sessions feed exposure, recency, and region fatigue. They never feed load progression, because implement, setup, coaching, and tempo differ and are not logged comparably.

---

## 11. Movement preparation and finish

### 11.1 Movement preparation (RULE-070, built after blocks are chosen)

| Step | Content | Source |
|---|---|---|
| 1. General warm-up (2–4 min) | bike (EX103), treadmill walk, or elliptical | AF-20 (one location, 2026, citation_resolved) |
| 2. Joint articulation (2 items) | chosen by A/B patterns from available items: ankle rocks (EX101), hip circles (EX102), spiderman stretch (EX038), standing external rotation hip stretch (EX036) | AF-20 |
| 3. Pattern rehearsal | unloaded or very light version of A1 and A2 patterns | AF-20 (bodyweight squats, unloaded hinges named) |
| 4. Ramp sets | 2 lighter sets building to A1 and A2 working loads; 1 for a B exercise in CALIBRATION | NONE (R1's "non-negotiable ramp" claim is from a quarantine-grade report and is not cited) |

Prep items pass the same hard filters (e.g., no high-plank position under HC-02). Band pull-aparts and foam-roller items are unavailable at the apartment gym.

### 11.2 Finish selection (RULE-071 to RULE-077)

Evaluated in order; the first that applies wins. Q-08 (a universal metabolic finisher) is **contradicted** in the findings register; AF-05 and AF-21 support a finish chosen per goal.

| # | Condition | Finish |
|---|---|---|
| 0 | tier < T3, or remaining time < P-80 (5 min) | NONE |
| 0b | posture LIGHT | MOBILITY (optional) or NONE |
| 1 | GOAL_ACCESSORY enabled (B2), goal-accessory touches D7 < target, no arm training logged in last 24 h (if OTHER logs count), block C did not already cover it | GOAL_ACCESSORY: default pair = elbow flexion + shoulder isolation (stated preference); elbow extension only per B5 settings and R-04 ≠ worse |
| 2 | a CORE subtype or CARRY still has a deficit after block C | CORE or CARRY |
| 3 | a main family deficit remains unplaced and posture STANDARD | ADDITIONAL_STRENGTH (MODERATE or LOW fatigue candidate) |
| 4 | conditioning opted in (P-07), posture STANDARD, no conditioning in last 24 h, no Alloy within 20 h | CONDITIONING: non-impact machine intervals (bike, elliptical, stair stepper) at moderate intensity; format from observed Alloy interval structures (AF-04/format vocabulary, D-004) |
| 5 | time remains | MOBILITY |
| 6 | otherwise | NONE |

Power as a finish is not offered in V0. The ordering above assumes G-01 → G-04/G-05 → G-07 priority; B1 may reorder rows 1–3.

---

## 12. Validation and repair

### 12.1 Validators

| ID | Checks | Severity |
|---|---|---|
| V-01 HARD_CONSTRAINT | every item (prep, main, finish) against HF-01 to HF-05 | BLOCK, never waivable |
| V-02 EQUIPMENT | availability; no simultaneous need for one single-unit station; prescribed load within confirmed range | BLOCK, never waivable |
| V-03 DURATION | estimated minutes ≤ R-01 with buffer; ≥ tier minimum | BLOCK |
| V-04 BALANCE | RULE-015 coverage; D7 pull ≥ push (soft); ≥ 1 unilateral lower in D7 if possible | BLOCK for RULE-015 (waivable only with recorded reason); WARN for the rest |
| V-05 REDUNDANCY | no duplicate exercise; no two items with same sub-pattern + implement unless deliberate | BLOCK |
| V-06 FATIGUE | HF-12 held; RULE-022 respected; posture limits respected | BLOCK |
| V-07 PAIRING | RULE-040 to RULE-043 | BLOCK |
| V-08 RECENCY | HF-08 respected | BLOCK |
| V-09 GOAL_ALIGNMENT | ≥ P-81 (4) main strength movements when tier ≥ T1 and no session-scoped exclusion (G-01); GOAL_ACCESSORY present when enabled, under target, and time allows (else reason recorded) | WARN, becomes BLOCK when no reason is recorded |
| V-10 PROGRESSION | every change backed by a qualifying exposure; ≤ 1 increment; one dimension; right-side independence; no complexity change without RULE-068 | BLOCK |
| V-11 HELD_ITEMS | no HELD item auto-selected | BLOCK |
| V-12 RECORD_COMPLETE | every item has the §13 fields | BLOCK |

### 12.2 Repair (RULE-080 to RULE-083)

For each failing BLOCK validator, apply the first repair that fixes it, then re-run all validators:

1. replace the item with the next candidate in the same slot;
2. re-pair within the block;
3. reduce sets or role dose;
4. change the slot's family to the next-highest-FP family;
5. drop optional content in order: FINISH → C2 → C1 → B2.

Maximum P-82 (10) repair iterations. V-01 and V-02 can never be waived. If a minimal session (PREP + block A) cannot pass, the generator returns **NO_SESSION** with the blocking reasons and the questions that would unblock it. It never presents an invalid session. Every repair is recorded.

---

## 13. Explainability

### 13.1 Generation record (technical, stored)

Session level:
```
generation_id, engine_version, parameter_version, generated_at, seed
inputs_snapshot_refs: {profile_version, constraints_version, equipment_version, library_version, metadata_version}
check_in: R-01..R-07 answers
session_size, load_posture, posture_reasons[]
rolling_state_summary: {l1, next_known_session, deficits by family, recent regions, cold_start, coverage_uncertain}
family_priorities: [{family, FP, terms[], eligibility_state}]
slot_plan: [{slot, family, role, why}]
constraints_applied: [{id, effect, items_affected[]}]
constraints_not_applied: [{id, status, note}]          # pending candidates, CONTEXT items
validators: [{id, result, repairs[]}]
waivers: [{validator, reason}]
unfillable_families: [{family, reason, unblocking_question}]
```

Per selected item:
```
item_id, slot, exercise_id, evidence_basis (ALLOY_LIBRARY | SUPPLEMENTAL)
movement_reason        # why this family is in the session (deficit, goal weight, coverage rule)
selection_reason       # the score terms that decided it, in words
score_total, score_terms[]
alternatives: [{exercise_id, score, outcome: LOST|EXCLUDED|HELD, reason}]   # top 3 losers + every HELD in family
pairing: {partner_id, cost_terms[], rejected_pairs[]}
recent_training: [{session_id, env, when, what_mattered}]
user_priorities: [goal/priority IDs that affected it]
progression: {line_state, decision, dimension, from, to, gates_passed[], gates_failed[]}
constraint_effects: [{constraint_id, effect}]
tie: {tie_set[], draw_used: bool}
rule_ids: [RULE-..., HF-...]
```

### 13.2 "WHY THIS EXERCISE?" (user-facing, generated from the record)

Three short lines, plain language, no scores:
1. **Why this movement:** from `movement_reason` (e.g., "You haven't done a carry in the last 7 days, including your Alloy sessions.").
2. **Why this exercise:** the top one or two positive terms and any decisive exclusion of a more obvious option (e.g., "You've done it the last 3 sessions, so we're continuing to build it. Pull-ups are waiting on your answer about your current reps.").
3. **Today's adjustment:** progression decision or posture effect (e.g., "Same weight as last time: you rated it HARD, so we're holding.").

Pending constraints, CONTEXT items, and scores stay in the technical record.

---

## 14. Rule / evidence ledger

All rules: `class: SYSTEM_DESIGN`. `verification` reflects the Phase 0 findings register (no finding is source_verified yet; RB-01 pending).

| Rule | Summary | Basis | Inspired by | Verification | Design merit only? |
|---|---|---|---|---|---|
| RULE-001 | One archetype; size and posture as parameters | NONE | AF-05 | citation_resolved | no |
| RULE-002 | Template PREP → A → B → optional C → optional finish | ALLOY_DOCUMENTED | AF-04, AF-05 | citation_resolved (one location for AF-05) | no, flagged |
| RULE-003 | Session cap ~55 min | ALLOY_DOCUMENTED | AF-06 | citation_resolved | no, flagged |
| RULE-010 | Windows L1/L3/D7/H14, timestamp-based | NONE | — | n/a | yes |
| RULE-011 | Load posture from readiness | PERSONAL | profile R-01..R-07, D-017 | n/a | no |
| RULE-012 | Proximity posture floor | NONE | profile TRAINING_FREQUENCY note | n/a | yes |
| RULE-013 | Forward look to known Alloy session | NONE | D-016 | n/a | yes |
| RULE-014 | No weekly volume catch-up | NONE | D-005 | n/a | yes |
| RULE-015 | Full-body coverage every session | ALLOY_DOCUMENTED | AF-01, AF-03 | citation_resolved | no, flagged |
| RULE-016 | Main-lift counts from region fatigue | NONE | AF-21 (reduce volume where signaling trouble) | citation_resolved | partly |
| RULE-017 | Families choose slots; exercises never choose families | NONE | D-020 | n/a | yes |
| RULE-020 | Family priority FP | NONE | AF-21 | citation_resolved | mostly |
| RULE-021/022 | Recent high-fatigue limits | NONE | Q-07 (no Alloy evidence) | n/a | yes |
| RULE-023 | Unilateral bonus/limit | SUPPORTED_PATTERN (proposed) | AF-12 | raw_only | **yes** |
| RULE-024 | Power spacing; impact gated | ALLOY_OBSERVED | AF-15 | citation_resolved | partly |
| RULE-025 | Conditioning spacing; opt-in | ALLOY_DOCUMENTED | AF-05, Q-08 | citation_resolved | partly |
| RULE-026 | Mild soreness (dormant) | PERSONAL | R-05 | n/a | no |
| Weekly targets (§4.3) | touch targets | mixed | AF-01, AF-03, AF-13, AF-14, AF-12 | AF-13/14/12 raw_only | **yes for carry, core, unilateral targets** |
| HF-01..HF-05, HF-07 | constraint, avoidance, session-scoped, review holds | PERSONAL | PERSONAL_constraints, D-006, D-013, D-017 | n/a | no |
| HF-06 | equipment eligibility | NONE | equipment files | n/a | yes |
| HF-08 | 48 h repetition window | NONE | Q-07 (unknown in evidence) | n/a | yes |
| HF-09 | capability-unknown hold | NONE | D-024 | n/a | yes |
| HF-10..HF-13 | posture, duration, A-slot fatigue, preference gates | NONE | — | n/a | yes |
| RULE-030..039 | scoring terms | NONE | AF-07 (preserve objective, change tool) informs CONT/ROT | citation_resolved | mostly |
| RULE-040 | no same-region supersets in V0 | ALLOY_OBSERVED (lower+upper common) | AF-11 | citation_resolved (partial) | partly |
| RULE-041 | no two right-triceps exercises paired | PERSONAL | SC-01 | n/a | no |
| RULE-042/043 | station and skill pairing limits | NONE | — | n/a | yes |
| RULE-044 | default block composition | ALLOY_OBSERVED | AF-11 | citation_resolved (partial) | no, flagged |
| RULE-045 | pairing cost matrix | NONE | — | n/a | yes |
| Role table (§9.1) | sets/reps/rest by role | ALLOY_OBSERVED (value range) | public workout prescriptions via R2/R3; historical documented example (AF-04 source) | citation_resolved | assignment is design |
| Load guidance (§9.4) | calibration, no 1RM | ALLOY_DOCUMENTED | AF-09 | citation_resolved | partly |
| Tempo triggers (§9.5) | when tempo appears | ALLOY_DOCUMENTED | AF-07 | citation_resolved | partly |
| Right-triceps rules (§9.6, §10.7) | per-side logging and progression | PERSONAL | SC-01, D-018 | n/a | no |
| RULE-060 | qualifying exposure | PERSONAL | profile PROGRESSION_GATES | n/a | no |
| RULE-061..066 | progression decision table | ALLOY_DOCUMENTED (load up when easy, down when technique breaks) | AF-09 | citation_resolved | thresholds are design |
| RULE-067 | dimension order | ALLOY_DOCUMENTED (levers exist) | AF-07, AF-09 | citation_resolved | order is design |
| RULE-068 | complexity only when earned | ALLOY_DOCUMENTED (technique earns load) + documented chains | AF-09, AF-16, AF-19 | AF-16 mixed, AF-19 raw_only | chains flagged |
| RULE-070 | movement prep content | ALLOY_DOCUMENTED | AF-20 | citation_resolved (one location) | ramp sets yes |
| RULE-071..077 | finish selection | ALLOY_DOCUMENTED (finish per goal) | AF-05, AF-21; Q-08 contradicted | citation_resolved | order is design |
| RULE-080..083 | validation and repair | NONE | APP_V0_SCOPE acceptance criteria | n/a | yes |
| RULE-090 | seeded tie-break | NONE | D-007 | n/a | yes |
| D-023 layer | supplemental exercises | NONE | AF-10 notes Alloy is not machine-centric; machines get no ALLOY bonus | citation_resolved | yes |

**Not used anywhere, by design:** Q-01/Q-02 (FMS quadrant routing), Q-03 (Trainerize templates), Q-04 (Day-1 mandate), Q-06 (5×5 at 85 % 1RM, undulating periodization), Q-08 (universal finisher), Q-10 (cross-plane rule), Q-13 (emotional/hotspot), AF-17 (heavy/medium/light week, v0.2), AF-18 (4–6 movements statistic; our 4 main + 2 C-slot count is a design parameter that happens to sit inside that range and does not cite it).

---

## 15. Parameter register (all tunable SYSTEM_DESIGN placeholders)

| ID | Parameter | Default |
|---|---|---|
| P-01 | minimum minutes to generate | 15 (replace with B3) |
| P-02 | session cap (minutes) | 55 |
| P-10 / P-11 | RECENT_24 window / min working sets | 24 h / 3 |
| P-12 / P-13 | touch threshold primary / secondary family | 2 / 3 working sets |
| P-14 | proximity posture floor window | 18 h |
| P-15 | forward-look window | 20 h |
| P-16 | hard repetition window | 48 h |
| P-20 | weekly touch targets | §4.3 |
| P-21 | goal-accessory direct touches / 7 d | 2 |
| P-30 to P-36 | family priority weights (deficit, goal, RECENT_24, RECENT_48, mild soreness, forward look) | 3, 0–2, 4, 2, 2, 1 |
| P-40… | exercise score terms | §7.2 |
| P-44 | tie tolerance | 1 point |
| P-46 | max score sacrifice for logistics | 3 points |
| P-50 | exposures before rotation is due | 6 |
| P-51 | consecutive top-of-range exposures for load increase | 2 |
| P-52 | stable exposures before complexity | 3 |
| P-53 | consecutive holds = STALLED | 3 |
| P-60… | pairing costs | §8.3 |
| P-70…P-76 | rest, transition, setup, buffer | §9.1, §9.3 |
| P-77 | "large increment" threshold | 15 % |
| P-80 | minimum finish time | 5 min |
| P-81 | minimum main strength movements (V-09) | 4 |
| P-82 | max repair iterations | 10 |

Change a parameter → bump `parameter_version` → the generation record shows which version produced each session.

---

## 16. Unresolved questions

### 16.1 Must be answered before the Phase 8 manual run

| ID | Question | What it unlocks | Default meanwhile |
|---|---|---|---|
| B3 | Preferred / minimum / maximum session length | tier table, P-01 | tiers as in §5.2 |
| B4a | HC-02 scope: does it cover forearm planks, shoulder-touch planks, renegade rows, mountain climbers? | 7 HELD core/pull exercises; ANTI_ROT and ANTI_EXT depth | HELD |
| B5 | Right triceps: intent, uneven per-side dosing, SC-02, SC-05 | §9.6 parameters, V-10 details | §9.6 defaults |
| B6 | How Alloy sessions will be logged; can you see the Alloy plan in advance? | FULL vs SUMMARY crediting; forward look precision | SUMMARY with assumed vector |
| UQ-G01 | Current chin-up / pull-up capability (reps, if any) | VPULL is otherwise UNFILLABLE at the apartment gym (no band, no pulldown) | VPULL HELD; recorded each session |
| UQ-G03 | Approve a small supplemental (non-Alloy) exercise layer for arm/shoulder isolation and the apartment machines (EQ017 to EQ021) | G-04/G-05 are otherwise unservable: the library has zero isolation exercises and no machine rows | GOAL_ACCESSORY UNFILLABLE |

### 16.2 Important, defaults are workable

| ID | Question | Default |
|---|---|---|
| B1 | Goal ranking; build vs preserve in the deficit | G-01 first, others equal; preserve (no set progression) |
| B2 | Apartment sessions per week; does the apartment generator share the arm/shoulder goal with DailyArms; are DailyArms/DailyAbs active and logged? | GOAL_ACCESSORY enabled only if B2 says yes; OTHER logs not counted |
| B4b/c/d | Push-up tolerance; SC-03; SC-04 | not applied; first exposures are calibration |
| UQ-G02 | Do any cable stations have an adjustable pulley (Pallof press, chops, pulldown)? | those exercises HELD (UNKNOWN) |
| UQ-G04 | Dumbbell range above 50 lb and light end; lightest kettlebell; KB pairs | only confirmed loads prescribed |
| UQ-G05 | Rack bar path (free vs guided); incline bench | barbell squat/press HELD; incline work HELD |
| UQ-G06 | Do apartment sessions ever happen on Alloy days (before 4 pm)? | allowed; forward-look rule handles it |
| UQ-G07 | Usable carry distance | carries prescribed by time |
| UQ-G08 | Finish, conditioning, and power/impact preferences (OQ-03, P-07, P-08) | conditioning opt-in; impact power NOT_ENABLED |
| UQ-G09 | Should compound pulls count toward the biceps goal? | no (direct work only) |
| UQ-G10 | Phase 2 verification of AF-01 to AF-21 | rules flagged provisional; raw_only-inspired rules stand on design merit |
| UQ-G11 | Whether the §4.3 targets are right for someone training 5 to 6 times a week across Alloy + apartment | calibrate in Phase 8 |
| UQ-G12 | A mild soreness level in R-05 (enables RULE-026) | dormant |

---

## 17. Minimum data contracts for the eventual application

Required fields only. Types are indicative, not code.

### C1 EXERCISE_METADATA (SYSTEM_METADATA layer; one row per usable exercise; never merged into the evidence dataset)

| Field | Values |
|---|---|
| exercise_id | EX### (library) or SX### (supplemental) |
| family_primary, family_secondary[] | §4.1 families |
| sub_pattern | e.g., goblet_squat, split_squat, rdl, row_supported, press_supine, press_overhead |
| laterality | bilateral / unilateral / alternating |
| per_side_logging | bool (true when right triceps involved or unilateral upper) |
| implement, equipment_ids[] | EQ### references |
| station_zone | RACK / DB_KB / BENCH / MACHINE / FLOOR / CARDIO |
| single_unit_station | bool |
| regions_loaded | {region: LOW / MODERATE / HIGH} |
| fatigue_tier | LOW / MODERATE / HIGH |
| skill_tier | LOW / MODERATE / HIGH |
| grip_demand, trunk_demand | LOW / MODERATE / HIGH |
| right_triceps_involvement | NONE / SECONDARY / PRIMARY |
| position_tags[] | high_plank, forearm_plank, quadruped, straight_arm_weight_bearing, supine_press, overhead_press, dip, impact, ballistic, floor |
| capability_prereq | null or text (e.g., "≥ 3 strict reps") |
| role_capable[] | PRIMARY / SECONDARY / ACCESSORY / CORE / CARRY / PREP / FINISH |
| est_seconds_per_set, setup_seconds | integers |
| load_mode | external_load / bodyweight / time / distance |
| increment_source | equipment ID whose increments apply |
| progression_links, regression_links | IDs + `link_basis` (ALLOY_DOCUMENTED chain ref, or SYSTEM_DESIGN) |
| goal_contribution | e.g., {elbow_flexion: DIRECT / INDIRECT} |
| evidence_basis | ALLOY_LIBRARY / SUPPLEMENTAL |

Families come from this layer only. The evidence dataset's `primary_pattern` and `horizontal_vertical` fields are incomplete and partly wrong (R3 defects in RAW_MANIFEST) and are not read by the engine.

### C2 SUPPLEMENTAL_EXERCISE

C1 fields plus `source: SYSTEM_DESIGN`, `added_because`, `approved_by_user_on`. Never carries an Alloy class.

### C3 EQUIPMENT_STATE

equipment_id, availability (AVAILABLE / NOT_AVAILABLE / UNKNOWN), confirmed_loads[] or {min, max, step}, single_unit, zone, today_issue (from check-in).

### C4 CHECK_IN

session_intent_id, timestamp, env, R-01..R-07 answers, R-06 choice (normal / lighter / skip), optional equipment issues.

### C5 SESSION_LOG (apartment)

session_id, generation_id, env, started_at, ended_at, items[]: {item_id, exercise_id, slot, sets[]: {side, load, load_unit, reps, time_s, rom, tempo, effort, flags[], right_arm_fade_rep}}, swaps[] (what was changed mid-session and why), session_capacity.

### C6 ALLOY_SESSION_LOG

session_id, date, start time, log_mode (FULL / SUMMARY), SUMMARY: {focus: full / upper / lower, perceived_effort, notes}; FULL: items with exercise_id or free text + family tag, sets/reps, loads optional; flags optional.

### C7 OTHER_TRAINING_LOG (pending B2)

session_id, program (DailyArms / DailyAbs / walking / other), date, focus tags, optional sets.

### C8 PROGRESSION_STATE (derived, cached)

§10.1 lines, rebuilt from C5 when any log is edited.

### C9 ROLLING_STATE (derived at generation)

§3.2 object, stored inside the generation record.

### C10 GENERATION_RECORD

§13.1.

### C11 PARAMETERS

parameter_version, §15 values.

### C12 CONSTRAINTS (exists; fields the engine needs)

constraint_id, status, hard/soft, target type, `mapped_tags[]`, `position_dependent_ids[]`, adoption option (for candidates), session_scoped (bool), source.

---

## 18. Acceptance scenarios (for the Phase 8 run; expected behavior only)

| ID | Scenario | Expected behavior |
|---|---|---|
| TS-01 | Morning after an Alloy full-body session logged as SUMMARY | posture floor MODERATED; parents credited as assumed; subtype deficits flagged coverage_uncertain; carry/core/goal families rise |
| TS-02 | No Alloy for 4 days, last apartment session 3 days ago | STANDARD posture; KD/HD primary slots; progression attempts allowed |
| TS-03 | 25 minutes available | T1: prep + A (3 sets) + B (2 sets); no C, no finish; V-03 passes |
| TS-04 | Right arm "worse" | right-triceps exercises −4; no two paired; no exclusion; record states SC-01 default |
| TS-05 | Lower body "too sore to load" | LOWER RESTRICTED_TODAY; RULE-015 waived with reason; blocks become upper + core |
| TS-06 | R-06 yes → "lighter" | LIGHT: 2 sets, no progression, no new exercises, finish mobility or none |
| TS-07 | Energy low + poor sleep | LIGHT via two down flags |
| TS-08 | Bench taken / 50 lb dumbbells missing | EQUIPMENT_ISSUE → affected items excluded today; repair picks next candidate |
| TS-09 | STOPPED_SYMPTOM on an exercise last session | exercise HELD_PENDING_REVIEW; sibling selected; record asks for review |
| TS-10 | First session ever (cold start) | all CALIBRATION; full-body coverage strict; no CONT bonuses |
| TS-11 | Goblet squat at heaviest confirmed KB, all sets TOO_EASY | extended reps → tempo → complexity candidate only if RULE-068 holds |
| TS-12 | 10 days with no logged training (travel) | cold-start deficits; loads = last qualifying load; the first exposure back is a hold (no progression); CONT bonus lapses for lines older than H14 |
| TS-13 | Alloy session in 6 hours | forward-look penalty on HIGH-fatigue families; no HIGH-fatigue lower progression |
| TS-14 | Only HELD items for VPULL | VPULL UNFILLABLE; PULL parent covered by HPULL; UQ-G01 surfaced |

Identical inputs + seed must reproduce identical output (APP_V0_SCOPE).
