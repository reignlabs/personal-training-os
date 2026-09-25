# DECISION_LOG addendum: Workout Generator v0.1 design (2026-09-23)

Append to DECISION_LOG.md after D-018. All entries are SYSTEM_DESIGN. Status: PROPOSED until the Phase 8 manual run confirms or revises them.

**D-019: One session archetype in V0.**
Context: day-after-Alloy, short, low-energy, and sore days all looked like candidates for separate archetypes. Decision: one template (PREP → A → B → optional C → optional finish). Variation comes only from session size (minutes), load posture (readiness and proximity), and family priorities (exposure state). Alternatives: separate "complement day" and "light day" archetypes (more rules, overlapping logic). Consequences: complement behavior after Alloy sessions is emergent from 7-day deficits; a second archetype is a v0.2 decision if Phase 8 shows the need.

**D-020: Two-level selection.**
Decision: family priority chooses which movement families fill the slots; exercise scoring ranks exercises only within an already-chosen family. "Undertrained" is a family-level signal only. Consequences: scoring stays short and readable; exercises can never change session architecture.

**D-021: Coarse exposure accounting with assumed vectors for summary logs.**
Decision: weekly targets use "touches" (a session with ≥ 2 working sets for a family), not set volume. Alloy sessions logged as SUMMARY credit one assumed touch to each parent family (LOWER, PUSH, PULL, CORE), flagged `assumed`; subtypes are never credited from summaries. Consequences: works with incomplete Alloy logs (B6); subtype deficits are marked `coverage_uncertain` when a summary is in the window.

**D-022: Continuity over novelty.**
Decision: an exercise with an active progression line gets a continuity bonus; the same moderate/high-fatigue exercise is hard-filtered within 48 h; rotation earns points only after 6 exposures or a stall. Context: Alloy evidence gives no repetition window (Q-07) but documents session-to-session progression (AF-07, AF-09). Consequences: progression evidence can accumulate; variety is never a reason by itself.

**D-023: Supplemental (non-Alloy) exercise layer.**
Context: the 103-row library contains no arm or shoulder isolation and none of the apartment gym's machines, so G-04/G-05 cannot be served. Decision: a separate SUPPLEMENTAL layer (IDs SX###) for exercises the user approves, with `evidence_basis: SUPPLEMENTAL`, never carrying an Alloy class, and receiving no Alloy-evidence score bonus. Requires user approval (UQ-G03). Consequences: goals can be served without contaminating the evidence layer.

**D-024: HELD is distinct from EXCLUDED.**
Decision: exercises whose eligibility depends on a pending constraint scope, unknown equipment, unknown capability, or an unreviewed symptom flag are HELD: not auto-selected, not excluded, selectable manually, and surfaced as a question. Consequences: the generator never invents a restriction and never silently resolves a pending one.

**D-025: Alloy studio logs feed exposure, not load progression.**
Decision: Alloy sessions count toward exposure, recency, and region fatigue (D-016) but never toward load progression, because implements, setups, and coaching differ. Consequences: progression lines are apartment-only.

**D-026: Conditioning and impact power are opt-in in V0.**
Context: no conditioning or power goal is stated; preferences P-07/P-08 are UNKNOWN; the cardio dislike is UNCONFIRMED and must not be acted on. Decision: conditioning appears only as an opted-in finish; impact power (jumps) is NOT_ENABLED until P-08 is answered; kettlebell swings remain eligible as hip-dominant exercises. Consequences: no preference or restriction is inferred; the choice is the user's.

**D-027: Rule evidence tagging.**
Decision: every engine rule keeps `class: SYSTEM_DESIGN` (D-002) and adds `basis` (ALLOY_DOCUMENTED / ALLOY_OBSERVED / SUPPORTED_PATTERN / PERSONAL / NONE) and `verification` from the findings register. Rules inspired only by `raw_only` findings are marked `stands_on_design_merit`. Consequences: the four-class discipline is visible per rule without labeling our rules as Alloy facts.

**D-028: Readiness never changes architecture.**
Decision: readiness sets load posture (STANDARD / MODERATED / LIGHT), which changes set counts, progression attempts, and power/conditioning eligibility only. Minutes change session size. Neither changes the template or which families are required. Consequences: consistent with APP_V0_SCOPE.

**D-029: Never present an invalid session.**
Decision: validators run after assembly; failures are repaired in a fixed order (replace → re-pair → reduce dose → change family → drop optional content). Hard-constraint and equipment validators can never be waived. If a minimal session cannot pass, the generator returns NO_SESSION with the unblocking questions. Consequences: the user never sees a session that violates a hard constraint or needs missing equipment.
