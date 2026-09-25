---
file: PRODUCT_UX_SPEC_V0.md
class: PRODUCT (SYSTEM_DESIGN)
status: CANONICAL (product UX, V0)
updated: 2026-09-24
supersedes: PRODUCT_V0_APP_SPEC_v0_1.md (retained as history). This document is self-contained; nothing in the superseded file applies unless restated here.
engine_baseline: ENGINE_WORKOUT_GENERATOR_V0_2_1.md (engine 0.2.1, config 0.2.0). Unchanged by this document.
acceptance_baseline: GENERATOR_ACCEPTANCE_TESTS_V0_2.md + AT-26 to AT-28
decisions: D-064 to D-078 retained (two amended, two partly superseded, see §16); D-079 (ECR-01) still PROPOSED; new D-080 to D-095 (DECISION_LOG_addendum_D080-D095.md)
---

# PRODUCT UX SPEC: Personal Training OS V0

## 0. Status and scope

This is the canonical product UX specification for V0. It is the result of an in-gym audit (§1) of the previous draft, PRODUCT_V0_APP_SPEC_v0_1.md, followed by an aggressive simplification of every workflow that happens while training or right after.

**Unchanged:** generator logic (engine 0.2.1), the evidence discipline, the health rule, the engine boundary (EI-01 to EI-08), and ECR-01 as a pending request. Every simplification here changes only how inputs are collected and outputs are shown. Where a shortcut answers an engine input on the user's behalf, this document says exactly what is recorded (§4.2).

**Core promise.** OPEN APP → UNDERSTAND TODAY'S SESSION → START QUICKLY → LOG WITH MINIMAL FRICTION → FINISH → UPDATE TRAINING STATE.

**Headline result.** A normal 40-minute session drops from about 32–38 interactions to 20, of which 16 are "I finished this set." Check-in on a normal day drops from 4 taps to 1. Finishing drops from 4 to 1. A detailed Alloy log of six exercises drops from about 90 interactions (mostly typing) to 9 when names are logged from recents, or about 21 with sets and weights.

---

## 1. In-gym audit of the V0 draft

### 1.1 Conditions assumed

| # | Condition | Design consequence |
|---|---|---|
| C1 | One hand may be occupied (dumbbell, water, towel) | Every in-session action reachable with one thumb in the bottom 60% of the screen |
| C2 | Fatigue | No reading required mid-set; the default action is always correct when the set went as planned |
| C3 | Phone on a bench, ~1 m away | Reps, weight, and rest readable at a glance; one large target to hit |
| C4 | Very few taps | Interaction budgets are acceptance criteria (§2.2) |
| C5 | Short rests (45–90 s) | Zero taps to manage rest; next exercise and equipment visible during rest |
| C6 | Logging must not interrupt training | No dialogs, no required fields, no confirmations during a session |
| C7 | Alloy entry afterward takes minutes | Names first, taps not typing, everything else optional |

### 1.2 Findings

Categories: TYP unnecessary typing · MOD unnecessary modal · TGT small touch target · CNF repeated confirmation · INF too much information during exercise · RST poor rest timer · WGT awkward weight entry · SET slow set completion · SWP poor swap flow · RDY excessive readiness questions · PST excessive post-workout questions.

| ID | Where (v0.1) | Finding | Cat | Severity | Resolution |
|---|---|---|---|---|---|
| F-01 | Check-in | Nine question groups shown every day; a normal day still takes 4 taps plus scanning the whole list | RDY | High | One-tap normal day (§4.2, D-081) |
| F-02 | Check-in | Sleep and fueling are shown daily but never change the plan | RDY | Medium | Moved to the "Something's different" path; optional setting to ask every time (D-082) |
| F-03 | Check-in | Check-in is a separate sheet over Today | MOD | Low | Check-in is inline on Today |
| F-04 | Warm-up | Separate warm-up screen with its own "Start block A" button | SET | Low | Warm-up is the first step of focus mode, one tap (D-095) |
| F-05 | Set rows | Per-row ✓ buttons move down the card as sets progress; row-sized targets are hard to hit one-handed or from a bench | TGT, SET | High | One fixed, full-width Done button (D-084) |
| F-06 | Exercise card | About 12 elements visible during a set (chips, provenance, links, ramp rows, all set rows, notes) | INF | High | Focus mode: name, set count, reps, weight, last time, one conditional line (D-083) |
| F-07 | Block view | Partner exercise shown as a second full card | INF | Medium | Partner is a one-line strip |
| F-08 | Effort | Effort is an extra tap after every final set | SET | Medium | The final set is logged by tapping the effort (D-085) |
| F-09 | Reps | Editing reps opens a stepper or keypad | SET, TYP | Medium | Large − / + beside the number; a set one short costs 1 extra tap |
| F-10 | Weight | Weight edit uses the numeric keypad; no stated carry-forward to later sets | WGT, TYP | High | Weight chips from confirmed loads or ±5 lb; carries to the remaining sets (D-087) |
| F-11 | Weight change | "Form was hard to keep?" prompt appears after lowering weight | MOD | Medium | Removed from the flow; the Report button already has it |
| F-12 | Rest | Small docked bar; moving on requires Skip; ±15 s buttons small; not readable from a bench | RST, TGT | High | Large countdown replaces the target area; logging the next set ends rest (D-086) |
| F-13 | Rest | End-of-rest cue only if visible; overrun not shown | RST | Medium | Color change + optional tone; overrun counts up |
| F-14 | Blocks | Moving to the next block needs a swipe or a tap on block dots | SET | Low | Auto-advance (D-095) |
| F-15 | Swap | Seven reasons before any option is shown; then a confirm step with a scope toggle | SWP, CNF | High | Options first; one tap applies; reasons optional afterward (D-088) |
| F-16 | Swap | "Show held options" given equal weight to real options | SWP, INF | Low | Small link at the bottom of the swap list |
| F-17 | Symptom stop | Flag, note, explanation sheet, "End this exercise," then "Continue or end session" | MOD, CNF | High | Two taps, no dialog (D-089) |
| F-18 | Report sheet | Consequence text for seven flags to read mid-session | INF | Medium | One short line each; tap applies and closes |
| F-19 | Finish | Missing-data list, capacity question, note, Finish, then Done | PST, CNF | High | One tap: the capacity answer finishes the session (D-090) |
| F-20 | Summary | Summary needs "Done" | PST | Low | Summary is simply Today's completed state |
| F-21 | Session | Tab bar visible while training: mis-tap risk, lost space | TGT, INF | Medium | Tab bar hidden in focus mode (amends D-064) |
| F-22 | Undo | Toast position unspecified; top-of-screen toasts are out of reach | TGT | Low | Undo sits directly above the Done button |
| F-23 | Timed sets | No lead-in; with the phone on a bench the user taps Start and then has to get into position | SET | Medium | 3-second lead-in, auto-log at target (D-094) |
| F-24 | Log Alloy | Each exercise requires typing a name and a dose string | TYP | High | Recents grid with auto-advance; dose and weight chips (D-091) |
| F-25 | Log Alloy | Dose syntax must be typed correctly when tired | TYP | Low | Chips first; text parsing only as fallback |
| F-26 | Log Alloy | The form implies sets, reps, and loads matter for planning; they don't (Alloy logs never touch progression, §H.8) | TYP, PST | High | "Names are what planning uses; the rest is optional" (D-091) |
| F-27 | Log Alloy | "Coach changed this" toggle and note on every row | INF | Low | One session-level coach-notes field; per-item notes on tap |
| F-28 | Per-side items | Separate left/right edits, separate efforts, plus a fade field | SET, INF | Medium | L/R reps side by side under one Done; effort L and R as the final-set tap; fade on demand |
| F-29 | Per-side items | Fade-rep control always visible | INF | Low | "R fade" chip in the secondary row, 2 taps when needed |
| F-30 | Exercise card | Why, How-to, and Swap links equally prominent with the log action | INF | Low | Swap and Details as secondary; Why and How-to inside Details |
| F-31 | Done button | Double-tap can log two sets | SET | Medium | 800 ms debounce + Undo |
| F-32 | Alloy prompt | Unanswered prompt blocks nothing but its skip meaning is unclear | RDY | Low | Card says "Skip = not sure" |

