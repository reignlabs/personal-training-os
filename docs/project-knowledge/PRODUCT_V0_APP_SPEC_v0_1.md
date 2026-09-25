---
file: PRODUCT_V0_APP_SPEC_v0_1.md
class: PRODUCT (SYSTEM_DESIGN)
status: DRAFT for review
product_spec_version: 0.1
updated: 2026-09-24
engine_baseline: ENGINE_WORKOUT_GENERATOR_V0_2_1.md (engine 0.2.1, config 0.2.0), unchanged by this document
acceptance_baseline: GENERATOR_ACCEPTANCE_TESTS_V0_2.md + AT-26 to AT-28 (spec §W)
reads: PERSONAL_user_profile.yaml (USER_PROFILE_V0 draft 0.1), PERSONAL_constraints.yaml, equipment_library.json,
       exercise_equipment_availability.json, claude_v0-exercise-db_canonical_exercise_schema.json,
       claude_v0-exercise-db_system_metadata_schema.json, claude_v0-exercise-db_alias_table.csv
decisions: proposes D-064 to D-078 (product layer) and one engine change request, ECR-01 (proposed D-079). See §15 and DECISION_LOG_addendum_D064-D079.md
---

# PRODUCT: Personal Training OS V0 (mobile-first web app)

## 0. Summary

**What this document is.** The V0 product design around the frozen generator (engine 0.2.1): information architecture, journeys, screens, components, state machines, lifecycles, error/empty states, responsive behavior, and the V0 boundary. It contains no code.

**Core promise (every screen is judged against it).**
OPEN APP → UNDERSTAND TODAY'S SESSION → START TRAINING QUICKLY → LOG WITH MINIMAL FRICTION → FINISH → UPDATE TRAINING STATE.

**Generator logic is not changed.** The UI never selects, ranks, or filters exercises. It collects inputs, calls the engine, renders its output and its generation record, and writes logs and events in the engine's contracts (§Q). Three kinds of engine-facing items came out of this design:

| Item | Type | Status | Why it matters |
|---|---|---|---|
| **ECR-01** Flag actions (STOPPED_SYMPTOM, UNCOMFORTABLE) apply even when the item has zero completed sets or no progression line | Engine change request (FIXED rule, §K) | **PROPOSED, needs your approval.** Product-blocking for the discomfort flow | Today, §K applies flags only to performed items that have a line. A person who stops on the first rep, or during a mobility drill, would see "held until you review" and the hold would not happen. This is the one genuine product-blocking issue found. §12.2 |
| **EI-01** Swap requests carry today's context (equipment newly unavailable, stations busy) | Interface clarification, no rule change | Needs confirmation | §E.6 says "the same ordered list"; §N already restricts mid-session swaps by busy station, and HF-06 already consumes today's issues. The UI needs this stated as the swap input. §12.1 |
| **D-065** Generation runs for the apartment gym only in V0; OTHER / MANUAL is a logging-only environment | Product scope decision | Proposed | Under M-20 (§H.7 re-base), treating another gym's equipment state as the equipment state would permanently re-base progression lines. Multiple gyms stay FUTURE (§S). §2.3 |

Everything else in this document is product-layer SYSTEM_DESIGN (decisions D-064 to D-078, §15).

**Evidence discipline in the product.** Every programming rule the app applies is SYSTEM_DESIGN (spec §0, §O). The UI may say an *exercise* comes from Alloy's public library (its `evidence_basis`), and that the *session template* (prep → paired strength blocks → optional finish) is inspired by Alloy's documented template (AF-04, AF-05). It never says that a selection, dose, or progression decision is Alloy's programming. Nelson's own Alloy class logs are personal training history, not research evidence (D-015, D-071).

**Recommended build order (implementation partner note).** Log Alloy, History, and Equipment confirmation do not depend on authored EXERCISE_METADATA. Building them first lets Alloy sessions accumulate as history before the first generated workout, which shortens the cold-start period (§M) and closes the equipment items that block implementation (§S). Today (generation) follows once metadata is authored and `default_order` is approved.

---

## 1. Product rules that govern every screen

| # | Rule | Source |
|---|---|---|
| PR-1 | The engine decides architecture, exercises, substitutes, doses, and progression. The UI never re-orders, hides, or adds candidates. | Product principle; D-030 |
| PR-2 | Every item on screen can answer: why this movement, why this exercise, what recent training mattered, what was rejected, what progression state applied. The answer comes from the generation record (§J.1), never re-derived by the UI. | Charter; §J |
| PR-3 | Required input is minimal: minutes available and the unwell gate (R-01, R-06). Everything else has a default and is recorded as defaulted. | §A.3, §M |
| PR-4 | Nothing is lost. Every set, flag, check-in answer, and Alloy entry is persisted the moment it is entered. No "save" buttons during training. | D-078 |
| PR-5 | Incomplete is acceptable. Missing effort, missing loads, and partial Alloy logs are stored. The UI says what an omission costs ("won't count toward progress") and never blocks finishing. | §M; brief |
| PR-6 | Health minimization. No diagnoses, medications, recovery factors, or CONTEXT items appear anywhere in the V0 UI. Constraints appear by their plain label and programming effect. Symptom text is recorded, never interpreted. | §0 Health; D-006, D-017, D-074 |
| PR-7 | Evidence labels are honest: exercise provenance may cite Alloy; rules never do. | §0 Evidence; D-002 |
| PR-8 | Randomness is invisible and irrelevant to the user. The only seeded choice (§E.4, core/carry/mobility/accessory ties among never-used exercises) is explained as "variety rotation" if it decided anything. | §E.4 |
| PR-9 | One primary action per screen, reachable with the right thumb on iPhone. | UX |

---

## 2. Information architecture

### 2.1 Navigation model (D-064)

Bottom tab bar, five items, always visible except during an active set entry keyboard:

| Position | Tab | Kind | Why it is top-level |
|---|---|---|---|
| 1 | **Today** | Place | The core loop. Default tab on open. |
| 2 | **History** | Place | Answers "what did I do / when / am I progressing." |
| 3 (center, emphasized) | **Log Alloy** | Action (opens a sheet over the current tab) | Three times a week, must be the fastest path in the app, and must work from anywhere, including mid-scroll in History. Logging is a task, not a place. |
| 4 | **Equipment** | Place | Needed often during setup (it closes blocking items in §S) and whenever the gym changes. Can fold into Profile after V0 if rarely used. |
| 5 | **Profile** | Place | Programming-relevant goals, rules, preferences, reviews, open questions, data. Carries a badge when something needs review. |

Model rules:
- Push navigation within a tab; sheets for tasks (check-in, swap, flag, Why, how-to, Log Alloy).
- An active workout pins a "Resume session" bar above the tab bar on every other tab.
- Deep links are internal only (e.g., from a History row to exercise detail).

### 2.2 Hierarchy

```
Today
├── First-run setup (once) ........ T-00
├── Today home (state-dependent) .. T-01
│   ├── Check-in (sheet) .......... T-02  (+ Alloy attendance prompts, T-03)
│   ├── Session overview .......... T-04
│   │   └── Why / Swap / How-to sheets (T-07, T-08, T-09)
│   ├── Warm-up ................... T-05
│   ├── Training (block view) ..... T-06  (+ rest timer T-10, flag sheet T-11, effort T-12)
│   ├── Finish .................... T-13
│   ├── Session summary ........... T-14
│   ├── No session ................ T-15
│   └── Unfinished session prompt . T-16
History
├── Feed (week strip, patterns, list) ... H-01
├── Apartment session detail ........... H-02
├── Alloy session detail ............... H-03
├── Exercise detail .................... H-04
├── Exercise search .................... H-05
└── Other/manual session detail ........ H-06
Log Alloy (sheet from any tab)
├── Quick log ..................... A-01
├── Exercises by slot ............. A-02
├── Exercise picker ............... A-03
└── Saved + effect preview ........ A-04
Equipment
├── Environments .................. E-01
├── Apartment gym list ............ E-02
├── Equipment item ................ E-03
└── Other / manual ................ E-04
Profile
├── Profile home .................. P-01
├── Goals ......................... P-02
├── Schedule & sessions ........... P-03
├── Movement rules ................ P-04
├── Exercise preferences .......... P-05
├── Needs review .................. P-06
├── Open questions ................ P-07
├── Coach notes ................... P-08
└── Data & system ................. P-09
```

### 2.3 Environments (D-065)

| Environment | V0 role | Engine relationship |
|---|---|---|
| **Apartment gym** | The only environment the generator plans for. | Equipment state (Q.3) is the engine input. |
| **Other / manual** | Log a session done elsewhere (hotel gym, home DailyArms/DailyAbs, a walk). Free-form exercises and sets. | Stored as OTHER_TRAINING_LOG (Q.7). **Not read by the engine in V0** (UNRESOLVED B2). Shown in History with the tag "Not used for planning." |
| **Alloy studio** | Not an equipment environment. Logged through Log Alloy. | ALLOY_SESSION_LOG (Q.6), credited per §L.3. |

Why generation is apartment-only: §H.7 re-bases a progression line when its implement is "not AVAILABLE in the equipment state (not merely today's issue)." If a second environment were fed in as the equipment state, every line whose implement that environment lacks would be permanently re-based after one session there. Supporting generation elsewhere needs per-environment equipment state and a home-environment rule for re-basing. That is an engine change and stays FUTURE (§S "multiple gyms").

---

## 3. UI vocabulary (display mapping; engine codes are never shown unless Technical details is on)

### 3.1 Movement families

| Engine family | Display name | Short chip |
|---|---|---|
| KD | Squat / lunge | Squat |
| HD | Hinge | Hinge |
| HPUSH | Push (horizontal) | Push |
| VPUSH | Push (overhead) | Overhead push |
| HPULL | Pull (row) | Row |
| VPULL | Pull (vertical) | Vertical pull |
| ANTI_EXT | Core: resist arching | Core |
| ANTI_ROT | Core: resist twisting | Core |
| ANTI_LAT | Core: resist side-bending | Core |
| CARRY | Carry | Carry |
| GOAL_ACCESSORY | Arms & shoulders accessory | Accessory |
| MOBILITY | Mobility | Mobility |
| CONDITIONING | Conditioning | Conditioning |
| Parent LOWER / PUSH / PULL | Lower body / Push / Pull | |

### 3.2 Roles

| Role | Display |
|---|---|
| PRIMARY | Main lift |
| SECONDARY | Second lift |
| CORE / CARRY / ACCESSORY / MOBILITY / CONDITIONING | Core / Carry / Accessory / Mobility / Conditioning |

### 3.3 Prescription and line state chips

| State (§G.3, §H) | Chip | One-line meaning |
|---|---|---|
| CALIBRATE | First time | "Pick a weight where {target} reps feel good. You can change weight between sets." |
| SEEDED | Starting point | "Starting from your {load} on the {other role} version." |
| BUILDING | Building | "{load} × {target}." |
| RETURN | Welcome back | "Same as last time after a break; this one won't count toward progress." |
| IMPLEMENT_CHANGED | Different equipment | "Use a similar weight; this won't count toward progress." |
| LOAD_CAPPED | At the top weight | "You've outgrown the heaviest confirmed weight; extended reps." |
| (LIGHT posture) | Lighter day | "2 sets each. Today won't change your targets." |

