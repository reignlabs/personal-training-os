---
file: ENGINE_LONGITUDINAL_TEST_V0_2.md
class: AUDIT
status: COMPLETE
engine_version: 0.2.0 tested; 0.2.1 issued (ENGINE_WORKOUT_GENERATOR_V0_2_1.md)
updated: 2026-09-23
method: reference simulator (test harness, not the application) running FX-META, FX-EQUIP, FX-CONFIG from GENERATOR_ACCEPTANCE_TESTS_V0_2.md
---

# Longitudinal test of the workout generator, engine 0.2

## 1. Verdict

Rolling-state programming produces sensible continuity. Across eight simulated three-week histories (76 apartment sessions), every family was trained every week at stable volume, no exercise repeated on consecutive days, no heavy lower-body lift fell within 24 hours of lower-body training, readiness and equipment disruptions were absorbed without lasting distortion, and nothing overcorrected.

Two defects surfaced that one-workout testing could not see. Both silently stop progression on specific lifts:

| ID | Problem | Seen in | Severity |
|---|---|---|---|
| **M-20** | **Implement lock.** A progression line created while kettlebells were unavailable records dumbbells as its implement. When kettlebells return, the engine switches to its preferred implement, every exposure becomes IMPLEMENT_CHANGED, and IMPLEMENT_CHANGED is never evidence. The lift never progresses again. | E (one lift), E2 (every KB-default lift, 16 non-evidence decisions in weeks 2–3) | High: permanent, silent |
| **M-21** | **RETURN triggered by line sparsity.** RETURN (§H.7) is meant for a genuine absence such as travel. It keys on the individual line, and with four lower-body anchors split across two roles plus day-after-Alloy substitutions, a specific anchor can go more than 14 days between exposures while its movement pattern is trained every session. The exposure is then non-evidence. | C (2 lifts), D (goblet squat and KB deadlift: calibration, RETURN, nothing else in three weeks); latent in B (your real schedule), where heavy anchors land exactly 14 days apart | Medium: one slipped session removes progression |

Both are fixed narrowly in **ENGINE_WORKOUT_GENERATOR_V0_2_1.md** (engine 0.2.1). The fixes change no pick, prescription, or decision in any of the 38 original red-team scenarios, and all 37 v0.2 acceptance tests still pass. Three new tests (AT-26 to AT-28) pass with the fixes and fail without them.

**Engine 0.2.1 is the implementation baseline.** Everything else observed is either intended behavior or an already-registered open question (§4).

## 2. Method

**Performer.** Every session completed as prescribed, every set at target, effort rated **HARD** (as the app instructs). This is an idealized user, so progression figures are an upper bound.

**Start.** Cold start on Mon 2026-09-28 for every history (no prior state), so week 1 contains calibration.

| History | Schedule (local times) | What is tested |
|---|---|---|
| **A** apartment-only | Mon, Tue, Thu, Sat; 18:00 (Sat 10:00); no Alloy | 4 sessions/week including back-to-back days |
| **B** alternating | Alloy Mon/Wed/Fri 16:00; apartment Tue 18:00, Thu 07:00, Sat 10:00. Week 2 Wed Alloy logged FULL, lower focus (EX053, EX082, sled) | Two of three apartment sessions fall the morning after Alloy |
| **C** inconsistent | 10 sessions on irregular days, 07:00 to 22:00; lengths 20, 30, 45, 60 min; a 6-day gap; back-to-back days; one Alloy class logged, one answered "not sure," one prompt dismissed | Irregular frequency, duration and Alloy data |
| **D** reduced readiness | B-style schedule (apartment Tue/Thu 18:00, Sat 10:00). Week 2: Tue energy low + capacity below usual; Thu legs too sore; Sat unwell → lighter | Recovery and whether the engine overcorrects afterwards |
| **E** limited equipment | As D. Week 2: kettlebells unavailable all week; bench also out Thursday | Temporary equipment loss mid-block |
| **E2** limited equipment at start | As D. Week 1: kettlebells unavailable | Equipment loss while lines are being created |
| **F1** priority movement, as specified | As D | Priority = arms/shoulders (G-04, G-05) and core (G-07) with GOAL_ACCESSORY disabled (current default) |
| **F2** priority movement, mechanism enabled | As F1 with `GOAL_ACCESSORY_ENABLED = true` and four **hypothetical** supplemental rows (DB curl, hammer curl, two lateral-raise variants; UQ-G03 not answered) | Whether the specified priority mechanism (§C.5) behaves sensibly over time |

**Reading the ledgers (§5).** Each apartment row shows the four main slots as `family exercise reason prescription`. Reasons: `ANCHOR`, `NEW` (new anchor), `SUB` (substitute; anchor kept), `SUB-NA` (substitute; no anchor yet), `ROT` (rotation), `STN`. Prescriptions: `8@35` = target 8 reps at 35 lb; prefixes `cal` calibrate, `seed` seeded from the other role, `impl` implement changed, `ret` RETURN. "decisions" counts the progression decisions written at completion. "state changes" lists anchors created or rotated. Alloy rows show the external log. The family shown with each main slot (KD, HD, HPULL, HPUSH, VPUSH, ANTI_*) is the movement plan; its alternation is the role-alternation state (M-01).

## 3. Evaluation by criterion

### 3.1 Movement exposure

Working sets per week, apartment only (week 3, a steady-state week):

| | KD | HD | HPULL | HPUSH | VPUSH | ANTI_EXT | ANTI_ROT | CARRY | arm/shoulder isolation |
|---|---|---|---|---|---|---|---|---|---|
| A (4×/wk) | 12 | 12 | 12 | 6 | 6 | 8 | 8 | 6 | 0 |
| B (3×/wk + Alloy) | 9 | 9 | 9 | 6 | 3 | 6 | 6 | 6 | 0 |
| F1 (3×/wk + Alloy) | 9 | 9 | 9 | 6 | 3 | 6 | 6 | 6 | 0 |
| F2 (accessory on) | 9 | 9 | 9 | 6 | 3 | 6 | 4 | 2 | 12 |

Every main family is trained every week, lower and upper volumes match, and push equals pull (push split between horizontal and vertical, alternating week to week). VPULL and ANTI_LAT get nothing because they are unservable (UQ-G01, no library row), as designed. Exposure is **flat by construction**: the template fixes it, and staleness only decides which family leads.

### 3.2 Exercise repetition

