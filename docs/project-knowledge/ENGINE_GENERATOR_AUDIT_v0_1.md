---
file: ENGINE_GENERATOR_AUDIT_v0_1.md
class: ENGINE
status: REVIEW RECORD (audit of ENGINE_GENERATOR_SPEC_v0_1.md)
updated: 2026-09-23
outcome: v0.1 rejected for implementation. Simplified v0.1.1 frozen as ENGINE_WORKOUT_GENERATOR_V0_1.md.
decisions: D-030 to D-040 (DECISION_LOG_addendum_D030-D040.md)
---

# Audit: Workout Generator v0.1

## Verdict

v0.1 is not implementable as written and would not behave well if it were. Its core defect is not any single rule. It is the combination of two weighted scoring systems (family priority and exercise score, about 20 interacting integer terms) with several fatigue and recency mechanisms that measure the same thing in different ways. The result looks rigorous and would be hard to predict, hard to explain honestly, and unstable in exactly the situation Nelson trains in most: apartment sessions that fall a day after full-body Alloy sessions.

Three findings are disqualifying on their own:

1. **The progression table reads data the app does not collect** (AUD-09). It uses per-set effort ratings; the profile collects one effort rating per exercise.
2. **Main lifts would flip-flop between sessions and never accumulate progression evidence** (AUD-21).
3. **Sleep and fueling answers could hold Nelson in a reduced-training state indefinitely**, turning Health-Project hypotheses into training restrictions (AUD-27).

Findings are grouped by the categories requested. Each has a concrete failure example and the smallest correction. The corrections together define v0.1.1.

---

## 1. Fake precision and arbitrary weights

**AUD-01. Additive exercise score with 13 integer terms and a 1-point tie band.**
- *Failure:* Goblet squat, the current squat, scores CONT +3, FAT −3, ALLOY +1 = **1**. Split squat scores UNI +1, ALLOY +1 = **2**. Split squat wins because of a bonus inspired by a `raw_only` finding (AF-12). Nobody chose that outcome; it fell out of arithmetic. The generation record would call it "selected by score," which explains nothing.
- *Correction:* Replace scoring with **lexicographic ordering**: the current exercise for that slot (an "anchor") wins if eligible; otherwise a short fixed list of sort keys decides (preference, known load, least recently used, library order). Every pick is explainable by naming the key that decided it.

**AUD-02. Family priority weights (3 / 0–2 / 4 / 2 / 2 / 1).**
- *Failure:* Nelson attends Alloy Mon/Wed/Fri. With summary logs, every parent family is "met" every week, so all deficits are zero. The only non-zero term left is goal weight, where VPUSH has +1 for G-04. Result: the upper A-slot is a shoulder press **every session**. After a full-body Alloy session, the −4 recent penalty hits every family equally and cancels out, so it provides no discrimination at all.
- *Correction:* Choose families by **staleness** (oldest last-trained timestamp first), inside a fixed template. One number, one meaning.

**AUD-03. Weekly touch targets (KD ≥ 2, carry ≥ 1, pull ≥ push, etc.).**
- *Failure:* Targets are trivially satisfied at the parent level by Alloy, and cannot be computed at the subtype level from summary logs. VPULL shows a deficit every week, but VPULL is HELD (pull-up capability unknown), so the system reports a permanent unfillable deficit that drives nothing useful.
- *Correction:* Drop weekly targets. Staleness already rotates families; frequency targets become a FUTURE feature once real logs exist.

**AUD-04. ~40 parameters, several defined per exercise (est. seconds per set, setup seconds).**
- *Failure:* Duration estimates depend on ~160 per-exercise timing values that nobody has measured. A 35-minute check-in could produce a 44-minute session.
- *Correction:* Block-level duration constants (minutes per pair-set by role), calibrated from logged session times in Phase 8. About 30 parameters total, each with an obvious meaning.

## 2. Fitness assumptions presented as evidence

**AUD-05. Rep ranges labeled `basis: ALLOY_OBSERVED (value range)`.**
- *Failure:* Public Alloy rep counts come largely from ladders, AMRAPs, and metabolic formats. A reader of the ledger would believe 6–10 / 8–12 derive from Alloy. They are conventional strength and hypertrophy ranges.
- *Correction:* `basis: NONE`. State plainly that they are conventional.