### 3.4 Effort and flags (from PERSONAL_user_profile.yaml DURING_WORKOUT_FEEDBACK)

| Code | Button label | Helper |
|---|---|---|
| TOO_EASY | Too easy | |
| GOOD | Good | |
| HARD | Hard | "The target effort, with good form" |
| TOO_HARD | Too hard | |
| UNCOMFORTABLE | Uncomfortable | "Optional: where" |
| STOPPED_SYMPTOM | Stopped: symptom | "Optional note. The app records it and doesn't interpret it." |
| TECHNIQUE_DIFFICULTY | Form was hard to keep | |
| RIGHT_ARM_FADE | Right arm faded at rep __ | Per-side items only |
| EQUIPMENT_ISSUE | Equipment problem | "Keeps equipment problems separate from the exercise." |
| DISLIKE / PREFER | Don't like it / Like it | |
| SESSION_CAPACITY | Below usual / Usual / Above usual | Post-session, optional |

**No numeric RPE in V0 (D-067).** The brief lists "RPE / difficulty." The engine's evidence contract (§H.2, §H.3) reads one four-level effort rating per exercise (per side where required). A per-set RPE would add a tap per set and nothing reads it.

### 3.5 Exercise provenance tag (PR-7)

| `evidence_basis` | Tag text |
|---|---|
| ALLOY_LIBRARY | From Alloy's public exercise library |
| ALLOY_LIBRARY_ADAPTED | Alloy library exercise, adapted to your gym: {executed_as} |
| SUPPLEMENTAL | Added by you (not from Alloy) |

Session-level line, shown once in the Why sheet: "Session structure (warm-up, paired strength blocks, optional finish) is inspired by Alloy's published template. Exercise choice, sets, reps, weights, and progression are this app's own rules."

---

## 4. User journeys

Tap counts assume defaults are accepted. "Engine" means a call into the generator or its completion processing.

### J1. First run (once)

1. Open app → T-00 Setup. Four short steps, each skippable except step 3 (the spec requires `default_order` approval before first use, §Q.1.1).
2. **Equipment essentials:** the "Confirm at the gym" checklist (E-02 top section): rack bar path, adjustable cable pulley, incline bench setting, dumbbell top weight and increments, plate denominations, station groups. Unanswered items stay UNKNOWN and their exercises stay held (HF-06), which the app says plainly.
3. **Approve starting exercises:** for each servable family, the first two rows of `default_order` (starting anchors for the two main roles, K0) with name, how-to, and equipment. Approve, or reorder within the family. Approval writes the user-review step of `default_order` (§Q.1.1 criterion 6).
4. **Alloy schedule:** Mon / Wed / Fri 4:00 pm pre-filled from the profile. Confirm or edit (ALLOY_SCHEDULE, PARAM).
5. **Time zone and units:** America/Los_Angeles, lb. Confirm (D-073).
6. Land on Today home, state "Ready to check in," with a one-line cold-start note: "Your first sessions are shorter while the app learns your weights."

### J2. Standard apartment session (happy path)

1. Open app → Today home (Ready). Tap **Check in**.
2. Check-in sheet: tap **40 min**, tap **No** (unwell/different), tap **Build session**. Three taps, under 10 seconds.
3. Engine generates → Session overview (T-04): "About 38 min · Warm-up · A: Squat + Row · B: Hinge + Overhead push · C: Core + Carry."
4. Optional: tap any exercise → expanded card (dose, last time, Why, Swap, how-to).
5. Tap **Start session** (writes `started_at`, keeps the screen awake) → Warm-up (T-05): 3 min bike, two mobility items, ramp sets for A1/A2 listed. Tap **Start block A**.
6. Block A (T-06): A1 set 1 is focused, pre-filled "8 reps · 40 lb." Tap **✓**. Focus moves to A2 set 1. Tap **✓**. Rest timer starts (90 s).
7. Repeat. After A1's last set, the effort row appears: tap **Hard**. Same for A2.
8. Blocks B, C the same way.
9. Tap **Finish** → T-13: any unrated efforts listed (optional), then "Overall today vs usual?" tap **Usual** → **Finish**.
10. Engine completes (§K) → Summary (T-14): what was done, "Next time" per exercise, patterns counted. Tap **Done** → Today home (Completed).

Logging cost for a 6-item, 3-set session with no deviations: about 18 set taps + 6 effort taps + 2 finish taps.

### J3. Short or low-energy day

1. Check-in: **20 min**, unwell **No**, energy **Low** → Build.
2. Overview shows "Lighter day" badge and one line: "2 sets each; today won't change your targets." Tier 15–25 min gives block A only.
3. Train and finish as J2. Summary says "Lighter day: no progression changes."

### J4. Check-in after missed Alloy logging

1. Tuesday, check-in opens with a card: "Did you train at Alloy on Mon?" **Yes / No / Not sure**.
2. **Yes** → a summary Alloy log is created (full body, Mon 4:00–4:55 pm) and recovery is protected. A link "Add what you did" opens A-02 for that date later.
3. **Not sure** or closing the card → recorded as unknown, counts for recovery only, asked again within 72 hours.
4. Continue check-in as J2. The generated plan reflects the answer (lower body trained yesterday → heavy lower lifts deferred if within 24 h of the recovery end).

### J5. Station occupied mid-session

1. In block B, the rack is taken. On B2's card tap **Swap** → reason **Station busy**.
2. Engine returns options restricted to exercises whose station is free or NONE (§N, EI-01), first option shown with its dose and one-line Why.
3. Tap **Use this** → scope defaults to **Today only** (USER_SWAP). Item replaced, card notes "Swapped from {original}."
4. No option → choices: **Skip this exercise**, **Wait** (close sheet), or **Show held options**.

### J6. Equipment unavailable

1. Tap **Swap** → **Equipment unavailable** → "What's missing?"
   - **Just the weight I need** (e.g., the 40 lb kettlebell) → no swap. Load field opens with confirmed alternatives; choosing a different load adds EQUIPMENT_ISSUE. Card notes "Weight changed for equipment: this won't count toward progress." (§H.4)
   - **The whole piece** (e.g., all kettlebells) → the equipment is added to today's issues (HF-06). If the exercise has another option set (e.g., goblet squat with a dumbbell), the engine keeps the exercise with a different implement (IMPLEMENT_CHANGED, §N). Otherwise the engine returns substitutes (EI-01).
2. If the equipment is gone for good, the card links to Equipment → mark Not available (J12).

### J7. Dislike, discomfort, technique, "just want something else"

| Reason chosen | What the app records before asking the engine | What happens to the regular exercise |
|---|---|---|
| I don't like it | SET_PREFERENCE DISLIKE (Q.8) | Rotates at the next exposure of that slot if an alternative exists (§E.5, M-11); otherwise the "only option" note. |
| Uncomfortable | UNCOMFORTABLE flag on this item (optional location) | If sets were done: held progression, streak +1, second consecutive → review hold (§H.4). If no sets were done: see ECR-01. |
| Form is hard to keep | TECHNIQUE_DIFFICULTY | Next exposure one load step lighter (§H.4). |
| Weight is wrong (too heavy/light) | Nothing. Offers **Change weight** instead of a swap, with "changing weight means this won't count toward progress" | Unchanged. |
| Just want an alternative | Nothing | Unchanged (USER_SWAP never changes anchors, §E.1). |

In every case the substitute list comes from the engine (§E.6). The user may tick **Make this my regular exercise** (USER_REPLACE).

### J8. Stopping for a symptom

1. Mid-set, tap the flag button → **Stopped: symptom** → optional note.
2. Sheet: "This exercise will be held from future sessions until you review it in Profile. The app doesn't interpret symptoms. If something is new or worrying, follow your clinician's guidance." → **End this exercise** (remaining sets marked skipped).
3. Choice: **Continue session** or **End session** (→ J9).
4. Profile tab shows a review badge. Clearing the hold later is an explicit action (P-06).

### J9. Ending early, interruption, unfinished session

- **End early:** overflow → End session → T-13. Unlogged sets become skipped; only performed items count (§K).
- **App closed or phone locked mid-session:** everything logged is already stored. Reopening returns to the same set.
- **Next day, session never finished:** T-16 prompt: "You have an unfinished session from Tue." **Finish with what I logged** (ended_at = time of the last logged set, D-072) or **Discard** (nothing changes; logged sets are deleted after confirmation). The app never auto-completes.

### J10. Logging an Alloy session