### 1.3 Interaction counts, before and after

Interaction = tap, keystroke, or deliberate gesture. Reading is not counted. Assumes the planned values are right unless stated.

| # | Workflow | v0.1 | Canonical | Notes |
|---|---|---|---|---|
| W1 | Open app → plan ready, normal day | 4 | **1** | Tap the minutes |
| W2 | Same, with one Alloy prompt | 5 | **2** | |
| W3 | Different day (low energy, right arm worse → swap for core, lower sore) | 8 | **7** | Deliberately not shortcut; every answer is meaningful |
| W4 | Plan → first working set | 2 | **2** | Start, Warm-up done |
| W5 | Log a set as planned | 1 (small, moving target) | **1** (fixed, full width) | |
| W6 | Log a set one rep short | 3 | **2** | −, Done |
| W7 | Change weight for the rest of an exercise | 4 per set (up to 10) | **2** once | Weight, chip |
| W8 | First-time (calibrate) set with weight choice | 2 | **2** | Chips shown automatically |
| W9 | Final set + effort | 2 | **1** | Effort tap logs the set |
| W10 | Final set + effort, per-side item | 3 | **2** | Left effort, right effort |
| W11 | Timed set (plank, carry) | 1–2 | **1** | Start; auto-logs |
| W12 | Rest period | 0–1 (Skip) | **0** | Logging the next set ends rest |
| W13 | Next block | 0–1 | **0** | Auto-advance |
| W14 | Finish session | 4 | **1** | Capacity answer or Skip |
| W15 | **Whole normal session**, 6 exercises, 16 working sets | **≈ 32–38** | **20** | 1 + 2 + 16 + 1 |
| W16 | Swap: just want an alternative | 3 | **2** | Swap, option |
| W17 | Swap: station busy | 3–4 | **3** | Swap, "Rack busy," option |
| W18 | One weight missing (e.g., 40 lb kettlebell taken) | 5 | **2** | Weight, chip; no swap |
| W19 | Swap because disliked, and make the new one regular | 4 | **4** | Swap, option, then optional "Don't like it," "Keep as regular" |
| W20 | Stop for a symptom | 4–5 + dialogs | **2** | Report, Stop: symptom |
| W21 | End session early | 5 | **3** | ⋯, End session, capacity or Skip |
| W22 | Log Alloy, summary only | 2 | **2** | Open, Save |
| W23 | Answer Alloy prompt at check-in | 1 | **1** | |
| W24 | Log Alloy, 6 exercises from recents, names only | ≈ 38 | **9** | Open, Add exercises, 6 picks, Done |
| W25 | Log Alloy, 6 exercises with sets × reps and weight | ≈ 92 | **≈ 21** | + one dose chip and one weight chip each |
| W26 | Log Alloy exercise not in recents | +5–7 each | +4–6 each | Type 3–4 letters, pick |
| W27 | "When did I last do X?" | 7 | **7** from History; **2** in session | Details → Last times |

---

## 2. Rules for training-time design

### 2.1 Hard rules (apply in focus mode and in Log Alloy)

1. **One primary action, always in the same place:** a full-width button at the bottom of the screen, at least 72 pt tall.
2. **No dialogs during a session.** Undo replaces confirmation. The only in-session confirmation is choosing an exercise that is on hold (a real safety check, §5.9).
3. **No keyboard during a session** except "Other" weight and optional notes.
4. **Nothing required mid-session.** Missing data is allowed and shown later, never blocking.
5. **The planned value is the default.** Doing what was planned costs one tap.
6. **Glanceable from a bench:** reps and weight ≥ 48 pt; rest countdown ≥ 96 pt; high contrast; no information carried by color alone.
7. **Reach:** every in-session control sits in the bottom 60% of the screen; the top area shows information only.
8. **Targets:** in-session controls ≥ 48 × 48 pt with ≥ 8 pt spacing; the primary button full width.
9. **No swipe-only or long-press-only actions.**
10. **Every tap persists immediately** (D-078).

### 2.2 Interaction budgets (acceptance criteria)

| Action | Budget |
|---|---|
| Normal-day check-in | ≤ 1 tap (+1 per Alloy prompt) |
| Plan → first working set | ≤ 2 taps |
| Set as planned | 1 tap |
| Set with one value changed | ≤ 2 taps |
| Final set + effort | 1 tap (2 for per-side items) |
| Rest and block changes | 0 taps |
| Swap to an alternative | ≤ 2 taps (≤ 3 with a station or equipment context) |
| Symptom stop | ≤ 2 taps |
| Finish | ≤ 1 tap after the last set |
| Alloy summary log | ≤ 2 taps |
| Alloy detailed log, 6 known exercises, names only | ≤ 9 taps |
| Dialogs in focus mode | 0 (except choosing a held exercise) |

A build that exceeds a budget fails UX acceptance for that workflow.

---

## 3. Information architecture

### 3.1 Navigation (D-064, amended by D-083)

Bottom tab bar: **Today · History · Log Alloy (center, opens a sheet) · Equipment · Profile.**

- **Focus mode** (an active session) hides the tab bar. "‹ Plan" in its header returns to Today's plan view; every other tab then shows a **Resume** bar above the tab bar.
- Tasks open as sheets (Details, Swap, Report, Log Alloy). Places push (History detail, Equipment item, Profile sections).
- Log Alloy is reachable from any tab except focus mode.

### 3.2 Environments (D-065, unchanged)

Generation runs for the **apartment gym** only. **Other / manual** is logging-only (OTHER_TRAINING_LOG, stored, not read in V0; UNRESOLVED B2). Alloy sessions are logged through Log Alloy. Reason: under §H.7 (M-20) another environment's equipment state would permanently re-base progression lines.

### 3.3 Screen inventory

| ID | Screen | Presentation | Engine / data |
|---|---|---|---|
| T-00 | First-run setup (once) | Full screen, 4 steps | CONFIRM_EQUIPMENT, `default_order` approval, ALLOY_SCHEDULE, time zone |
| T-01 | Today: states NOT_READY, CHECK-IN, PLAN, COMPLETED (summary), NO_SESSION | Tab root | Q.4, Q.10, Q.11, completion decisions |
| T-02 | Something's different (full check-in) | Inline expansion of T-01 | Q.4 |
| T-03 | Focus mode: warm-up step, set step, rest state, finish step | Full screen, tab bar hidden | Q.5 writes |
| T-04 | Details (Why, How-to, last times, set list edit) | Sheet | Q.11 item record, evidence-layer cues |
| T-05 | Swap | Sheet | EI-01 |
| T-06 | Report | Sheet | Q.5 flags, Q.8 SET_PREFERENCE |
| T-07 | Unfinished session | Modal on open (not in a session) | Q.5 |
| A-01 | Log Alloy (quick → exercises → effect line) | Sheet | Q.6, EI-05 |
| A-02 | Type or dictate instead | Sheet page | Q.6 |
| H-01–H-06 | History feed, session details, exercise detail, search, other session | Tab / push | Q.5, Q.6, Q.7, lines |
| E-01–E-04 | Environments, gym list, equipment item, other/manual | Tab / push | Q.3, Q.8, EI-06 |
| P-01–P-09 | Profile home, goals, schedule, movement rules, preferences, needs review, open questions, coach notes, data & system | Tab / push | Profile, constraints, Q.8 |

Removed from v0.1 as separate screens: Check-in sheet (now inline T-01/T-02), Alloy attendance prompt screen (cards in T-01), Session overview (T-01 PLAN), Warm-up (focus step), Rest timer (focus state), Effort rating (final-set buttons), Finish sheet (focus step), Session summary (T-01 COMPLETED), Exercise picker (inside A-01).

### 3.4 Display vocabulary

| Engine family | Display | | Role | Display |
|---|---|---|---|---|
| KD | Squat / lunge | | PRIMARY | Main lift |
| HD | Hinge | | SECONDARY | Second lift |
| HPUSH / VPUSH | Push / Overhead push | | CORE, CARRY | Core, Carry |
| HPULL / VPULL | Row / Vertical pull | | ACCESSORY | Accessory |
| ANTI_EXT / ANTI_ROT / ANTI_LAT | Core: resist arching / twisting / side-bending | | MOBILITY | Mobility |
| CARRY | Carry | | | |