**AUD-06. "Full-body every session" labeled `basis: ALLOY_DOCUMENTED`.**
- *Failure:* The evidence is about 2–3 full-body sessions per week. Nelson may train 5–6 times per week across Alloy and the apartment gym. The label claims Alloy support for a frequency Alloy never described.
- *Correction:* `basis: NONE`, `inspired_by: AF-01, AF-03`. Weekly frequency tolerance becomes an explicit UNRESOLVED item for Phase 8.

**AUD-07. 55-minute session cap derived from Alloy's session length (AF-06).**
- *Failure:* Alloy's studio timing says nothing about Nelson's apartment sessions.
- *Correction:* Remove the cap. Tiers come from minutes available and B3.

**AUD-08. Region-fatigue windows (24 h / 48 h / 3 sets) described as "bookkeeping."**
- *Failure:* They are recovery assumptions dressed as accounting. They also stack with three other mechanisms (AUD-25).
- *Correction:* Replace the region model with two narrow, labeled rules: no repeat of the same exercise within 48 h; no `heavy_lower` exercise within 24 h of any lower-body training. Both `basis: NONE`.

## 3. Rules requiring data we do not have

**AUD-09. Progression table uses per-set effort.**
- *Failure:* "All sets TOO_EASY" and "TOO_HARD on ≥ 2 sets" cannot be evaluated. The profile's DURING_WORKOUT_FEEDBACK collects **one effort rating per exercise** (per side for right-arm exercises) plus per-set reps. An engineer would have to invent the rule.
- *Correction:* Progression uses the per-exercise effort rating plus per-set reps completed.

**AUD-10. Exercise metadata with eight subjective tiers per exercise.**
- *Failure:* regions_loaded, fatigue_tier, skill_tier, grip_demand, trunk_demand across ~80 exercises is hidden tuning. One mis-tag silently changes selection and no log would reveal why.
- *Correction:* Minimum metadata: family, laterality, equipment, station, a single `heavy_lower` boolean, right-triceps involvement, position tags, allowed roles, soreness regions. All are observable facts about the exercise, not ratings.

**AUD-11. Alloy SUMMARY logs assumed to load every region at MODERATE fatigue.**
- *Failure:* Every morning-after-Alloy session sees all regions "recent," which feeds AUD-02's cancellation and AUD-26's permanent posture floor.
- *Correction:* Summaries credit last-trained timestamps for LOWER, PUSH, PULL parents only. No region model.

**AUD-12. Forward-look rule assumes the next scheduled Alloy session will happen.**
- *Failure:* Nelson travels 2–3 times a month. The rule penalizes sessions before Alloy classes he will not attend.
- *Correction:* Remove. FUTURE feature if Alloy attendance becomes predictable.

**AUD-13. Mild-soreness rule defined but dormant (check-in cannot collect it).**
- *Failure:* Dead rule that engineers must still implement and test.
- *Correction:* Delete.

## 4. Too complicated for V0

**AUD-14. Pairing cost matrix, top-3 enumeration, and a "score sacrifice" cap.**
- *Failure:* Seven costs interacting with exercise scores make pair outcomes unpredictable, while the real logistics problem (two stations in one superset) was only a 1-point cost.
- *Correction:* The template fixes pair composition. One station rule: a pair uses at most one fixed station.

**AUD-15. Repair loop with five strategies, ten iterations, full re-validation after each.**
- *Failure:* Outcomes depend on the order validators fail. Two runs with the same inputs could repair differently if validator order changes in code.
- *Correction:* Most validators become filters applied during selection, so failures are rare. Repair is reduced to three ordered actions: next candidate, trim sets, drop trailing blocks.

**AUD-16. Progression dimension chain (reps → load → extended reps → tempo → ROM → complexity).**
- *Failure:* Six dimensions, each with its own gate, for a system that has not yet logged one session.
- *Correction:* Reps → load → extended reps → LOAD_CAPPED flag, which triggers anchor rotation. Tempo, ROM, and complexity progression become FUTURE (or user-initiated swaps).

## 5. Contradictions between rules

**AUD-17. RULE-016 vs V-09.**
- *Failure:* The day after Alloy, RULE-016 reduces lower-body main slots to one (3 main movements). V-09 requires ≥ 4 main movements, so repair adds a lower movement back. The two rules fight.
- *Correction:* Delete both. The template always has 4 main slots. Recency acts through the `heavy_lower` filter, which changes the exercise, not the slot count.

