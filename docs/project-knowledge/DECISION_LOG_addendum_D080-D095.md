# DECISION_LOG addendum: In-gym UX audit (2026-09-24)

Append after D-079. All entries are SYSTEM_DESIGN, product layer. Source: PRODUCT_UX_SPEC_V0.md §1 (audit findings F-01 to F-32) and §16. No engine rule changes; engine 0.2.1 / config 0.2.0 unchanged. D-079 (ECR-01) remains PROPOSED.

**Status of earlier decisions.** D-064 amended by D-083 (tab bar hidden in focus mode). D-068 partly superseded by D-084 (pre-fill kept; per-row ✓ replaced). D-069 partly superseded by D-088 (routing kept; reason-first order replaced). D-070 extended by D-091. All others retained.

**D-080: PRODUCT_UX_SPEC_V0.md is canonical.**
Decision: the new spec is the self-contained product UX specification; PRODUCT_V0_APP_SPEC_v0_1.md is retained as history. Alternatives: keep both as partial sources. Consequences: nothing in v0.1 applies unless restated.

**D-081: One-tap normal-day check-in.** (F-01)
Decision: Today shows "Feeling as usual today. How long do you have?" with minutes chips; a tap builds the plan, answering R-01 and R-06 = no, with R-02, R-04, R-05 defaulted and recorded in `defaulted_fields[]` and `normal_day_shortcut = true`. "Something's different" opens every question. Alternatives: the four-tap form; a separate explicit R-06 tap (2 taps). Consequences: R-06 is answered by a labeled tap rather than its own control; needs user confirmation.

**D-082: Recorded-only questions leave the default path.** (F-02)
Decision: sleep (R-03) and fueling (R-07) appear only under "Something's different," unless the setting "Ask sleep and fueling every time" is on. Alternatives: ask daily. Consequences: fewer and biased records for OQ-02 (OBS-06).

**D-083: Focus mode.** (F-06, F-07, F-21, F-30)
Decision: during a session, one exercise at a time in large type; tab bar hidden; partner as a one-line strip; Why, How-to, and metadata in Details. Alternatives: full cards. Consequences: amends D-064.

**D-084: One fixed Done button.** (F-05, F-22, F-31)
Decision: a full-width primary button logs the focused set and states the values it logs; 800 ms debounce; Undo chip above it. Alternatives: per-row ✓. Consequences: supersedes D-068's per-row control; pre-fill retained.

**D-085: Final set is logged by its effort.** (F-08, F-28)
Decision: on the final working set the primary area becomes the four effort buttons; one tap logs set and effort; per-side items show Left and Right rows. Alternatives: separate effort tap. Consequences: 6 fewer taps per typical session; higher effort coverage expected (OBS-03).

**D-086: Rest needs no taps.** (F-12, F-13)
Decision: rest starts automatically after a pair; logging the next set ends it; countdown ≥ 96 pt with the next exercise and equipment; overrun counts up; one optional tone; no dialog or repeating alarm; timestamp-based. Alternatives: docked timer with Skip. Consequences: no reliance on background notifications or vibration.

**D-087: Weight by chips, carried forward.** (F-10)
Decision: confirmed load list, or ±5 lb steps within `max_confirmed_load`, as 56 pt chips; keypad only via Other; a change carries to the exercise's remaining sets; the non-evidence consequence is stated once, never asked about. Alternatives: keypad per set. Consequences: F-11 prompt removed.

**D-088: Options-first swap.** (F-15, F-16)
Decision: Swap immediately shows up to three engine options; a tap applies with Undo; station-busy and equipment-missing chips re-request with that context; reason chips and "Keep as my regular" are optional after the swap. Alternatives: reason, options, confirm. Consequences: reasons are written as flags/events, not sent with the request (EI-01 revised).

**D-089: Two-tap symptom stop.** (F-17)
Decision: Report → Stop: symptom ends the exercise, holds it (subject to D-079 for zero-set and no-line items), and moves on, with a banner carrying Add note, End session, and one line on following clinician guidance. Alternatives: explanation sheet and follow-up choices. Consequences: strengthens the case for ECR-01.

**D-090: One-tap finish.** (F-19, F-20)
Decision: after the last set, the capacity question (or Skip) finishes the session; the summary is Today's completed state with inline chips for unrated efforts; later ratings edit the log and replay. Alternatives: missing-data sheet, note, Finish, Done.

**D-091: Alloy logging names first.** (F-24 to F-27)
Decision: recents grid with auto-advancing slots, alias search, optional dose and weight chips, one session-level coach-notes field (per-item on tap), type-or-dictate fallback with match preview; the screen states that names are what planning uses. Alternatives: typed form per exercise. Consequences: extends D-070; a 6-exercise names-only log takes about 9 taps.

**D-092: No dialogs in focus mode.**
Decision: the only in-session confirmation is choosing an exercise on hold; outside focus mode, confirmations only for clearing a hold, discarding a session, deleting logs, and import. The single allowed interruption is a storage-failure banner.

**D-093: Physical ergonomics are requirements.**
Decision: primary ≥ 72 pt, in-session controls ≥ 48 pt with ≥ 8 pt spacing, bottom-60% reach, reps/weight ≥ 48 pt, countdown ≥ 96 pt, wake lock, landscape bench layout. Interaction budgets (spec §2.2) are acceptance criteria.

**D-094: Timed sets with lead-in.** (F-23)
Decision: one Start with a 3-second lead-in; auto-log at target; Stop logs actual; per-side runs both sides under one Start.

**D-095: Warm-up as first step; auto-advance.** (F-04, F-14)
Decision: warm-up is the first focus step (one tap); blocks advance automatically; ramp sets are a text line on A1/A2 set 1, never logged.