Same exercise on consecutive days: **0** in every history. The most-used main lift appears 6 times in 12 sessions in A (every other session), 5 times in 9 elsewhere. Consecutive sessions share **no** main exercise (Jaccard 0.00 in A, E, E2, F1, F2; 0.02–0.12 in B, C, D); sessions two apart share 0.15–0.41.

### 3.3 Progression

With the fixes, every anchored lift that is performed progresses one rep per exposure, and lines that reach the top of the range load up (A: goblet squat 6→10 reps at 35 lb, then 40 lb, in 3 weeks; DB row 30→35; KB deadlift 35→40). Substitutes progress on their own lines (B: split squat and suitcase deadlift gain reps in both roles). LIGHT and changed-implement exposures hold without regressing. Before the fixes, E2's kettlebell-default lifts were frozen for good, and D's goblet squat and KB deadlift made no progress in three weeks (§1).

**Structural observation (not a defect):** each specific lower-body anchor is met about once a week at 3 sessions/week, and about once every two weeks in B, where two of three apartment sessions are the morning after Alloy. In B, the bilateral heavy lifts are trained on Tuesdays only, and most apartment lower-body work is done by two stable substitutes. That is the 24-hour rule doing its job while Alloy supplies heavy lower work three times a week.

### 3.4 Variation

New exercises per week: 13–18 in week 1 (cold start), 3–6 in week 2, 0–3 in week 3. Variety after that comes from the role split (each family has a PRIMARY and a SECONDARY anchor), push-family alternation, core anchors rotating every 4 exposures, drawn mobility, and substitutes on filtered days.

### 3.5 Recovery

Heavy lower lifts within 24 h of any lower-body training (apartment or Alloy): **0** in all histories. Day-after sessions consistently swap to the same two lighter lower-body exercises rather than new ones. The "not sure" and dismissed Alloy prompts in C each produced one conservative day, as intended by M-15. Not addressed by design (FL-17, still UNRESOLVED): in B, lower-body musculature is trained six days a week (Alloy M/W/F + apartment T/Th/S), lighter on apartment days, and upper-body training after Alloy is unmodified.

### 3.6 Goal emphasis

As specified today (F1), the priority goals get **no direct emphasis**: zero elbow-flexion or shoulder-isolation sets, and overhead pressing on alternate weeks only (3–6 sets/week). This is the already-disclosed gap (B1, B2, UQ-G03). When the mechanism is enabled (F2) it works longitudinally: 12 arm/shoulder isolation sets per week, stable accessory anchors, progression (10→12 reps), rotation after 4 exposures (hammer curl → curl, lateral raise → leaning lateral raise). The cost is visible: the finish slot no longer carries core or carry, so anti-rotation drops from 6 to 2–4 sets/week and carry from 6 to 2–4. Whether arms or core come first is a B1 ranking question, so the engine should not decide it.

A **main** movement cannot receive extra exposure at all (for example, "more pulling"): the template gives every main family the same share. That is the V0 design, not a defect; any change would be goal weighting (B1).

### 3.7 Session architecture

Stable: A/B/C/F for 45-minute check-ins from session 3 on (30 min in sessions 1–2 with the FIRST_SESSIONS notice), A/B for 30, A for 20, the same ~40-minute plan with a TIER_MAXIMUM notice for 60. Soreness days keep the block structure and fill with core (D: 30 min, SLOTS_EMPTY notice). Estimated durations 36–43 min for 45 available.

### 3.8 Do workouts become mechanically repetitive?

At the main-lift level, yes, by design, and within three weeks that is appropriate. In A the same three main lifts recur every other session (4 distinct main-lift sets in 12 sessions), and in the 3×/week histories 6–9 distinct sets in 9 sessions. Consecutive sessions never look alike, and the accessory layer (core, mobility, carry) changes slowly. The repetition is what makes the load visibly progress.

Watch beyond this test window: main anchors rotate only at LOAD_CAPPED. Kettlebell lifts cap at 45 lb in roughly 12 weeks, but dumbbell lines (cap 50 lb) could stay unchanged for four to six months, and substitutes never rotate. Whether that feels stale is a Phase 8 question for real use. Adding time-based rotation now would be periodization, which is out of scope.

### 3.9 Does the generator overcorrect?

