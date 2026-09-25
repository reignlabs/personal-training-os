# DECISION_LOG addendum: Red-team revision, engine 0.2.0 (2026-09-23)

Append after D-040. All entries are SYSTEM_DESIGN. Sources: ENGINE_STRESS_TEST_LEDGER_v0_1.md (failures FL-xx), ENGINE_STRESS_TEST_RERUN_V0_2.md (verification). Full problem / old / new / reason / affected scenarios / new failure risk for each entry: ENGINE_WORKOUT_GENERATOR_V0_2.md §V.1 (M-xx).

**Status of earlier decisions.** Amended: D-031 by D-041 (tie-break), D-032 by D-043 (how anchors are chosen) and D-051 (DISLIKE trigger), D-033 by D-048 (`hand_support`) and D-057 (criteria), D-035 by D-042 (calendar-day repeat) and D-055 (recovery credits), D-036 by D-050, D-058, D-059, D-037 by D-055, D-038 by D-052, D-007 by D-045 (draw scope). D-040 superseded by D-060. All others retained.

**D-041: Staleness ties break by who led least recently.** (FL-01, FL-24; M-01)
Decision: add `family_last_primary` and `parent_last_primary` as second ordering keys; within the leading upper parent the PRIMARY family is the one that least recently held PRIMARY. Alternatives: rotating fixed schedule (ignores real staleness); randomness (rejected by project principle). Consequences: squat/hinge and push/pull alternate the leading role; pressing now leads half of sessions, which raises the weight of B4c/B5.

**D-042: Same-exercise exclusion is "not on consecutive calendar days."** (FL-02; M-02)
Decision: `REPEAT_EXCLUSION_DAYS = 1` replaces `REPEAT_EXCLUSION_HOURS = 48`. Alternatives: a shorter hour threshold (moves the cliff, keeps it). Consequences: no clock sensitivity at the user's cadence; the threshold now sits at midnight.

**D-043: Anchors come from preference and default order; filtered-day picks are substitutes.** (FL-03; M-03)
Decision: the anchor candidate is chosen ignoring today-only filters and history keys (K4, K5) for main roles; if it cannot be done today, the pick is SUBSTITUTE_NO_ANCHOR. Alternatives: allow the first pick to anchor (FL-03); promote a substitute after N uses (adds a counter and a rule). Consequences: long-term exercises are deliberate; users who only train on filtered days keep stable substitutes without an anchor.

**D-044: New role lines seed from the other main role's load.** (FL-04; M-04)
Decision: SEEDED line state; first exposure counts as evidence. Alternatives: share lines across roles (changes the line key and rep-range semantics). Consequences: no recalibration when roles alternate.

**D-045: `default_order` replaces harvest order; no draws in main roles.** (FL-05; M-05; amends D-007)
Decision: Q.1 `default_order`, authored under Q.1.1 and approved by the user, is K7; the seeded draw is limited to MOBILITY, CORE, CARRY and ACCESSORY. Consequences: starting exercises are reviewable choices; cold-start variety in main lifts is removed.

**D-046: Families with no servable exercise are removed from planning.** (FL-07, FL-24; M-06)
Decision: servability computed from static filters each generation; unservable families listed once with their question. Consequences: no phantom ANTI_LAT or VPULL slots.

**D-047: A core or carry family appears at most once per session.** (FL-08; M-07)
Decision: C/F fallback excludes planned and selected families; V-04 extended. Consequences: no redundant anti-extension blocks; C may be empty on restricted days.

**D-048: Mandatory `hand_support`; undocumented plank positions are HELD.** (FL-09, CRITICAL; M-08)
Decision: HIGH_PLANK → HF-01 excluded (HC-02); PLANK_POSITION_UNCONFIRMED → HF-02 held (B4a). Mobility rows with hand weight bearing carry UPPER soreness. Alternatives: extend the HF-02 ID list (the failure mode that caused FL-09). Consequences: every row must declare its hand position; Knee Plank and similar are held until B4a is answered.

