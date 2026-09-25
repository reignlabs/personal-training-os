# DECISION_LOG addendum: Longitudinal test, engine 0.2.1 (2026-09-23)

Append after D-060. All entries are SYSTEM_DESIGN. Source: ENGINE_LONGITUDINAL_TEST_V0_2.md. Full problem / old / new / reason / affected scenarios / new failure risk: ENGINE_WORKOUT_GENERATOR_V0_2_1.md §V.1 (M-20, M-21).

**Status of earlier decisions.** Amended: D-053 by D-061 (which implement is used), D-036 by D-062 (RETURN condition). D-060 superseded by D-063. All others retained.

**D-061: A progression line keeps its implement.** (longitudinal E, E2; M-20; amends D-053)
Decision: today's implement is the line's implement whenever it is available; otherwise the first available option. A line whose implement leaves the gym (availability not AVAILABLE, not merely a same-day issue) is re-based once, with a non-evidence exposure. Alternatives: re-base on every implement change (a one-week outage would permanently move lifts to the substitute implement); treat implement changes as evidence (mixes kettlebell and dumbbell loads in one line). Consequences: no permanent progression lock; a lift first performed on the non-preferred implement stays on it until replaced.

**D-062: RETURN means absence from the movement pattern.** (longitudinal C, D; M-21; amends D-036)
Decision: RETURN applies only when the line is older than `GAP_DAYS` and the exercise's movement pattern (parent for main families, including Alloy credits; family otherwise) has not been trained within `GAP_DAYS`. Alternatives: lengthen `GAP_DAYS` (moves the threshold; does not separate absence from rotation). Consequences: the engine's own rotation structure (two anchors per family, day-after substitutes) no longer suppresses progression; true breaks still return conservatively.

**D-063: ENGINE_WORKOUT_GENERATOR_V0_2_1.md is canonical (engine 0.2.1, config 0.2.0) and is the implementation baseline.**
Decision: ENGINE_WORKOUT_GENERATOR_V0_2.md is superseded and kept as history. Conformance = GENERATOR_ACCEPTANCE_TESTS_V0_2.md plus §W of the 0.2.1 spec (AT-26 to AT-28). Findings not changed (anchor frequency on a B-style schedule, six-day lower-body loading with Alloy, goal emphasis, GOAL_ACCESSORY displacing the core finish, main-lift rotation only at LOAD_CAPPED, carry cap) are recorded in the longitudinal report §4 and assigned to Phase 8 or to the open user decisions B1, B2, UQ-G03. Consequences: implementation can begin once the blocking items in the spec's §S are closed.
