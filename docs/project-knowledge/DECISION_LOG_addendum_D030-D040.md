# DECISION_LOG addendum: Generator audit and freeze (2026-09-23)

Append after D-029. All entries are SYSTEM_DESIGN. Source: ENGINE_GENERATOR_AUDIT_v0_1.md.

**Status of D-019 to D-029 after the audit.** Retained: D-019 (one archetype), D-023 (supplemental layer), D-024 (HELD vs EXCLUDED), D-025 (Alloy logs never feed progression), D-026 (conditioning and impact power opt-in), D-027 (rule basis tagging), D-029 (never present an invalid session). Amended: D-020 by D-030, D-021 by D-031 and D-037, D-022 by D-032, D-028 by D-034.

**D-030: Deterministic ordering replaces weighted scoring.** (AUD-01, AUD-02)
Decision: no numeric exercise or family scores. Exercises are chosen by anchor, then fixed sort keys K0–K7. Alternatives: tuned weights (unpredictable, unexplainable). Consequences: every pick names the key that decided it; D-020's principle that families choose slots and exercises never choose families is kept.

**D-031: Family staleness replaces weekly touch targets.** (AUD-02, AUD-03)
Decision: families are ordered by last-trained timestamp inside a fixed template. Weekly targets are FUTURE. Consequences: works with summary Alloy logs; no permanent unfillable deficits.

**D-032: Anchors per (family, role).** (AUD-21)
Decision: each family-and-role slot has one current exercise. One-day substitutes never move it. Anchors change only on a persistent block, LOAD_CAPPED (main roles), 4 exposures (accessory roles), or a user "replace." Consequences: progression evidence accumulates; primary and secondary roles give built-in variety without randomness.

**D-033: Metadata is objective facts only.** (AUD-10)
Decision: the engine reads family, laterality, equipment, station, a `heavy_lower` boolean, right-triceps involvement, position tags, roles, and soreness regions. No subjective tiers. Consequences: authoring is checkable; no hidden tuning.

**D-034: Two postures; sleep and fueling recorded only; R-05 maps to regions.** (AUD-26, AUD-27; amends D-028)
Decision: posture is LIGHT only for low energy or a user "lighter" choice after the unwell gate. R-03 and R-07 are stored as monitoring. R-05 options become none/upper/lower/trunk. Readiness may change slot families, set counts, and finish presence; never block count or order. Consequences: no Health-Project hypothesis becomes a training restriction; no chronic reduced state.

**D-035: Recovery logic is four explicit mechanisms.** (AUD-08, AUD-11, AUD-12, AUD-13, AUD-17, AUD-25)
Decision: 48 h same-exercise exclusion; 24 h exclusion of `heavy_lower` exercises after lower-body training; LIGHT posture; soreness exclusions. Removed: region fatigue model, proximity posture floor, forward-look rule, mild-soreness rule, RULE-016, V-09. Consequences: simple and testable; whether it suffices at 5–6 sessions/week is UNRESOLVED and assigned to Phase 8.

**D-036: Progression uses per-exercise effort and per-set reps; stalls are flagged only.** (AUD-09, AUD-16, AUD-22)
Decision: double progression with LOAD_UP_CONFIRMATIONS = 2, one extended range, then LOAD_CAPPED. Stalls produce a review flag, never rotation. Tempo, ROM, complexity, and set progression are FUTURE. Consequences: holding a load during the fat-loss phase is treated as acceptable, not as failure.

**D-037: Alloy log handling.** (AUD-31; amends D-021)
Decision: summaries credit LOWER, PUSH, PULL parents only (never core, carry, or accessories). Check-in asks about unlogged scheduled classes from the last 72 h. `performed_at` is class time. FULL items credit subfamilies only with a family tag. Same-date logs merge. Consequences: core and carries are not under-programmed on the assumption Alloy covered them.

**D-038: Station rule replaces pairing costs; RULE-041 removed.** (AUD-14, AUD-28, AUD-30)
Decision: at most one fixed station per block unless both items share it; otherwise re-select, else straight sets. The right-triceps pairing ban is removed because it chose an unanswered B5 parameter; the template already prevents push-with-push pairs. Consequences: real logistics problems are handled; no hidden SC-01 parameter.

**D-039: Evidence basis corrections.** (AUD-05, AUD-06, AUD-07)
Decision: role rep ranges, every-session full-body application, and session length are `basis: NONE`. The 55-minute cap is removed. Consequences: the ledger no longer implies Alloy support for choices we made.

**D-040: ENGINE_WORKOUT_GENERATOR_V0_1.md is canonical (engine 0.1.1).**
Decision: ENGINE_GENERATOR_SPEC_v0_1.md is superseded and kept as history. Changing a FIXED rule requires a decision entry and an engine_version bump; changing a PARAM requires a config_version bump. Consequences: implementation can begin once the blocking items in §S are closed.
