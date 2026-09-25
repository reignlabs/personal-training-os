---
file: ENGINE_STRESS_TEST_RERUN_V0_2.md
class: AUDIT
status: COMPLETE
engine_version: 0.2.0 (tested) vs 0.1.1 (ledger)
updated: 2026-09-23
method: same reference simulator, same fixture metadata (with v0.2 fields added and three fixture corrections listed in §4), same histories and check-ins as ENGINE_STRESS_TEST_LEDGER_v0_1.md
---

# Stress test rerun, engine 0.2.0

## 1. Result

Every scenario the ledger classified QUESTIONABLE or FAIL was rerun (33 runs including variants), plus the five GOOD scenarios as regressions.

| | GOOD | QUESTIONABLE | FAIL |
|---|---|---|---|
| Ledger (0.1.1), same 33 runs | 0 | 12 | 21 |
| Rerun (0.2.0) | 21 | 11 | 1 |
| Regressions (S09, S10, S11, S22b, S31) | 5 of 5 still GOOD | | |

No unresolved **critical** engine failure remains. FL-09 and FL-11 are fixed. FL-22 (no canonical metadata) is resolved at specification level by M-17 and remains a blocking authoring task. The single FAIL (S23, goal representation) is blocked on user decisions B1, B2 and UQ-G03 and was already disclosed as such.

## 2. Scenario by scenario

| Scenario | 0.1.1 | 0.2.0 | What changed (evidence) | Fixed by | Residual |
|---|---|---|---|---|---|
| S01 cold start | FAIL | GOOD | Main anchors EX012, EX066, EX011, EX054 from `default_order`; no plank-position item; 30.25 of 45 min with FIRST_SESSIONS notice | M-05, M-08, M-16 | C2 is a drawn core item (by design) |
| S02 one session, next morning | FAIL | QUESTIONABLE | Hinge and squat picks are SUBSTITUTE_NO_ANCHOR(HF-12); no anchor set from them; two unilateral main items (was three); no Inchworm | M-03, M-08 | Novelty: day 2 still introduces new exercises (FL-06 unchanged) |
| S03 three consecutive days | QUESTIONABLE | QUESTIONABLE | Lower substitutes (HF-12), anchors elsewhere | — | FL-17: fourth consecutive training day at full volume |
| S04a heavy KD Alloy → next morning | FAIL | GOOD | HD PRIMARY anchor protected (substitute EX073, anchor EX065 kept); KD SECONDARY substitute for HF-11; no duplicate anti-extension | M-02, M-03, M-07 | FL-17 note only |
| S04b heavy KD apartment → Mon | FAIL | GOOD | KD leads because HD led last (last_primary), reason LOWER_ROLE_ALTERNATION | M-01 | Same-day Alloy not anticipated (FUTURE) |
| S05 heavy HD Alloy → 24.6 h | QUESTIONABLE | QUESTIONABLE | Unchanged: KD leads, HD heavy anchor allowed at 24.6 h | — | FL-17 |
| S06 upper sore | FAIL | GOOD | A2 ANTI_EXT, B2 ANTI_ROT (no phantom ANTI_LAT); C empty and dropped; SLOTS_EMPTY notice | M-06, M-07, M-16 | — |
| S07 lower sore | FAIL | GOOD | A1 ANTI_EXT, B1 ANTI_ROT; upper pairs intact; 28 of 45 min disclosed | M-06, M-16 | — |
| S08 low readiness | QUESTIONABLE | QUESTIONABLE | LIGHT unchanged; now disclosed (LIGHT_POSTURE) | M-16 | FL-19 |
| S12 45 min | QUESTIONABLE | GOOD | C = ANTI_EXT + ANTI_ROT, F = carry; no redundancy; record no longer lists phantom families each time | M-06, M-07 | — |
| S13 60 min | FAIL | QUESTIONABLE | Same session as 45 min, now disclosed (TIER_MAXIMUM) | M-16 | Blocked on B1/B3 (no volume added) |
| S14 KB rack in use | QUESTIONABLE | GOOD | Anchors kept via dumbbell options; IMPLEMENT_CHANGED, not evidence | M-13 | DB load guidance approximate |
| S15 dumbbells only | FAIL | GOOD | Squat pattern present (EX012 with DB); press and core substitutes; full 45-min structure | M-13 | — |
| S16 cable + DB | FAIL | QUESTIONABLE | Same good DB session as S15; machines still invisible | M-13 | Data-blocked: UQ-G02, UQ-G03 |
| S17 exercise repeated twice | QUESTIONABLE | GOOD | EX012 excluded the day after Alloy (calendar rule), other anchors used; no recalibration | M-02, M-04 | — |
| S18 PREFER on non-anchor | QUESTIONABLE | QUESTIONABLE | Unchanged by design | — | PREFER wins at rotation or by manual replace |
| S19 DISLIKE on anchor | FAIL | GOOD | Next KD/PRIMARY session: EX053, NEW_ANCHOR_ROTATION(DISLIKE); EX012 absent | M-11 | — |
| S20a R-04 worse, as usual | FAIL | GOOD | Bench kept by user choice; right side NOT_EVIDENCE; rows progress | M-09 | Default does not reduce pressing |
| S20b R-04 worse, swap | (new) | GOOD | B2 becomes ANTI_EXT (R04_SWAP); no pressing | M-09 | — |
| S21 Alloy SUMMARY → 15 h | QUESTIONABLE | QUESTIONABLE | Lower substitutes; push anchor no longer evicted by station rule | M-12 | FL-17 (upper body after Alloy) |
| S22a Alloy "not sure" | FAIL | GOOD | Heavy lower blocked (recovery credit); staleness unchanged | M-15 | — |
| S22c class ran at 18:00 | QUESTIONABLE | GOOD | Recovery end 18:55 → HF-12 at 22.6 h | M-15 | Real 16:00 classes substitute up to 2 h longer |
| S23 goals underexposed | FAIL | FAIL | Unchanged; core reaches 30-min users about weekly | — | Blocked: B1, B2, UQ-G03 (disclosed, not critical) |
| S24 aborted session | FAIL | GOOD | Next session HD/HPUSH lead (true staleness); anchors used; only never-performed EX041 calibrates | M-01, M-04 | — |
| S25 cadence just under 48 h | FAIL | GOOD | No HF-11 substitutions; 18:20 and 18:50 generations identical | M-02 | — |
| S26 six weeks | FAIL | GOOD | A1 KD 9 / HD 9; A2 HPULL 9, VPUSH 5, HPUSH 4; ANCHOR 50, SUBSTITUTE 12 (all HF-12), NEW 10; every lower anchor +5 lb (EX012 35→40, EX011 35→40, EX018 35→40, EX065 30→35) | M-01, M-02, M-03, M-12, M-18, M-19 | Pace to be reviewed in Phase 8 |
| S27 grip and unilateral | QUESTIONABLE | QUESTIONABLE | Unilateral items: 0 in 9 sessions, 1 in 3, 2 in 5, 3 in 1 (the day-after pattern persists, less often); grip-loaded holds 3–4 per session, carry in every 45-min session | — | FL-21 |
| S28 right-arm fade | FAIL | GOOD | (a) fade, all reps, HARD → REPS_UP to LOAD_UP; (b) one rep short → HOLD; (c) two short every time → one REDUCE (30→25), then HOLD(REDUCE_LIMIT) with review flag | M-10, M-18 | Right arm progresses when it completes reps (B5 open) |
| S29 lower + trunk sore | QUESTIONABLE | QUESTIONABLE | Row + bench only, straight sets, 35 min | — | Thin but valid session |
| S29b upper + lower sore | FAIL | GOOD | Rollout + quadruped hold + mobility; no duplicates; no plank-position item; SLOTS_EMPTY notice | M-06, M-07, M-08 | — |
| S30 cold start on eight dates | FAIL | GOOD | Main session identical on all eight dates | M-05 | Core C2 still drawn (rotates every 4 exposures) |
| S32 three LIGHT sessions | QUESTIONABLE | QUESTIONABLE | Unchanged; disclosed | M-16 | FL-19 |
| S33 two anchors, two stations | FAIL | GOOD | Block A STRAIGHT_SETS; both anchors kept; EX069 PRIMARY SEEDED 6 @ 30 lb | M-12, M-04 | Straight-sets time underpriced |

