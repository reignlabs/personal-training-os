# DECISION_LOG addendum: V0 product design (2026-09-24)

Append after D-063. All entries are SYSTEM_DESIGN. Source: PRODUCT_V0_APP_SPEC_v0_1.md. Engine baseline unchanged: ENGINE_WORKOUT_GENERATOR_V0_2_1.md (engine 0.2.1, config 0.2.0). D-064 to D-078 are product-layer decisions and change no engine rule. D-079 is a proposed engine change (ECR-01) and is **not adopted** until approved.

**Status of earlier decisions.** None amended by D-064 to D-078. D-079, if adopted, amends the §K flag application described under D-036/D-050 (flags) without changing any progression rule.

**D-064: Five-tab navigation; Log Alloy is a center action.** (spec §2.1)
Decision: tabs Today, History, Log Alloy (center; opens a sheet over any screen), Equipment, Profile. An active session pins a Resume bar on other tabs. Alternatives: Alloy logging inside Today (slower, buried); Equipment folded into Profile (setup needs it prominent in V0). Consequences: Equipment may fold into Profile after V0 if rarely used.

**D-065: V0 generates for the apartment gym only; OTHER / MANUAL is logging-only.** (spec §2.3)
Decision: the generator's equipment state is always the apartment gym. Sessions elsewhere are logged as OTHER_TRAINING_LOG (Q.7), stored and shown, not read (B2). Alternatives: feed another environment's equipment as the equipment state (under M-20/D-061, every line whose implement that environment lacks would be permanently re-based after one session). Consequences: travel workouts are not generated in V0; multiple gyms remain FUTURE and will need per-environment equipment state and a home-environment re-base rule.

**D-066: Two equipment-change scopes.** (spec §8.8, J12)
Decision: "Unavailable today" writes today's issues (HF-06 EXCLUDED_TODAY; anchors kept; never re-bases). "Not available" or "Unconfirmed" writes CONFIRM_EQUIPMENT and is preceded by an impact warning listing the progression lines that would re-base. Alternatives: a single availability toggle. Consequences: a one-day outage never becomes a permanent re-base by accident.

**D-067: Effort is the four-level rating; no numeric RPE in V0.** (spec §3.4)
Decision: one TOO_EASY / GOOD / HARD / TOO_HARD rating per exercise, per side where `per_side_logging`. Alternatives: per-set RPE or RIR (extra tap per set; nothing reads it). Consequences: the brief's "RPE / difficulty" is satisfied by the engine's evidence contract.

**D-068: Pre-filled set rows; one tap logs "as planned."** (spec §8.5)
Decision: set rows show the prescription; ✓ logs it and displays the values it logs; edits are explicit. CALIBRATE external-load sets require a load. Alternatives: empty fields. Consequences: minimal friction; risk of overstated reps tracked as OBS-02.

**D-069: Swap reasons route to engine inputs; the UI never ranks candidates.** (spec §8.6)
Decision: each reason maps to the input it represents (load edit, implement change, UNCOMFORTABLE, TECHNIQUE_DIFFICULTY, SET_PREFERENCE DISLIKE, today's issues, busy station) before the engine returns substitutes (§E.6). "Make regular" = USER_REPLACE. Alternatives: reason-agnostic swaps (lose signal); UI-side filtering (violates the product principle). Consequences: depends on EI-01 (swap requests carry today's issues and busy stations), which needs confirmation as an interface clarification.

**D-070: Alloy logs save first, enrich later.** (spec §8.7, A-01 to A-04)
Decision: one tap creates a SUMMARY; adding items upgrades to FULL; a date is the only required field. Extension fields (slot label, finisher, raw dose text, coach modified + note, duration known) are stored and not read by the engine. Alternatives: a structured form with required fields. Consequences: answers B6's logging-mode part in practice (both modes; summary expected). "Program visible in advance" remains open.

**D-071: Coach modifications are review items; personal Alloy logs are not evidence.** (spec P-08, §13)
Decision: coach changes are collected as TRAINER-sourced notes for the user to review into PERSONAL_constraints.yaml; never auto-applied. Personal Alloy logs never receive ALLOY_DOCUMENTED or ALLOY_OBSERVED. Alternatives: derive constraints automatically (violates D-006, D-015). Consequences: using personal logs as research evidence would need its own decision.

**D-072: Unfinished sessions are never auto-completed.** (spec J9, T-16)
Decision: on a later day the user chooses Finish with what I logged (`ended_at` = time of the last logged set) or Discard. Alternatives: auto-complete at midnight (wrong times and credits). Consequences: set `logged_at` is stored (extension).

**D-073: Time zone is a profile setting.** (spec P-03, §10.3)
Decision: default America/Los_Angeles; a device mismatch shows a notice. Alternatives: device time zone (local dates, and the consecutive-day rule, shift during travel). Consequences: deterministic local dates across trips.

**D-074: Health minimization in the UI.** (spec PR-6, P-02, P-04)
Decision: no diagnoses, medications, recovery factors, evidence labels from the Health handoff, or CONTEXT items anywhere in V0; constraints shown by `label_in_app`, description, status, and programming effect; symptom notes are the user's words, recorded, not interpreted, shown only in Needs review and the session log. Alternatives: full profile display. Consequences: the Health Project remains the place for medical context.

**D-075: Past logs are editable; state is rebuilt by replay.** (spec J16)
Decision: apartment, Alloy, and other logs can be edited or deleted; engine state is rebuilt (§B.1); already generated sessions are not altered. Alternatives: immutable logs. Consequences: the UI lists what recalculated.

**D-076: How-to uses Alloy's documented cues, display only.** (spec T-09)
Decision: show `documented_coaching_cues` and source links from the evidence layer, labeled "Alloy's published cues"; the engine still does not read the evidence layer. Alternatives: author our own cues. Consequences: exercises without cues show a source link only.

**D-077: Rest between straight sets uses the item's rest value.** (spec T-06)
Decision: UI default; no engine rule. Alternatives: no guidance. Consequences: none for progression.

**D-078: Local-first persistence and backup.** (spec PR-4, §11.4)
Decision: every entry persists on device when entered; the in-session loop works offline; V0 includes export/import of all logs, events, check-ins, generation records, equipment state, and settings. Alternatives: server-first storage; no backup. Consequences: logs are the source of truth (§B.1), so backup is a core requirement, not a feature.

**D-079 (PROPOSED, ECR-01): Flag actions apply to zero-set and no-line items.** (spec §12.2)
Decision (if adopted): §K gains step 6a: STOPPED_SYMPTOM and UNCOMFORTABLE flag actions (§H.4) apply to every item carrying the flag, including items with zero completed working sets, PREP items, and items without a progression line; only hold and streak effects apply to such items; crediting, `exercise_last_used`, counters, anchors, and progression are unchanged. Alternatives: leave §K as is (a person who stops before logging a rep, or during a mobility drill, is told the exercise is held and it is not); STOPPED_SYMPTOM only. Consequences: engine 0.2.2; add AT-29 to AT-31; rerun AT-01 to AT-28 to confirm no change.