**AUD-18. "Readiness never changes architecture" vs soreness turning blocks into upper + core.**
- *Failure:* The stated principle is false as written.
- *Correction:* Restate: the template and block order are fixed. Readiness may change which family fills a slot, the set counts, and whether a finish is included. It never adds or reorders blocks.

**AUD-19. Cold start: §3.5 resets all exercises to CALIBRATION; TS-12 says loads persist.**
- *Failure:* After a travel week, known loads would be wiped.
- *Correction:* Sparse history affects family ordering only. Progression lines persist. A long gap produces a hold on the first exposure back.

**AUD-20. Calibration allows within-session load changes; V-10 allows ≤ 1 increment per exposure.**
- *Failure:* A first exposure that climbs three weights fails validation.
- *Correction:* Calibration exposures are explicitly exempt.

## 6. Unstable behavior

**AUD-21. CONT / REC / ROT / UNI interplay makes main lifts flip-flop.**
- *Failure:* Apartment sessions every ~2.5 days. Session 1: goblet squat. Session 2, 60 h later: goblet squat gets REC −2 against CONT +3; split squat gets UNI +1, ALLOY +1; they land within the 1-point tie band and a seeded draw decides. Over time the two alternate, neither line gets two consecutive qualifying exposures, and load never increases.
- *Correction:* **Anchors.** Each family-and-role slot has one current exercise. A substitute used for one session does not move the anchor. Anchors change only on persistent blocks, load cap, accessory rotation count, or a user "replace" action.

**AUD-22. Rotation on stall during a fat-loss phase.**
- *Failure:* Under G-01 ("preserve"), holding a load for three sessions is success. ROT −2 then rotates the exercise, which restarts calibration and discards the evidence that matters most.
- *Correction:* Stalls are flagged for user review. They never trigger automatic rotation.

## 7. Excessive novelty and accidental randomization

**AUD-23. Frequent ties plus a seed that includes the generation timestamp.**
- *Failure:* Many candidates fall within 1 point, so picks are often effectively random. Regenerating a minute later changes the seed, so "regenerate" becomes a reroll button.
- *Correction:* Deterministic sort keys. A seeded draw is used only among never-used exercises that tie on every key. Seed = user + local date + apartment session count, so regenerating the same day gives the same session. The only variety control for the user is an explicit swap.

**AUD-24. Cold start introduces 10+ unfamiliar exercises at once.**
- *Failure:* First session: new prep items, four new main lifts, two new core items, a new finish. Nelson has said he does not know every movement by name.
- *Correction:* No finish in the first two apartment sessions. For main slots, exercises with an existing line always sort before never-used ones.

## 8. Box-checking without regard to fatigue; recovery logic

**AUD-25. Full-body coverage enforced every session; fatigue only as score penalties.**
- *Failure:* Tuesday 8 am, after Monday's full-body Alloy session: penalties cancel (AUD-02), so a trap-bar-substitute barbell deadlift can land in A1.
- *Correction:* Keep the full-body template (it is the Alloy-inspired core), but make the one high-cost case a hard filter: no `heavy_lower` exercise within 24 h of lower-body training. Mark weekly frequency tolerance UNRESOLVED; Phase 8 decides whether more is needed.

**AUD-26. Proximity posture floor.**
- *Failure:* Mon Alloy ends ~5 pm; Tue apartment session at 8 am is 15 h later. Every morning-after-Alloy session is MODERATED, and MODERATED blocks progression. If Nelson usually trains those mornings, his apartment lifts never progress.
- *Correction:* Remove the posture floor. Proximity is handled only by the `heavy_lower` filter.

## 9. Readiness dependence and health inference

**AUD-27. Sleep (R-03) and fueling (R-07) as posture down-flags.**
- *Failure:* The Health handoff records ~5.2 h average sleep (UNC). Poor sleep plus a missed pre-workout meal gives LIGHT: two sets, no progression. That could be the default state. It also converts a Health-Project hypothesis (fueling explains the afternoon capacity drop) into a training restriction, which the project rules forbid.
- *Correction:* Sleep and fueling are recorded as monitoring only. Posture uses energy (R-02) and the unwell gate (R-06) only. Two postures: NORMAL and LIGHT.

**AUD-28. "Never pair two right-triceps exercises" (RULE-041).**
- *Failure:* It chooses an SC-01 parameter the user has not chosen (B5 pending).
- *Correction:* Delete. The template already prevents push-with-push pairs. When R-04 = worse, right-triceps-involved exercises sort after uninvolved ones and are held (no progression) that day. Anything more waits for B5.