No. The template fixes volume and structure, so recent training can only change which family leads, which exercise stands in today, and whether an exposure counts. It cannot add catch-up volume. D shows this clearly: after a week with a LIGHT day, a sore-legs day and an unwell day, week 3 returned to the normal plan: no anchor changed because of the disrupted week, and no load was reduced by the LIGHT or sore days. The only lasting effect was a harmless phase shift in role alternation: Tuesday led with hinge instead of squat. E returned to kettlebell lines in week 3 with loads intact. The one "undercorrection" was M-21 (a lift treated as returning from absence when it wasn't).

## 4. Findings not changed in 0.2.1

| Finding | Disposition |
|---|---|
| Heavy lower anchors trained about every other week on a B-style schedule; substitutes carry most apartment lower work | Intended (24 h rule, M-03). The records say so truthfully. Review in Phase 8 with real logs |
| Lower body trained six days a week in B; no upper-body recovery rule after Alloy | FL-17, UNRESOLVED weekly-frequency tolerance, Phase 8 |
| No direct arm/shoulder work until supplemental rows are approved | B2, UQ-G03 (disclosed) |
| Enabling GOAL_ACCESSORY displaces the core/carry finish | B1 ranking of G-04/G-05 vs G-07 |
| Main anchors rotate only at LOAD_CAPPED (months for dumbbell lines) | Monitor in Phase 8; no rotation rule added |
| Farmer's carry reaches LOAD_CAPPED in week 3 of A (45 lb kettlebells, extended range) and, with no other carry row, stays there | Minor. The line keeps its kettlebell implement (M-20); heavier carries need a supplemental row or a user replace. Phase 8 |
| Harness deviation found and corrected: the simulator took load increments from the kettlebell list even for dumbbell lines, contrary to §H.5 | Harness only; spec unchanged |

## 5. Session-by-session state (engine 0.2.1)

### A. Apartment-only, 4×/week

Role alternation runs cleanly (KD/HPULL and HD/PUSH alternate every session). Every Tuesday is 23 h after Monday, so both lower slots take the same two lighter substitutes (split squat, suitcase deadlift) each week, and they progress on their own lines. Main lifts load up in week 3. Carry caps in week 3 (see §4).

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mon 09-28 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX084 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX084 |
| 2 | Tue 09-29 18:00 |   | HD EX073 SUB-NA cal 6 | VPUSH EX015 NEW cal 6 | KD EX013 SUB-NA cal 8 | HPULL EX069 NEW cal 8 | EX029 EX046 | — | 33 | {'CALIBRATE': 7} | VPUSH/PRI:∅→EX015; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| 3 | Thu 10-01 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 6@30 | HD EX011 ANCHOR 8@35 | HPUSH EX054 ANCHOR 8@30 | EX084 EX090 | EX046 | 38 | {'REPS_UP': 8} |  |
| 4 | Sat 10-03 10:00 |   | HD EX065 NEW cal 6 | HPUSH EX041 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 ANCHOR 8@30 | EX090 EX084 | EX046 | 36 | {'CALIBRATE': 4, 'REPS_UP': 4} | HD/PRI:∅→EX065; HPUSH/PRI:∅→EX041; KD/SEC:∅→EX018 |
| 5 | Mon 10-05 18:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 9@35 | VPUSH EX071 NEW cal 8 | EX090 EX084 | EX046 | 40 | {'REPS_UP': 6, 'CALIBRATE': 2} | VPUSH/SEC:∅→EX071 |
| 6 | Tue 10-06 18:00 |   | HD EX073 SUB 6@35 | VPUSH EX015 ANCHOR 6@25 | KD EX013 SUB 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX098 | EX101 EX021 | 41 | {'REPS_UP': 6, 'CALIBRATE': 1} | ANTI_EXT/COR:EX090→EX029; ANTI_ROT/COR:EX084→EX098 |
| 7 | Thu 10-08 18:00 |   | KD EX012 ANCHOR 8@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 10@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX046 | EX098 | 38 | {'REPS_UP': 7, 'EXTEND_RANGE': 1} |  |
| 8 | Sat 10-10 10:00 |   | HD EX065 ANCHOR 6@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 8} |  |
| 9 | Mon 10-12 18:00 |   | KD EX012 ANCHOR 9@35 | HPULL EX066 ANCHOR 9@30 | HD EX011 ANCHOR 11@35 | VPUSH EX071 ANCHOR 8@25 | EX029 EX098 | EX046 | 40 | {'REPS_UP': 8} |  |
| 10 | Tue 10-13 18:00 |   | HD EX073 SUB 7@35 | VPUSH EX015 ANCHOR 7@25 | KD EX013 SUB 9@35 | HPULL EX069 ANCHOR 11@30 | EX090 EX083 | EX038 EX102 | 41 | {'REPS_UP': 6, 'CALIBRATE': 1} | ANTI_EXT/COR:EX029→EX090; ANTI_ROT/COR:EX098→EX083 |
| 11 | Thu 10-15 18:00 |   | KD EX012 ANCHOR 10@35 | HPULL EX066 ANCHOR 10@30 | HD EX011 ANCHOR 12@35 | HPUSH EX054 ANCHOR 10@30 | EX090 EX046 | EX083 | 38 | {'LOAD_UP': 3, 'REPS_UP': 3, 'EXTEND_RANGE': 1, 'LOAD_CAPPED': 1} |  |
| 12 | Sat 10-17 10:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 7@30 | KD EX018 ANCHOR 9@35 | HPULL EX069 ANCHOR 12@30 | EX090 EX083 | EX046 | 38 | {'REPS_UP': 6, 'LOAD_UP': 1, 'LOAD_CAPPED': 1} |  |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-28 cal 6→CALIBRATE · 10-01 6@35→REPS_UP · 10-05 7@35→REPS_UP · 10-08 8@35→REPS_UP · 10-12 9@35→REPS_UP · 10-15 10@35→LOAD_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-28 cal 6→CALIBRATE · 10-01 6@30→REPS_UP · 10-05 7@30→REPS_UP · 10-08 8@30→REPS_UP · 10-12 9@30→REPS_UP · 10-15 10@30→LOAD_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-28 cal 8→CALIBRATE · 10-01 8@35→REPS_UP · 10-05 9@35→REPS_UP · 10-08 10@35→REPS_UP · 10-12 11@35→REPS_UP · 10-15 12@35→LOAD_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-28 cal 8→CALIBRATE · 10-01 8@30→REPS_UP · 10-08 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 09-29 cal 6→CALIBRATE · 10-06 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 09-29 cal 6→CALIBRATE · 10-06 6@25→REPS_UP · 10-13 7@25→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 09-29 cal 8→CALIBRATE · 10-06 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-06 9@30→REPS_UP · 10-10 10@30→REPS_UP · 10-13 11@30→REPS_UP · 10-17 12@30→LOAD_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-03 cal 6→CALIBRATE · 10-10 6@30→REPS_UP · 10-17 7@30→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-03 cal 6→CALIBRATE · 10-10 6@30→REPS_UP · 10-17 7@30→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-03 cal 8→CALIBRATE · 10-10 8@35→REPS_UP · 10-17 9@35→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-05 cal 8→CALIBRATE · 10-12 8@25→REPS_UP

### B. Alternating Alloy and apartment

Only Tuesday sessions are ≥ 24 h after an Alloy class, so bilateral heavy lower anchors (EX012, EX011, EX065, EX018) appear on Tuesdays only, each about every other week. Thursday-morning and Saturday lower work is done by EX013 and EX073 in alternating roles, seeded from each other's lines. The FULL lower-focused Alloy log in week 2 is respected (substitutes the next morning). Upper-body anchors progress every exposure.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 07:00 |   | HD EX073 SUB-NA cal 6 | VPUSH EX015 NEW cal 6 | KD EX013 SUB-NA cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 33 | {'CALIBRATE': 6, 'REPS_UP': 1} | VPUSH/PRI:∅→EX015; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB seed 6@35 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB seed 8@35 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'REPS_UP': 8} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 |   | HD EX065 NEW cal 6 | HPUSH EX041 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 ANCHOR 8@30 | EX090 EX098 | EX046 | 36 | {'CALIBRATE': 4, 'REPS_UP': 4} | HD/PRI:∅→EX065; HPUSH/PRI:∅→EX041; KD/SEC:∅→EX018 |
| | Wed 10-07 16:00 | Alloy FULL lower: EX053, EX082, sled | | | | | | | | | |
| 5 | Thu 10-08 07:00 |   | KD EX013 SUB 7@35 | HPULL EX066 ANCHOR 7@30 | HD EX073 SUB 9@35 | VPUSH EX071 NEW cal 8 | EX029 EX098 | EX046 | 43 | {'REPS_UP': 5, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB 6@35 | VPUSH EX015 ANCHOR 6@25 | KD EX013 SUB 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 6, 'CALIBRATE': 1, 'EXTEND_RANGE': 1} | ANTI_ROT/COR:EX098→EX084 |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 8@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX084 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 07:00 |   | HD EX073 SUB 7@35 | HPUSH EX041 ANCHOR 6@30 | KD EX013 SUB 9@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 8} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB 8@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB 10@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX084 | EX046 | 43 | {'REPS_UP': 7, 'LOAD_CAPPED': 1} | ANTI_EXT/COR:EX029→EX090 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-13 6@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-13 8@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@35→REPS_UP · 10-15 7@35→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-01 cal 8→CALIBRATE · 10-10 8@35→REPS_UP · 10-15 9@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 seed 6@35→REPS_UP · 10-08 7@35→REPS_UP · 10-17 8@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 seed 8@35→REPS_UP · 10-08 9@35→REPS_UP · 10-17 10@35→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-06 cal 6→CALIBRATE
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-06 cal 8→CALIBRATE
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP

### C. Inconsistent frequency

Irregular days and lengths keep the same structure scaled to time (20 min = block A only, 30 = A+B, 60 = the 45 plan with a TIER_MAXIMUM notice). The "not sure" answer and the dismissed prompt each give one conservative (substitute) day. The 6-day gap changes nothing. Under v0.2, the split squat and suitcase deadlift were given RETURN on 10-15 although lower body had been trained two days earlier; under 0.2.1 they progress.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mon 09-28 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX084 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX084 |
| 2 | Tue 09-29 07:00 | {'R01': 30}  | HD EX073 SUB-NA cal 6 | VPUSH EX015 NEW cal 6 | KD EX013 SUB-NA cal 8 | HPULL EX069 NEW cal 8 | — | — | 28 | {'CALIBRATE': 5} | VPUSH/PRI:∅→EX015; HPULL/SEC:∅→EX069 |
| 3 | Sat 10-03 11:00 |  Fri Alloy: not sure | KD EX013 SUB seed 6@35 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB seed 8@35 | HPUSH EX054 ANCHOR 8@30 | EX090 EX046 | EX084 | 41 | {'REPS_UP': 7, 'CALIBRATE': 1} | CARRY/CAR:∅→EX046 |
| 4 | Sun 10-04 19:00 | {'R01': 60}  | HD EX065 NEW cal 6 | HPUSH EX041 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 ANCHOR 8@30 | EX029 EX083 | EX102 EX038 | 36 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; HPUSH/PRI:∅→EX041; KD/SEC:∅→EX018 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Sat 10-10 09:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 8@35 | VPUSH EX071 NEW cal 8 | EX090 EX046 | EX084 | 40 | {'REPS_UP': 6, 'CALIBRATE': 2} | VPUSH/SEC:∅→EX071 |
| 6 | Mon 10-12 18:00 | {'R01': 20}  | HD EX065 ANCHOR 6@30 | VPUSH EX015 ANCHOR 6@25 | — | — | — | — | 16 | {'REPS_UP': 3} |  |
| 7 | Tue 10-13 18:00 | {'R01': 30}  | KD EX013 SUB 7@35 | HPULL EX066 ANCHOR 8@30 | HD EX073 SUB 9@35 | HPUSH EX054 ANCHOR 9@30 | — | — | 27 | {'REPS_UP': 5} |  |
| 8 | Thu 10-15 12:00 |  Wed Alloy prompt dismissed | HD EX073 SUB 6@35 | HPUSH EX041 ANCHOR 6@30 | KD EX013 SUB 8@35 | HPULL EX069 ANCHOR 9@30 | EX090 EX084 | EX046 | 41 | {'REPS_UP': 8} |  |
| 9 | Fri 10-16 22:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 9@30 | HD EX011 ANCHOR 9@35 | VPUSH EX071 ANCHOR 8@25 | EX029 EX098 | EX101 EX036 | 40 | {'REPS_UP': 6, 'CALIBRATE': 1} | ANTI_EXT/COR:EX090→EX029; ANTI_ROT/COR:EX084→EX098 |
| 10 | Sun 10-18 08:00 |   | HD EX065 ANCHOR 7@30 | VPUSH EX015 ANCHOR 7@25 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX046 | EX098 | 38 | {'REPS_UP': 8} |  |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-28 cal 6→CALIBRATE · 10-10 6@35→REPS_UP · 10-16 7@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-28 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-10 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-16 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-28 cal 8→CALIBRATE · 10-10 8@35→REPS_UP · 10-16 9@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-28 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 09-29 cal 6→CALIBRATE · 10-15 6@35→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 09-29 cal 6→CALIBRATE · 10-12 6@25→REPS_UP · 10-18 7@25→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 09-29 cal 8→CALIBRATE · 10-15 8@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 09-29 cal 8→CALIBRATE · 10-04 8@30→REPS_UP · 10-15 9@30→REPS_UP · 10-18 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 seed 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 seed 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-04 cal 6→CALIBRATE · 10-12 6@30→REPS_UP · 10-18 7@30→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-04 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-04 cal 8→CALIBRATE · 10-18 8@35→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-10 cal 8→CALIBRATE · 10-16 8@25→REPS_UP

