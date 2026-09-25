---
file: ENGINE_STRESS_TEST_LEDGER_v0_1.md
class: ENGINE
status: REVIEW RECORD (adversarial simulation of ENGINE_WORKOUT_GENERATOR_V0_1.md, engine 0.1.1). No rule is revised here.
updated: 2026-09-23
tested_against: ENGINE_WORKOUT_GENERATOR_V0_1.md (frozen), PERSONAL_user_profile.yaml, PERSONAL_constraints.yaml,
                equipment_library.csv/json, exercise_equipment_availability.csv/json, claude_v0-exercise-db_exercise_dataset.json
companion: ENGINE_STRESS_TEST_TRACES_v0_1.md (full per-scenario generation records), engine_sim.zip (simulator)
evidence_class: every finding is a SYSTEM_DESIGN observation about our engine. Nothing here is a claim about Alloy.
---

# Engine 0.1.1 stress test: failure ledger

## 0. Method

**The engine was executed, not reasoned about.** The frozen spec was implemented as a simulator (`engine.py`) and run against the canonical profile, constraints, equipment and availability files. Every session below is real simulator output. Where the spec was ambiguous, the reading taken is listed in §6 and flagged where it changes an outcome.

**Blocking fact discovered before any scenario ran:** the engine reads `EXERCISE_METADATA` (contract Q.1) for every decision in §C to §H, and that file does not exist. To run anything, a simulation-only metadata layer (`sim_metadata.py`, class SYSTEM_DESIGN, not canonical) was authored in good faith. Its judgment calls:

| ID | Authoring assumption (spec gives no criterion unless noted) |
|---|---|
| A1 | `heavy_lower = true` for bilateral loaded squats and deadlifts; false for unilateral, bodyweight and ballistic lifts |
| A2 | PRIMARY allowed only for externally loaded strength lifts; bodyweight lower options SECONDARY only |
| A3 | KB swings and cleans are HD, SECONDARY only, tagged `ballistic` (spec §B.2 makes swings HD) |
| A4 | Full-body complexes (thrusters, clean-to-press, get-up, snatch, squat clean, swing-to-squat, burpee) have no family in the §B.2 vocabulary, so they have no row and leave the pool |
| A5 | `AVAILABLE_WITH_SUBSTITUTION` mapped to AVAILABLE (Q.3 has no such value). Trap Bar Deadlift executes as a barbell deadlift |
| A6 | DB Bench, SA DB Bench, Chest-Supported Row use EQ011 (station BENCH_2); Box Squat, Step-Up, Box Row, Box Hip Bridge use EQ005 (RACK_AREA) |
| A7 | Position tags only where the library documents the position (the constraints file's own rule). Bird Dog Plank, Knee Plank, Inchworm, Spider Crawl get no `high_plank` tag |
| A8 | ANTI_LAT has zero library rows (side plank and suitcase carry are not in the 103-row DB) |
| A9 | Figure 8 and Sit-Out are ROTATION (FUTURE), no row. KB Halo is ANTI_ROT |
| A10 | EX070 needs the EQ011 incline (UNKNOWN) and is HELD; cable/band items EX010, EX022, EX091 are HELD (UNKNOWN) |
| A11 | Machines EQ017 to EQ021 have no library rows and no approved supplemental rows |
| A12 | `sore_regions`: lower lifts LOWER, upper lifts UPPER, core TRUNK, carry UPPER+LOWER+TRUNK, mobility empty |

Several failures below depend on these choices. Each ledger entry says whether it is **ENGINE** (fails under any reasonable metadata), **ENGINE×DATA** (the engine turns a data gap into a bad session), or **AUTHORING-SENSITIVE**.

**Baseline history** (used from S03 onward): Sep 7 to 20, 2026. Alloy SUMMARY logs (focus full) Mon/Wed/Fri 16:00 to 16:55. Apartment sessions Tue 18:00, Thu 18:00, Sat 10:00, R-01 = 45. Performer model: calibration loads KB 35 lb (lower), KB 25 lb (upper), DB 30 lb, barbell 135 lb, carry 45 lb; every set hits target; effort GOOD unless a scenario overrides. DB increments are unknown in Q.3, so the simulator uses +5 lb as the stand-in for "next heavier available weight."

## 1. Verdict

37 scenario runs (24 required, 13 adversarial or split variants).

| Result | Count | Scenarios |
|---|---|---|
| GOOD | 5 | S09, S10, S11, S22b, S31 |
| QUESTIONABLE | 12 | S03, S05, S08, S12, S14, S17, S18, S21, S22c, S27, S29, S32 |
| FAIL | 20 | S01, S02, S04a, S04b, S06, S07, S13, S15, S16, S19, S20, S22a, S23, S24, S25, S26, S28, S29b, S30, S33 |

The template, the hard-filter order, the HELD/EXCLUDED distinction, determinism, and incomplete-log hygiene all held up. The failures concentrate in five places, each of which alone would justify not implementing 0.1.1 as frozen:

1. **The staleness plan is degenerate** (FL-01). Every full apartment session credits KD, HD, PUSH and PULL at the same timestamp, and every Alloy summary re-ties the parents. Ties resolve by `FAMILY_ORDER`/`PARENT_ORDER`, so in six simulated weeks A1/A2 was KD/PULL in **18 of 18** sessions. Hinging was never PRIMARY; pushing was never PRIMARY. The explanation template then tells the user squatting was chosen because it was "least recently trained," which is false.
2. **The 48-hour rule collides with a normal every-other-day cadence** (FL-02). Generating at 18:20 versus 18:50 on the same Thursday changed three of four main lifts. Anchors, the fix for AUD-21 flip-flop, are used in roughly one to two of every three sessions; the rest are substitutes. Flip-flop has been re-created by a clock threshold.
3. **Progression is effectively frozen** (FL-18, FL-11). With perfect compliance and every set GOOD, the primary squat gained **zero** load in six weeks and needs about 20 weeks to reach the load cap. Logging right-arm fade one rep before target ratchets pressing from 30 lb to 5 lb in five exposures, **for both arms**.
4. **An active hard constraint probably leaks** (FL-09). Bird Dog Plank, Spider Crawl and Inchworm, all commonly performed from a push-up position, are auto-selected because the HC-02 position list omits them. Meanwhile SC-04's pending list (which names exactly these) is not applied.
5. **The engine cannot run on canonical data** (FL-22). Q.1 metadata is missing, and the two fields that drive recovery and role quality (`heavy_lower`, `roles_allowed`) have no authoring criteria. Outcomes swing on those choices.

---

## 2. Scenario records

Field key: **In** input state · **Req** movement requirements chosen · **Elim** candidate elimination · **Top** top candidates and pick · **Pairs** pair construction · **Rx** prescription / final session · **Val** duration and validation · **Next** state changes after completion (default performance) · **Assess** verdict.

Exercise names are shortened after first use. Loads are lb.

### S01 · No workout history (cold start), 45 min · **FAIL**
- **In:** empty state; Tue 18:00; R-01 45; Alloy Mon prompt answered "no."
- **Req:** all timestamps null → FAMILY_ORDER/PARENT_ORDER decide: A1 KD/PRIMARY, A2 HPULL/PRIMARY, B1 HD/SECONDARY, B2 HPUSH/SECONDARY, C1 ANTI_EXT, C2 ANTI_ROT. F removed (FIRST_SESSIONS_NO_FINISH).
- **Elim:** KD/PRIMARY 17 rows → 8 eligible (9 HF-09 bodyweight/impact, 1 HF-06 suspension). HPULL 6 eligible (Renegade Row HF-02). HPUSH 5 (incline press HF-06 UNKNOWN, explosive push-up HF-14). ANTI_EXT 3 (four planks HF-02). ANTI_ROT 5 (Suspension Halo HF-01, three HF-02, Pallof and Chop HF-06 UNKNOWN).
- **Top:** every slot is a seeded DRAW among all eligible (all never used, all tie K0–K6). A1 KB Front Squat (draw of 8), A2 KB Bent Over Row (draw of 6), B1 Contralateral SLDL (draw of 13), B2 SA DB Bench (draw of 5), C1 Deadbug (draw of 3), C2 **Bird Dog Plank** (draw of 5). PREP: Standing ER Hip Stretch, Hip Circles (draws).
- **Pairs:** A = KB front squat + KB row; B = CSLDL + SA DB bench (BENCH_2 vs NONE, legal); C = deadbug + bird dog plank.
- **Rx:** all CALIBRATE. A 3 × 6 (row per side), B 3 × 8 per side, C 2 × 8.
- **Val:** 34.75 min for 45 available. V-03/V-04/V-06 pass.
- **Next:** six families credited; six anchors created from draws.
- **Assess:** Four PRIMARY/SECONDARY anchors that will persist for months (rotation only on LOAD_CAPPED) are chosen by `hash(user, date, 0)`. See S30: the same state on eight dates yields five different primary squats and, for HD, a single-arm KB clean or two-arm swing as the long-term hinge. Bird Dog Plank is an HC-02 position risk (FL-09). Ten minutes of available time unused. FL-05, FL-09, FL-15.

### S02 · One previous workout only (next morning), 45 min · **FAIL**
- **In:** only S01's session (ended Tue 18:39). Wed 07:00 → 12.3 h since lower.
- **Req:** KD, HD, HPULL, HPUSH all tie at Tue 18:39 → KD A1, PULL A2 again (tie-break). A2 plan VPULL → FALLBACK_SIBLING HPULL. B2 VPUSH (null). C1 ANTI_LAT (null, stalest) → unfillable → CARRY; C2 CARRY → taken → ANTI_EXT.
- **Elim:** KD/PRIMARY: KB Front Squat HF-11, four heavy KD HF-12 → 3 eligible, all unilateral. HD/SECONDARY: CSLDL HF-11, five heavy HD HF-12.
- **Top:** A1 Goblet Split Squat (DRAW of 3, SUBSTITUTE HF-11), A2 3-Point Row (DRAW of 5), B1 Single-Leg Hip Bridge (DRAW of 7), B2 KB Overhead Press (DRAW of 2, new anchor), C1 Farmer's Carry, C2 Stability Ball Rollout. PREP: Ankle Rocks, **Inchworm**.
- **Pairs:** A split squat + 3-point row; B SL hip bridge + KB OHP; C carry + rollout.
- **Rx:** all CALIBRATE.
- **Val:** 34.75 min / 45. Pass.
- **Next:** VPUSH and CARRY anchors set. Six substitute lines created.
- **Assess:** Twelve never-used strength/core exercises plus four new mobility drills across the first two sessions. Three of four main items unilateral. AUD-24 (novelty flood) is only half fixed: the no-finish rule works, but substitutes are themselves new and HF-13's familiarity rule applies only under LIGHT. Inchworm walks out to a high plank (FL-09). FL-06, FL-21.

### S03 · Three consecutive training days (Alloy Mon, apartment Tue, Alloy Wed) → Thu 07:30, 45 min · **QUESTIONABLE**
- **In:** baseline + Alloy Mon, apt Tue 18:00 (ended 18:44), Alloy Wed. 14.6 h since lower. Fourth consecutive training day.
- **Req:** KD/HD tie at Tue → KD A1; PULL/PUSH tie at Wed Alloy → PULL A2; B2 VPUSH (stalest push); C1 ANTI_LAT → CARRY; C2 → ANTI_EXT; F1 ANTI_ROT (CORE_OR_CARRY).
- **Elim:** KD/PRIMARY 3 eligible (anchor Racked KB Squat HF-11, four heavy HF-12). HD 8 eligible (anchor HF-11, four HF-12).
- **Top:** A1 KB Suitcase Lunge (K4, SUBSTITUTE), A2 Batwing Row (K4, SUBSTITUTE HF-11), B1 Box Hip Bridge (K4), B2 KB OHP (ANCHOR), C1 Farmer's Carry (ANCHOR), C2 Rollout (substitute), F1 Bird Dog Plank.
- **Rx:** suitcase lunge 3 × 7/side @ 35; batwing 3 × 7 @ 30; box hip bridge 3 × 9; KB OHP 3 × 10 @ 25; carry 2 × 40 s @ 45; rollout 2 × 11; bird dog plank CALIBRATE.
- **Val:** 39.75 / 45. Pass.
- **Next:** everything REPS_UP (all were qualifying exposures).
- **Assess:** Lower-body response is real (heavy lifts filtered). Nothing else changes on the fourth straight day: same block count, same sets, full progression pressure on rows and presses 15 h after an Alloy session that trained both. There is no upper-body analogue to HF-12. Weekly frequency tolerance is a declared UNRESOLVED item, so this is not a spec violation, but the engine's only fatigue lever here is exercise substitution. FL-17.

### S04a · Heavy knee-dominant Alloy session (FULL, focus lower, KD-tagged items) → Tue 07:00 · **FAIL**
- **In:** baseline + Alloy Mon FULL with Front Squat (EX018), Goblet Split Squat (EX013), "wall balls" tagged KD. 14.1 h since lower.
- **Req:** KD now fresher → **HD A1 PRIMARY**, KD B1 SECONDARY (correct family response). C1 ANTI_LAT → fallback ANTI_EXT; C2 ANTI_EXT (planned); F1 ANTI_ROT.
- **Elim:** HD/PRIMARY: five heavy HD HF-12 → 3 eligible (CSLDL, Single-Leg DL, KB Suitcase DL). No HD/PRIMARY anchor exists (HD has never been PRIMARY; FL-01).
- **Top:** A1 **Contralateral SLDL (DRAW of 3, NEW_ANCHOR_NONE_PRIOR)**, A2 KB row (ANCHOR), B1 KB Suitcase Lunge (K4, NEW_ANCHOR_NONE_PRIOR for KD/SECONDARY), B2 DB Bench (ANCHOR), C1 Knee Plank, C2 Deadbug, F1 KB Halo.
- **Rx:** CSLDL CALIBRATE 3 × 6; row 3 × 9/side @ 25; suitcase lunge CALIBRATE 3 × 8; DB bench 3 × 8 @ 30.
- **Val:** 42.75 / 45. Pass.
- **Next:** **HD/PRIMARY anchor = CSLDL, KD/SECONDARY anchor = Suitcase Lunge**, both created under a 24 h filter that will not apply next time.
- **Assess:** A one-day recovery filter permanently chose the long-term primary hinge: a unilateral, non-heavy lift picked by seeded draw. Three of four main items unilateral. Block C holds two anti-extension exercises and both claim the ANTI_EXT/CORE anchor in the same session. Carry dropped. FL-03, FL-05, FL-08, FL-21.

### S04b · Heavy knee-dominant apartment session (Sat) → Mon 07:00 · **FAIL**
- **In:** baseline. Saturday's A1 was KD PRIMARY. No Alloy since. 44.2 h since lower. Alloy class at 16:00 the same day.
- **Req:** KD and HD both credited Sat 10:46 → tie → **KD A1 PRIMARY again**; PULL A2 again.
- **Top:** Racked KB Squat (ANCHOR), Batwing Row (SUBSTITUTE HF-11), Limited-ROM KB DL (ANCHOR), DB Bench (ANCHOR).
- **Rx:** racked squat 3 × 7 @ 35 (heavy), limited-ROM DL 3 × 9 @ 35 (heavy).
- **Val:** 38.25 / 45. Pass.
- **Next:** KD/HD credited again at the same time; the tie persists.
- **Assess:** The engine cannot move KD out of PRIMARY after a knee-dominant apartment session, because an apartment session always trains KD and HD together and credits both at `ended_at`. Two heavy lower lifts are prescribed nine hours before a scheduled full-body Alloy class; forward-looking use of the schedule is FUTURE by design (AUD-12), so this part is a known trade. FL-01, FL-17.

### S05 · Heavy hip-dominant Alloy session (FULL, free-text items tagged HD) → Tue 17:30 (24.6 h) · **QUESTIONABLE**
- **In:** baseline + Alloy Mon FULL, items "trap bar deadlift 5×5 heavy," "KB swings," "RDL," all tagged HD.
- **Req:** HD fresher → KD A1, HD B1. Correct.
- **Elim:** 24.6 h > 24 h, so HF-12 is inactive. Free-text items carry no `exercise_id`, so HF-11 cannot see them.
- **Top:** Racked KB Squat (ANCHOR), KB row (ANCHOR), **Limited-ROM KB Deadlift (ANCHOR, heavy)**, DB Bench (ANCHOR).
- **Val:** 39.75 / 45. Pass.
- **Assess:** Hinging moved to block B, which is the right direction. A heavy bilateral deadlift still lands 24.6 h after a heavy hinge session, because HF-12 is one binary threshold with no family memory. At 23.9 h the same session would have swapped both lower lifts. FL-17.

### S06 · High upper-body fatigue (R-05 = upper), Tue 18:00 · **FAIL**
- **In:** baseline + Alloy Mon. R-05 {upper}.
- **Req:** soreness replacement assigns A2 and B2 from the stalest core families. **ANTI_LAT is stalest (never trainable, always null) → A2 = ANTI_LAT**, B2 = ANTI_EXT. C re-planned: C1 ANTI_ROT, C2 CARRY → carry is UPPER-tagged → fallback ANTI_EXT.
- **Elim:** A2 ANTI_LAT has zero rows. Fallback chain: sibling core families already planned; PUSH/PULL all HF-05; no unplanned core → **SLOT_EMPTY**. KB Halo HF-05. Carry HF-05.
- **Top:** A1 Racked KB Squat (ANCHOR), B1 Limited-ROM KB DL (ANCHOR), B2 Knee Plank, C1 Bird Dog Plank, C2 Deadbug. PREP: **Inchworm**, Hip Circles. F: two mobility drills (CORE_OR_CARRY found nothing eligible).
- **Pairs:** A runs as straight sets (one item). B pairs deadlift with knee plank.
- **Val:** 39.25 / 45. Pass.
- **Assess:** The soreness rule sent a slot to a family with no exercises, so block A lost its second item instead of receiving core work. Two anti-extension items again. Inchworm (walk-out to plank, loaded straight-arm) is chosen for PREP on an "upper too sore" day because MOBILITY rows carry no `sore_regions`. FL-07, FL-08, FL-09.

### S07 · High lower-body fatigue (R-05 = lower), Tue 18:00 · **FAIL**
- **In:** as S06 with R-05 {lower}.
- **Req:** A1 → ANTI_LAT (phantom), B1 → ANTI_EXT; C1 ANTI_ROT; C2 CARRY → carry LOWER-tagged → ANTI_EXT.
- **Elim:** A1 fallback tries KD, HD (all HF-05) → SLOT_EMPTY.
- **Top:** A2 KB row (ANCHOR), B1 Knee Plank, B2 DB Bench (ANCHOR), C1 Bird Dog Plank, C2 Deadbug. PREP Inchworm, Hip Circles. F mobility.
- **Pairs:** A = one row as straight sets.
- **Val:** 38.5 / 45. Pass.
- **Assess:** Block A, the most important block, is a single row. Same phantom-family mechanism as S06. FL-07.

### S08 · Low readiness (R-02 low), 45 min · **QUESTIONABLE**
- **In:** as S06, R-02 low → posture LIGHT.
- **Req:** unchanged families (LIGHT never re-plans). Finish → MOBILITY.
- **Elim:** HF-13 removes every never-used candidate where a used one exists (KD 5, HD 10, HPUSH 4).
- **Top:** all anchors: Racked KB Squat, KB row, Limited-ROM KB DL, DB Bench, Knee Plank, Deadbug.
- **Rx:** every block 2 sets; **loads unchanged** (racked squat 2 × 7 @ 35, deadlift 2 × 9 @ 35).
- **Val:** 33.5 / 45. Pass.
- **Next:** every exposure NOT_EVIDENCE, regardless of how the session went.
- **Assess:** No overreaction in architecture, which is good. Two issues: "LIGHT" lowers volume only, never load, and a single pre-session energy answer voids progression even when the post-session SESSION_CAPACITY says usual or above. The pre-session guess outranks the logged outcome. FL-19.

### S09 · Excellent readiness (R-02 high, R-03 good), 45 min · **GOOD**
- Identical session to S12 (anchors, 39.75 min). R-02 high and R-03 are recorded only. No hidden "push harder" behaviour, no progression shortcut. This is the intended design.

### S10 · 20-minute session · **GOOD**
- **Req:** tier A only: KD/PRIMARY + HPULL/PRIMARY.
- **Rx:** Racked KB Squat 3 × 7 @ 35 with KB row 3 × 9/side @ 25. PREP 4 min.
- **Val:** 17.5 / 20. Pass.
- **Next:** only KD and HPULL credited, so the next session puts HD and PUSH in A. Partial sessions break the tie-lock (FL-01), which is why short sessions alternate correctly while full ones do not. Core never appears in the A-only tier; see S23.

### S11 · 30-minute session · **GOOD**
- A + B with the four anchors, 28.75 / 30. No trims. Block B not reduced.

### S12 · 45-minute session · **QUESTIONABLE**
- **Req:** A/B as S11; C1 ANTI_LAT → fallback ANTI_EXT; C2 ANTI_EXT (tie-break beats CARRY); F1 ANTI_ROT.
- **Rx:** C = Knee Plank 2 × 25 s + Deadbug 2 × 8; F = KB Halo CALIBRATE.
- **Val:** 39.75 / 45. Pass.
- **Assess:** Two anti-extension items in one block, carry absent although tied-stalest, and both C items rotate into the same anchor key. The literal reading of §C.7 ("next family in that slot's pool") produces this; another reading would not (§6, R1). FL-07, FL-08.

### S13 · 60-minute session · **FAIL**
- Same state as S12. **Session is identical to the 45-minute session: 39.75 min estimated for 60 available.** The top tier is "≥ 45"; nothing scales sets, blocks, or finish length upward, and §G.5 only trims. Twenty minutes unused, with no record entry explaining why. FL-15.

### S14 · Equipment unavailable unexpectedly (KB rack EQ009 in use), 45 min · **QUESTIONABLE**
- **In:** as S12, `EQ-?` = [EQ009].
- **Elim:** KD/PRIMARY: 7 HF-06(today) → 1 eligible (Step-Up). HD: 7 HF-06(today). Row anchor and carry out.
- **Top:** A1 Step-Up (only candidate, CALIBRATE), A2 Batwing Row (K4), B1 Barbell Deadlift (K5, line 135 × 9), B2 **DB Bench evicted by the station rule** (BENCH_2 vs Barbell DL on RACK_AREA) → Push-Up. F1 Bird Dog Plank.
- **Val:** 39.75 / 45. Pass. Anchors kept (HF-06 today = keep).
- **Assess:** Substitution is sensible and anchors survive. Two defects: the push anchor is lost to a knock-on station conflict created by the lower substitute, and §E.3 has no reason code for a station re-selection, so the record can only mis-attribute it (the simulator's record shows HF-10). FL-13, FL-24.

### S15 · Limited dumbbells only (every other ID listed as today's issue), 45 min · **FAIL**
- **Elim:** **KD/PRIMARY: 0 eligible.** Every loaded KD row names a kettlebell or the EQ005 bench; the bodyweight KD rows are SECONDARY-only.
- **Req change:** A1 fallback: sibling HD already planned; same-side already planned; → FALLBACK_CORE ANTI_ROT.
- **Top:** A1 **Bird Dog Plank 3 × 8 as block A's lower item**, A2 Batwing Row, B1 DB RDL (DRAW), B2 Push-Up, C Knee Plank + Deadbug, F mobility.
- **Val:** 35.25 / 45. Pass.
- **Assess:** A dumbbell-only gym produces a session with no squat pattern, although dumbbells support goblet squats, split squats and step-backs. Q.1 `equipment_ids` is an AND list with no implement alternatives, and the library row's implement (KB) is taken literally. The fallback chain also prefers a core family over a bodyweight KD exercise that was one role away. FL-14.

### S16 · Cable + dumbbell environment (EQ010, EQ017–EQ021 only), 45 min · **FAIL**
- **Byte-identical to S15.** The five cable machines have no library rows and no approved supplemental rows, so they cannot contribute a single candidate. This is the gym's main difference from a DB-only room. FL-14.

### S17 · Exercise recently repeated twice (Racked KB Squat at apt Sat 10:00 and at Alloy Mon FULL with its exercise_id) → Wed 17:00 · **QUESTIONABLE**
- **In:** KD credited Mon 16:55 by the FULL item; HD last Sat. 24.1 h since lower.
- **Req:** HD fresher-is-older → **HD A1 PRIMARY** (first time in history), KD B1 SECONDARY.
- **Elim:** Racked KB Squat HF-11 (24 h after the Alloy use). Correctly blocked.
- **Top:** A1 **Barbell Deadlift (K4, NEW_ANCHOR_NONE_PRIOR)**, B1 KB Front Squat (K5, new KD/SECONDARY anchor).
- **Rx:** barbell deadlift **CALIBRATE 3 × 6** although a SECONDARY line at 135 × 9 exists. Front squat CALIBRATE 3 × 8 although a PRIMARY line exists.
- **Val:** 39.75 / 45. Pass.
- **Assess:** Repetition itself is handled: the Alloy FULL item's `exercise_id` fed HF-11 and the squat was not repeated a third time. What follows is the problem: a role flip creates two new anchors and throws away two known loads (lines are keyed by role). Also, with no Alloy that week, the same squat can be the anchor Mon 07:00, Wed 08:00 and Fri 09:00 (verified): three exposures in four days, because the only repetition control is 48 h. FL-03, FL-04, FL-17.

### S18 · Preferred exercise eligible (DB Floor Press marked PREFER; HPUSH/SECONDARY anchor is DB Bench) · **QUESTIONABLE**
- **Top:** DB Bench (ANCHOR). K1 (PREFER first) is never consulted because §E.1 returns the anchor before sorting.
- **Assess:** PREFER only matters when an anchor rotates or is blocked. DB lines can never reach LOAD_CAPPED, because the DB increment list is unknown and §H.5 treats "unknown" as "a heavier load exists" (verified: 30 TOO_EASY exposures take the DB Bench line to 180 lb with `rotate_due` still false). The preference therefore never acts unless the user uses "replace permanently." The manual path exists, so this is not a hard fail. FL-12, FL-18.

### S19 · Disliked exercise otherwise top-ranked (Racked KB Squat, the KD/PRIMARY anchor, flagged DISLIKE) · **FAIL**
- **Top:** Racked KB Squat (ANCHOR). DISLIKE (K2) is never consulted.
- **Assess:** The user flagged the exercise and the engine serves it again, and will keep serving it until the line caps (about 20 weeks, FL-18) or the user finds "replace permanently." §H.4 says DISLIKE is "preference update; no load effect," and §E.5 has no DISLIKE rotation trigger. The flag has no observable effect. FL-12.

### S20 · Soft constraint SC-01 on a top candidate, with R-04 = worse · **FAIL**
- **Top:** B2 DB Bench (ANCHOR, `right_triceps_involvement` SECONDARY) at the usual 3 × 8 @ 30. K3 (sort right-triceps-involved last) never runs because the anchor is eligible.
- **Next:** right side NOT_EVIDENCE, left merged to NOT_EVIDENCE (conservative). **KB Bent Over Row**, which has no triceps involvement but is per-side logged, **also** becomes NOT_EVIDENCE on both sides.
- **Assess:** On the one day the user reports the weak arm is worse, the pressing exercise, load, reps and pairing are exactly as usual. SC-01's only live effect is to discard progression evidence, and it discards it for rows too, because §H.2's "RIGHT side under R-04 = worse" applies to every per-side item. With R-04 = same, SC-01 has no effect anywhere (by design while B5 is open). FL-10.

### S21 · Recent external Alloy workout (SUMMARY Mon 16:00) → Tue 08:00 (15 h) · **QUESTIONABLE**
- **Elim:** five heavy KD and five heavy HD HF-12.
- **Top:** A1 KB Suitcase Lunge (K4), A2 KB row (ANCHOR), B1 Box Hip Bridge (K4), B2 **DB Bench evicted** by RACK_AREA/BENCH_2 conflict → Push-Up.
- **Val:** 41.25 / 45. Pass.
- **Assess:** Lower-body response is appropriate. The upper body gets no adjustment 15 h after an Alloy class that credited PUSH and PULL. The day-after lower substitute (Box Hip Bridge uses the rack-area bench) knocks out the push anchor. In baseline this cascade is why the HPUSH anchor was used 3 times in 18 sessions. FL-13, FL-17.

### S22a · Incomplete Alloy log: Mon attended, not logged, prompt answered "not sure" → Tue 08:00 · **FAIL**
- **In:** truth: full-body Alloy class Mon 16:00. `alloy_resolved = UNKNOWN`, no credit.
- **Req:** parents still dated Sat. hours_since_lower = 69 by the engine's count, 15 by reality.
- **Top:** **Racked KB Squat (heavy) and Limited-ROM KB DL (heavy)**, all anchors, full progression.
- **Assess:** Uncertainty is resolved to the least conservative assumption ("did not train"), which disables the one recovery filter the design relies on. For progression, "missing data never counts as evidence" is the right default; for recovery, the same default is backwards. FL-16.

### S22b · Alloy FULL log with untagged free-text items → Tue 08:00 · **GOOD**
- Summary credit from the `focus` field still applies, so HF-12 fires; no family is credited without a tag; no exercise is marked used without an ID. Session identical to S21. This is exactly §L.3 and it behaves well.

### S22c · Alloy logged via check-in "yes," but the class ran 18:00–18:55, not 16:00 → Tue 17:30 · **QUESTIONABLE**
- **Assess:** The prompt path writes `performed_at` = scheduled 16:00 without asking. True gap 22.6 h, engine gap 24.6 h, so HF-12 is off and both heavy lower anchors are prescribed. The profile itself says "4 pm onward." A two-hour default error flips a binary rule. FL-16.

### S23 · High-priority weakness underexposed (G-04 arms/shoulders, G-05 biceps, G-06 right triceps, G-07 core) · **FAIL** (disclosed gap)
- **30-min-only history** (same schedule, 6 sessions): core delivered **2 items in 6 sessions**, both from one CORE_STARVATION_SWAP on day 8. The generated 30-min session after that history has no core.
- **45-min baseline:** VPUSH (shoulders) appeared only as SECONDARY; PUSH never took PRIMARY (FL-01). No biceps, shoulder-isolation or triceps item can exist (GOAL_ACCESSORY disabled, no supplemental rows). Alloy summaries never credit core (by design, D-037), so Alloy cannot satisfy G-07 either.
- **Assess:** The engine has no representation of priority or under-exposure; it cannot respond to this scenario at all. The spec discloses this (§A.4, AUD-33), so it is not hidden. It still fails the requirement. FL-20.

### S24 · Previous workout aborted halfway (A done; B1 one set; rest skipped) → Thu 18:00 · **FAIL**
- **In:** aborted Tue: Racked KB Squat, KB row completed; Limited-ROM DL 1 set; DB Bench, core, finish skipped. Credits: KD, HPULL (≥ 2 sets). HD not credited (1 set). `exercise_last_used` set for the DL anyway. `apartment_sessions_completed` +1.
- **Req:** HD stalest → **HD A1 PRIMARY**; PUSH stalest (Mon Alloy) → **HPUSH A2 PRIMARY**. Correct family response.
- **Top:** A1 Barbell Deadlift (K4, new HD/PRIMARY anchor), A2 DB Floor Press (DRAW of 2, new HPUSH/PRIMARY anchor), B1 KB Front Squat (new KD/SECONDARY anchor), B2 Batwing Row (new HPULL/SECONDARY anchor).
- **Rx:** **all four main lifts CALIBRATE**, including barbell deadlift (known 135 × 12 as SECONDARY) and front squat (known 35 × 10 as PRIMARY).
- **Val:** 36.25 / 45. Pass.
- **Assess:** The family logic is right. Its consequence is a full recalibration session: four new anchors, four exposures that cannot count as evidence, and known loads discarded. A single aborted session reshuffles every role. FL-03, FL-04.

### S25 · (adversarial) Apartment cadence just under 48 h · **FAIL**
- **In:** Tue 18:00, Thu 17:30, Sat 17:00 for two weeks.
- **Result:** main-slot reasons per session: new / sub×3 / anchor×4 / anchor×4 / **sub×4** / anchor×4. Thursday is always a full substitute session.
- **Sensitivity (verified):** same state, Thursday generation at **18:20 → three of four main lifts are substitutes; at 18:50 → all four are anchors.** The Tuesday session ended 18:44; the threshold is 48 h after `ended_at`.
- **Assess:** A deterministic but arbitrary threshold decides whether the user trains his program or a different one. This is randomness wearing a clock. It also re-creates AUD-21: two exercises alternate per slot and each line advances at half speed. FL-02.

### S26 · (adversarial) Six weeks of the standard schedule, perfect compliance, every set GOOD · **FAIL**
- **A1/A2 family pair over 18 sessions: (KD, HPULL) 18 of 18.**
- **Anchor exposures in 18 sessions:** KD/PRIMARY 6, HPULL/PRIMARY 12, HD/SECONDARY 6, HPUSH/SECONDARY **3**, VPUSH/SECONDARY 9.
- **Lines at end:** Racked KB Squat 35 lb × 10 (CONFIRM_TOP; **no load increase in six weeks**); KB row 30 lb × 10 (one increase); DB Bench 30 × 10; KB OHP 30 × 10.
- **Load-cap horizon (verified):** Racked KB Squat reaches LOAD_CAPPED after 20 GOOD exposures at 45 lb. At its observed one anchor exposure per week, that is about **20 weeks** before rotation.
- **Assess:** Every mechanism worked as written and the result is a program where hinging and pressing never lead a session, the primary squat moves about 5 lb per 7 weeks for a compliant intermediate lifter, and the bench press anchor is barely trained. FL-01, FL-02, FL-13, FL-18.

### S27 · (adversarial) Grip and unilateral load, six weeks · **QUESTIONABLE**
- **Grip-loaded holds per session** (KB/DB/barbell lower lifts, rows, carry): 2 to 4, typically 3. Thursday pattern: KB Front Squat, Batwing Row, Barbell Deadlift 3 × 8–12, then Farmer's Carry at 45 lb.
- **Unilateral items per session:** 0 to 2 on the standard schedule; **3 of 4 main items** on day-after-Alloy and cold-start days (S02, S04a), because the non-heavy lower options are mostly unilateral (A1).
- **Assess:** The observed dose is moderate and not alarming. But nothing measures it: grip demand was deliberately removed from metadata (D-033), and no rule caps unilateral items or orders the carry away from the deadlift. Unilateral PRIMARY sets are costed at +0.5 min, far less than doubling the work. FL-21.

### S28 · (adversarial) Right-arm fade near the top rep on DB Bench · **FAIL**
- **(a) Fade logged on the last target rep, every set** (effort L GOOD / R HARD): HOLD, HOLD, HOLD, HOLD, HOLD, HOLD. After 4, "stalled; consider reviewing." Both arms held (conservative merge).
- **(b) Fade logged one rep before target, every set:** fade rep 7 counts as 6 reps against a target of 8 → short by 2 on all sets → `short2` → **REDUCE**. Trace: 30 → 25 → 20 → 15 → 10 → 5 → AT_MINIMUM. **Both arms reduced every time.**
- **Assess:** RIGHT_ARM_FADE is documented as "recorded, not interpreted" in the profile, but §H.4 interprets it (reps n−1 for `met`). AS-02 says the fade is a stable within-set trait. Logging it honestly drives pressing loads to the minimum within five sessions, left arm included, with no stall flag (REDUCE resets `consecutive_holds`). Unnecessary regression of the goal G-06 cares about most. FL-11.

### S29 · (adversarial) Lower and trunk sore · **QUESTIONABLE**
- A1 → ANTI_LAT (phantom) → empty; B1 ANTI_EXT → all trunk-tagged → empty; C1, C2 empty (all trunk or carry tags). Result: KB row (straight sets), DB Bench (straight sets), two mobility drills. 36.75 / 45.
- **Assess:** The output respects every filter and is a reasonable minimum. It under-fills the time, and block structure (two single-item "blocks") no longer means anything. FL-07, FL-15.

### S29b · (adversarial) Upper and lower sore · **FAIL**
- A1 ANTI_LAT → empty; A2 ANTI_ROT → Bird Dog Plank 3 × 8; B1 ANTI_EXT → Knee Plank 3 × 25 s; B2 → no family left → empty; C1 → Deadbug; C2 → Rollout.
- **Assess:** A core-only session with **three anti-extension exercises** (knee plank, deadbug, rollout) and a probable HC-02 exercise in block A. FL-07, FL-08, FL-09.

### S30 · (adversarial) Same cold-start state generated on eight dates · **FAIL**

| Date | A1 KD/PRIMARY | A2 HPULL/PRIMARY | B1 HD/SECONDARY | B2 HPUSH/SECONDARY | C2 |
|---|---|---|---|---|---|
| Tue 09-22 | KB Front Squat | KB Bent Over Row | Contralateral SLDL | SA DB Bench | Bird Dog Plank |
| Wed 09-23 | Racked KB Squat | Chest-Supported Row | **SA KB Clean** | Push-Up | Quadruped Hold |
| Thu 09-24 | KB Suitcase Lunge | Batwing Row | **KB Swing** | DB Bench | **Spider Crawl** |
| Fri 09-25 | KB Front Squat | KB Bent Over Row | DB RDL | DB Bench | Bird Dog Plank |
| Sat 09-26 | Goblet Split Squat | 3-Point Row | Trap Bar DL (as barbell) | Push-Up | KB Halo |
| Sun 09-27 | Racked KB Squat | Batwing Row | KB Deadlift | DB Bench | Bear Crawl |
| Mon 09-28 | Racked KB Squat | Chest-Supported Row | Contralateral SLDL | DB Bench | KB Halo |
| Tue 09-29 | Step-Up | 2-Point Row | DB RDL | Deficit Push-Up | Quadruped Hold |

- **Assess:** Five different primary squats, six different hinges (including two ballistic lifts as the eight-to-twelve-rep strength anchor), four C2 exercises from SC-04's pending list. Whichever date Nelson starts decides his program for months. §E.4 says randomness never selects families, blocks or loads; it does select the anchors that everything else hangs on. FL-05.

### S31 · (adversarial) Return after a 16-day travel gap · **GOOD**
- Anchors unchanged; every line prescribed RETURN at the last load and target; no progression; nothing recalibrated. This is AUD-19's fix working.

### S32 · (adversarial) Three LIGHT sessions in a row · **QUESTIONABLE**
- 33.5, 32.5, 33.5 min for 45 available; every exposure NOT_EVIDENCE; heavy squat and barbell deadlift still at full load, two sets. Posture does not persist beyond the day it is reported, so there is no chronic reduced state (AUD-27 fix holds). Same concerns as S08. FL-19.

### S33 · (adversarial) Two anchors on conflicting stations (Box Squat on RACK_AREA + Chest-Supported Row on BENCH_2) · **FAIL**
- §F.2 keeps slot 1 and re-selects slot 2 → Batwing Row as SUBSTITUTE. The next session repeats the same conflict.
- **Assess:** The HPULL anchor is never performed again; the substitute receives every exposure but never becomes the anchor (SUBSTITUTE never moves it, §K step 7). Permanent anchor starvation with no rotation trigger. FL-13.

---

## 3. Failure ledger (root causes)

Severity: **CRITICAL** (constraint or safety-relevant, or blocks running at all) · **HIGH** (systematically wrong sessions or progression) · **MEDIUM** (wrong in identifiable situations) · **LOW** (cosmetic, explainability, or rare).
Type: **ENGINE** · **ENGINE×DATA** · **AUTHORING-SENSITIVE** (see §0).

| ID | Failure | Mechanism (rules implicated) | Seen in | Severity | Type |
|---|---|---|---|---|---|
| FL-01 | **Staleness tie-lock.** KD is always PRIMARY and PULL always PRIMARY; HD and PUSH never lead | §B.3 credits every family in a session at the same `ended_at`; §L.3 SUMMARY credits LOWER/PUSH/PULL at one timestamp; §C.4 ties resolve by FAMILY_ORDER/PARENT_ORDER. Only partial sessions and FULL tagged logs break ties. §J.3's STALEST_LOWER text ("least recently trained") is then false | S02, S04b, S26 (18/18), baseline | HIGH | ENGINE |
| FL-02 | **48 h cliff at the user's natural cadence.** Anchors used in roughly one to two of three sessions; a 30-minute shift in generation time swaps three main lifts | HF-11 measured from `ended_at` against `now`, with sessions ~2 days apart; HF-12 removes heavy anchors on day-after-Alloy sessions. Re-creates AUD-21 alternation | S25, sensitivity check, baseline (15 ANCHOR vs 17 SUBSTITUTE picks) | HIGH | ENGINE |
| FL-03 | **Permanent anchors created under one-day conditions** | §E.3/§K step 7: when no anchor exists for the key, today's pick becomes NEW_ANCHOR even if HF-11/HF-12/HF-06(today) shaped the eligible set | S04a (unilateral SLDL becomes primary hinge), S17, S24 | HIGH | ENGINE |
| FL-04 | **Known loads discarded on role flip** | Lines keyed by (exercise, role, side) (§H.1); K4 selects on "any line" but §G.3 prescribes from this role's line only → CALIBRATE | S17, S24 (four main lifts recalibrated) | MEDIUM | ENGINE |
| FL-05 | **Randomness chooses long-term anchors** | §E.4 draw applies whenever all top candidates are never used, which at cold start is every slot; the drawn pick becomes the anchor; rotation waits for LOAD_CAPPED. Among used exercises, K7 (`library_order` = harvest order) is the final arbiter, which is arbitrary rather than random | S01, S30, S02 | HIGH | ENGINE×DATA |
| FL-06 | **Novelty flood in the first sessions** | FIRST_SESSIONS_NO_FINISH limits only F; HF-13's familiarity preference applies only under LIGHT; day-2 substitutes (FL-02) are themselves new | S02 (12 new strength/core exercises + 4 mobility in 2 sessions) | MEDIUM | ENGINE |
| FL-07 | **Phantom family ANTI_LAT** | A family with zero eligible rows has `family_last_trained = null` forever, so it is always stalest: C1 is planned as ANTI_LAT every session and soreness replacement assigns it first → empty slot | S06, S07, S29, S29b, every C block | HIGH | ENGINE×DATA |
| FL-08 | **Core redundancy and anchor collision** | §C.7 C/F fallback "next family in that slot's pool" can pick a family already planned; C2 tie-break favours ANTI_EXT over CARRY; two items in one session then write the same (family, CORE) anchor | S04a, S06, S12, S29b (three anti-extension items) | MEDIUM | ENGINE (reading R1) |
| FL-09 | **Probable HC-02 leak** (active hard constraint) | HF-02's position-dependent list omits Bird Dog Plank (EX003), Spider Crawl (EX085), Inchworm (EX092), all commonly performed from a push-up position. They are auto-selected. SC-04 (pending) names them but pending candidates are "not applied," while HC-02-pending items are HELD: two pending questions about the same position, treated in opposite ways | S01, S02, S03, S06, S07, S15, S29b, S30 | CRITICAL | ENGINE×DATA |
| FL-10 | **SC-01 has no selection or dose effect** | §E.1 returns an eligible anchor before K3 runs, so R-04 = worse never changes the press; prescription ignores R-04; §H.2 "RIGHT side under R-04 worse" voids evidence for every per-side item, including rows with no triceps involvement | S20 | HIGH | ENGINE |
| FL-11 | **Right-arm fade ratchet** | §H.4 RIGHT_ARM_FADE counts reps as n−1 → `short2` → REDUCE; §H.6 conservative merge applies REDUCE to both sides; REDUCE resets the stall counter, so no review flag | S28 (30 → 5 lb in five exposures; or permanent HOLD) | CRITICAL | ENGINE |
| FL-12 | **Preference flags inert on anchored slots** | DISLIKE/PREFER act only through K1/K2, which never run while the anchor is eligible; no DISLIKE rotation trigger in §E.5 | S18, S19 | MEDIUM | ENGINE |
| FL-13 | **Station rule evicts anchors** | §F.2 always keeps slot 1 and re-selects slot 2; a lower substitute on RACK_AREA (Box Hip Bridge, Barbell DL, Step-Up) evicts a BENCH_2 push or row anchor; two conflicting anchors starve slot 2 permanently; §E.3 has no reason code for it | S14, S21, S33, S26 (HPUSH anchor 3 of 18) | HIGH | ENGINE (station groups UNRESOLVED) |
| FL-14 | **Equipment model cannot express the gym** | Q.1 `equipment_ids` is AND-only (no "DB or KB"); machines have no rows; `AVAILABLE_WITH_SUBSTITUTION` has no Q.3 value; EX050 and EX082 become the same barbell deadlift under two IDs, which bypasses HF-11 and V-04 | S15, S16 | HIGH | ENGINE×DATA |
| FL-15 | **Duration underfill; no upward scaling** | §C.3 tops out at "≥ 45"; §G.5 only trims; cold start drops F; LIGHT halves B/C sets without refilling; straight-sets and unilateral costs are flat constants | S13 (39.75 of 60), S01 (34.75 of 45), S08, S29 | MEDIUM | ENGINE |
| FL-16 | **Uncertain Alloy data resolves to "no training"** | §L.2 "not sure" → no credit; prompt-created logs default to 16:00 without asking; both disable HF-12 exactly when the user just trained | S22a, S22c | HIGH | ENGINE |
| FL-17 | **Fatigue management is lower-body-only and binary** | HF-12 is one 24 h threshold for all lower families; no upper-body analogue after Alloy; no weekly exposure awareness (same squat 3× in 4 days allowed); no look-ahead to a same-day Alloy class (FUTURE by design) | S03, S04b, S05, S17, S21 | MEDIUM | ENGINE (declared UNRESOLVED) |
| FL-18 | **Progression pace set by clock artifacts; DB lines never cap** | Anchor exposure rate is set by FL-01/FL-02/FL-13, not by programming; CONFIRM_TOP ×2 at GOOD; §H.5 treats unknown increments as "heavier exists," so DB lines never reach LOAD_CAPPED and can prescribe past the confirmed 50 lb rack | S26 (0 squat load increases in 6 weeks; ~20 weeks to cap), S18 | HIGH | ENGINE×DATA |
| FL-19 | **LIGHT posture outranks logged outcome** | §H.2 excludes any LIGHT exposure from evidence even when SESSION_CAPACITY = usual/above; LIGHT never reduces load | S08, S32 | LOW | ENGINE |
| FL-20 | **Priority goals unrepresented** | GOAL_ACCESSORY disabled; no supplemental rows; no priority input anywhere in §C; core reaches 30-min users about once a week | S23 | HIGH | ENGINE×DATA (disclosed) |
| FL-21 | **Grip and unilateral load unmeasured** | grip removed from metadata (D-033); non-heavy lower options are mostly unilateral, so day-after sessions stack 3 unilateral main items; +0.5 min per unilateral item underprices it | S02, S04a, S27 | LOW | AUTHORING-SENSITIVE |
| FL-22 | **Engine cannot run on canonical data** | Q.1 metadata missing; `heavy_lower` and `roles_allowed` have no authoring criteria; the family vocabulary has no home for complexes (A4) | all | CRITICAL | DATA (blocking) |
| FL-23 | **Evidence-class leak on substituted executions** | Trap Bar DL executed as a barbell DL, Box Squat on a flat bench, Banded Split Squat without a band all keep `evidence_basis = ALLOY_LIBRARY`; K6 ranks by Alloy-library membership | S14, S30 | LOW | ENGINE×DATA |
| FL-24 | **Explainability gaps** | STALEST_LOWER sentence false under ties (FL-01); no code for station re-selection; C/F fallbacks leave UNFILLABLE ANTI_LAT and VPULL in every record, so the signal becomes noise | S12, S14, S21, S33 | MEDIUM | ENGINE |
| FL-25 | **Aborted session side effects** | `apartment_sessions_completed` +1 on any single set (consumes the no-finish allowance and changes the seed); partially done exercise marked used for 48 h | S24 | LOW | ENGINE |

---

## 4. Requested failure types: where each was found

| Looked for | Found | Ledger |
|---|---|---|
| Randomness masquerading as programming | Yes: seeded draws pick long-term anchors (S30); a 30-minute clock shift swaps main lifts (S25); `library_order` as final tie-break | FL-05, FL-02 |
| Poor fatigue management | Partly: lower-body 24 h rule works as specified; nothing for upper body, weekly frequency, same-day Alloy, or near-threshold cases | FL-17, FL-16 |
| Exercise repetition | Handled within 48 h (including Alloy FULL IDs). Same squat 3× in 4 days allowed; duplicate barbell deadlift IDs bypass the rule | FL-17, FL-14 |
| Movement redundancy | Two or three anti-extension items per session | FL-08 |
| Bad supersets | Station conflicts handled but evict anchors; no ill-matched pairs observed (template prevents push+push) | FL-13 |
| Excessive grip demands | Moderate (2–4 grip-loaded items); unmeasured | FL-21 |
| Excessive unilateral fatigue | 3 of 4 main items on day-after and cold-start days | FL-21 |
| Equipment conflicts | DB-only and cable+DB rooms unsupported; machines invisible | FL-14 |
| Duration mismatch | 60 min = 45 min; cold start and LIGHT underfill | FL-15 |
| Constraint violations | Probable HC-02 leak via three unlisted high-plank exercises | FL-09 |
| Bad progression | Six weeks without a squat load increase; DB lines never cap; role flips recalibrate | FL-18, FL-04 |
| Unnecessary regression | Right-arm fade ratchet on both arms | FL-11 |
| Overreaction to one subjective score | Not in architecture (R-02 high: no change; R-02 low: sets only). R-02 low does void evidence the post-session answer could have confirmed | FL-19 |
| Poor response to incomplete data | Missing reps/effort/side handled well; uncertain Alloy attendance handled badly | FL-16 |

## 5. What held up

These behaved as specified and as intended, and should be protected in any revision: the fixed template and block order; hard-filter ordering and the HELD/EXCLUDED split (HC-02 listed items and VPULL capability were held every time, never selected); determinism and same-day regeneration; posture never persisting (no chronic LIGHT state); RETURN after gaps without recalibrating (S31); untagged FULL Alloy logs (S22b); partial-session family crediting (S10, S24 family choice); CORE_STARVATION_SWAP firing on day 8 of a 30-minute-only history; Alloy FULL `exercise_id` feeding the 48 h rule (S17); `MIN_SETS_FOR_CREDIT` correctly refusing credit for a one-set abort.

## 6. Spec readings used (ambiguities surfaced by implementation)

| ID | Ambiguity | Reading used | Changes outcomes? |
|---|---|---|---|
| R1 | §C.7 C/F fallback "next family in that slot's pool": may it pick a family already planned? | Yes (literal) | Yes: produces FL-08 redundancy |
| R2 | §C.4 soreness pool "not already planned": does it exclude C's planned families? | Excludes only A/B; C re-planned after | Minor |
| R3 | HF-13 second clause needs the slot's eligible set before HF-13 runs | Two-pass evaluation | No |
| R4 | K4 "has any progression line": any role, or this role? | Any role | Yes: creates FL-04 (K4 picks by a line G.3 then ignores) |
| R5 | RIGHT_ARM_FADE n−1 applied to `short2` as well as `met` | Yes | Yes: FL-11(b) REDUCE vs HOLD |
| R6 | Reason code for §F.2 re-selection | None exists; simulator logged HF-10 | Explainability only |
| R7 | Ramp "rounded down to available weights" below the lightest confirmed KB | Not simulated | Undefined behaviour |
| R8 | Unanswered (dismissed) Alloy prompt | Treated as "no" | Yes, same class as FL-16 |
| R9 | `AVAILABLE_WITH_SUBSTITUTION` in Q.3 | AVAILABLE | Yes: FL-14 duplicates |
| R10 | Anchor write when two items in one session share (family, role) | Last write wins | FL-08 collision |
| R11 | MOBILITY items in F: sets and prescription | 1 item block, flat FINISH_MINUTES | No |

## 7. Implementation-blocking items (not fixes)

Independent of any redesign, the engine cannot be implemented or trusted until these exist: canonical Q.1 metadata with written criteria for `heavy_lower` and `roles_allowed` (FL-22); a decision on the three unlisted high-plank exercises under HC-02 (FL-09, B4a); a Q.3 representation of implement alternatives and of the cable stations (FL-14, UQ-G02); confirmed DB and KB load lists including limits (FL-18, UQ-G04).

The next step is the revision pass against this ledger. No rule has been changed here.