Effort buttons: **Too easy · Good · Hard · Too hard** (Hard carries the helper "target effort" on first use and in Details). No numeric RPE (D-067).

Exercise provenance (Details only): ALLOY_LIBRARY "From Alloy's public exercise library" · ALLOY_LIBRARY_ADAPTED "Alloy library exercise, adapted: {executed_as}" · SUPPLEMENTAL "Added by you (not from Alloy)". Rules are never attributed to Alloy.

---

## 4. Today

### 4.1 Today states

| State | Shown | Primary action |
|---|---|---|
| NOT_READY | "Session planning isn't ready yet. You can log Alloy sessions and set up equipment now." | Log Alloy |
| CHECK-IN | Alloy prompt cards (if any) and the normal-day row (§4.2) | Tap your minutes |
| PLAN | The plan (§4.4) | **Start** |
| IN_PROGRESS | (Today is replaced by focus mode; from other tabs, the Resume bar) | Resume |
| COMPLETED | Summary (§4.5) | none required |
| NO_SESSION | Reason sentence (§11.1) | Change check-in |

### 4.2 Normal-day check-in (D-081)

```
│ Mon, Sep 28
│ ┌ Did you train at Alloy on Fri?   [Yes] [No] [Not sure]   skip = not sure
│
│ Feeling as usual today. How long do you have?
│ [ 20 ] [ 30 ] [ 40 ] [ 45 ] [ 60 ]
│ 20 = 1 pair · 30 = 2 pairs · 40 = + core · 45+ = + finish
│
│ Something's different ▸
```

- Tapping a minutes chip **builds the plan immediately.**
- What that tap records: R-01 = the minutes; **R-06 = "no"** (the line above the chips states it, and the tap is the answer); R-02 normal, R-04 same, R-05 none, no equipment issues, recorded in `defaulted_fields[]`; R-03 and R-07 unanswered. Extension flag `normal_day_shortcut = true` on Q.4.
- An Alloy card left unanswered is treated as dismissed (UNKNOWN: recovery credit only, asked again within 72 h, §L.2). The card says "skip = not sure."
- The static hint line under the chips shows what each length gets (tier table, §C.3). It is generated from config, so it stays true if the thresholds change. The first two sessions never include a finish (§C.3).
- A mis-tap costs one tap to fix: "Change" on the plan returns to check-in with the answers kept.

### 4.3 Something's different (T-02)

Inline expansion, one scroll, in this order. Nothing preselected for the two required items.

1. **Minutes*** chips (select; do not build).
2. **Unwell or different from usual?*** No / Yes → Normal / Lighter / Skip today. Helper: "The app doesn't ask what or interpret it."
3. **Energy** Low / Normal / High (Normal preselected).
4. **Right arm vs usual** Worse / Same / Better (Same preselected). Worse → "Press as usual, or swap pressing for core?" As usual / Swap for core.
5. **Too sore to load** None / Upper / Lower / Trunk (multi; None preselected).
6. **Anything unavailable today?** equipment chips (implements with a station or a load first).
7. **Also note** (collapsed): Sleep Poor / OK / Good · Ate per plan 2–3 h before Yes / No. Both "for your records."
8. **Build** (sticky; "Skip today" when Skip is chosen).

Setting (P-03): **Ask sleep and fueling every time** (off by default). When on, item 7 is expanded and also appears under the normal-day chips as two optional rows (D-082). Trade-off stated in the setting: with it off, sleep and fueling are recorded only on different days, which weakens the fueling question OQ-02.

### 4.4 Plan (T-01 PLAN)

```
│ Today · about 38 min                               Change
│ Lighter day: 2 sets each, today won't change targets     (only when LIGHT)
│ Warm-up · bike 3 min + 2 mobility
│ A  Goblet Squat 3 × 8 @ 40   +  Kettlebell Row 3 × 8 @ 35
│ B  Romanian Deadlift 3 × 10 @ 35  +  Half-Kneeling Press 3 × 10 @ 25
│ C  Dead Bug 2 × 10  +  Suitcase Carry 2 × 30 s @ 40
│ 2 movement types not planned yet ▸
│ [                  Start                  ]
```

- At most two notice lines visible (priority: Lighter day, replacement/swap-for-core, underfill, straight sets, core-starvation swap); the rest behind a "More" line. Unservable families are one collapsed line linking to their unblocking questions.
- Tap an exercise → Details (T-04) with Why, How-to, Swap. Swaps here are recorded when the session starts; "Keep as regular" (USER_REPLACE) applies at tap time.
- **Start** writes `started_at`, enters focus mode, requests screen wake lock.
- An Alloy log saved while PLAN is showing adds a line: "Plan made before your Alloy log. Update plan?" (§L.4).
- "Not training now" lives in "Change"; a plan never started expires at local midnight and changes nothing.

### 4.5 Completed (T-01 COMPLETED = the summary)

```
│ Done today · 41 min
│ Next time
│   Goblet Squat        40 × 9          (one more rep)
│   Kettlebell Row      stays 35 × 8
│   Romanian Deadlift   rate to count  [Too easy][Good][Hard][Too hard]
│   …
│ Counted: Squat, Row, Hinge, Overhead push, Core, Carry
│ Add note ·  Train again today
```

- "Next time" text comes from completion decisions (§K). Decision copy in §10.3.
- Unrated items show inline effort chips. Rating later edits the log and rebuilds state by replay (D-075, D-090).
- No "Done" button. Holds and rotations appear as lines ("Your regular hinge exercise changes next time").

---

## 5. Focus mode (training)

### 5.1 Layout (iPhone portrait)

```
│ ‹ Plan      18:40 · ~20 min left      A ▸ B ○ C ○      ⋯        ← info only
│ A1 Goblet Squat  ▸  A2 Kettlebell Row                            ← pair strip
│
│ GOBLET SQUAT                                        Set 2 of 3  ● ● ○
│
│        [ − ]     8 reps     [ + ]
│                 40 lb ▾
│ Last: 8 · 8 · 7 @ 40 · Good
│ (one conditional line, e.g. "First time: pick a weight")
│
│  [ Swap ]            [ Details ]            [ ⚑ ]                ← secondary, 48 pt
│ ┌───────────────────────────────────────────────────────────┐
│ │                 Done  ·  8 × 40 lb                        │   ← primary, ≥ 72 pt
│ └───────────────────────────────────────────────────────────┘
```

- **Visible during a set:** exercise name, set x of y with dots, reps with − / +, weight, last time, at most one conditional line, three secondary buttons, the primary button. Nothing else (D-083).
- **Conditional line** (one at most, priority order): "Stopped: …" banner for a just-stopped partner; "First time: pick a weight"; "Warm-up sets first: 20 × 6, 30 × 6" (A1/A2 set 1 only; not logged); "Different equipment today: similar weight, won't count toward progress"; "Weight changed: won't count toward progress"; "Right side counts separately today" (R-04 worse on a triceps-involved item).
- **Moved to Details:** Why, How-to, family and role, provenance, line state, rest length, full set list, notes.
- **Header (info only):** elapsed, estimated remaining, block progress, "Lighter day" tag when LIGHT. "⋯" holds: Sound on/off, Session note, Skip exercise, End session.

### 5.2 Warm-up step (D-095)

First screen after Start. Lists: general warm-up (3 min: first available of bike / treadmill walk / elliptical) with an optional 3-minute timer, and the two mobility items with their doses. Primary: **Warm-up done**. Secondary: Swap (mobility items; engine list). Not logged as working sets; completion recorded as an extension.

### 5.3 Set completion