<details><summary>C under engine 0.2.0 (before M-20/M-21)</summary>

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mon 09-28 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX084 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX084 |
| 2 | Tue 09-29 07:00 | {'R01': 30}  | HD EX073 SUB-NA cal 6 | VPUSH EX015 NEW cal 6 | KD EX013 SUB-NA cal 8 | HPULL EX069 NEW cal 8 | — | — | 28 | {'CALIBRATE': 5} | VPUSH/PRI:∅→EX015; HPULL/SEC:∅→EX069 |
| 3 | Sat 10-03 11:00 |  Fri Alloy: not sure | KD EX013 SUB seed 6@35 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB seed 8@35 | HPUSH EX054 ANCHOR 8@30 | EX090 EX046 | EX084 | 41 | {'REPS_UP': 7, 'CALIBRATE': 1} | CARRY/CAR:∅→EX046 |
| 4 | Sun 10-04 19:00 | {'R01': 60}  | HD EX065 NEW cal 6 | HPUSH EX041 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 ANCHOR 8@30 | EX029 EX083 | EX102 EX038 | 36 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; HPUSH/PRI:∅→EX041; KD/SEC:∅→EX018 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Sat 10-10 09:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 8@35 | VPUSH EX071 NEW cal 8 | EX090 EX046 | EX084 | 40 | {'REPS_UP': 6, 'CALIBRATE': 2} | VPUSH/SEC:∅→EX071 |
| 6 | Mon 10-12 18:00 | {'R01': 20}  | HD EX065 ANCHOR 6@30 | VPUSH EX015 ANCHOR 6@25 | — | — | — | — | 16 | {'REPS_UP': 3} |  |
| 7 | Tue 10-13 18:00 | {'R01': 30}  | KD EX013 SUB 7@35 | HPULL EX066 ANCHOR 8@30 | HD EX073 SUB 9@35 | HPUSH EX054 ANCHOR 9@30 | — | — | 27 | {'REPS_UP': 5} |  |
| 8 | Thu 10-15 12:00 |  Wed Alloy prompt dismissed | HD EX073 SUB ret 6@35 | HPUSH EX041 ANCHOR 6@30 | KD EX013 SUB ret 8@35 | HPULL EX069 ANCHOR 9@30 | EX090 EX084 | EX046 | 41 | {'RETURN': 2, 'REPS_UP': 6} |  |
| 9 | Fri 10-16 22:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 9@30 | HD EX011 ANCHOR 9@35 | VPUSH EX071 ANCHOR 8@25 | EX029 EX098 | EX101 EX036 | 40 | {'REPS_UP': 6, 'CALIBRATE': 1} | ANTI_EXT/COR:EX090→EX029; ANTI_ROT/COR:EX084→EX098 |
| 10 | Sun 10-18 08:00 |   | HD EX065 ANCHOR 7@30 | VPUSH EX015 ANCHOR 7@25 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX046 | EX098 | 38 | {'REPS_UP': 8} |  |

- Goblet Squat (EX012, PRIMARY): 09-28 cal 6→CALIBRATE · 10-10 6@35→REPS_UP · 10-16 7@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-28 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-10 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-16 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-28 cal 8→CALIBRATE · 10-10 8@35→REPS_UP · 10-16 9@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-28 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 09-29 cal 6→CALIBRATE · 10-15 ret 6@35→RETURN
- Kettlebell Overhead Press (EX015, PRIMARY): 09-29 cal 6→CALIBRATE · 10-12 6@25→REPS_UP · 10-18 7@25→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 09-29 cal 8→CALIBRATE · 10-15 ret 8@35→RETURN
- Chest-Supported Row (EX069, SECONDARY): 09-29 cal 8→CALIBRATE · 10-04 8@30→REPS_UP · 10-15 9@30→REPS_UP · 10-18 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 seed 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 seed 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-04 cal 6→CALIBRATE · 10-12 6@30→REPS_UP · 10-18 7@30→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-04 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-04 cal 8→CALIBRATE · 10-18 8@35→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-10 cal 8→CALIBRATE · 10-16 8@25→REPS_UP

</details>

### D. Reduced readiness in week 2

Week 2: the low-energy day is LIGHT (2 sets, mobility finish, no progression, no novelty: the unused floor press is skipped for the familiar bench); the sore-legs day replaces both lower slots with core; the unwell day is LIGHT again. Week 3 resumes normal training with no carried-over reduction. Under v0.2 the goblet squat and KB deadlift received RETURN on 10-15 (16 days since their only exposure), so they made no progress in three weeks; under 0.2.1 they progress.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'CALIBRATE': 2, 'REPS_UP': 6} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 | {'R02': 'low'} energy low | HD EX065 ANCHOR 6@30 | HPUSH EX054 SUB-NA seed 6@30 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX098 | EX101 EX036 | 32 | {'NOT_EVIDENCE': 7} |  |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 | {'R05': ['lower']} legs too sore | ANTI_ EX029 ROT cal 8 | HPULL EX066 ANCHOR 7@30 | ANTI_ EX098 ANCHOR 9 | VPUSH EX071 NEW cal 8 | — | EX102 EX021 | 30 | {'CALIBRATE': 3, 'REPS_UP': 2} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 | {'R06': 'yes', 'R06_choice': 'lighter'} unwell: lighter | KD EX013 SUB 6@35 | VPUSH EX015 ANCHOR 6@25 | HD EX073 SUB 8@35 | HPULL EX069 ANCHOR 8@30 | EX029 EX046 | EX101 EX036 | 34 | {'NOT_EVIDENCE': 7} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | HD EX065 ANCHOR 6@30 | HPULL EX066 ANCHOR 8@30 | KD EX018 ANCHOR 8@35 | HPUSH EX054 ANCHOR 9@30 | EX084 EX029 | EX046 | 38 | {'REPS_UP': 7, 'CALIBRATE': 1} | ANTI_ROT/COR:EX098→EX084 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | KD EX012 ANCHOR 6@35 | HPUSH EX041 NEW cal 6 | HD EX011 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX029 EX084 | EX046 | 38 | {'REPS_UP': 6, 'CALIBRATE': 2} | HPUSH/PRI:∅→EX041 |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | HD EX073 SUB seed 6@35 | HPULL EX066 ANCHOR 9@30 | KD EX013 SUB seed 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX084 | EX046 | 43 | {'REPS_UP': 7, 'EXTEND_RANGE': 1} | ANTI_EXT/COR:EX029→EX090 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-15 6@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-15 8@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→NOT_EVIDENCE · 10-13 6@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→NOT_EVIDENCE
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@35→NOT_EVIDENCE · 10-13 8@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→NOT_EVIDENCE · 10-10 8@30→NOT_EVIDENCE · 10-15 8@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-10 6@35→NOT_EVIDENCE
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-10 8@35→NOT_EVIDENCE
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-15 cal 6→CALIBRATE
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-17 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-17 seed 8@35→REPS_UP