## 3. New-risk checks run after the changes

| Check | Finding | Disposition |
|---|---|---|
| N1 Alloy prompt dismissed | Treated as UNKNOWN; heavy lower blocked the next morning | Intended (M-15); listed as new risk |
| N2 22:30 session, then 06:00 two days later (31.5 h) | Anchors allowed | Accepted edge of calendar rule (M-02) |
| N2b consecutive calendar days, 25 h apart | Different anchors anyway, because roles alternate | No issue |
| N3 push role distribution | First M-01 draft: overhead press PRIMARY 9/9, bench SECONDARY 9/9 (new lock) | **Fixed** by PRIMARY-family key (M-01); now 5/4 and 4/5 |
| N4 seeded line across roles | Suitcase deadlift line in both roles at 35 lb | Works as specified (M-04) |
| N5 DISLIKE on the only carry | First draft rotated anyway and mislabelled the pick | **Fixed** (M-11): kept with NO_ALTERNATIVE_FOR_DISLIKE |
| N6 dumbbell bench, 30 TOO_EASY exposures | Stops at 50 lb, LOAD_CAPPED, rotation due | Intended (M-14) |
| N7 always training the morning after Alloy | Lower anchors never set; stable substitutes | Accepted (M-03 new risk) |
| K4 promotion path | First M-03 draft let day-2 substitutes become anchors later through "has a line" | **Fixed** (M-03): anchor choice ignores history keys |
| HARD rating | Compliant user (rates HARD as instructed) never progressed | **Fixed** (M-18) |
| Pace after all fixes | No lower load increase in six weeks with two confirmations | **Changed** PARAM (M-19) |

## 4. Fixture corrections made during the rerun

These change test data, not engine rules. Each was found by applying the new §Q.1.2 validators to the red-team's fixture.

1. EX073 Kettlebell Suitcase Deadlift: laterality BILATERAL → UNILATERAL (load in one hand; V-00d). Effect: +1.5 min estimate when it appears; no selection changed.
2. `default_order` completed to a full list per family (held rows appended in harvest order; no selection changed).
3. V-00c amended in the spec (not the fixture) to allow bodyweight vertical pulls in PRIMARY; chin-up and pull-up remain held by HF-08.

## 5. What this rerun cannot show

- Behavior on canonical metadata (not yet authored).
- Real duration, fatigue, and progression pace (needs Phase 8 logs).
- Anything about Alloy's programming. All findings concern this engine's rules, which are SYSTEM_DESIGN.