| Situation | Interaction |
|---|---|
| Set as planned | **Done** (1) |
| Reps differ | − or + (each 1), then Done |
| Weight differs | tap weight → chip strip (§5.4) → chip (2 total), then Done; new weight carries to this exercise's remaining sets |
| Final working set of an exercise | the primary area shows **Too easy · Good · Hard · Too hard** (4 buttons, each ≥ 72 pt tall); one tap logs the set with the shown reps and weight **and** the effort (D-085) |
| Per-side item | two reps controls side by side (L, R) sharing one weight; **Done · both sides**; final set shows two effort rows, Left and Right (2 taps) |
| Timed set | §5.6 |
| Skip a set | "⋯" → Skip exercise, or simply Finish/End later (unlogged sets become skipped) |
| Mis-tap | **Undo** chip directly above the primary button for 5 s; primary debounced 800 ms |
| Fix an earlier set | tap the set dots → set list in Details; edit values in place |

After a set is logged, focus moves by the pairing rule (§F.3): A1 set n → A2 set n → rest → A1 set n+1. Straight-sets blocks: all sets of item 1 with rest between sets (D-077), then item 2. The pair strip shows which exercise is up. A swapped or stopped partner leaves the other item running as straight sets.

The Done label always states what it logs ("Done · 8 × 40 lb"), so a stale pre-fill is visible before the tap (OBS-02).

### 5.4 Weight entry (D-087)

Tapping the weight replaces the secondary row with a horizontal chip strip, current value centered, 56 pt chips:

| Equipment state | Chips |
|---|---|
| Confirmed load list (e.g., kettlebells) | every confirmed load: 25 · 30 · 35 · 40 · 45 |
| No list, `max_confirmed_load` known (e.g., dumbbells ≤ 50) | current −10 · −5 · current · +5 · +10, capped at the confirmed maximum |
| Nothing known | −5 · current · +5 · Other |
| Bodyweight | no weight control |

"Other" opens the numeric keypad (the only keyboard in focus mode). Tapping a chip applies and closes the strip. Changing weight on a non-calibrate item shows the conditional line "Weight changed: won't count toward progress" once; no prompt, no question. Calibrate items open the strip automatically on set 1 and the Done button reads "Pick a weight" until one is chosen. "Next heavier available" prescriptions open the strip with the eligible heavier chips highlighted.

### 5.5 Rest (D-086)

- Starts automatically when the pair completes (or after each straight set). No rest after mobility or after the last set of the session.
- The reps/weight area is replaced by a countdown (≥ 96 pt) and, beneath it, **what's next**: "Next: A1 Goblet Squat · set 3 · 8 × 40 lb". Between blocks: "Next: Block B · Romanian Deadlift · grab 35 lb dumbbells."
- **Logging the next set ends rest.** The primary button stays "Done · {next set}" during rest; there is no Skip button. −15 s / +15 s sit in the secondary row.
- At zero: the countdown area changes color, one short tone plays if sound is on and the page is visible, and the display counts up the overrun ("+0:14"). No repeating alarm, no dialog.
- Timestamp-based: correct after locking the phone or switching apps. V0 does not rely on background notifications or vibration (not available to web apps on iPhone in general).
- The rest length is the engine's `rest_after_pair_s`; adjustments are not logged and never affect the engine.

### 5.6 Timed sets (D-094)

Target area shows "30 s". Primary: **Start 30 s** → 3-second lead-in (3 · 2 · 1, large) → countdown → at zero the set logs automatically with the target seconds. Primary during the countdown: **Stop** (logs the seconds achieved). Per-side timed items run Left, then a 3-second "Switch sides" lead-in, then Right, under one Start. A final timed set ends by showing the effort buttons (1 more tap). Carries with a load show the weight chip as in §5.4.

### 5.7 Report (⚑) (D-089)

Sheet of large rows; tapping a row applies it and closes the sheet. One short consequence line each.

| Row | Consequence line | Effect |
|---|---|---|
| **Stop: symptom** (first row) | "Ends this exercise and holds it for your review." | Exercise ends now; remaining sets skipped; STOPPED_SYMPTOM; focus moves to the next item. A banner stays on the next screen: "{Exercise} stopped · held for review · Add note · End session" plus one line: "If something is new or worrying, follow your clinician's guidance." |
| Uncomfortable | "Keeps this weight. Twice in a row puts it on hold." | UNCOMFORTABLE (location can be added in Details) |
| Form was hard to keep | "Next time one step lighter." | TECHNIQUE_DIFFICULTY |
| Equipment problem | "Won't count against the exercise." | EQUIPMENT_ISSUE |
| Don't like it / Like it | "Changes which exercise becomes your regular one." | SET_PREFERENCE |

Per-side items also show **R fade** in the secondary row (replacing nothing else): tap → a row of rep numbers (1 to target) → tap the rep (2 taps). Recorded only (§H.4).

Until ECR-01 is approved, the consequence line for Stop and Uncomfortable reads "Recorded" whenever the exercise has no logged set or no progression line (mobility, warm-up), because the hold would not apply (§13.2).

### 5.8 Details (T-04)