<details><summary>D under engine 0.2.0 (before M-20/M-21)</summary>

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'CALIBRATE': 2, 'REPS_UP': 6} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 | {'R02': 'low'} energy low | HD EX065 ANCHOR 6@30 | HPUSH EX054 SUB-NA seed 6@30 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX098 | EX101 EX036 | 32 | {'NOT_EVIDENCE': 7} |  |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 | {'R05': ['lower']} legs too sore | ANTI_ EX029 ROT cal 8 | HPULL EX066 ANCHOR 7@30 | ANTI_ EX098 ANCHOR 9 | VPUSH EX071 NEW cal 8 | — | EX102 EX021 | 30 | {'CALIBRATE': 3, 'REPS_UP': 2} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 | {'R06': 'yes', 'R06_choice': 'lighter'} unwell: lighter | KD EX013 SUB 6@35 | VPUSH EX015 ANCHOR 6@25 | HD EX073 SUB 8@35 | HPULL EX069 ANCHOR 8@30 | EX029 EX046 | EX101 EX036 | 34 | {'NOT_EVIDENCE': 7} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | HD EX065 ANCHOR 6@30 | HPULL EX066 ANCHOR 8@30 | KD EX018 ANCHOR 8@35 | HPUSH EX054 ANCHOR 9@30 | EX084 EX029 | EX046 | 38 | {'REPS_UP': 7, 'CALIBRATE': 1} | ANTI_ROT/COR:EX098→EX084 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | KD EX012 ANCHOR ret 6@35 | HPUSH EX041 NEW cal 6 | HD EX011 ANCHOR ret 8@35 | HPULL EX069 ANCHOR 8@30 | EX029 EX084 | EX046 | 38 | {'RETURN': 2, 'CALIBRATE': 2, 'REPS_UP': 4} | HPUSH/PRI:∅→EX041 |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | HD EX073 SUB seed 6@35 | HPULL EX066 ANCHOR 9@30 | KD EX013 SUB seed 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX084 | EX046 | 43 | {'REPS_UP': 7, 'EXTEND_RANGE': 1} | ANTI_EXT/COR:EX029→EX090 |

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-15 ret 6@35→RETURN
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-15 ret 8@35→RETURN
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→NOT_EVIDENCE · 10-13 6@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→NOT_EVIDENCE
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@35→NOT_EVIDENCE · 10-13 8@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→NOT_EVIDENCE · 10-10 8@30→NOT_EVIDENCE · 10-15 8@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-10 6@35→NOT_EVIDENCE
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-10 8@35→NOT_EVIDENCE
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-15 cal 6→CALIBRATE
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-17 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-17 seed 8@35→REPS_UP

</details>

### E. Limited equipment in week 2

During the kettlebell-free week, anchors are kept and performed with dumbbells (IMPLEMENT_CHANGED, not evidence); Thursday's VPUSH/SECONDARY anchor (EX071) happens to be created that week, so its line is built on dumbbells. In week 3, kettlebell lines resume with loads intact. Under v0.2, that dumbbell-created VPUSH line switched back to kettlebells and could never count again (the Sat 10-17 `impl` row in v0.2); under 0.2.1 it stays on dumbbells and progresses.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'CALIBRATE': 2, 'REPS_UP': 6} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 | {'eq_issues': ['EQ009']} no KBs | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR impl 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX083 | EX046 | 38 | {'REPS_UP': 3, 'CALIBRATE': 3, 'NOT_EVIDENCE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 | {'eq_issues': ['EQ009', 'EQ011']} no KBs, no bench | KD EX012 ANCHOR impl 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR impl 8@35 | VPUSH EX071 NEW cal 8 | EX029 EX084 | EX046 | 40 | {'NOT_EVIDENCE': 3, 'REPS_UP': 1, 'CALIBRATE': 4} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 | {'eq_issues': ['EQ009']} no KBs | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR impl 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX083 | EX046 | 41 | {'REPS_UP': 5, 'NOT_EVIDENCE': 3} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 8@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX084 | EX046 | 43 | {'REPS_UP': 7, 'EXTEND_RANGE': 1} | ANTI_EXT/COR:EX029→EX090; ANTI_ROT/COR:EX098→EX084 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 impl 6@35→NOT_EVIDENCE · 10-13 6@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 impl 8@35→NOT_EVIDENCE · 10-13 8@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 impl 6@25→NOT_EVIDENCE
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 impl 8@35→NOT_EVIDENCE · 10-15 8@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 6@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 8@35→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP

<details><summary>E under engine 0.2.0 (before M-20/M-21)</summary>

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'CALIBRATE': 2, 'REPS_UP': 6} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 | {'eq_issues': ['EQ009']} no KBs | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR impl 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX083 | EX046 | 38 | {'REPS_UP': 3, 'CALIBRATE': 3, 'NOT_EVIDENCE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 | {'eq_issues': ['EQ009', 'EQ011']} no KBs, no bench | KD EX012 ANCHOR impl 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR impl 8@35 | VPUSH EX071 NEW cal 8 | EX029 EX084 | EX046 | 40 | {'NOT_EVIDENCE': 3, 'REPS_UP': 2, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR impl 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 5, 'NOT_EVIDENCE': 3} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR impl 6@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR impl 8@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX098 | EX046 | 38 | {'NOT_EVIDENCE': 3, 'REPS_UP': 4, 'CALIBRATE': 1} | ANTI_ROT/COR:EX084→EX098 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR impl 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 6, 'NOT_EVIDENCE': 2} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB impl 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB impl 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX098 | EX046 | 43 | {'NOT_EVIDENCE': 3, 'REPS_UP': 5} | ANTI_EXT/COR:EX029→EX090 |

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 impl 6@35→NOT_EVIDENCE · 10-13 impl 6@35→NOT_EVIDENCE
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 impl 8@35→NOT_EVIDENCE · 10-13 impl 8@35→NOT_EVIDENCE
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 impl 6@25→NOT_EVIDENCE
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 impl 8@35→NOT_EVIDENCE · 10-15 impl 8@35→NOT_EVIDENCE
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 impl 6@35→NOT_EVIDENCE
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 impl 8@35→NOT_EVIDENCE
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP

</details>

### E2. Limited equipment in week 1

The clearest case of the implement lock. Under v0.2, every kettlebell-default lift calibrated on dumbbells in week 1 shows `impl` for the rest of the history and never progresses (16 non-evidence decisions in weeks 2–3). Under 0.2.1 the lines stay on dumbbells and progress exactly like F1.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 | {'eq_issues': ['EQ009']} no KBs | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX083 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 | {'eq_issues': ['EQ009']} no KBs | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 | {'eq_issues': ['EQ009']} no KBs | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX084 EX090 | EX046 | 41 | {'CALIBRATE': 3, 'REPS_UP': 5} | ANTI_ROT/COR:∅→EX084 |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 |   | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX084 | EX046 | 38 | {'REPS_UP': 6, 'CALIBRATE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 8@35 | VPUSH EX071 NEW cal 8 | EX029 EX084 | EX046 | 40 | {'REPS_UP': 5, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 7, 'LOAD_UP': 1} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 9@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 7, 'CALIBRATE': 1} | ANTI_ROT/COR:EX084→EX098 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR 9@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX098 | EX046 | 43 | {'REPS_UP': 8} | ANTI_EXT/COR:EX029→EX090 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@35→REPS_UP · 10-15 9@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 6@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 8@35→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP

<details><summary>E2 under engine 0.2.0 (before M-20/M-21)</summary>

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 | {'eq_issues': ['EQ009']} no KBs | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX083 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 | {'eq_issues': ['EQ009']} no KBs | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 | {'eq_issues': ['EQ009']} no KBs | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX084 EX090 | EX046 | 41 | {'CALIBRATE': 3, 'REPS_UP': 5} | ANTI_ROT/COR:∅→EX084 |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 |   | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR impl 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX084 | EX046 | 38 | {'REPS_UP': 4, 'CALIBRATE': 2, 'NOT_EVIDENCE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 |   | KD EX012 ANCHOR impl 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR impl 8@35 | VPUSH EX071 NEW cal 8 | EX029 EX084 | EX046 | 40 | {'NOT_EVIDENCE': 3, 'REPS_UP': 2, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR impl 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 5, 'NOT_EVIDENCE': 3} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR impl 6@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR impl 8@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX098 | EX046 | 38 | {'NOT_EVIDENCE': 3, 'REPS_UP': 4, 'CALIBRATE': 1} | ANTI_ROT/COR:EX084→EX098 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR impl 8@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX098 | EX046 | 38 | {'REPS_UP': 6, 'NOT_EVIDENCE': 2} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB impl 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB impl 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX098 | EX046 | 43 | {'NOT_EVIDENCE': 3, 'REPS_UP': 5} | ANTI_EXT/COR:EX029→EX090 |

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 impl 6@35→NOT_EVIDENCE · 10-13 impl 6@35→NOT_EVIDENCE
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 impl 8@35→NOT_EVIDENCE · 10-13 impl 8@35→NOT_EVIDENCE
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 impl 6@25→NOT_EVIDENCE
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 impl 8@35→NOT_EVIDENCE · 10-15 impl 8@35→NOT_EVIDENCE
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 impl 6@35→NOT_EVIDENCE
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 impl 8@35→NOT_EVIDENCE
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP

</details>

### F1. Priority movement, as specified (GOAL_ACCESSORY off)

Same schedule as D/E without disruption: the reference history. Priority goals (arms, shoulders) get no direct work; core gets 10–12 sets/week plus 4–6 carry sets.

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | EX046 | 41 | {'CALIBRATE': 2, 'REPS_UP': 6} |  |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 |   | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX098 | EX046 | 38 | {'REPS_UP': 6, 'CALIBRATE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 8@35 | VPUSH EX071 NEW cal 8 | EX029 EX098 | EX046 | 40 | {'REPS_UP': 5, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX084 | EX046 | 41 | {'REPS_UP': 6, 'CALIBRATE': 1, 'EXTEND_RANGE': 1} | ANTI_ROT/COR:EX098→EX084 |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 9@35 | HPUSH EX054 ANCHOR 9@30 | EX029 EX084 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR 9@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX084 | EX046 | 38 | {'REPS_UP': 8} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB 8@35 | VPUSH EX071 ANCHOR 8@25 | EX090 EX084 | EX046 | 43 | {'REPS_UP': 7, 'LOAD_CAPPED': 1} | ANTI_EXT/COR:EX029→EX090 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@35→REPS_UP · 10-15 9@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 6@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 8@35→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP

### F2. Priority movement, GOAL_ACCESSORY on (hypothetical rows)

Accessories fill the finish from session 3: one elbow-flexion and one shoulder-isolation item per session, progressing 10→12 reps, rotating after four exposures. The carry moves into C when it is stalest, so core and carry volume falls (§3.6).

| # | when | check-in | A1 | A2 | B1 | B2 | C | F | min | decisions | state changes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | Mon 09-28 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 1 | Tue 09-29 18:00 |   | KD EX012 NEW cal 6 | HPULL EX066 NEW cal 6 | HD EX011 NEW cal 8 | HPUSH EX054 NEW cal 8 | EX090 EX098 | — | 30 | {'CALIBRATE': 7} | KD/PRI:∅→EX012; HPULL/PRI:∅→EX066; HD/SEC:∅→EX011; HPUSH/SEC:∅→EX054; ANTI_EXT/COR:∅→EX090; ANTI_ROT/COR:∅→EX098 |
| | Wed 09-30 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 2 | Thu 10-01 18:00 |   | HD EX065 NEW cal 6 | VPUSH EX015 NEW cal 6 | KD EX018 NEW cal 8 | HPULL EX069 NEW cal 8 | EX090 EX046 | — | 30 | {'CALIBRATE': 6, 'REPS_UP': 1} | HD/PRI:∅→EX065; VPUSH/PRI:∅→EX015; KD/SEC:∅→EX018; HPULL/SEC:∅→EX069; CARRY/CAR:∅→EX046 |
| | Fri 10-02 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 3 | Sat 10-03 10:00 |   | KD EX013 SUB cal 6 | HPULL EX066 ANCHOR 6@30 | HD EX073 SUB cal 8 | HPUSH EX054 ANCHOR 8@30 | EX098 EX090 | SX002 SX003 | 41 | {'CALIBRATE': 4, 'REPS_UP': 5} | GA_EF/ACC:∅→SX002; GA_SI/ACC:∅→SX003 |
| | Mon 10-05 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 4 | Tue 10-06 18:00 |   | HD EX065 ANCHOR 6@30 | HPUSH EX041 NEW cal 6 | KD EX018 ANCHOR 8@35 | HPULL EX069 ANCHOR 8@30 | EX090 EX046 | SX002 SX003 | 38 | {'REPS_UP': 7, 'CALIBRATE': 2} | HPUSH/PRI:∅→EX041 |
| | Wed 10-07 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 5 | Thu 10-08 18:00 |   | KD EX012 ANCHOR 6@35 | HPULL EX066 ANCHOR 7@30 | HD EX011 ANCHOR 8@35 | VPUSH EX071 NEW cal 8 | EX098 EX029 | SX002 SX003 | 40 | {'REPS_UP': 6, 'CALIBRATE': 3} | ANTI_EXT/COR:EX090→EX029; VPUSH/SEC:∅→EX071 |
| | Fri 10-09 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 6 | Sat 10-10 10:00 |   | HD EX073 SUB seed 6@35 | VPUSH EX015 ANCHOR 6@25 | KD EX013 SUB seed 8@35 | HPULL EX069 ANCHOR 9@30 | EX029 EX046 | SX002 SX003 | 41 | {'REPS_UP': 9} |  |
| | Mon 10-12 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 7 | Tue 10-13 18:00 |   | KD EX012 ANCHOR 7@35 | HPULL EX066 ANCHOR 8@30 | HD EX011 ANCHOR 9@35 | HPUSH EX054 ANCHOR 9@30 | EX098 EX029 | SX001 SX004 | 38 | {'REPS_UP': 7, 'CALIBRATE': 2} | GA_EF/ACC:SX002→SX001; GA_SI/ACC:SX003→SX004 |
| | Wed 10-14 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 8 | Thu 10-15 18:00 |   | HD EX065 ANCHOR 7@30 | HPUSH EX041 ANCHOR 6@30 | KD EX018 ANCHOR 9@35 | HPULL EX069 ANCHOR 10@30 | EX029 EX046 | SX001 SX004 | 38 | {'REPS_UP': 9} |  |
| | Fri 10-16 16:00 | Alloy SUMMARY full | | | | | | | | | |
| 9 | Sat 10-17 10:00 |   | KD EX013 SUB 6@35 | HPULL EX066 ANCHOR 9@30 | HD EX073 SUB 8@35 | VPUSH EX071 ANCHOR 8@25 | EX083 EX090 | SX001 SX004 | 43 | {'REPS_UP': 8, 'CALIBRATE': 1} | ANTI_EXT/COR:EX029→EX090; ANTI_ROT/COR:EX098→EX083 |

**Line trajectories (exposure date, prescription → decision):**

- Goblet Squat (EX012, PRIMARY): 09-29 cal 6→CALIBRATE · 10-08 6@35→REPS_UP · 10-13 7@35→REPS_UP
- Dumbbell Bent-Over Row (EX066, PRIMARY): 09-29 cal 6→CALIBRATE · 10-03 6@30→REPS_UP · 10-08 7@30→REPS_UP · 10-13 8@30→REPS_UP · 10-17 9@30→REPS_UP
- Kettlebell Deadlift (EX011, SECONDARY): 09-29 cal 8→CALIBRATE · 10-08 8@35→REPS_UP · 10-13 9@35→REPS_UP
- Dumbbell Bench Press (EX054, SECONDARY): 09-29 cal 8→CALIBRATE · 10-03 8@30→REPS_UP · 10-13 9@30→REPS_UP
- Dumbbell Romanian Deadlift (EX065, PRIMARY): 10-01 cal 6→CALIBRATE · 10-06 6@30→REPS_UP · 10-15 7@30→REPS_UP
- Kettlebell Overhead Press (EX015, PRIMARY): 10-01 cal 6→CALIBRATE · 10-10 6@25→REPS_UP
- Kettlebell Front Squat (EX018, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@35→REPS_UP · 10-15 9@35→REPS_UP
- Chest-Supported Row (EX069, SECONDARY): 10-01 cal 8→CALIBRATE · 10-06 8@30→REPS_UP · 10-10 9@30→REPS_UP · 10-15 10@30→REPS_UP
- Goblet Split Squat (EX013, PRIMARY): 10-03 cal 6→CALIBRATE · 10-17 6@35→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, SECONDARY): 10-03 cal 8→CALIBRATE · 10-17 8@35→REPS_UP
- Dumbbell Hammer Curl (hypothetical) (SX002, ACCESSORY): 10-03 cal 10→CALIBRATE · 10-06 10@15→REPS_UP · 10-08 11@15→REPS_UP · 10-10 12@15→REPS_UP
- Dumbbell Lateral Raise (hypothetical) (SX003, ACCESSORY): 10-03 cal 10→CALIBRATE · 10-06 10@15→REPS_UP · 10-08 11@15→REPS_UP · 10-10 12@15→REPS_UP
- Dumbbell Floor Press (EX041, PRIMARY): 10-06 cal 6→CALIBRATE · 10-15 6@30→REPS_UP
- Half-Kneeling SA KB Overhead Press (EX071, SECONDARY): 10-08 cal 8→CALIBRATE · 10-17 8@25→REPS_UP
- Kettlebell Suitcase Deadlift (EX073, PRIMARY): 10-10 seed 6@35→REPS_UP
- Goblet Split Squat (EX013, SECONDARY): 10-10 seed 8@35→REPS_UP
- Dumbbell Biceps Curl (hypothetical) (SX001, ACCESSORY): 10-13 cal 10→CALIBRATE · 10-15 10@15→REPS_UP · 10-17 11@15→REPS_UP
- Leaning Dumbbell Lateral Raise (hypothetical) (SX004, ACCESSORY): 10-13 cal 10→CALIBRATE · 10-15 10@15→REPS_UP · 10-17 11@15→REPS_UP

## 6. Verification of the correction

| Check | Result |
|---|---|
| v0.2 acceptance tests (37 executable) with 0.2.1 rules | all pass |
| New tests AT-26 (implement continuity), AT-27 (re-base when equipment leaves), AT-28 (RETURN by pattern) | pass with 0.2.1; **fail** with 0.2.0 rules (negative control) |
| 38 original red-team scenarios: picks, prescriptions, decisions | identical between 0.2.0 and 0.2.1 |
| Longitudinal histories | E2 non-evidence decisions 16 → 0; E 7 → 5 (only genuine outage-week exposures remain); RETURN in C and D 4 → 0; A, B, F1, F2 unchanged |

## 7. Limits

- One idealized performer (all reps, HARD). Real misses, TOO_HARD ratings, skipped items and swaps were covered one workout at a time in the red-team, not here.
- Three weeks each. Month-scale questions (anchor staleness, dumbbell caps, weekly fatigue) need Phase 8 logs.
- Fixture metadata, not canonical metadata (not yet authored).
- Nothing here describes Alloy's programming; all rules tested are SYSTEM_DESIGN.