## 10. Shortened sessions

**AUD-29. Tier cliffs remove all core work on short days.**
- *Failure:* If Nelson usually has 30 minutes, block C never appears, so G-07 (consistent core) is never served by the generator.
- *Correction:* One rule. In the 25–34 minute tier, if no core family has been trained for 7 days (with at least 7 days of history), block C replaces block B.

## 11. Equipment transitions

**AUD-30. Station conflicts were only a 1-point cost; no mid-session handling.**
- *Failure:* Step-up (using the flat bench as a box) paired with a bench press on the same bench; or rack work paired with a machine across the room while someone waits for the rack.
- *Correction:* A pair may use at most one fixed station (rack area, a bench, a machine, pull-up bar) unless both exercises use the identical station. Deterministic mid-session swap: next candidate in the same ordered list whose station is free.

## 12. Alloy sessions entered manually

**AUD-31. Late, missing, duplicate, and unmappable Alloy entries.**
- *Failure:* (a) Nelson logs Monday's Alloy class on Wednesday; Tuesday's generation never saw it. (b) Log entry time is used instead of the class time. (c) A FULL log with free-text exercises cannot be mapped to families. (d) Summaries credit CORE, so the generator under-programs core on the assumption Alloy covered it.
- *Correction:* At check-in, ask about any scheduled Alloy class in the last 72 h that has no log ("Did you train at Alloy on Monday?"). Logs carry `performed_at`, defaulting to the scheduled class time. FULL items need a one-tap family tag or they do not credit subtypes. Summaries credit LOWER, PUSH, PULL only. Same-date duplicates merge.

## 13. Incomplete history

**AUD-32. Missing effort ratings, missing reps, missing side data, unknown equipment increments.**
- *Failure:* v0.1 does not say what happens. An engineer would guess.
- *Correction:* Each gap has one defined outcome (canonical spec §M). The general rule: missing data never counts as evidence and never produces progression.

## 14. Goals presented as handled when they are not

**AUD-33. G-04/G-05 depend on a 45+ minute session, B2, and approval of supplemental exercises.**
- *Failure:* v0.1 reads as if the arm and shoulder goals are served. In practice they may never be.
- *Correction:* Say so. GOAL_ACCESSORY is disabled by default and marked UNRESOLVED. Goals act structurally (template, block C, finish order) rather than through hidden weights.

---

## Simplified Generator v0.1.1 in one page

| Stage | v0.1.1 rule |
|---|---|
| Template | PREP → A (lower + upper) → B (other lower + other upper parent) → C (core + carry/core) → F (optional). Fixed. |
| Size | Minutes → which blocks: <15 none; 15–24 A; 25–34 A+B; 35–44 A+B+C; ≥45 A+B+C+F. Trim sets if the estimate runs over. |
| Posture | NORMAL or LIGHT. LIGHT only if energy is low or the user chooses "lighter" after the unwell gate. |
| Family choice | Stalest first by last-trained timestamp (Alloy summaries credit parents). Fixed tie order. |
| Exercise choice | Anchor if eligible; otherwise fixed sort keys. No scores. |
| Recovery | Same exercise not within 48 h; no `heavy_lower` exercise within 24 h of lower training; soreness exclusions; LIGHT posture. |
| Pairing | Composition fixed by template; one fixed station per pair. |
| Prescription | Role table (conventional ranges, labeled as such); load from the progression line; calibration for new exercises. |
| Progression | Per-exercise effort + per-set reps. Reps +1 → load +1 increment after confirmation → extended reps → LOAD_CAPPED. Stalls flagged, not acted on. |
| Alloy | Parent credit from summaries; check-in prompt for missing classes; never feeds progression. |
| Randomness | Only among never-used exercises tied on every key; seed stable for the day. |
| Validation | Filters do most of the work; three repair actions; NO_SESSION if block A cannot be formed. |

**Removed:** exercise scoring, family priority weights, weekly targets, region fatigue model, proximity posture floor, forward-look rule, MODERATED posture, mild-soreness rule, pairing cost matrix, RULE-016, V-09, RULE-041, tempo/ROM/complexity progression, stall rotation, 55-minute cap, per-exercise timing, eight metadata tiers.

**Kept:** one archetype, HELD vs EXCLUDED, calibration without 1RM, per-side right-arm logging and progression, Alloy never feeding progression, never presenting an invalid session, evidence basis on every rule, supplemental layer (disabled until approved).