**D-049: "Right arm worse" gets a same-day user choice.** (FL-10; M-09)
Decision: R-04b (press as usual / swap pressing for core); K3 leads when triggered; right-side non-evidence only for triceps-involved rows. Alternatives: automatic load reduction (would choose a B5 parameter). Consequences: the user decides; the engine does not invent SC-01 dosing.

**D-050: Right-arm fade is monitoring only; one automatic REDUCE until success or review.** (FL-11, CRITICAL; M-10; amends D-036)
Decision: fade never alters counted reps; `reduce_locked` turns further REDUCE into HOLD(REDUCE_LIMIT) with a review flag; CLEAR_REVIEW event added. Consequences: no silent ratchet to the lightest weight.

**D-051: DISLIKE on an anchor rotates it when an alternative exists.** (FL-12; M-11; amends D-032)
Decision: new rotation cause DISLIKE; NO_ALTERNATIVE_FOR_DISLIKE note otherwise. PREFER unchanged. Consequences: explicit user preference is honoured at the next exposure.

**D-052: Station rule keeps anchors.** (FL-13; M-12; amends D-038)
Decision: keep the anchor pick and re-select the other; two anchors → straight sets; STATION_RESELECT reason code. Consequences: anchors are no longer evicted by substitutes.

**D-053: Equipment alternatives, implement changes, substitution availability.** (FL-14, FL-23; M-13)
Decision: `equipment_options`; IMPLEMENT_CHANGED is not evidence; exercises that become another library row under substitution are NOT_AVAILABLE; other substituted executions are ALLOY_LIBRARY_ADAPTED. Consequences: KB/DB interchange works without corrupting progression or evidence labels; machines still need approved supplemental rows (UQ-G03).

**D-054: Unknown increments stop at the confirmed maximum load.** (FL-18; M-14)
Decision: Q.3 `max_confirmed_load`; unknown increments cannot exceed it. Consequences: dumbbell lines cap at 50 lb until the user confirms more.

**D-055: Uncertain Alloy attendance counts for recovery, not staleness.** (FL-16; M-15; amends D-035, D-037)
Decision: "not sure" and unanswered prompts, and prompt-created logs, add a recovery credit at scheduled start + 55 min + 2 h used only by HF-12. Consequences: uncertainty resolves toward rest for heavy lower lifts without distorting the plan.

**D-056: Under-filled sessions are disclosed, not padded.** (FL-15; M-16)
Decision: underfill notice with cause when more than 10 minutes are unused. Alternatives: add sets or a second finish item (a goal and session-length decision, B1/B3). Consequences: honest about 60-minute requests until B3 is answered.

**D-057: Metadata authoring criteria and load-time validators.** (FL-22, CRITICAL; FL-05; M-17; amends D-033)
Decision: Q.1.1 criteria (family, roles, heavy_lower formula, hand_support, soreness, triceps involvement, equipment options, default order) and validators V-00a to V-00g. Consequences: FL-22 resolved at specification level; authoring remains blocking.

**D-058: HARD with all reps met counts as success.** (found in rerun, S28a; M-18; amends D-036)
Decision: GOOD or HARD with every rep met → REPS_UP / CONFIRM_TOP. Consequences: the effort instruction ("aim for HARD") and the decision table agree.

**D-059: `LOAD_UP_CONFIRMATIONS` = 1.** (FL-18; M-19; PARAM; amends D-036)
Decision: one qualifying exposure at the top of the range triggers the load increase. Consequences: about one load step per lower anchor per six weeks at perfect compliance; to be reviewed in Phase 8.

**D-060: ENGINE_WORKOUT_GENERATOR_V0_2.md is canonical (engine 0.2.0, config 0.2.0).**
Decision: ENGINE_WORKOUT_GENERATOR_V0_1.md is superseded and kept as history. GENERATOR_ACCEPTANCE_TESTS_V0_2.md defines conformance. Deliberately unchanged ledger items (FL-06, FL-17, FL-19, FL-20, FL-21, FL-25, PREFER) are recorded in the spec §V.2. Consequences: implementation can begin once the blocking items in spec §S are closed, now including user approval of `default_order`.