Sheet with, in order: **Why** (three lines, §10.1, and "More"), **Last times** (last 3 exposures, plus "At Alloy" rows marked "not used for targets"), **Set list** (editable), **How to** (Alloy's published cues with source link, or "No published cues"), **About** (family, role, line state, provenance, rest), **Note**. Opening Details never pauses anything.

### 5.9 Swap (T-05) (D-088)

```
│ Swap Goblet Squat
│ [ Rack busy ] [ Equipment missing ]                     ← context chips, shown only when relevant
│ ┌ Dumbbell Goblet Squat   3 × 8 · same weight    Same exercise, dumbbell
│ ├ Split Squat             3 × 8 · first time     Next in your squat options
│ └ Step-Up                 3 × 8 · 30 lb          Used less recently
│ More options ·  Show held (2)
```

- Opening Swap immediately shows up to three engine options (EI-01), each with dose and a one-line reason (§10.2 copy). **Tap an option → applied, sheet closes, Undo chip appears.** No confirm step.
- Context chips appear only when relevant: **{Station} busy** if the current exercise uses a station; **Equipment missing** if it uses equipment. Tapping one re-requests the list with that context (busy station or today's issue). "Equipment missing" asks one thing inline: **All of it** (today's issue; the engine may return the same exercise on another implement) or **Just the weight I need** (closes the sheet and opens the weight strip; no swap).
- After a swap, one strip on the new exercise, dismissed automatically by its first logged set: "Swapped from Goblet Squat · Why? [Don't like it] [Uncomfortable] [Form] · [Keep as my regular]". Each chip writes its flag or event (§8.6); all optional.
- "More options" cycles the engine's ordered list (§E.6). "Show held" lists held exercises with their hold reasons; choosing one shows the single in-session confirmation naming the hold. The hold is not cleared.
- No options: "Nothing else fits this pair right now." Buttons: Skip this exercise · Keep {original}.
- Swaps never change families or blocks (§E.6); a swapped-in exercise never becomes the regular one unless "Keep as my regular" is tapped (§E.1).

### 5.10 Finish step (D-090)

After the last set of the last item is logged, focus mode shows:

```
│ Done · 41 min
│ Today vs usual?
│ [ Below usual ]   [ Usual ]   [ Above usual ]
│                   Skip
```

Any tap (including Skip) finishes the session: `ended_at` = the tap, §K runs, Today shows COMPLETED. **End session** from "⋯" leads to the same step with "Back to workout" above it; that link is the only guard against an accidental end. No missing-data list, no note prompt; both live on the summary.

### 5.11 Unfinished session (T-07, D-072)

On opening the app on a later local date with a started, unfinished session: "Unfinished session from Tue · 11 sets logged." **Finish with what I logged** (`ended_at` = last logged set) · **Discard** (confirm; deletes logged sets). Same-day reopening simply resumes focus mode at the focused set with rest recomputed.

---

## 6. Log Alloy (A-01) (D-070, D-091)

### 6.1 Quick log

```
│ Log Alloy
│ [ Today ] [ Fri 25 ] [ Wed 23 ] [ Pick ]
│ 4:00 pm · Full body · length unknown ▾
│ [   Save   ]      [   Save + add exercises   ]
│ Counts as full-body training. Heavy lower-body lifts after Sat 4:55 pm.
```

- Date defaults to today if it is a class day after 4 pm, else the most recent unlogged class day in the last 7 days. Future dates are disabled. If a log exists for the chosen date, the sheet opens it instead (no duplicates, §L.4).
- The one-line details row expands to time, focus (Full body / Upper / Lower), and length (45 · 50 · 55 · 60 · Other · Unknown). Unknown stores `ended_at` = class time + 55 min with `duration_known = false`.
- **Save** creates the SUMMARY log (2 taps from any tab). **Save + add exercises** saves and continues.
- The effect line (EI-05) updates live.

### 6.2 Adding exercises: names first

```
│ Names are what planning uses. Sets and weights are optional.
│ A1 Goblet squat        3×10 · 35        A2 ▸ (next)
│ ┌ Recent at Alloy ─────────────────────────────────┐
│ │ [KB deadlift] [Goblet squat] [DB bench] [KB row] │
│ │ [Reverse lunge] [Plank] [Farmer carry] [TRX row] │
│ └──────────────────────────────────────────────────┘
│ Search… 
│ Finisher · + Add row · Coach notes · Type or dictate instead
│ [ Done ]
```

- Focus starts at A1. The recents grid (up to 12 large chips: most recent Alloy exercises first) sits under the slot list. **Tapping a chip fills the focused slot and advances** (A1 → A2 → B1 → B2 → C1 → C2). Six known exercises = six taps.
- Search matches display names, canonical names, and the alias table after 2 letters; results as large rows. No match → "Use '{text}'" as free text, then pattern chips inline (Squat · Hinge · Push · Overhead push · Row · Vertical pull · Core · Carry · Not sure; one tap, optional). "Core" on free text records no family (the engine never credits core from unspecified entries); a second row of the three core types appears for those who know.
- **Optional dose:** a filled slot shows a chip row: that exercise's last Alloy dose first, then 3×8 · 3×10 · 3×12 · 4×8 · 30 s · 40 s. **Optional weight:** last Alloy weight and ±5 chips. Typing is only via tapping the slot's dose text ("3x12/10/8 @30" parsed; unparsed text kept as a note).
- **Coach notes:** one session-level field. A per-exercise coach note is available by tapping a filled slot (marks `coach_modified`). All feed Profile → Coach notes (D-071).
- **Type or dictate instead (A-02):** a text box that accepts one exercise per line ("A1 goblet squat 3x10 35"), suitable for iPhone keyboard dictation. On "Use these," lines are matched against names and aliases; matched lines fill slots, unmatched lines become free-text items; a preview shows which is which before saving.
- Everything autosaves. The first exercise upgrades the log to FULL. **Done** closes the sheet.

### 6.3 From the check-in prompt

"Yes" on the Today card creates the summary log in one tap. After the plan is built, the card collapses to "Alloy Fri logged · Add exercises" (opens §6.2 for that date).

### 6.4 Alloy log states (§L)

| State | Reached by | Engine effect |
|---|---|---|
| UNRESOLVED | Scheduled class in the last 72 h, no log, no answer | Card at next check-in |
| UNKNOWN | "Not sure," or card skipped | Recovery credit only; asked again within 72 h |
| SKIPPED | "No" (card or History "Resolve") | No prompt again |
| SUMMARY (prompt) | "Yes" on the card | Parent credits LOWER/PUSH/PULL at the scheduled end; recovery credit |
| SUMMARY (user) | Save | Parent credits per focus at `ended_at`; replaces a prompt log and its recovery credit |
| FULL | First exercise added | + family credits for tagged items, `exercise_last_used` for library items |
| EDITED / DELETED | History | Replay |

Minimum valid log: a date.

---

## 7. Other screens (not used while training)

These keep the v0.1 content with the simplifications noted.

### 7.1 First-run setup (T-00)

Four steps, each skippable except step 2 (the spec requires `default_order` approval before first use, §Q.1.1):
1. **Confirm at the gym:** rack bar path, adjustable cable pulley, incline setting, dumbbell top weight and increments, plate denominations, station groups. One question per screen with large answer buttons; "Not sure" leaves it UNKNOWN (exercises needing it stay on hold, stated plainly). Unservable families are listed with their unblocking question.
2. **Approve starting exercises:** per family, the first two `default_order` rows with name and How-to. Approve all, or reorder within a family.
3. **Alloy schedule:** Mon / Wed / Fri 4:00 pm pre-filled.
4. **Time zone and units:** America/Los_Angeles, lb (D-073).
If EXERCISE_METADATA is missing or fails to load (V-00e), setup ends at NOT_READY; Log Alloy, History, and Equipment work.

### 7.2 History

- **H-01 Feed:** week strip (apartment ●, Alloy A, other ○, unresolved ?), "Patterns: last trained" (collapsible; family, relative time, source), filter chips (All · Apartment · Alloy · Other), session rows newest first; unresolved Alloy slots with **Resolve** (Yes / No). A "Recent exercises" row (last 8 distinct) gives one-tap access to exercise detail. No charts, totals, or streaks.
- **H-02 Apartment session:** non-default check-in answers, items by block with sets, effort, flags, swaps, notes; Why as generated; next-time decisions. Edit / Delete (replay, D-075).
- **H-03 Alloy session:** date, time, length or "not recorded," focus, source, items by slot, coach notes, credit summary. Edit (opens A-01 for the log) / Delete.
- **H-04 Exercise detail:** current targets per role; status (Calibrating · Progressing · Holding · Lowered · Stalled · At top weight · On hold); last done; recent exposures (10, "Show more"); "At Alloy" rows (not used for targets); like/dislike; hold actions; How-to. "Progressing" = REPS_UP, LOAD_UP, CONFIRM_TOP, or EXTEND_RANGE within the last 3 qualifying exposures (display rule).
- **H-05 Search:** names and aliases after 2 letters; last-done date per result.
- **H-06 Other / manual session:** banner "Not used for planning (yet)."

### 7.3 Equipment (D-066)

- **E-01 Environments:** Apartment gym (used for planning; count to confirm) · Other / manual (logging only).
- **E-02 Gym list:** "Confirm at the gym (n)" first, then by category: status (Available · Not available · Unconfirmed), loads, station.
- **E-03 Item:** read-only description, confidence, and source; Availability; confirmed weights (chip editor); heaviest confirmed weight; station group; confirmed-on date; **Unavailable today**. Changing to Not available or Unconfirmed first shows the impact warning (EI-06): the exercises whose progress lines would re-base, and the choice **Gone for good** / **Only today** / Cancel. Adding a heavier weight says which capped exercises can progress again.
- **E-04 Other / manual:** "Log other session" (date, length, items via the same recents/search picker and dose chips as Log Alloy; program chips DailyArms · DailyAbs · Walking · Manual).

### 7.4 Profile

- **P-01 Home:** Goals · Schedule & sessions · Movement rules · Exercise preferences · Needs review (badge) · Open questions · Coach notes · Data & system. Footer: "Health details stay in your Health Project."
- **P-02 Goals** (read-only): G-01, G-03 to G-07 as stated; G-02 shown as "Reach goal body weight" without numbers; G-08 not shown. Banner: "Goal ranking isn't set (B1). Until it is, no goal is weighted and sessions don't grow above the 45-minute plan."
- **P-03 Schedule & sessions:** Alloy days and time (config change); session length "Not set (B3)" with the current tier defaults; time zone; units; **Ask sleep and fueling every time** (D-082); **Sound for rest end** default.
- **P-04 Movement rules** (read-only): HC-01, HC-02 with `label_in_app` and effect; SC-01 active with parameters pending; SC-02 to SC-05 "Waiting for your decision"; avoid list. No diagnoses, quotes, or Health handoff labels (D-074).
- **P-05 Preferences:** liked, disliked, regular-exercise replacements; remove any.
- **P-06 Needs review:** On hold (symptom; the user's note) · On hold (uncomfortable twice) · Lowered once already · Stalled (info) · Ready for a harder variant (info) · Disliked but no alternative (info). Actions: **Put back into planning** (confirm: "The app doesn't assess symptoms. This puts the exercise back into planning.") → CLEAR_HOLD; **Mark reviewed** → CLEAR_REVIEW.
- **P-07 Open questions:** each with "What the app does until you answer." UQ-G01 answerable in-app (CONFIRM_CAPABILITY); equipment questions link to E-02; B1–B6 and P-07/P-08 answered in the PERSONAL files. Also lists OBS-05 ("Plans don't know a class is coming later today").
- **P-08 Coach notes:** from Alloy logs; **Mark reviewed**. "Recorded as trainer input. They change planning only once you add them to your movement rules."
- **P-09 Data & system:** engine and config versions; rejected metadata rows; Technical details toggle (reason codes and raw record in Details and History); Export backup; Import backup (confirm); Rebuild training state; Run setup again.

---

## 8. State models

### 8.1 Today

```
NOT_READY ──setup + metadata──▶ CHECK_IN
CHECK_IN ──minutes (normal day) / Build (different)──▶ GENERATING
GENERATING ──session──▶ PLAN        GENERATING ──NO_SESSION──▶ NO_SESSION
PLAN / NO_SESSION ──Change──▶ CHECK_IN (answers kept)
PLAN ──Start──▶ FOCUS (IN_PROGRESS)
FOCUS ──finish step answered──▶ COMPLETED
FOCUS ──reopened on a later local date──▶ UNFINISHED ──finish / discard──▶ COMPLETED / CHECK_IN
COMPLETED ──Train again today──▶ CHECK_IN
local midnight: PLAN, NO_SESSION, COMPLETED ▶ CHECK_IN
```
Same answers regenerate an identical plan (§E.4, §N). Alloy answers persist even if the check-in is abandoned (§C.1 step 2).

### 8.2 Workout lifecycle

| Stage | Trigger | Written | Engine |
|---|---|---|---|
| Generated | minutes tap / Build | Q.4, Q.10, Q.11 | Alloy answers applied |
| Planned | — | pre-start swaps (draft); USER_REPLACE / SET_PREFERENCE at tap time | events at `event_at` |
| Started | Start | Q.5 `started_at` | — |
| In progress | each set, effort, flag, swap | Q.5 immediately | — |
| Completed | finish step tap | `ended_at`, `session_capacity` | §K |
| Edited / Deleted | History | Q.5 revised / removed | Replay |
| Discarded | Unfinished → Discard | Q.5 removed | none |

### 8.3 Focus-mode step machine

```
WARMUP ──Warm-up done──▶ SET(A1, 1)
SET(item, n) ──Done──▶ SET(partner, n)            within a pair, no rest
SET(item, n) ──Done, pair complete──▶ REST(next)
REST(next) ──Done (logs next)──▶ …                rest ends by logging
REST(next) ──timer 0──▶ REST_OVERRUN(next) ──Done──▶ …
SET(item, final) ──effort tap──▶ (partner final or REST or next block)
SET(timed) ──Start──▶ LEAD_IN ──▶ COUNTDOWN ──0 or Stop──▶ logged
any ──Stop: symptom──▶ next item (banner)
last set logged ──▶ FINISH_STEP ──any tap──▶ COMPLETED
any ──⋯ End session──▶ FINISH_STEP (with Back to workout)
```

### 8.4 Set logging

| State | Action | Result |
|---|---|---|
| FOCUSED (planned values shown) | Done | LOGGED as shown |
| FOCUSED | − / + / weight chip | values change; FOCUSED |
| FOCUSED (final) | effort tap | LOGGED + effort |
| FOCUSED (calibrate, external load) | weight chip → Done | LOGGED; line created at completion from the last completed set (§H.7) |
| LOGGED | Undo within 5 s | FOCUSED (values restored; effort cleared) |
| LOGGED | edit in Details set list | LOGGED (edited) |
| PLANNED | session ended | SKIPPED |

Stored per set: `set_no`, `side`, `load`, `reps` or `seconds`, `is_working` (warm-up sets false; ramp sets are never logged), `logged_at` (extension). Changing load on a non-calibrate item makes the exposure non-evidence (§H.2); the UI states it once and never asks why.

### 8.5 Rest

`IDLE → RUNNING (pair complete) → OVERRUN (0) → ENDED (next set logged)`; ±15 s adjusts RUNNING; End session or Stop ends it. Not persisted beyond the end timestamp.

### 8.6 Swap

```
IDLE ─Swap─▶ OPTIONS (up to 3 from engine)
OPTIONS ─context chip (station busy | equipment all)─▶ OPTIONS (re-requested, EI-01)
OPTIONS ─equipment: just the weight─▶ weight strip (no swap)
OPTIONS ─More options─▶ OPTIONS (next in ordered list, cycling, §E.6)
OPTIONS ─Show held → pick → confirm─▶ APPLIED (hold unchanged)
OPTIONS ─tap option─▶ APPLIED
APPLIED: original SWAPPED_OUT (keeps logged sets); new item planned with engine prescription; swap_type USER_SWAP
APPLIED ─Undo (until first set on new item)─▶ IDLE
APPLIED strip chips (optional, until first set logged):
   Don't like it → SET_PREFERENCE DISLIKE (original)      Uncomfortable → UNCOMFORTABLE (original)
   Form → TECHNIQUE_DIFFICULTY (original)                 Keep as my regular → USER_REPLACE (swap_type USER_REPLACE)
```
The order of options is the engine's; context chips only change the engine's inputs; post-swap chips only write flags or events (D-069 routing retained).

---

## 9. Component inventory

| Group | Components (variants) |
|---|---|
| Shell | Tab bar (hidden in focus mode) · Top bar · Resume bar · Sheet (bottom sheet on iPhone; panel/popover on iPad and desktop) · Undo chip (above primary) · Inline notice · Confirm dialog (outside focus mode, plus held-exercise choice) · Offline indicator · Empty / error / loading states |
| Today | Alloy prompt card · Normal-day minutes row (chips that build) · Tier hint line · Something's-different panel · Plan list (block rows, notice lines, More) · Summary list (next-time rows, inline effort chips) |
| Focus mode | Info header (elapsed, remaining, block progress, Lighter-day tag, ⋯) · Pair strip · Exercise title + set dots · Reps control (− value +; L/R variant) · Weight control + chip strip (list / ±step / keypad Other) · Last-time line · Conditional line · Secondary row (Swap, Details, ⚑, R fade) · Primary button (Done / Pick a weight / Start N s / Stop / Warm-up done) · Effort bar (4 buttons; L/R two-row variant) · Rest display (countdown, next line, overrun) · Timed-set lead-in · Stop banner · Finish step |
| Sheets | Details (Why 3 lines + More, last times, set list editor, How-to, About, note) · Swap (context chips, option rows, More, Show held, post-swap strip) · Report (large rows with one-line consequence) |
| Log Alloy | Date chips · Details line (time, focus, length) · Save / Save + add · Slot list with focus · Recents grid · Search results · Pattern chips · Dose chips · Weight chips · Coach notes field · Dictate text box + match preview · Effect line |
| History | Week strip · Patterns list · Filter chips · Session row · Recent exercises row · Exposure table · Status line · Resolve control |
| Equipment | Equipment row · Availability control · Load-list editor · Impact warning · Confirm-at-the-gym question page |
| Profile | Section list · Rule row · Review row · Question row · Settings rows |

---

## 10. Explainability

### 10.1 Why (Details, and plan view)

Three lines from §J.3 templates: **movement** (family reason), **exercise** (selection reason), **today's dose** (progression code). "More" (plan view and History; collapsed in focus mode) adds: Also considered (next 3 + every held/excluded option in the family), Recent training that mattered, Your rules applied (and pending ones not applied), Progress on this exercise, Pairing (straight sets and why), Where this comes from (provenance + "Choice and dose: this app's rules"). Technical details adds codes and the generation id.

### 10.2 Plain reasons for alternatives and swap options (UI copy, SYSTEM_DESIGN)

| Outcome | Text | | Outcome | Text |
|---|---|---|---|---|
| HF-01 | Excluded by your rule: {label} | | HF-10 | Already in today's session |
| HF-02 | On hold until you decide the plank-position question | | HF-11 | Done {today · yesterday} |
| HF-03 | Excluded by a rule you adopted: {label} | | HF-12 | Legs trained {n} h ago; heavier lower-body lifts wait 24 h |
| HF-04 | On your avoid list | | HF-13 | Lighter day: explosive exercises skipped · familiar exercises first |
| HF-05 | You said your {region} is too sore today | | HF-14 | Jumping exercises are off until you set a preference |
| HF-06 | Needs equipment that's {not available · unconfirmed · unavailable today} | | LOST(K0) | Your regular exercise for the other lift slot |
| HF-07 | On hold for your review ({cause}) | | LOST(K1) / (K2) | {winner} is marked as liked / Marked as disliked |
| HF-08 | Needs a capability you haven't confirmed: {prereq} | | LOST(K3) | Works your right triceps more |
| LOST(K4) | No weight history yet | | LOST(K5) | Used more recently |
| LOST(K6) | Alloy library exercises come first | | LOST(K7) | Later in your approved starting order |
| DRAW | Chosen by today's variety rotation (core, carry, and mobility only) | | Same exercise, other implement | Same exercise with {implement}; won't count toward progress today |

Swap option lines use the positive form of the deciding key (e.g., "Used less recently," "Next in your squat options," "Same exercise, dumbbell").

### 10.3 Next-time copy (summary)

| Decision | Text |
|---|---|
| REPS_UP | 40 × 9 (one more rep) |
| CONFIRM_TOP / LOAD_UP | 45 × 6 (heavier) |
| EXTEND_RANGE | 40 × 11 (no heavier weight confirmed; more reps) |
| HOLD | stays 40 × 8 |
| HOLD(REDUCE_LIMIT) | stays 35 × 8 · lowered once already, in Needs review |
| REDUCE | 35 × 8 (lighter) |
| CALIBRATE / SEEDED | starting point 40 × 8 |
| RETURN / IMPLEMENT_CHANGED / NOT_EVIDENCE | didn't count: {effort not rated · weight changed · lighter day · below-usual day · sets not logged · uncomfortable · re-based on new equipment} |
| LOAD_CAPPED | at the heaviest confirmed weight; your regular exercise changes next time |

### 10.4 Other explanation points

Plan notice lines (session-level decisions), the Alloy effect line (EI-05), the equipment impact warning (EI-06), and History keeping each session's Why as generated.

---

## 11. Error, empty, and edge states

### 11.1 No session (§I.2)

| Reason | Sentence | Action |
|---|---|---|
| USER_SKIP | "Rest day. Nothing changes." | Log Alloy · Log other session |
| TOO_SHORT | "{n} minutes is shorter than the shortest session this app plans (15 min). Short mobility sessions aren't set up yet." | Change |
| NO_BLOCK_A | "Nothing can fill the first strength pair today." + blocked families with reasons and unblocking questions | Change · Open questions · Equipment |
| VALIDATION_FAILED | "The plan didn't pass its own checks, so it isn't shown." | Change · Export |

### 11.2 Empty states

| Where | Shown |
|---|---|
| Today, metadata not ready | NOT_READY text (§4.1) |
| Today, cold start | "First sessions are shorter while the app learns your weights." (one line on the plan) |
| Focus, never done | Last-time line: "First time" |
| Focus, done only at Alloy | "At Alloy Mon: 3 × 10 @ 35 (not used for targets)" |
| Details, no cues | "No published cues. Source ▸" |
| History, empty | "Nothing logged yet. Log an Alloy class or finish a session." |
| Log Alloy, no recents | Search field focused; the grid appears after the first logs |
| Needs review / Coach notes empty | "Nothing needs your review." / "Coach changes you log with Alloy sessions appear here." |

### 11.3 Training-time edge cases

| Situation | Behavior |
|---|---|
| Phone locks mid-rest | Wake lock normally prevents it; if locked, reopening shows the correct remaining or overrun time |
| App reloaded or crashed | Returns to the focused set; nothing lost |
| Offline in the gym | Everything in focus mode works; "Saved on this device" indicator (D-078) |
| Offline at check-in | If generation can't run on device: "Can't build a plan offline." Logging still works. Preferred: on-device generation |
| Double tap on Done | Second tap ignored within 800 ms |
| Wrong set logged | Undo chip (5 s) or edit in the Details set list |
| Rack taken, nothing else fits | Swap shows "Nothing else fits this pair right now" → Skip this exercise · Keep original |
| Partner exercise stopped or skipped | Remaining item runs as straight sets |
| Session runs past midnight | Continues; real times used; the plan keeps its start date |
| Device time zone differs from profile | One-line notice on Today, not in focus mode (D-073) |
| Storage write fails | Blocking banner (the one allowed interruption): "Couldn't save. Export a backup now." |
| Engine refuses to load (V-00e) | NOT_READY with "Exercise data has a configuration error" |
| Alloy log for a future date | Disabled |
| Alloy log saved while a plan is showing | "Plan made before your Alloy log. Update plan?" |

---

## 12. Responsive and physical context

### 12.1 iPhone, portrait (primary)

- Focus mode as §5.1. Primary button ≥ 72 pt tall, full width minus 16 pt margins, above the home indicator. Secondary controls ≥ 48 pt.
- Reps and weight ≥ 48 pt; rest countdown ≥ 96 pt; exercise name ≥ 24 pt. Supports Dynamic Type up to accessibility sizes by wrapping the name and keeping reps/weight at their minimum size.
- Screen wake lock during focus mode where supported. Runs in Safari and installed to the Home Screen.
- Sound for rest end requires one user gesture to unlock audio; the Start tap provides it.

### 12.2 iPhone on a bench (landscape or portrait)

- Landscape focus mode: left half shows name, set, reps, weight, last time; right half shows the primary button (full height of the lower two-thirds) with secondary buttons above it. Rest countdown fills the left half.
- Portrait on a bench works unchanged; the primary button is the only large target needed.

### 12.3 iPad (secondary)

- Focus mode centered at ≤ 640 pt width with the same layout; in landscape, a left column shows the block list (A, B, C, F with item status) as information only.
- History, Equipment, Profile: list on the left, detail on the right. Sheets become centered panels.
- Hardware keyboard: Return = Done; arrow keys adjust reps.

### 12.4 Desktop (occasional)

- Two-pane layouts, max ~1100 px. Best for detailed Alloy logging after the fact (the dictate/type box works well with a keyboard), equipment confirmation, and reviewing History.
- Focus mode works but is not optimized.

### 12.5 Accessibility

VoiceOver labels on every control, including the rest state ("Rest, 45 seconds left, next Goblet Squat set 3"). Color never carries meaning alone (overrun also shows "+" and text). Reduced motion respected.

---

## 13. Engine boundary (carried forward, unchanged)

### 13.1 Interface

| ID | Call / query | Status |
|---|---|---|
| EI-01 | SWAP_OPTIONS(generation_id, slot, today_issues[], busy_stations[]) → same-exercise-other-implement, or ordered substitutes with prescriptions, one-line reasons, and held options with reasons (§E.6, §N, HF-06) | **Clarification pending confirmation.** The swap reason is no longer sent: this design writes reasons as flags or events after the swap, so they cannot affect ranking. |
| EI-02 | GENERATE(check_in) → Q.10, Q.11, or NO_SESSION | Existing |
| EI-03 | COMPLETE(session_log) → decisions per item and side, holds, rotations, credits | Existing |
| EI-04 | REBUILD() (§B.1) | Existing |
| EI-05 | ALLOY_EFFECT_PREVIEW(log) → credits, next-day exclusions, heavy-lower time | Read-only projection |
| EI-06 | EQUIPMENT_IMPACT(equipment_id) → lines on that implement | Read-only |
| EI-07 | SERVABILITY() → unservable families and unblocking questions | Existing computation |
| EI-08 | Line and exposure queries | Read-only |

### 13.2 ECR-01 (still PROPOSED, D-079)

Flag actions for STOPPED_SYMPTOM and UNCOMFORTABLE (§H.4) should apply to every item that carries the flag, including items with zero completed sets, warm-up items, and items without a progression line (only hold and streak effects; nothing else changes). Engine 0.2.2 with AT-29 to AT-31. This design makes the case stronger: the two-tap stop (§5.7) and the post-swap "Uncomfortable" chip (§5.9) both frequently land on items with no logged set. Until approved, the consequence text says "Recorded" in those cases.

### 13.3 Observations (Phase 8)

| ID | Observation |
|---|---|
| OBS-01 | Lowering weight mid-exercise because it is simply too heavy makes the exposure non-evidence, so the next prescription repeats the weight; only "Form was hard to keep" lowers it. |
| OBS-02 | Pre-filled values may overstate performance if confirmed without editing. Watch the share of sets logged exactly at target. |
| OBS-03 | The final-set effort tap should keep effort coverage high; measure the unrated rate. |
| OBS-04 | Weekly frequency tolerance with Alloy remains UNRESOLVED (§S). |
| OBS-05 | A plan made on a class day does not know class is coming (FUTURE). |
| OBS-06 | With D-082, sleep and fueling are recorded mostly on "different" days, which biases any later look at them. The setting exists if OQ-02 needs daily data. |

---

## 14. Data stored beyond engine contracts

Ignored by the engine and by replay.

| Record | Extensions |
|---|---|
| Q.4 CHECK_IN | `normal_day_shortcut` |
| Q.5 SESSION_LOG | set `logged_at`; item `note`; session `note`; warm-up completed; pre-start swap draft |
| Q.6 ALLOY_SESSION_LOG | item `slot_label`, `is_finisher`, `dose_text`, `coach_modified`, `coach_note`, `coach_note_reviewed`; session `coach_notes`, `duration_known`, `entry_mode` (chips · typed · dictated) |
| Q.7 OTHER_TRAINING_LOG | `environment` = OTHER_MANUAL; items with `dose_text` |
| Settings | time zone, units, sound, ask-sleep-and-fueling, technical details, setup completed, Alloy schedule edits (config), `default_order` approval record |

Personal Alloy logs are training history, never research evidence (D-015, D-071).

---

## 15. Not in V0

**Programming (FUTURE/UNRESOLVED in the engine):** generation outside the apartment gym (including travel); weekly targets, periodization, programs; forward use of the Alloy schedule; mobility-only or conditioning sessions; resuming a regenerated partial session; set, tempo, ROM, or complexity progression; progression trees; sessions above the 45-minute plan; reading OTHER logs; upper-body or weekly fatigue models.

**Training-time extras:** per-set RPE or RIR; plate calculator; 1RM estimates; tempo cues; voice commands; Apple Watch or other wearables; haptics or background alarms; gesture-only controls; reordering blocks or exercises; adding exercises to a generated session; custom workouts; a shuffle button; choosing substitutes outside the engine's list.

**After-the-fact extras:** photo or whiteboard capture of Alloy workouts; importing Alloy programs; charts, totals, streaks, badges, PRs, weekly reports.

**Health and body:** symptom tracking, medical monitoring, medications, body weight, measurements, nutrition, sleep tracking beyond the optional check-in answer (Health Project, D-017).

**Profile editing:** goals, constraints, and B1–B6 answers stay in the versioned PERSONAL files.

**Platform:** accounts, multi-device sync, sharing, social, coach access, push notifications, AI chat or avatars, custom themes (system light/dark only).

**Evidence:** personal Alloy logs as ALLOY_OBSERVED; any text attributing the app's rules to Alloy.

---

## 16. Decisions

### 16.1 Status of D-064 to D-079

| ID | Status in this spec |
|---|---|
| D-064 Five tabs | Retained; **amended** by D-083 (tab bar hidden in focus mode) |
| D-065 Apartment-only generation | Retained |
| D-066 Two equipment-change scopes | Retained |
| D-067 Four-level effort, no RPE | Retained |
| D-068 Pre-filled set rows | Retained for pre-fill; **per-row ✓ superseded** by D-084 |
| D-069 Swap reasons route to engine inputs | Retained for routing; **reason-first order superseded** by D-088 |
| D-070 Alloy save first, enrich later | Retained; **extended** by D-091 |
| D-071 to D-078 | Retained |
| D-079 (ECR-01) | Still PROPOSED |

### 16.2 New decisions (SYSTEM_DESIGN)

| ID | Decision | Rejected alternative |
|---|---|---|
| D-080 | PRODUCT_UX_SPEC_V0.md is the canonical, self-contained product UX spec; PRODUCT_V0_APP_SPEC_v0_1.md is history. | Keep both as partial sources |
| D-081 | Normal-day check-in: under the line "Feeling as usual today," a minutes chip builds the plan. The tap answers R-01 and R-06 = no; R-02, R-04, R-05 default and are recorded as defaulted. | Four-tap form every day |
| D-082 | Sleep and fueling (recorded-only) appear only in "Something's different," unless the setting asks every time. | Asking daily questions that never change the plan |
| D-083 | Focus mode: one exercise at a time, large type, tab bar hidden, details on demand. | Full exercise cards during sets |
| D-084 | One fixed, full-width Done button logs the focused set; it states what it logs; 800 ms debounce; Undo instead of confirmation. | Per-row ✓ buttons |
| D-085 | The final working set is logged by tapping its effort (two rows for per-side items). | Separate effort tap |
| D-086 | Rest starts automatically, ends when the next set is logged, shows the next exercise and equipment, counts up after zero, never alarms or opens a dialog. | Docked timer with Skip |
| D-087 | Weight entry by chips (confirmed loads or ±5 lb within the confirmed maximum); changes carry to the remaining sets of that exercise; keypad only via "Other." | Numeric keypad per set |
| D-088 | Swap shows engine options first; one tap applies; context chips (station busy, equipment missing) re-request; reasons and "keep as regular" are optional chips afterward. | Reason, then options, then confirm |
| D-089 | Symptom stop is two taps with no dialog; the exercise ends, the session moves on, a banner carries the note and end-session options. | Explanation sheet and follow-up choices |
| D-090 | Finish is one tap on the capacity question (or Skip); the summary is Today's completed state; unrated efforts can be added later (edit + replay). | Missing-data sheet, note, Finish, Done |
| D-091 | Alloy detailed logging is names first: recents grid with auto-advance, search with aliases, optional dose and weight chips, one session-level coach-notes field, and a type-or-dictate fallback. | A typed form per exercise |
| D-092 | No dialogs or confirmations in focus mode except choosing an exercise on hold. Outside focus mode, confirmations only for clearing a hold, discarding a session, deleting logs, and import. | Confirmations on swaps, stops, ends |
| D-093 | Physical ergonomics are requirements: primary ≥ 72 pt, controls ≥ 48 pt, bottom-60% reach, glanceable sizes, wake lock, landscape bench layout. | Standard app sizing |
| D-094 | Timed sets: one Start with a 3-second lead-in, auto-log at target, Stop logs actual; per-side runs both sides under one Start. | Start and confirm per side |
| D-095 | Warm-up is the first focus step (one tap); blocks auto-advance; ramp sets are a text line, not logged rows. | Separate warm-up screen and block start buttons |

### 16.3 Confirmations needed

1. **ECR-01 (D-079):** approve both flags, STOPPED_SYMPTOM only, or reject.
2. **EI-01:** confirm swap requests carry today's added issues and busy stations; reasons are no longer part of the request.
3. **D-081:** confirm that tapping a minutes chip under "Feeling as usual today" is an acceptable answer to the unwell/different question. If you want that question answered separately every time, the normal-day path becomes 2 taps.
4. **D-082:** confirm sleep and fueling move off the default path.

---

## Appendix A. Pre-build checklist (from spec §S)

| Blocking item | Closed by |
|---|---|
| Author EXERCISE_METADATA; pass V-00a–g | Data work; rejected rows visible in P-09 |
| Approve `default_order` | T-00 step 2 |
| Equipment load lists, `max_confirmed_load`, station groups (UQ-G02, G04, G05) | T-00 step 1 / E-02 |
| UQ-G01 pull-up / chin-up capability | P-07 |
| B3, B4a, B5, B6 | PERSONAL files; B6 logging mode answered in practice by D-070/D-091 |

**Build order:** Log Alloy, History, and Equipment first (no metadata needed), so Alloy classes accumulate as history before the first generated session; then Today and focus mode.
