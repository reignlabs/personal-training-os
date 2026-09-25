# DECISION_LOG addendum: Phase 1 personal intake (2026-09-23)

Append to DECISION_LOG.md. Numbering assumes the last entry is D-011; renumber if the log has moved on.
All entries are SYSTEM_DESIGN.

**D-012: The profile and the constraints stay in separate files.**
USER_PROFILE_V0 is `PERSONAL_user_profile.yaml`. Its HARD_CONSTRAINTS and SOFT_CONSTRAINTS sections hold IDs only. Definitions live in `PERSONAL_constraints.yaml`. This keeps the architecture's rule that constraints are recorded with their source and kept apart from goals and preferences.

**D-013: AI-PLAN rules from the Health Project are candidates, not constraints.**
Rules Claude wrote inside the Health Project (no-failure, face-over pressing, straight-arm weight bearing, volume holds, stop-and-call lists) enter as `CANDIDATE_PENDING_USER`. They become active only when the user adopts them, and the source is then recorded as `USER (adopted from AI-PLAN)` so the origin is never lost.

**D-014: A diagnosis alone never creates a constraint. New item class CONTEXT.**
Health facts with no stated training implication (MG diagnosis, Graves', cervical stenosis findings, TED, gaze findings, reflexes) are stored as CONTEXT. CONTEXT appears in explanation records and has no effect on selection. Only a user, clinician, or trainer statement can turn one into a constraint.

**D-015: The user's own Alloy coach modifications are TRAINER-sourced personal inputs, not Alloy research evidence.**
ALLOY_OBSERVED stays reserved for public Alloy workouts and demonstrations. What Nelson's coach does for Nelson is recorded in PERSONAL files with source TRAINER. It is never used as evidence of Alloy's general programming.

**D-016: Alloy studio sessions are part of the same training history.**
They count fully toward weekly pattern exposure and recency. A lower-resolution logging mode is allowed for them (granularity pending question B6). The generator never ignores a logged Alloy session.

**D-017: V0 readiness is not medical monitoring.**
The check-in has seven items at most. A single "unwell or different from usual?" gate replaces symptom-specific ratings. The app records the answer and offers normal / lighter / skip; it does not interpret symptoms. Symptom tracking stays in the Health Project.

**D-018: Right-arm-involved exercises are always logged per side.**
Any exercise where the right triceps is a working muscle is logged left and right separately, including the rep where the right arm began to fade. Left-side performance can never trigger right-side progression.