- **10-second log (summary):** tap **Log Alloy** → date is pre-selected (today if it's a class day after 4 pm, else the most recent unlogged class day) → **Save**. One tap after opening. Focus defaults to full body.
- **90-second log (detailed):** after Save, the sheet shows slot rows A1, A2, B1, B2, C1, C2, Finisher. For each: type 2–3 letters, pick from recent Alloy exercises or the library (aliases included), type a dose like "3x10 @35", optionally toggle **Coach changed this** with a note. Every field autosaves. The log becomes detailed (FULL) with the first exercise.
- **Later enrichment:** open the log from History and add items; the summary is upgraded (same-date merge, §L.4).
- **Effect preview** after save: "Counts as full-body training on Mon. Tomorrow won't repeat: Goblet Squat, Kettlebell Row. Heavy lower-body lifts wait until Tue 4:55 pm."

### J11. "When did I last do X, and am I progressing?"

1. History → search icon → type "goblet" → Exercise detail (H-04).
2. Top: "Last done Tue Sep 22 (apartment) · Building: next 40 lb × 9." Status line: "Progressing: +1 rep last time."
3. Below: recent exposures table; separate "At Alloy" rows (not used for targets).

### J12. Permanent equipment change

1. Equipment → Dumbbells → Availability **Not available**.
2. Impact warning lists the exercises that track progress on dumbbells: "If they're gone for good, each one's next session re-bases on the new equipment and won't count toward progress. If they're only unavailable today, add them to today's check-in instead."
3. **Gone for good** (CONFIRM_EQUIPMENT) / **Only today** (today's issues) / **Cancel**.
4. If a plan exists for today and hasn't started: "Update today's plan?" → regenerate.

### J13. Reviewing a held exercise

1. Profile badge → Needs review → "Reverse Lunge: on hold since Sep 20 (you stopped for a symptom). Your note: '…'."
2. **Put back into planning** → confirm ("The app doesn't assess symptoms. Clearing puts this exercise back into planning.") → CLEAR_HOLD. Or **Keep on hold**.
3. Other review rows: "Lowered once already" (HOLD(REDUCE_LIMIT)) → **Mark reviewed** (CLEAR_REVIEW). "Stalled" and "Ready for a harder variant" are information only.

### J14. No session

Check-in returns NO_SESSION → T-15 with the reason sentence and the next step (§10.1). The user can edit the check-in (e.g., more minutes) or log something else.

### J15. Right arm worse today

1. Check-in: Right arm **Worse** → a follow-up appears: "Press today as usual, or swap pressing for core?" **As usual / Swap for core**.
2. Overview reflects the choice ("You chose to swap pressing for core today"). If as usual, pressing items may be swapped to lower-triceps options automatically, with the Why line stating it.
3. Per-side items show left and right fields; the right side of a triceps-involved exercise doesn't count toward progress today (§H.2), and the card says so.

### J16. Correcting a past log

1. History → session → **Edit** → change a load or rep → **Save changes**.
2. Notice: "Targets for affected exercises will be recalculated." Engine state is rebuilt by replay (§B.1, D-075). Already generated sessions are not altered (a plan made before the edit stays as it was; the next plan sees the correction).

---

## 5. Screen inventory

| ID | Screen | Tab | Presentation | Engine / data touchpoints |
|---|---|---|---|---|
| T-00 | First-run setup | Today | Full screen, 4 steps | Q.3 CONFIRM_EQUIPMENT, `default_order` approval, ALLOY_SCHEDULE, time zone |
| T-01 | Today home | Today | Tab root, state-dependent | Engine state summary, pending Alloy prompts, unfinished session |
| T-02 | Check-in | Today | Sheet (full height on iPhone) | Q.4 CHECK_IN → GENERATE |
| T-03 | Alloy attendance prompt | Today | Cards inside T-02 | §L.2 AL-? answers |
| T-04 | Session overview | Today | Push | Q.10 GENERATED_SESSION, Q.11 record |
| T-05 | Warm-up | Today | Push | PREP (§C.6) |
| T-06 | Training (block view) | Today | Push, focus mode | Q.5 SESSION_LOG writes |
| T-07 | Why this exercise? | Today, History | Sheet | §J.1 per-item record, §J.3 templates |
| T-08 | Swap | Today | Sheet, 3 steps | EI-01 swap request, Q.8 events |
| T-09 | How to do it | Today, History | Sheet | Evidence layer `documented_coaching_cues`, `source_ids`, `demo_ref` |
| T-10 | Rest timer | Today | Inline bar | Q.10 `rest_after_pair_s` |
| T-11 | Report (flags) | Today | Sheet | Q.5 `flags[]`, Q.8 SET_PREFERENCE |
| T-12 | Effort rating | Today | Inline row | Q.5 `effort` |
| T-13 | Finish | Today | Sheet | Q.5 `session_capacity`, `ended_at` |
| T-14 | Session summary | Today | Push (replaces T-06) | COMPLETE decisions (§K) |
| T-15 | No session | Today | Tab root state | NO_SESSION reason (§I.2) |
| T-16 | Unfinished session | Today | Modal on open | Q.5 partial log |
| H-01 | History feed | History | Tab root | Q.5, Q.6, Q.7, engine state timestamps |
| H-02 | Apartment session detail | History | Push | Q.5 + Q.11 |
| H-03 | Alloy session detail | History | Push | Q.6 |
| H-04 | Exercise detail | History | Push | Lines (§H.1), exposures, holds, preference |
| H-05 | Exercise search | History | Push | Evidence layer names, aliases, metadata |
| H-06 | Other/manual session detail | History | Push | Q.7 |
| A-01 | Log Alloy: quick | Log Alloy | Sheet | Q.6 SUMMARY |
| A-02 | Log Alloy: exercises by slot | Log Alloy | Sheet (expands A-01) | Q.6 FULL items + extensions (§13) |
| A-03 | Exercise picker | Log Alloy | Nested sheet / inline typeahead | Alias table, metadata `family` |
| A-04 | Saved + effect preview | Log Alloy | Inline in sheet | EI-05 read-only preview |
| E-01 | Environments | Equipment | Tab root | Environment registry |
| E-02 | Apartment gym equipment | Equipment | Push | equipment_library (descriptive) + Q.3 state |
| E-03 | Equipment item | Equipment | Push | Q.8 CONFIRM_EQUIPMENT, EI-06 impact query |
| E-04 | Other / manual | Equipment | Push | Q.7 entry |
| P-01 | Profile home | Profile | Tab root | |
| P-02 | Goals | Profile | Push | Profile GOALS, GOAL_PRIORITIES (read-only) |
| P-03 | Schedule & sessions | Profile | Push | ALLOY_SCHEDULE, SESSION_PREFERENCES, time zone |
| P-04 | Movement rules | Profile | Push | PERSONAL_constraints.yaml (read-only) |
| P-05 | Exercise preferences | Profile | Push | Q.8 SET_PREFERENCE, USER_REPLACE history |
| P-06 | Needs review | Profile | Push | `review_hold`, `reduce_locked`, stalls, notes |
| P-07 | Open questions | Profile | Push | Profile OPEN_QUESTIONS, §A.4 defaults, CONFIRM_CAPABILITY |
| P-08 | Coach notes | Profile | Push | Alloy log coach-modification extension |
| P-09 | Data & system | Profile | Push | Versions, `metadata_rejected`, export/import, rebuild |

---

## 6. Screen-by-screen requirements

Format: **Purpose · Entry · Content (top to bottom) · Actions · Rules.** "Must" items are V0 acceptance criteria for the screen.

### T-00 First-run setup

- **Purpose:** close what the spec says must be settled before first generation, without making the user read documents.
- **Entry:** first launch; also reachable from P-09 ("Run setup again").
- **Content:** step indicator (1 of 4); step bodies per J1.
- **Actions:** Continue, Skip (steps 1, 3, 4), Back.
- **Rules:** must not require answers to B1–B6. Must show, in step 2, which families are currently unservable and why (e.g., "Vertical pulling: needs you to confirm pull-up or chin-up ability"). If EXERCISE_METADATA is missing or fails to load (V-00e), setup ends at a notice: "Session planning isn't ready yet. You can already log Alloy sessions and set up equipment."

### T-01 Today home

- **Purpose:** in one glance, where today stands and the one next action.
- **States and primary action:**

| State | Shown | Primary action |
|---|---|---|
| NOT_READY (no metadata) | "Session planning isn't ready yet" + what's missing | Log Alloy |
| READY | Date; last apartment session ("Sat, 45 min"); patterns trained this week (chips); pending review count (if any) | **Check in** |
| PLANNED | Compact overview of the generated plan (blocks, minutes) | **Start session** (secondary: View plan, Edit check-in) |
| IN_PROGRESS | Current block and set | **Resume** |
| COMPLETED | "Done today · 41 min" + next-time highlights | View summary (secondary, overflow: Train again today → check-in) |
| NO_SESSION | Reason sentence | Edit check-in |
| UNFINISHED (earlier day) | T-16 modal on open | Finish / Discard |

- **Rules:** must not show analytics. Must show the Alloy-log shortcut only through the tab (no duplicate cards). An Alloy log saved while in PLANNED shows a banner: "Your plan was made before this Alloy log. Update plan?" (§L.4: logs never change an existing plan; regenerating uses them).

### T-02 Check-in

- **Purpose:** collect R-01…R-07, Alloy answers, and today's equipment issues in under 30 seconds.
- **Content (single scroll, in this order):**
  1. Alloy prompt cards (T-03), only if §L.2 triggers; max 3, newest first.
  2. **Minutes available*** chips: 20 · 30 · 40 · 45 · 60 · Other. Live hint below from the tier table (§C.3): "30 min: warm-up + 2 strength pairs." Nothing preselected.
  3. **Unwell or different from usual?*** No / Yes. If Yes: "How do you want to train?" Normal / Lighter / Skip today. Helper: "The app doesn't ask what or interpret it."
  4. **Energy** Low / Normal / High (Normal preselected).
  5. **Right arm vs usual** Worse / Same / Better (Same preselected). If Worse: "Press today as usual, or swap pressing for core?" As usual / Swap for core (As usual preselected).
  6. **Too sore to load?** None / Upper body / Lower body / Trunk (multi-select; None exclusive; None preselected).
  7. **Sleep last night** Poor / OK / Good (optional; tag "For your records").
  8. **Ate per plan 2–3 h before?** Yes / No (optional; tag "For your records"; hidden by config when OQ-02 closes).
  9. **Anything unavailable today?** collapsed row → equipment multi-picker.
- **Actions:** Build session (disabled until 2 and 3 answered; becomes "Skip today" when Skip chosen).
- **Rules:** untouched defaults are written to `defaulted_fields[]`. Must remember nothing across days except the Alloy prompt state (no pre-filled minutes). Must not display health wording beyond the profile's question text. Sticky primary button above the keyboard/tab bar.

### T-03 Alloy attendance prompt

- **Content:** "Did you train at Alloy on {Mon, Sep 21}?" Yes / No / Not sure; small ✕ to dismiss.
- **Rules:** Yes → Q.6 SUMMARY (source CHECKIN_PROMPT) + recovery credit; No → SKIPPED; Not sure or ✕ → UNKNOWN (recovery only, asked again within 72 h). After Yes, show inline link "Add what you did" (opens A-02 for that date after the check-in completes, not before).

### T-04 Session overview

- **Purpose:** understand today's session in 5 seconds, then start.
- **Content:**
  1. Header: "Today · about {duration_estimate_min} min" + badges: Lighter day, First sessions.
  2. Notices (0–n, one line each, tappable for detail): underfill sentence (§J.3), soreness/R-04b replacement, core-starvation swap, straight-sets block, "{n} movement types not planned yet" (unservable, collapsed; each with its unblocking question and a link to P-07 or E-02).
  3. Plan list: Warm-up row (general + 2 mobility + ramp note) · Block A, B, C, F. Each block shows "Paired" or "Straight sets." Each item row: exercise name, family chip, role label, dose ("3 × 8 @ 40 lb"; "3 × 8, pick a weight"; "2 × 30 s"), line-state chip, per-side icon if applicable.
  4. Tapping an item expands it: last time, target, rest, Why (3 lines), Swap, How to.
- **Actions:** **Start session** (sticky). Secondary: Edit check-in (regenerates). Overflow: Not training now (dismisses; nothing changes, §K).
- **Rules:** must never show an item that the record marks invalid (the engine never returns one, §I). Swaps here are allowed and are recorded when the session starts; USER_REPLACE applies at its event time.

### T-05 Warm-up

- **Content:** General warm-up (3 min, first available of spin bike / treadmill walk / elliptical) with a start/stop timer; two mobility items with seconds or reps/side and a checkbox each; ramp sets for A1/A2 as a preview ("Ramp: 20 lb × 6, 30 lb × 6, then working sets"), done on the A1/A2 cards.
- **Actions:** check items off (optional), **Start block A**.
- **Rules:** mobility items can be swapped (engine list); none of this is progression evidence. Skipping the warm-up is allowed and recorded.

### T-06 Training (block view): the core screen

- **Layout (iPhone):** top bar with elapsed time, "~{n} min left," block progress dots A · B · C · F, overflow (Session note, End session). Body: the current block as two stacked exercise cards (or one for straight sets / single item). Rest timer bar docks above the tab area. Swipe or tap block dots to view other blocks; the order of execution is fixed (§F.3), and the UI does not offer reordering.
- **Exercise card (see C-EXCARD in §7):** name + How-to icon; family chip + role label + provenance icon; prescription line ("3 sets × 8 reps @ 40 lb · rest 90 s after the pair"); last-time line; line-state chip; Why and Swap links; ramp rows (A1/A2 only, marked "warm-up sets, not logged as working"); working set rows; effort row after the last set; Report (flag) button; note field.
- **Set row behavior:** see §8.5. Pre-filled from the prescription; **✓** logs "as planned"; tapping a value opens a stepper with the numeric keypad. Per-side items show L and R values in one row; a small "fade at rep" control appears on the right side only.
- **Flow in a pair:** log A1 set n → focus A2 set n → log → rest timer starts → focus A1 set n+1. Straight-sets blocks: all sets of item 1 (rest between sets = the item's rest value, D-077), then item 2.
- **Timed sets:** the row becomes a countdown control (Start → running → auto-stop at target or tap Stop); the achieved seconds are logged.
- **CALIBRATE items:** load field empty with confirmed load chips (e.g., KB 25 · 30 · 35 · 40 · 45); the ✓ is disabled until a load is entered for external-load items. Load may change between sets without warning.
- **Load change on non-calibrate items:** allowed; card shows "Weight changed: this won't count toward progress." If the user lowers the load, a one-line prompt offers "Form was hard to keep?" (→ TECHNIQUE_DIFFICULTY) or "Equipment" (→ EQUIPMENT_ISSUE); ignoring it is fine.
- **Rules:** every tap persists immediately. Must keep the screen awake while IN_PROGRESS where the browser allows it. Must never block logging because of missing effort. Unit is lb.

### T-07 Why this exercise?

Specified in §9.

### T-08 Swap

Lifecycle in §8.6. Screens: (1) **Reason** (Station busy · Equipment unavailable · Don't like it · Uncomfortable · Form is hard · Weight is wrong · Just want something else); (2) **Options**: first engine option as a card (name, dose, line-state chip, one-line Why), "Next option" to cycle, "See all options" list, "Show held options" (each with its hold reason); (3) **Confirm**: Use this · scope toggle "Make this my regular {family} exercise" (off by default).
- **Rules:** options come only from the engine. EXCLUDED exercises never appear (§D). Choosing a held option requires a confirm naming the hold ("On hold: plank position not yet decided (your exclusion scope). Use anyway?"); choosing it does not clear the hold. Undo is available until a set is logged on the new item.

### T-09 How to do it

- **Content:** exercise name, provenance tag, "Alloy's published cues" (from `documented_coaching_cues`) with source link(s), `demo_ref` illustration or link if present, equipment ("executed as" for adapted rows).
- **Rules:** read-only use of the evidence layer for display (the engine does not read it, §A.1; D-076). Empty state: "No published cues for this exercise. Tap the source link to see the original."

### T-10 Rest timer

- **Content:** docked bar: countdown, −15 s, +15 s, Skip. Expands on tap to a large countdown.
- **Rules:** starts automatically after the second item of a pair is logged (or after a straight set). Timestamp-based: correct after the phone is locked or the tab is backgrounded. V0 does not depend on background alerts; a sound/visual cue plays if the page is visible. Rest changes are not logged and have no engine effect. No rest after mobility.

### T-11 Report (flags)

- **Content:** options from §3.4 with a one-line consequence under each (e.g., Uncomfortable: "Keeps this weight next time. Twice in a row puts it on hold for your review."). STOPPED_SYMPTOM follows J8.
- **Rules:** flags attach to the item (and side, rep where relevant). DISLIKE/PREFER also emit SET_PREFERENCE. No free-text field is required anywhere. With ECR-01 approved, flags work on items with zero sets and on mobility items; until then, the consequence text for those cases must say "Recorded" only (never promise a hold that won't happen).

### T-12 Effort rating

- **Content:** "How was {exercise}?" Too easy · Good · Hard (target effort) · Too hard. Per-side items: two rows, Left and Right.
- **Rules:** appears after the last working set; changeable until finish. Missing effort is allowed and listed at finish.

### T-13 Finish

- **Content:** (1) Missing-data list: unrated items ("Rate so these count toward progress": inline effort chips), unlogged sets ("{n} sets not logged will be marked skipped"); (2) "Overall today vs usual?" Below usual / Usual / Above usual (optional); (3) Session note.
- **Actions:** **Finish** (primary), Back to session.
- **Rules:** never blocks. `ended_at` = tap time (or last-set time for T-16, D-072).

### T-14 Session summary

- **Content:** duration and blocks done; per exercise: what was logged and **Next time** in plain words from the completion decision:

| Decision | Next-time text |
|---|---|
| REPS_UP | "Next: 40 lb × 9" |
| CONFIRM_TOP / LOAD_UP / EXTEND_RANGE | "Next: 45 lb × 6" / "No heavier weight confirmed, so the rep range extends: next 40 lb × 11" |
| HOLD | "Stays at 40 lb × 8" |
| HOLD(REDUCE_LIMIT) | "Stays at 35 lb × 8. Lowered once already; it's in Needs review." |
| REDUCE | "Next: 35 lb × 8" |
| CALIBRATE | "Starting point saved: 40 lb × 8" |
| SEEDED | as the decision it produced |
| RETURN / IMPLEMENT_CHANGED / NOT_EVIDENCE | "Didn't count toward progress: {reason}" (effort not rated · weight changed · lighter day · below-usual day · not all sets logged · flagged uncomfortable · re-based on new equipment) |
| LOAD_CAPPED | "At the heaviest confirmed weight; your regular exercise will change next time" (main roles) |

  Also: holds created, rotations queued ("Your regular hinge exercise changes next time: you marked it disliked"), patterns counted ("Counted: Squat, Row, Hinge, Overhead push, Core").
- **Rules:** text comes from engine decisions only.

### T-15 No session

Copy in §10.1. Actions: Edit check-in; secondary: Log Alloy, Log other session.

### T-16 Unfinished session

J9. Shows date, items with logged sets, the last-set time that will become `ended_at`.

### H-01 History feed

- **Content:** (1) Week strip (Mon–Sun, swipe back): per day, markers for apartment ●, Alloy A, other ○, unresolved Alloy class ?. (2) "Patterns: last trained" collapsible: each family with relative time and source ("Hinge · 3 days ago · Alloy"), from engine timestamps (§B.3). (3) Filter chips: All · Apartment · Alloy · Other. (4) Session rows, newest first: date, type badge, duration, family chips, first two lifts with dose; Alloy rows show Summary/Detailed and "from check-in" when source is CHECKIN_PROMPT; unresolved Alloy slots ("Wed: not sure") with **Resolve** (Yes / No).
- **Actions:** search icon (H-05), tap row.
- **Rules:** no charts, totals, streaks, or volume sums in V0.

### H-02 Apartment session detail

- **Content:** check-in answers (non-default only), items grouped by block with sets, effort, flags, swaps ("Swapped from …"), notes; each item links to Why (the record as generated) and Exercise detail; completion decisions ("Next time" as in T-14).
- **Actions:** Edit (values, efforts, flags, notes, capacity), Delete session (confirm).
- **Rules:** edits trigger replay (D-075) and show which targets recalculated.

### H-03 Alloy session detail

- **Content:** date, time, duration (or "not recorded"), focus, source, items by slot with dose, coach modifications, notes, credit summary ("Counted: Lower body, Push, Pull; Squat, Row").
- **Actions:** Edit (opens A-02 for this log), Delete.

### H-04 Exercise detail

- **Content:** name, provenance tag, How-to link; **Current targets** per role line ("As main lift: next 40 lb × 9 · Building"); **Status** (one of: Calibrating · Progressing · Holding · Lowered · Stalled · At top weight · On hold for review) with a one-line reason from `last_decision`; **Last done** date + environment; **Recent exposures** table (date, role, sets × reps @ load, effort, decision; 10 rows, "Show more"); **At Alloy** rows separately with the note "Recorded for your history. Not used for targets."; preference and hold status with actions (Like/Dislike, Put back into planning).
- **Rules:** "Progressing" = a REPS_UP, LOAD_UP, CONFIRM_TOP, or EXTEND_RANGE decision within the last 3 qualifying exposures (display rule only; SYSTEM_DESIGN).

### H-05 Exercise search

Typeahead over display names, canonical names, and aliases. Results show last-done date. Exercises never done show "Not done yet."

### H-06 Other / manual session detail

Free-form items, date, notes; banner "Not used for planning (yet)." Edit, Delete.

### A-01 Log Alloy: quick

- **Content:** date chips (smart default + last 7 days + picker; future dates disabled), class time (default 4:00 pm, editable), focus Full body (default) / Upper / Lower, duration chips 45 · 50 · 55 · 60 · Other · Don't know (default Don't know).
- **Actions:** **Save** (primary). If a log already exists for that date, the sheet opens it for enrichment instead of creating a second one.
- **Rules:** Save creates Q.6 SUMMARY immediately. "Don't know" duration stores `ended_at` = class time + 55 min (ALLOY_DEFAULT_DURATION_MINUTES) with `duration_known = false` (extension, §13).

### A-02 Log Alloy: exercises by slot

- **Content:** rows A1, A2, B1, B2, C1, C2 (empty rows ignored), **Finisher**, **+ Add row** (free label, e.g., D1). Each row: exercise field (A-03), dose field, pattern chip (auto-filled when the exercise has metadata; editable), **Coach changed this** toggle with note. Session: notes, "How hard was it?" (optional, collapsed; stored as `perceived_effort`).
- **Dose field parsing:** accepts "3x10", "3x10 35", "3x10 @35", "3x12/10/8 @30", "40s", "3x40s", "10/side". Parsed values appear as chips (sets · reps · load). Anything unparsed is kept verbatim in the item note, never discarded.
- **Rules:** every change autosaves; the first item upgrades the log to FULL. Items without a family credit nothing beyond the summary (§L.3); the pattern chip says so ("No pattern: counts toward the session only").

### A-03 Exercise picker

- **Content:** "Recent at Alloy" chips (last 10 distinct), typeahead over library names and aliases (alias table), then "Use '{typed text}'" as free text.
- **Free-text pattern chips:** Squat/lunge · Hinge · Push · Overhead push · Row · Vertical pull · Core: arching · Core: twisting · Core: side · Carry · Not sure. "Not sure" leaves `family_tag` null.
- **Rules:** library picks carry `exercise_id` (feeds the consecutive-day rule, §L.3); family comes from EXERCISE_METADATA, never from the evidence layer's `primary_pattern` (§A.1).

### A-04 Saved + effect preview

Inline confirmation "Saved" + effect lines from EI-05: patterns credited, exercises the next plan won't repeat (and until when), heavy-lower recovery time. Actions: Done, Add exercises (if summary).

### E-01 Environments

Two rows: Apartment gym ("Used for planning" + count of items needing confirmation) and Other / manual ("Log a session done elsewhere. Not used for planning yet"). No "add environment" in V0.

### E-02 Apartment gym equipment

- **Content:** "Confirm at the gym ({n})" section first (open items from §S: rack bar path, adjustable pulley, incline setting, dumbbell top weight and increments, plate denominations, station groups); then equipment grouped by category. Row: name, status chip (Available · Not available · Unconfirmed), loads summary ("25–45 lb confirmed"), station group.
- **Rules:** Unconfirmed items show "Exercises needing this are on hold" (HF-06 UNKNOWN). Descriptions and confidence come from equipment_library.json and are read-only.

### E-03 Equipment item

- **Content:** description + confidence + evidence source (read-only); **Availability** (Available / Not available / Unconfirmed); **Confirmed weights** (chip list editor); **Heaviest confirmed weight**; **Station group** (None, Rack area, Bench 2, Dip, machine own group); confirmed-on date (auto); note.
- **Actions:** Save (CONFIRM_EQUIPMENT), **Unavailable today** (adds to today's issues; if a plan exists and hasn't started, offers regenerate; if a session is in progress, applies to swaps).
- **Rules:** changing an implement to Not available or Unconfirmed triggers the impact warning (J12) using EI-06. Adding a heavier confirmed weight explains: "Exercises capped at {old max} can progress again."

### E-04 Other / manual

Explanation + **Log other session** (date, duration, free-text items with dose field, notes). Stored as Q.7 with `program` = "manual" (or DailyArms / DailyAbs / Walking chips).

### P-01 Profile home

Sections: Goals · Schedule & sessions · Movement rules · Exercise preferences · Needs review (badge count) · Open questions (count) · Coach notes (count unreviewed) · Data & system. Footer: "Health details stay in your Health Project."

### P-02 Goals (read-only)

Active goals G-01, G-03 to G-07 with their stated wording; G-02 shown as "Reach goal body weight" without numbers (no planning effect in V0); G-08 not shown (CONTEXT). Banner: "Goal ranking isn't set (question B1). Until it is, sessions don't weight any goal and session size doesn't grow above the 45-minute plan." G-04 shows its review date.

### P-03 Schedule & sessions

Alloy days and time (editable; a config change, recorded with a config version bump); session length preferences "Not set (B3). Using: shortest session 15 min, full session at 45 min or more"; time zone (D-073); units.

### P-04 Movement rules (read-only in V0)

- **Always excluded:** HC-01 "No dips of any kind" · "Your exclusion (not a medical restriction)" · Effect: "Dip exercises are never planned." HC-02 "No push-up-position planks" · same label · Effect: "Exercises with that position are excluded; exercises whose hand position isn't documented are on hold until you decide the scope (B4a)."
- **Adjustments:** SC-01 "Right-triceps adjustments" · Active, details pending (B5) · Effect: "Right side logged separately; check-in asks about your right arm; lower-triceps options are chosen when you say it's worse."
- **Proposed, not applied:** SC-02 to SC-05, one line each, "Waiting for your decision."
- **Avoid list:** profile avoidances.
- **Rules:** shows `label_in_app`, description, status, and effect. Never shows `source_reference` quotes, diagnoses, or evidence labels from the Health handoff. Editing happens in PERSONAL_constraints.yaml (versioned) in V0.

### P-05 Exercise preferences

Liked, Disliked (with "Rotates your regular exercise when an alternative exists"), Regular-exercise replacements (USER_REPLACE history). Actions: remove a like/dislike (SET_PREFERENCE null).

### P-06 Needs review

Rows by cause: On hold (symptom) · On hold (uncomfortable twice) · Lowered once already (REDUCE limit) · Stalled (info) · Ready for a harder variant (bodyweight LOAD_CAPPED, info) · Disliked but no alternative (info). Actions per J13. Symptom notes are the user's own words, shown only here and in the session log.

### P-07 Open questions

Each question with "What the app does until you answer" (from §A.4). In-app answerable now: UQ-G01 "Can you do pull-ups or chin-ups?" → CONFIRM_CAPABILITY; equipment questions link to E-02. B1 to B6 and P-07/P-08 are answered by updating the profile files in V0; the screen shows the current default.

### P-08 Coach notes

List of coach modifications from Alloy logs (date, exercise, note), each with **Mark reviewed**. Header: "Your coach's changes are recorded as trainer input. They don't change planning until you add them to your movement rules." (D-015, D-071)

### P-09 Data & system

Engine 0.2.1, config 0.2.0, input file versions; metadata rows rejected (count + list with validator); **Technical details** toggle (shows reason codes and the raw generation record in Why sheets and History); **Export backup** (all logs, check-ins, events, generation records, equipment state, settings as one JSON file); **Import backup** (replace, confirm); **Rebuild training state** (replay, §B.1); Run setup again.

---

## 7. Component inventory

Each component is built once and reused. "Variants" are states or modes, not separate components.

### 7.1 Shell and system

| ID | Component | Variants / notes |
|---|---|---|
| C-TABBAR | Bottom tab bar | 5 items; center Log Alloy emphasized; badge on Profile |
| C-TOPBAR | Top bar | title, back, overflow; in-session variant with elapsed time and block dots |
| C-RESUME | Resume-session bar | pinned above tab bar on non-Today tabs while IN_PROGRESS |
| C-SHEET | Sheet | iPhone: bottom sheet (medium/full detent); iPad/desktop: centered panel or popover |
| C-TOAST | Toast with Undo | set logged (undo), swap applied (undo), log deleted (undo) |
| C-BANNER | Inline notice | info / attention; one line + optional detail |
| C-CONFIRM | Confirm dialog | destructive and hold-clearing actions only |
| C-EMPTY / C-ERROR / C-LOADING | System states | §10 |
| C-OFFLINE | Offline indicator | small, non-blocking; "Saved on this device" |

### 7.2 Inputs

| ID | Component | Notes |
|---|---|---|
| C-CHIPS | Choice chips | single / multi / exclusive-none; shows "defaulted" styling until touched |
| C-SEG | Segmented control | 2–4 options |
| C-STEPPER | Numeric stepper | reps (step 1), seconds (step 5), load (steps from confirmed list, else 5 lb nominal); opens numeric keypad on tap |
| C-LOADCHIPS | Confirmed-load chips | from Q.3 `loads`; "Other" opens keypad |
| C-DOSE | Compact dose field | Alloy / Other logs; parser in A-02; shows parsed chips |
| C-TYPEAHEAD | Exercise typeahead | names + aliases + recents; free-text fallback |
| C-DATECHIPS | Date chips | smart default, last 7 days, picker; no future dates |
| C-NOTE | Note field | single line expanding; optional everywhere |

### 7.3 Training

| ID | Component | Notes |
|---|---|---|
| C-SESSIONHDR | Session header | duration estimate, badges (Lighter day, First sessions) |
| C-NOTICE | Plan notice row | underfill, replacement, starvation swap, straight sets, unservable |
| C-BLOCK | Block card | Paired / Straight sets / Single; block label A–C, F |
| C-EXCARD | Exercise card | collapsed (overview), expanded (overview), active (training), done, skipped, swapped-out |
| C-RXLINE | Prescription line | sets × target @ load; CALIBRATE and "next heavier available" variants; per-side marker |
| C-LASTTIME | Last-time line | "Last: Tue · 8, 8, 7 @ 40 lb · Good"; Alloy variant "At Alloy Mon: 3 × 10 @ 35 (not used for targets)" |
| C-STATECHIP | Line-state chip | §3.3 |
| C-PROV | Provenance tag/icon | §3.5 |
| C-SETROW | Set row | planned / focused / logged / edited / skipped; bilateral / per-side (L,R) / timed; ramp variant (not working) |
| C-TIMEDSET | Timed-set control | countdown with Start/Stop; logs achieved seconds |
| C-FADE | Fade-rep control | right side only; optional integer |
| C-REST | Rest timer bar | docked / expanded; ±15 s; Skip |
| C-EFFORT | Effort picker | single / per-side |
| C-FLAGBTN + C-FLAGSHEET | Report | §3.4 with consequence text |
| C-WHY | Why panel | 3 lines + More sections (§9) |
| C-ALTLIST | Alternatives list | ranked-lower and held/excluded rows with plain reasons |
| C-SWAPCARD | Swap candidate card | dose, chip, one-line Why, Next option |
| C-HOWTO | How-to panel | cues, source link, illustration |
| C-NEXTTIME | Next-time row | decision text (T-14) |

### 7.4 Alloy, History, Equipment, Profile

| ID | Component | Notes |
|---|---|---|
| C-ALLOYQUICK | Alloy quick card | date, time, focus, duration, Save |
| C-SLOTGRID | Slot grid | A1–C2, Finisher, + row |
| C-ALLOYITEM | Alloy item row | exercise, dose, pattern chip, coach toggle + note |
| C-PATTERNCHIPS | Pattern tag chips | family vocabulary incl. Not sure |
| C-EFFECT | Effect preview | credited patterns, no-repeat list, recovery time |
| C-WEEKSTRIP | Week strip | day markers by source; unresolved "?" |
| C-PATTERNLIST | Patterns last trained | family, relative time, source |
| C-SESSIONROW | Session row | apartment / Alloy summary / Alloy detailed / other |
| C-EXPOSURES | Exposure table | date, role, dose, effort, decision |
| C-STATUS | Progress status line | §6 H-04 statuses |
| C-EQROW | Equipment row | status chip, loads, station |
| C-AVAIL | Availability control | Available / Not available / Unconfirmed; "Unavailable today" action |
| C-LOADLIST | Load list editor | add/remove chips; heaviest confirmed |
| C-IMPACT | Impact warning | lines affected; Gone for good / Only today / Cancel |
| C-RULEROW | Constraint row | label, status, effect; never health text |
| C-REVIEWROW | Review row | cause, date, user note, actions |
| C-QUESTIONROW | Open question row | question, current default, action if answerable in-app |

---

## 8. State models and transitions

### 8.1 Today (day-level) state

```
NOT_READY ──(metadata loads, setup done)──▶ READY
READY ──check in──▶ CHECKING_IN
CHECKING_IN ──cancel──▶ READY
CHECKING_IN ──build──▶ GENERATING
GENERATING ──session──▶ PLANNED
GENERATING ──NO_SESSION(reason)──▶ NO_SESSION
NO_SESSION ──edit check-in──▶ CHECKING_IN
PLANNED ──edit check-in / "Update plan?"──▶ GENERATING      (same inputs ⇒ identical plan, §N)
PLANNED ──not training now──▶ READY                          (nothing changes, §K)
PLANNED ──start──▶ IN_PROGRESS
IN_PROGRESS ──finish / end early──▶ FINISHING ──complete──▶ COMPLETED
IN_PROGRESS ──(app reopened on a later local date)──▶ UNFINISHED
UNFINISHED ──finish with what I logged──▶ FINISHING
UNFINISHED ──discard──▶ READY
COMPLETED ──train again today──▶ CHECKING_IN
(local date changes) PLANNED ▶ READY  ·  COMPLETED ▶ READY  ·  NO_SESSION ▶ READY
```

A plan generated but never started expires at local midnight and changes nothing. Alloy prompt answers given during CHECKING_IN persist even if the user cancels (they are resolved before generation, §C.1 step 2).

### 8.2 Workout lifecycle (one generated session)

| Stage | Trigger | Data written | Engine effect |
|---|---|---|---|
| Generated | Build session | Q.4 CHECK_IN; Q.10 GENERATED_SESSION; Q.11 GENERATION_RECORD | Alloy prompt answers applied (logs + recovery credits) |
| Previewed | — | Pre-start swaps held in session draft; USER_REPLACE / SET_PREFERENCE events written at tap time | Events apply at `event_at` (§K) |
| Started | Start session | Q.5 created: `started_at`, `generation_id`, items from plan | None yet |
| In progress | Each set / flag / effort / swap | Q.5 updated immediately | None yet |
| Finishing | Finish / End session / Finish unfinished | `ended_at`, `session_capacity`, notes | — |
| Completed | Confirm finish | Q.5 finalized | §K steps 1–8: counters, `exercise_last_used`, family credits, progression decisions, flags, anchors, rotation |
| Edited (later) | History edit | Q.5 revised | Replay (§B.1) |
| Deleted (later) | History delete | Q.5 removed | Replay |
| Discarded | Unfinished → Discard | Q.5 removed | None |

### 8.3 Exercise item states (within a session)

```
PLANNED ─▶ ACTIVE (first set focused)
ACTIVE ─▶ DONE        (all working sets logged; effort may be pending)
ACTIVE ─▶ PARTIAL     (≥1 set logged, then ended/skipped/stopped)
PLANNED/ACTIVE ─▶ SKIPPED     (zero working sets; "Skip exercise" or session ended)
PLANNED/ACTIVE/PARTIAL ─▶ SWAPPED_OUT ─▶ (new item PLANNED, swapped_from = original)
DONE/PARTIAL ─▶ EFFORT_RATED  (independent flag; required for evidence, not for finishing)
any ─▶ FLAGGED (flags attach; STOPPED_SYMPTOM forces PARTIAL or SKIPPED)
```

### 8.4 Check-in lifecycle

`OPEN → (Alloy cards answered or dismissed) → REQUIRED_ANSWERED (R-01, R-06) → SUBMITTED → consumed by GENERATE`. Editing a check-in creates a new Q.4 record and regenerates; the old record stays attached to the old generation record.

### 8.5 Set logging lifecycle

| State | Shown | User action | Result |
|---|---|---|---|
| PLANNED | target reps/seconds and load, pre-filled (D-068); ramp rows marked "warm-up" | — | — |
| FOCUSED | highlighted; large ✓ | **✓** | LOGGED as prescribed |
| FOCUSED | | tap a value → stepper/keypad → **✓** | LOGGED with edited values |
| FOCUSED (timed) | Start | Start → auto-stop or Stop | LOGGED with achieved seconds |
| FOCUSED (per side) | L and R values | **✓** (both) or edit one side | LOGGED per side; fade rep optional on R |
| FOCUSED (CALIBRATE, external load) | load empty + load chips | pick load, **✓** | LOGGED; line created at completion from the last completed set (§H.7) |
| LOGGED | values + time | tap row | EDITING |
| EDITING | stepper | save / undo | LOGGED (edited) |
| PLANNED/FOCUSED | | swipe or menu → Skip set | SKIPPED |
| LOGGED | | toast Undo (5 s) or edit → Clear | PLANNED |

Rules:
- A LOGGED set stores `set_no`, `side`, `load`, `reps` or `seconds`, `is_working` (ramp rows false), and the tap time (extension, used by D-072).
- After a LOGGED set, focus moves by the pairing rule (§F.3) and the rest timer starts when the pair completes.
- Evidence consequences are shown, not enforced: changing the load on a non-calibrate item shows the "won't count" note (§H.2); leaving sets unlogged shows the same at finish.
- Reps pre-filled with the target must be changed if the target wasn't reached. The ✓ button states the values it will log ("✓ 8 reps · 40 lb") so a mis-tap is visible. Risk tracked as OBS-02 (§12.3).

### 8.6 Swap lifecycle

```
IDLE
 └─ Swap tapped ─▶ REASON
REASON
 ├─ Weight is wrong ─────────────▶ LOAD_EDIT (no swap; exits)                          
 ├─ Equipment: just the weight ───▶ LOAD_EDIT + EQUIPMENT_ISSUE flag (no swap; exits)
 ├─ Equipment: whole piece ───────▶ add to today's issues ─▶ REQUEST
 ├─ Station busy ─────────────────▶ mark station busy (session-scoped) ─▶ REQUEST
 ├─ Don't like it ────────────────▶ SET_PREFERENCE DISLIKE ─▶ REQUEST
 ├─ Uncomfortable ────────────────▶ UNCOMFORTABLE flag on item ─▶ REQUEST
 ├─ Form is hard ─────────────────▶ TECHNIQUE_DIFFICULTY flag on item ─▶ REQUEST
 └─ Just want something else ─────▶ REQUEST
REQUEST ─(EI-01: slot, reason, today's issues, busy stations)─▶
 ├─ SAME_EXERCISE_NEW_IMPLEMENT (engine keeps exercise via another option set; IMPLEMENT_CHANGED) ─▶ APPLIED
 ├─ OPTIONS (ordered list; first shown) ─▶ PREVIEW
 └─ NO_OPTIONS ─▶ {Show held options | Skip this exercise | Keep original}
PREVIEW ─ Next option ─▶ PREVIEW (cycles, §E.6)
PREVIEW ─ Use this [+ Make regular?] ─▶ APPLIED
APPLIED: original item → SWAPPED_OUT (keeps any logged sets); new item PLANNED with engine prescription;
         swap_type = USER_SWAP, or USER_REPLACE (Q.8 event now + swap_type on item)
APPLIED ─ Undo (until first set logged on new item) ─▶ IDLE (flags/preferences written in REASON stay; the toast says so)
```

Rules: the reason never ranks options; it only changes the engine's inputs (today's issues, busy stations) or writes the flag/preference it names. Swaps never change families or blocks (§E.6). A swapped-in item is a substitute and never becomes an anchor unless "Make regular" (USER_REPLACE) is chosen (§E.1).

### 8.7 Alloy session logging lifecycle

| State | How it is reached | Engine effect (§L) |
|---|---|---|
| UNRESOLVED | A scheduled class in the last 72 h with no log and no answer | Prompt at next check-in |
| UNKNOWN | "Not sure" or dismissed prompt | Recovery credit only; asked again within 72 h |
| SKIPPED | "No" in the prompt, or Resolve → No in History | ALLOY_SKIPPED; no prompt again |
| SUMMARY (prompt) | "Yes" in the prompt | Parent credits LOWER/PUSH/PULL at scheduled end; recovery credit |
| SUMMARY (user) | A-01 Save | Parent credits per focus at `ended_at`; replaces a prompt log for that date and its recovery credit |
| FULL | First item added in A-02 | Summary credit + family credits for tagged items + `exercise_last_used` for library items |
| EDITED | Any change | Replay |
| DELETED | History delete | Replay; the slot returns to UNRESOLVED only if still inside the 72 h window |

Minimum valid log: a date. Everything else is optional (PR-5). Two logs on one date merge (FULL wins, later `ended_at` kept, §L.4); the UI prevents creating a second one by opening the existing log instead.

### 8.8 Equipment change lifecycle

| Change | Scope | Written | Engine effect |
|---|---|---|---|
| Unavailable today | Today only | Q.4 `equipment_issues[]` (or session-scoped for swaps) | HF-06 EXCLUDED_TODAY; anchors kept; lines never re-based |
| Not available (gone) | Persistent | Q.8 CONFIRM_EQUIPMENT | HF-06 EXCLUDED; lines on that implement re-base at their next exposure (§H.7, M-20) |
| Unconfirmed | Persistent | CONFIRM_EQUIPMENT (UNKNOWN) | HF-06 HELD; a line on that implement is also re-based if it is performed with another option set (§H.7 re-bases whenever the implement is not AVAILABLE), so the impact warning applies here too |
| Available / weights / heaviest weight / station group | Persistent | CONFIRM_EQUIPMENT | Eligibility, load increases (§H.5), station rule (§F.2) |

---

## 9. Explainability: "Why this exercise?"

### 9.1 Structure of the Why sheet

**Always visible (three lines, §J.3 templates, plain language, no codes):**
1. **Why this movement:** from `family_reason_code` (e.g., "Hinging is your least recently trained lower-body pattern (last: Mon, Alloy).").
2. **Why this exercise:** from `selection.reason_code` (e.g., "You did Goblet Squat yesterday, so this stands in today.").
3. **Today's dose:** from the progression code (e.g., "Same weight, one more rep: you hit every rep last time.").

**"More" (collapsed sections, each hidden when empty):**

| Section | Source (§J.1) | Example |
|---|---|---|
| Also considered | `alternatives` (next 3 in order + every HELD/EXCLUDED in the family) | "Kettlebell Deadlift: used more recently" · "Single-Leg RDL: on hold, needs your review" · "Trap-Bar Deadlift: needs equipment that isn't available" |
| Recent training that mattered | `recent_training` | "Legs trained 20 h ago (Alloy)" · "Goblet Squat done yesterday" |
| Your rules applied | `constraint_effects`, `constraints_not_applied` | "No dips: 0 affected here" · "Proposed rule SC-03 not applied (waiting for your decision)" |
| Progress on this exercise | `progression` | "Building · last decision: one more rep · weight from your last session" |
| Pairing | `station` | "Paired with Kettlebell Row. Straight sets today because both use the rack." |
| Where this comes from | `evidence_basis` + session line (§3.5) | "From Alloy's public exercise library. Choice and dose: this app's rules." |

Technical details on (P-09): each section also shows its raw codes (`decided_by`, HF ids, reason codes) and the generation id.

### 9.2 Plain-language reasons for alternatives (UI copy table, SYSTEM_DESIGN)

The engine's §J.3 templates cover lines 1–3. Alternatives need a mapping from outcomes to text:

| Outcome | Text |
|---|---|
| HF-01 | "Excluded by your rule: {label}" |
| HF-02 | "On hold until you decide the plank-position question" |
| HF-03 | "Excluded by a rule you adopted: {label}" |
| HF-04 | "On your avoid list" |
| HF-05 | "You said your {region} is too sore today" |
| HF-06 | "Needs equipment that's {not available · unconfirmed · unavailable today}" |
| HF-07 | "On hold for your review ({cause})" |
| HF-08 | "Needs a capability you haven't confirmed: {prereq}" |
| HF-10 | "Already in today's session" |
| HF-11 | "Done {today · yesterday}" |
| HF-12 | "Legs trained {n} h ago; heavier lower-body lifts wait 24 h" |
| HF-13 | "Lighter day: {explosive exercises are skipped · familiar exercises first}" |
| HF-14 | "Jumping exercises are off until you set a preference" |
| LOST(K0) | "Your regular exercise for the other lift slot" |
| LOST(K1) | "{winner} is marked as liked" |
| LOST(K2) | "Marked as disliked" |
| LOST(K3) | "Works your right triceps more" |
| LOST(K4) | "No weight history yet" |
| LOST(K5) | "Used more recently" |
| LOST(K6) | "Alloy library exercises come first" |
| LOST(K7) | "Later in your approved starting order" |
| DRAW | "Chosen by today's variety rotation (core, carry, and mobility only)" |

### 9.3 Explainability outside the Why sheet

- **Overview notices** state every session-level decision that changed the shape of the plan (§6 T-04).
- **Session summary** states every completion decision (T-14).
- **Alloy effect preview** states what a log changes (A-04).
- **Equipment impact warning** states which progress lines a change affects (E-03).
- **History** keeps the generation record for every session; the Why sheet in H-02 shows the plan *as generated*, not as re-derived today.

---

## 10. Error, empty, and edge states

### 10.1 No-session outcomes (§I.2; copy for §J.3's "user-facing sentence")

| Reason | Sentence | Next step offered |
|---|---|---|
| USER_SKIP | "Rest day. Nothing changes." | Log Alloy · Log other session |
| TOO_SHORT | "{n} minutes is shorter than the shortest session this app plans (15 min). Short mobility sessions aren't set up yet." | Edit minutes |
| NO_BLOCK_A | "Nothing can fill the first strength pair today." + list of blocked families with plain reasons and unblocking questions | Edit check-in · Open questions · Equipment |
| VALIDATION_FAILED(ids) | "The plan didn't pass its own checks, so it isn't shown." (+ ids in technical view) | Edit check-in · Export record |

### 10.2 Empty states

| Where | Condition | Shown |
|---|---|---|
| Today | Metadata not authored / not loaded | "Session planning isn't ready yet. You can log Alloy sessions and set up equipment now." |
| Today | No history (cold start) | Normal READY state + "First sessions are shorter while the app learns your weights." |
| Overview | Underfill | §J.3 underfill sentence |
| Exercise card | Never done | Last-time line: "First time" |
| Exercise card | Done only at Alloy | "At Alloy Mon: 3 × 10 @ 35 (not used for targets)" |
| How-to | No cues | §6 T-09 |
| History | No sessions | "Nothing logged yet. Log an Alloy class or finish a session to see it here." |
| History | Exercise search, no match | "Not in your library. Check spelling or aliases." |
| Log Alloy | No recents | Picker shows library typeahead only |
| Equipment | Nothing to confirm | Section hidden |
| Needs review | Empty | "Nothing needs your review." |
| Coach notes | Empty | "Coach changes you log with Alloy sessions appear here." |

### 10.3 Errors and edge cases

| Situation | Behavior |
|---|---|
| Offline during a session | Everything works; logs stored locally; C-OFFLINE shows "Saved on this device." (D-078) |
| Offline at check-in | If generation needs the network in the chosen implementation, show "Can't build a plan offline. Check in again when connected." Logging Alloy/other still works. (Preferred: generation runs on device, §11.4.) |
| Engine refuses to load (V-00e) | Today: "Exercise data has a configuration error; planning is paused." Details in P-09. |
| Metadata rows rejected (V-00a–g) | No user-facing error; count in P-09; the record lists them (§Q.1.2). |
| Generation takes > 2 s | Progress indicator on the Build button; no spinner screens. |
| Local storage write fails | Blocking banner: "Couldn't save. Export a backup now." + Export button. Never silently continue. |
| App reload mid-session | Returns to the focused set; rest timer recomputed from timestamps. |
| Local date changes mid-session (late night) | Session continues; completion uses real times; the plan's date stays the start date. |
| Device time zone differs from profile (travel) | Banner in Today: "Your phone is on {zone}; the app uses {profile zone}." Change in P-03 (D-073). |
| Duplicate Alloy log for a date | Prevented; opens existing log. Imported duplicates merge per §L.4. |
| Alloy log with a future date | Disabled in pickers. |
| Alloy log entered after today's plan | Plan unchanged; banner offers regenerate if not started (§L.4). |
| Edit of a past log | Replay; notice lists affected exercises (D-075). |
| Import backup | Replaces all data after confirmation; runs replay; shows counts imported. |
| Held option chosen in swap | Confirm naming the hold; hold not cleared. |
| "Train again today" after completion | Normal check-in; the consecutive-day rule already excludes today's exercises (HF-11). |
| Regenerate same day with same answers | Identical plan (§E.4 seed, §N). The app does not offer "shuffle." |

---

## 11. Responsive behavior

### 11.1 iPhone (primary; portrait)

- Single column, content width = screen minus 16 pt margins; respects safe areas (notch, home indicator).
- Bottom tab bar; primary actions docked at the bottom above the tab bar (thumb zone). Sheets use a bottom sheet with medium and full detents.
- Tap targets ≥ 44 × 44 pt; ✓ buttons ≥ 56 pt wide. Set rows sized for sweaty hands; no swipe-only actions (every swipe has a visible alternative).
- Numeric keypad for numbers; the focused set scrolls above the keyboard.
- In session: large type for the dose; secondary text reduced; one exercise card fully visible, its partner collapsed to a one-line summary until focused.
- Dynamic Type supported up to accessibility sizes; layouts reflow vertically rather than truncate doses.
- Runs installed to the Home Screen (standalone display) and in Safari. Screen stays awake during a session where the browser supports it.
- Landscape: allowed; training screen shows the pair side by side if width ≥ 640 pt.

### 11.2 iPad (secondary)

- Portrait: single column at up to 640 pt readable width, centered; tab bar at the bottom.
- Landscape and large portrait: two panes. Today in session: left pane = block list (A, B, C, F with item status), right pane = active block with both exercise cards side by side. History: list left, detail right. Profile/Equipment: list left, detail right.
- Sheets become centered panels or popovers anchored to their trigger.
- Keyboard support if attached (Return logs the focused set; Tab moves fields).
- Split View / Slide Over: falls back to the iPhone layout below 640 pt width.

### 11.3 Desktop (occasional)

- Same two-pane layout as iPad landscape, max content width ~1100 px; a left rail may replace the bottom tab bar at ≥ 1024 px.
- Best suited to: detailed Alloy logging after the fact, equipment confirmation, reviewing History and Why records, export/import. The training screen works but is not optimized.
- Full keyboard: typeahead with arrow keys; dose field parsing; Esc closes sheets.

### 11.4 Cross-device and platform notes

- V0 data is local to a device unless backups are moved (export/import). Multi-device sync is not in V0 (§14). Pick one primary device for logging.
- Timers are timestamp-based; background notifications are not required and not relied upon.
- Generation and completion are deterministic functions of local data and config; running them on the device keeps the whole loop working offline. If the implementation cannot, logging must still be fully offline (D-078).

---

## 12. Engine boundary

### 12.1 Engine interface the UI needs (EI)

None of these changes a FIXED rule. EI-01 needs confirmation because it states an input the spec implies but does not name.

| ID | Call / query | Returns | Basis | Status |
|---|---|---|---|---|
| EI-01 | **SWAP_OPTIONS**(generation_id, slot, reason, today_issues[], busy_stations[]) | Either "same exercise, other implement" (IMPLEMENT_CHANGED) or the ordered substitute list for the slot, each with prescription, one-line Why, and HELD options with reasons | §E.6 (ordered list, station-compatible), §N (busy station → free or NONE station; implement missing → next option set), HF-06 (today's issues) | **Clarification: confirm** that a swap re-evaluates HF-06 with issues added mid-session and restricts by busy stations. Reason is recorded, never used for ranking. |
| EI-02 | GENERATE(check_in) | Q.10, Q.11 or NO_SESSION | §C, §P | Existing |
| EI-03 | COMPLETE(session_log) | Decisions per item and side, holds, rotations, credits | §K; tests use `C.` | Existing |
| EI-04 | REBUILD() | Engine state from logs, events, answers | §B.1 | Existing |
| EI-05 | ALLOY_EFFECT_PREVIEW(alloy_log) | Credits (§L.3), exercises excluded tomorrow (HF-11 via `exercise_last_used`), heavy-lower recovery time (HF-12) | Read-only projection of existing rules | New query, no rule |
| EI-06 | EQUIPMENT_IMPACT(equipment_id) | Lines whose `implement` includes it; exercises that would lose availability | §H.1 `implement`, §H.7 re-base | New query, no rule |
| EI-07 | SERVABILITY() | Unservable families with unblocking questions | §C.4.1 | Existing computation, exposed |
| EI-08 | LINE / EXPOSURE queries | Lines, last decisions, exposures per exercise | §B.1, Q.5 | Read-only |

### 12.2 ECR-01 (engine change request): flags on items with zero sets or no line

- **Problem.** §K step 1: "Items with zero completed working sets are 'skipped' and have no effect beyond being recorded." §K step 6 and the §P pseudocode apply flag actions only to performed items that have a role line. So: (a) STOPPED_SYMPTOM reported before the first set is logged, (b) STOPPED_SYMPTOM on a mobility or warm-up item, (c) UNCOMFORTABLE given as a swap reason before attempting, all produce no hold. The next session can auto-select the same exercise.
- **Why it blocks the product.** The discomfort flow must tell the truth about consequences. Without the change, the UI must say "Recorded" in exactly the moments when a person most expects "held until you review." A safety-relevant promise that depends on whether a rep was logged is not acceptable UX.
- **Proposed rule (FIXED, §K new step 6a).** Flag actions for STOPPED_SYMPTOM and UNCOMFORTABLE (§H.4) apply to every item in the session log that carries the flag, including items with zero completed working sets, PREP items, and items without a progression line. For such items only the hold and streak effects apply. Crediting, `exercise_last_used`, `apartment_sessions_completed`, anchors, and progression are unchanged (a zero-set item still counts as skipped for those).
- **Alternative considered.** STOPPED_SYMPTOM only (leave UNCOMFORTABLE-before-attempt as recorded-only). Narrower, but then the "Uncomfortable" swap reason writes a flag with no effect; the user would need "Don't like it" to steer selection, which conflates preference with tolerance (the profile keeps them as separate problem classes).
- **Recommendation.** Both flags. Engine 0.2.2, config unchanged, decision D-079.
- **Tests to add.** AT-29: STOPPED_SYMPTOM on a zero-set main item → `review_hold` set; item never auto-selected next session (AT-P02 corpus). AT-30: STOPPED_SYMPTOM on a PREP mobility item → held; excluded from the next PREP by HF-07. AT-31: UNCOMFORTABLE on zero-set items in two consecutive exposures → `review_hold`. Rerun AT-01 to AT-28 to confirm no change (expected, since no existing test logs a flag on a zero-set item; to be verified).
- **Until approved.** Build the UI as specified with the consequence text switched to "Recorded" for zero-set and no-line items (T-11 rule).

### 12.3 Observations for Phase 8 (no change proposed)

| ID | Observation | UI mitigation in V0 |
|---|---|---|
| OBS-01 | Lowering the weight mid-exercise because it is simply too heavy makes the exposure NOT_EVIDENCE (§H.2), so the next prescription repeats the same weight. Form breakdown is covered by TECHNIQUE_DIFFICULTY (§H.4). | On a lowered load, offer "Form was hard to keep?"; the summary states "Stays at {load}: weight was changed." Review frequency in Phase 8. |
| OBS-02 | Pre-filled reps may overstate performance if the user confirms without editing. | ✓ shows the values it logs; Phase 8 checks the share of sets logged exactly at target. |
| OBS-03 | Missing effort ratings silently reduce evidence. | Effort row appears automatically; finish lists unrated items. Track the rate. |
| OBS-04 | Weekly frequency tolerance with Alloy (already UNRESOLVED, §S). | History "Patterns: last trained" makes load visible; no app rule. |
| OBS-05 | A plan made on an Alloy day before class does not know class is coming (forward use of the schedule is FUTURE). | None in V0; noted in P-07. |

---

## 13. Data the app stores beyond engine contracts

All extensions are ignored by the engine and by replay. They exist for the user's record and for display.

| Record | Extension fields | Purpose |
|---|---|---|
| Q.5 SESSION_LOG | set `logged_at`; item `note`; session `note`; PREP check-offs; pre-start swap draft | D-072 `ended_at`; notes; warm-up record |
| Q.6 ALLOY_SESSION_LOG | item `slot_label` (A1…, custom), `is_finisher`, `dose_text` (raw), `coach_modified`, `coach_note`, `coach_note_reviewed`; session `duration_known` | Fast Alloy logging, coach notes (P-08) |
| Q.7 OTHER_TRAINING_LOG | `environment` = OTHER_MANUAL, items with `dose_text` | Manual logging (D-065) |
| Settings | time zone, units, technical-details flag, setup completed, Alloy schedule edits (config), `default_order` approval record (date, order per family) | D-073; §Q.1.1 approval |
| UI state (not exported) | focused set, rest-timer end timestamp, sheet positions | Resume |

Alloy logs are PERSONAL training history. They are not research evidence and never receive an ALLOY_DOCUMENTED or ALLOY_OBSERVED class (D-015, D-071). Using them as evidence would need its own decision.

---

## 14. Explicitly NOT in V0

**Programming (FUTURE or UNRESOLVED in the engine, §S; the UI must not imply them):** generation for any environment other than the apartment gym, including travel; weekly targets, periodization, heavy/medium/light weeks, programs or phases; forward use of the Alloy schedule or program; mobility-only or conditioning sessions; resuming a regenerated partial session; set progression; tempo, ROM, or complexity progression; progression trees; session sizes above the 45-minute plan; reading OTHER logs (DailyArms, DailyAbs, walking); upper-body or weekly fatigue models.

**Workout editing:** reordering blocks or exercises; adding exercises to a generated session; custom workout builder; manual superset editing; choosing a substitute from outside the engine's list; a "shuffle" button.

**Logging extras:** per-set RPE or RIR; plate calculator; estimated 1RM; tempo entry; voice logging; photo logging of Alloy whiteboards; importing Alloy programs.

**History and analytics:** charts, volume totals, trend graphs, PR tracking, streaks, badges, weekly reports, calendar view beyond the week strip.

**Health and body:** symptom tracking, medical monitoring, medication or dosing information, body weight, measurements, photos, nutrition, sleep tracking beyond the recorded check-in answer, wearable or Apple Health integration. These belong to the Health Project (D-017).

**Profile editing:** in-app editing of goals, hard or soft constraints, or answers to B1–B6 (done in the versioned PERSONAL files in V0).

**Platform and social:** accounts, multi-device sync, sharing, social features, coach access, push notifications and reminders, AI chat or avatars, exercise video library beyond linked sources, custom themes (the app follows system light/dark appearance).

**Evidence:** using personal Alloy logs as ALLOY_OBSERVED evidence; any UI text attributing the app's rules to Alloy.

---

## 15. Decisions, open items, and pre-build checklist

### 15.1 Decisions proposed by this document (all SYSTEM_DESIGN)

| ID | Decision | Alternatives rejected |
|---|---|---|
| D-064 | Five tabs; Log Alloy is the center tab and opens a sheet over any screen. | Alloy logging inside Today (buried; slower); Equipment inside Profile (setup needs it prominent in V0). |
| D-065 | V0 generates for the apartment gym only. OTHER / MANUAL is logging-only (Q.7, not read). | Generate with another environment's equipment state (would permanently re-base lines under M-20). |
| D-066 | Equipment changes have two explicit scopes: today (issues; never re-bases) and persistent (CONFIRM_EQUIPMENT; may re-base, shown before confirming). | One availability toggle (turns a one-day outage into permanent re-basing). |
| D-067 | Effort is the engine's four-level rating per exercise (per side where required). No numeric RPE. | Per-set RPE (a tap per set; nothing reads it). |
| D-068 | Set rows are pre-filled with the prescription; ✓ logs "as planned" and displays the values. | Empty fields (3–4 more taps per set). |
| D-069 | Swap reasons route to the engine input they correspond to (load edit, implement change, flag, preference, today's issues, busy station) before substitutes are requested. The UI never ranks candidates. | Reason-agnostic swap (loses tolerance and preference signal); UI-side filtering (violates PR-1). |
| D-070 | Alloy logs save on first tap as SUMMARY and are enriched to FULL; extension fields (slot label, finisher, dose text, coach notes, duration known) are stored, not read. | Structured form with required fields (fails "incomplete is better than none"). |
| D-071 | Coach modifications are collected as TRAINER-sourced notes for review (P-08), never auto-applied. Personal Alloy logs are never research evidence. | Auto-derive constraints from coach notes (violates D-006, D-015). |
| D-072 | Unfinished sessions are never auto-completed. Finishing later sets `ended_at` to the last logged set. | Auto-complete at midnight (wrong times; unintended credits). |
| D-073 | Time zone is a profile setting, default America/Los_Angeles; device mismatch shows a notice. | Device zone (local dates, and so the consecutive-day rule, shift during travel). |
| D-074 | The UI shows no diagnoses, medications, recovery factors, or CONTEXT items; constraints appear by label and effect; symptom notes are recorded, not interpreted. | Full profile display (exposes unnecessary health detail). |
| D-075 | Past logs are editable and deletable; engine state is rebuilt by replay; the UI lists what recalculated. | Immutable logs (typos become permanent training state). |
| D-076 | How-to content is Alloy's documented coaching cues from the evidence layer, labeled with source, for display only. | Authoring our own cues in V0 (new content to maintain; blurs evidence classes). |
| D-077 | Straight-sets blocks rest between sets using the item's `rest_after_pair_s` (UI default). | No rest guidance for straight sets. |
| D-078 | Local-first: every entry is persisted on device at the moment of entry; the in-session loop works offline; export/import backup of all logs, events, check-ins, generation records, equipment state, and settings is in V0. | Server-first storage (gym connectivity); no backup (logs are the source of truth, §B.1, so losing them loses training state). |
| D-079 (proposed, ECR-01) | Flag actions for STOPPED_SYMPTOM and UNCOMFORTABLE apply to items with zero sets and items without a line. Engine 0.2.2. | Leave §K as is (safety promise fails in edge cases); STOPPED_SYMPTOM only. |


### 15.2 Confirmations needed from you

1. **ECR-01:** approve, approve STOPPED_SYMPTOM only, or reject.
2. **EI-01:** confirm that mid-session swaps re-evaluate equipment with today's added issues and busy stations.
3. **D-065:** confirm OTHER / MANUAL is logging-only in V0 (travel workouts are not generated).
4. **Navigation (D-064):** keep Equipment as a top-level tab for V0.

### 15.3 Pre-build checklist (from spec §S) and where the product closes each item

| Blocking item | Closed by |
|---|---|
| Author EXERCISE_METADATA (Q.1) and pass V-00a–g | Data work (not UI). P-09 shows rejected rows. |
| User approval of `default_order` | T-00 step 3 |
| Equipment load lists, `max_confirmed_load`, station groups; UQ-G02, UQ-G04, UQ-G05 | T-00 step 2 / E-02 "Confirm at the gym" |
| UQ-G01 pull-up / chin-up capability | P-07 → CONFIRM_CAPABILITY |
| B3 session length, B4a plank scope, B5 right-triceps parameters, B6 Alloy logging | Answered in PERSONAL files; B6 is answered in practice by D-070 (both modes; summary expected), with the "program visible in advance" part still open |

---

## Appendix A. Low-fidelity layouts (iPhone, portrait)

Content order and emphasis only; not visual design.

```
CHECK-IN (T-02)
│ ✕  Check in
│ ┌ Did you train at Alloy on Mon?   [Yes] [No] [Not sure]
│ Minutes available *   [20] [30] [40] [45] [60] [Other]
│   30 min: warm-up + 2 strength pairs
│ Unwell or different from usual? *   [No] [Yes]
│ Energy        [Low] [Normal] [High]
│ Right arm     [Worse] [Same] [Better]
│ Too sore      [None] [Upper] [Lower] [Trunk]
│ Sleep         [Poor] [OK] [Good]        for your records
│ Ate per plan  [Yes] [No]                for your records
│ ▸ Anything unavailable today?
│ [            Build session            ]
```

```
TRAINING, BLOCK A (T-06)
│ ‹  12:40 elapsed · ~26 min left          A ● B ○ C ○   ⋯
│ A1  Goblet Squat                                ⓘ  Why
│     Squat · Main lift · Building · Alloy library
│     3 × 8 @ 40 lb · rest 90 s after the pair
│     Last: Tue 8, 8, 7 @ 40 lb · Good
│     1   8 reps · 40 lb                          ✓ logged
│     2   8 reps · 40 lb                [ ✓ 8 · 40 lb ]
│     3   8 reps · 40 lb
│     Swap · Report · Note
│ A2  Kettlebell Row (next)   Row · Main lift · 3 × 8 @ 35 lb
│ ▌ Rest 1:12        −15   +15   Skip
│ Today   History   (+ Alloy)   Equipment   Profile
```

```
LOG ALLOY (A-01 → A-02)
│ ✕  Log Alloy                                   Saved ✓
│ [Today] [Mon 21] [Fri 18] [Pick date]
│ 4:00 pm · Full body ▾ · Duration: Don't know ▾
│ A1  [Goblet squat   ]  [3x10 @35]  Squat   ☐ coach changed
│ A2  [KB row         ]  [3x10 @30]  Row     ☐ coach changed
│ B1  [               ]  [        ]
│ B2  [               ]  [        ]
│ C1 · C2 · Finisher · + Add row
│ Notes
│ Counts: Lower body, Push, Pull. Tomorrow won't repeat: Goblet squat, KB row.
│ Heavy lower-body lifts after Tue 4:55 pm.
│ [                 Done                 ]
```
</content>
</invoke>
