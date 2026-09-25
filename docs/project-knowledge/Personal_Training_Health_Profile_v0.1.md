# PERSONAL TRAINING HEALTH PROFILE
**Version 0.1 · September 2026**
**Subject:** Nelson Yong · male · age 41 · 5'9" · Kirkland, WA
**Prepared from:** the "Health" Claude Project only (project files, prior project chats, project memory). No outside medical or fitness knowledge was added as fact.
**Purpose:** give the Personal Training OS enough health and physical context to make sensible exercise-selection and workload decisions. This is a factual handoff, not a workout prescription, not a diagnosis, and not medical advice.

---

## 0. HOW TO READ THIS DOCUMENT

### 0.1 Evidence labels

| Label | Meaning |
|---|---|
| `DX` | Documented diagnosis (chart problem list or clinician-written diagnosis) |
| `TEST` | Documented test or exam finding |
| `CLIN` | Guidance actually given by a clinician (physician, NP, PT, surgeon) |
| `PR-SYM` | Patient-reported symptom |
| `PR-FUNC` | Patient-reported functional limitation |
| `PR-GOAL` | Patient-reported goal or preference |
| `HIST` | Historical or resolved |
| `CUR` | Current as of the latest record |
| `UNC` | Uncertain, conflicting, or unreconciled in the records |
| `UNK` | Unknown: the Health Project does not establish it |
| `AI-PLAN` | **Added label.** Written by Claude inside the Health Project (plans, app rules, "safety rules," literature summaries). Not issued or confirmed by any clinician or trainer. Many training "rules" in the Health Project fall in this category, and the receiving system should not treat them as clinical restrictions. |

### 0.2 Source key

| Code | Source | Date / currency |
|---|---|---|
| S1 | MG / Autoimmune Health & Insurance Master Brief | Last updated Sept 11, 2026 |
| S2 | Records Review June 2026 Addendum (reconciled against primary clinic notes) | June 1, 2026. **Weighted most heavily where master docs diverge from clinic notes.** |
| S3 | Health Optimization Master Document | Aug 2026 (last addendum Aug 21, 2026) |
| S4 | Spine, Posture & Rehab Framework | May 22, 2026 |
| S5 | DailyArms Handoff Brief + DailyAbs.html | Sept 2026 |
| S6 | Health Dashboard | Snapshot June 1, 2026 |
| S7 | Fat-loss / recomposition research report | ~May 2026 |
| S8 | Tirzepatide Decision Framework | June 5, 2026 |
| S9 | Sleep Architecture Protocol + Sleep Dashboard | June–July 2026 |
| C1 | Project chat: DailyAbs build | Sept 2026 |
| C2 | Project chat: DailyArms build | Sept 2026 |
| C3 | Project chat: tirzepatide course | July–Sept 2026 |
| C4 | Project chat: apartment-gym trainer posting | July 2026 |
| M | Health Project memory summaries | Updated through Sept 22, 2026 |

### 0.3 Known reliability issues inside the Health Project

1. **Master documents overstate certainty relative to clinic notes.** S2 was written specifically to correct this. Where S1/S3 and S2 disagree, S2 and the dated clinician quotes in S1 §16 are closer to primary sources.
2. **Biopsy is described two ways.** S1 §3 and S3 say "negative for primary muscle disease, so symptoms are signaling dysfunction." S2 and Dr. Preston (8/7/2026, quoted in S1) say **"active and chronic neurogenic changes,"** not the pattern expected from MG. The second description is the more current and more primary.
3. **TED status is contested.** S1/S3 say "inactive." S2 documents a disagreement between two eye specialists. Treat as `UNC`.
4. **Right triceps strength grade is unreconciled** (3/5 vs 4/5). See §2 and §5.

---

## 1. EXECUTIVE TRAINING CONTEXT

The factors most likely to matter for strength training, in order of how directly the Health Project ties them to training:

1. **Long-standing focal right triceps weakness.** First noticed 2022, isolated to the right triceps/arm (`PR-SYM`, `HIST` onset). Graded **3/5** on neurosurgery exam 4/27/2026 (`TEST`) and **4/5** in the treating neurologist's letter 5/6/2026 (`TEST`, `UNC`: never reconciled). In Sept 2026 the patient stated 3/5 "is still accurate" and that **the weakness builds within a set** (`PR-FUNC`, `CUR`). Other tested upper-limb muscles (biceps, deltoids, wrist extensors, hand intrinsics) and lower-limb strength were normal on 4/27/2026 (`TEST`). The weakness is described as painless with no sensory loss (`TEST`/clinician observation, per S2).
2. **The cause of that weakness is unresolved.** Candidates in the records are myasthenia gravis and a cervical nerve-root / neurogenic process (`UNC`). The treating neurologist expects the eyes to respond to treatment more than the triceps and said the **triceps may not return to full strength** (`CLIN`, 8/7/2026).
3. **Myasthenia gravis diagnosis on the chart, with documented diagnostic uncertainty.** Problem list: "Myasthenia gravis without exacerbation," ICD-10 G70.00 (`DX`, 6/26/2026). The treating neurologist has also said the diagnosis is "not entirely clear" and is running a **therapeutic trial** approach (`CLIN`, `UNC`). Main documented symptoms are ocular (left eyelid droop, double vision) plus the right triceps. MG-ADL rose from 5 (Mar 2026) to 8 (clinician-scored, Aug 7, 2026) (`TEST`, `CUR`).
4. **Resistance training clearance: patient-reported only.** The patient stated in Sept 2026 that his neurologist (Dr. Preston) "has cleared me" for resistance training (`PR`, `CUR`). No written clearance, scope, or limits appear in the project (`UNK`).
5. **Unresolved exertional capacity drop.** Patient reported an estimated **20–40% reduction in lifting and cardio capacity** at 4–5 pm sessions during the tirzepatide course (Jul–Aug 2026) (`PR-FUNC`). Leading hypothesis in the project is under-fueling from appetite suppression; an MG-related cause was not excluded. Last recorded status (Aug 21, 2026): still unresolved (`UNC`).
6. **Active weight-loss phase on a GLP-1/GIP medication.** Compounded tirzepatide since July 2026, goal ~160 lb from ~182 lb (`PR-GOAL`). **Lean-mass preservation is a stated non-negotiable** (`PR-GOAL`). Protein target 130–160 g/day (`PR-GOAL`).
7. **Immunosuppression.** Mycophenolate 1,500 mg twice daily (`CUR`). Mild lymphopenia on 6/1/2026 labs (`TEST`). A second immune-targeting drug (Vyvgart Hytrulo) is prescribed but **not started**; insurance access has been denied three times (latest 9/2/2026) (`CUR`).
8. **Graves' disease on methimazole** (`DX`, `CUR`). Overnight resting heart rate swings (~15 bpm) observed in wearable data (`TEST`-like wearable data, not clinician-read).
9. **Short, late sleep.** Wearable data (June–July 2026) showed ~5.2 h average total sleep with a delayed sleep window (`TEST`-like wearable data). A later patient report (late July) described 7–8 h (`PR`, `UNC`).
10. **Current training structure:** trainer-led circuit weight training Mon/Wed/Fri afternoons at Alloy Fitness (Kirkland), plus a home arm/shoulder program (DailyArms) built Sept 2026 (`CUR`). What the trainer actually programs and modifies is `UNK`.

**No clinician-established exercise prohibitions exist in the Health Project** (see §9). The practical exclusions currently in use come from the patient's own reports and from Claude-authored app rules (§8.4, §10).

---

## 2. CURRENT HEALTH CONDITIONS RELEVANT TO TRAINING

### 2.1 Myasthenia gravis (MG), AChR-antibody positive

| Field | Detail |
|---|---|
| Status | `DX` on problem list (G70.00, confirmed 6/26/2026). Diagnostic certainty **contested by the treating neurologist himself** (`UNC`). |
| Timeframe | Workup began with right triceps weakness (2022). Positive antibody and MG framing emerged over 2024–2026. |
| Documented vs suspected | **Supporting:** positive AChR antibody, described as low / "mild positive" (binding titer ~0.21 per S2) (`TEST`); fatigable left ptosis worsening on sustained upgaze (`TEST`, 2/25/2026 and 8/7/2026); three UW specialists document MG in signed notes. **Against / complicating:** stimulated single-fiber EMG 6/23/2025 normal, sampled left eyelid muscles only (`TEST`); repetitive nerve stimulation largely negative, >10% decrement at right brachioradialis "of uncertain significance" (`TEST`); muscle biopsy showed neurogenic changes (`TEST`). Dr. Preston 8/7/2026: "is this really myasthenia gravis? I think that question still is there." |
| Current treatment | Mycophenolate 1,500 mg BID (`CUR`). Pyridostigmine stopped 8/4/2025, no benefit (`HIST`). Vyvgart Hytrulo prescribed, **not started** (`CUR`). Never taken steroids (`CUR`). |
| Symptoms relevant to exercise | Persistent left eyelid droop; double vision, especially rightward and upward gaze (`TEST`, 5/6/2026 letter). Right triceps weakness. "Weakness affecting exercise and physical activity" is listed among documented symptoms in the 5/6/2026 letter (`TEST`/clinician-documented). |
| Known functional effects | MG-ADL: 8 (8/4/2025, Goldstein), 5 (3/5/2026, Preston), 6 (3/30/2026, Goldstein), patient self-score 9 (8/6/2026), **8 (8/7/2026, Preston)** (`TEST`). Domains recorded at 5/6: talking, chewing, swallowing, breathing, brushing/combing, rising from chair all 0; diplopia 2; ptosis 3. On 3/30/2026 "chair" scored 1 (Goldstein). Domain breakdown for the 8/7/2026 score is `UNK`. |
| Explicit clinician guidance | No exercise-specific guidance recorded. Resistance training clearance is patient-reported (§8). Preston 8/7/2026: expect eyes to improve most; triceps may not fully recover; reassess treatment at ~3 months / a couple of cycles. |
| Unknown | Whether the triceps weakness is MG-driven. Scope of training clearance. 8/7/2026 MG-ADL domain scores. Whether Vyvgart will be started and when. Genetic panel (congenital myasthenic syndrome / myopathy) deferred 8/7/2026, results `UNK`. |

### 2.2 Right triceps weakness with cervical spine / nerve findings (treated as its own entry because its cause is contested)

| Field | Detail |
|---|---|
| Status | `CUR`. Cause `UNC`. |
| Timeframe | Onset 2022, "present for many years" (Houston, 4/27/2026). |
| Documented findings | Right triceps 3/5 (Houston 4/27/2026) vs 4/5 (Preston letter 5/6/2026) (`TEST`, `UNC`). Deep tendon reflexes absent at bilateral triceps, 1-/4 at biceps (Houston) (`TEST`); S2 records a "trace right triceps reflex" from other notes (`UNC`: reflex descriptions differ between notes). Cervical MRI: C6-7 right foraminal stenosis (Houston) (`TEST`); multilevel cervical stenosis worst at C5-6/C6-7 and a "mild chronic right C8-T1 radiculopathy" (S2, from clinic notes) (`TEST`). Spurling's test negative (`TEST`). No radicular pain, no dermatomal numbness (`TEST`/history). Muscle biopsy 2/20/2026: neurogenic changes (`TEST`). |
| Clinician interpretations (conflicting) | UW neuromuscular team: weakness "either secondary to cervical radiculopathy or myasthenia." Goldstein: uncertain which contributor is greatest. Houston (neurosurgery): "not highly consistent with a right C7 radiculopathy"; surgery would not improve the triceps. Preston 8/7/2026: neurogenic biopsy raises possibility of a coexisting nerve process; triceps may not return to full strength. |
| Current treatment | None specific to the arm. No surgery recommended. |
| Symptoms relevant to exercise | Right triceps weakness that **builds within a set** (`PR-FUNC`, Sept 2026). Push-up-position planks difficult (`PR-FUNC`). Dips difficult (`PR-FUNC`). Painless (`TEST`/history). |
| Conflict to preserve | A Feb 2026 neuro-ophthalmology history recorded the patient saying the triceps weakness "isn't necessarily worse with activity" (`HIST`, `UNC`). The Sept 2026 patient report says it builds within a set. |
| Unknown | Which grade is current per a clinician. Left triceps strength grade (not stated in project records). Whether the weakness is improving, stable, or worsening on a clinician's exam since April 2026. Any clinician statement on loaded right-triceps work. |

### 2.3 Graves' disease

| Field | Detail |
|---|---|
| Status | `DX`, `CUR`. Described as active/stabilizing. |
| Treatment | Methimazole 5 mg daily (`CUR`). |
| Findings | TSH 0.415 (prior) → 0.559 (6/1/2026), T3/T4 normal (`TEST`). TRAb rising 1.12 → 1.64 (`TEST`). Overnight RHR swings of ~15 bpm in wearable data, flagged as a question for endocrinology (`UNC`). |
| Exercise-relevant symptoms | None patient-reported in the project. |
| Clinician guidance | None exercise-specific. |
| Unknown | Whether endocrinology has any view on heart-rate response to training. Results of a pending morning draw (thyroid, testosterone panel, celiac panel). |

### 2.4 Thyroid eye disease (TED)

| Field | Detail |
|---|---|
| Status | `UNC`. Treated with teprotumumab (Tepezza) in 2023, 8 sessions (`HIST`). Master docs call it inactive. Dr. May (UW) documents "significant ophthalmoplegia from TED, likely combined with MG." Dr. Grazko (Evergreen) reads diplopia as primarily MG, left lid as pseudoptosis, CT orbit (7/2024) without TED muscle involvement. |
| Exercise-relevant findings | Bilateral proptosis, abnormal eye movements both eyes, left lid MRD1 1 mm vs right 4 mm (`TEST`, 2/25/2026). Intraocular pressure 23 R / 22 L on 2/25/2026, later called "borderline and not worrisome" by Dr. May (`CLIN`, 8/24/2026). |
| Clinician guidance | None exercise-specific. |
| Unknown | Whether any eye finding has a bearing on exercise positions. Not addressed by any clinician. |

### 2.5 Weight management (active weight-loss phase)

| Field | Detail |
|---|---|
| Status | `CUR`. Not framed as a diagnosis in the project. |
| Data | 167 lb (8/2025) → 182 (3/2026) → 183 (6/1/2026) → ~182 at tirzepatide start (7/2026) → 178 plateau (Aug 2026) (`TEST`/`PR`). |
| Treatment | Compounded tirzepatide (§7). Structured home diet with protein target 130–160 g/day and calorie floor ~1,700 (`PR-GOAL`). |
| Exercise relevance | Stated primary risk is appetite suppression pulling intake below the floor, causing lean-mass loss and fatigue that could be confused with MG (`AI-PLAN` framing adopted by patient as a principle, per M). |

### 2.6 Sleep: delayed and short sleep (wearable-data finding, not a clinician diagnosis)

| Field | Detail |
|---|---|
| Status | `UNC` currency. |
| Data | 54-night record (June–July 2026): onset drifting ~2:10 → ~3:30 AM, average total sleep ~5.2 h; deep ~25%, REM ~24–26% (wearable export). Late July patient report: 7–8 h on several nights, Fitbit scores 65–80 (`PR`). |
| Clinician guidance | None. Sleep-disordered breathing screening was listed as a question for neurology (`AI-PLAN`), not ordered. |

### 2.7 Other chart items noted for completeness

- "Myopathy" on problem list since 2/5/2026, likely a pre-biopsy holdover (`UNC`).
- "Myelopathy" in a 2/25/2026 resident note, confirmed a typo by Dr. Preston 8/7/2026 (`HIST`, not a real finding).
- History of shingles; no Shingrix on record (`TEST`/chart). Relevance to training `UNK`.

---

## 3. CURRENT FUNCTIONAL LIMITATIONS

Only limitations documented or reported in the Health Project. Anything not listed is `UNK`, not "normal."

| Domain | Finding | Label | Laterality | Timeframe |
|---|---|---|---|---|
| Strength | Right triceps 3/5 (Houston) vs 4/5 (Preston letter). Patient confirms 3/5 as of Sept 2026. | OBSERVED/DOCUMENTED + PATIENT REPORTED, `UNC` grade | Right | 4/2026–9/2026 |
| Strength | Biceps, deltoids, wrist extensors, hand intrinsics normal; lower-extremity strength normal. | OBSERVED/DOCUMENTED | Laterality not specified in project summary | 4/27/2026 |
| Strength | "Otherwise preserved limb strength." | OBSERVED/DOCUMENTED | — | 5/6/2026 |
| Muscular endurance | Right triceps weakness builds within a set. | PATIENT REPORTED (conflicts with a Feb 2026 history, see §2.2) | Right | Sept 2026 |
| Asymmetry | Right vs left triceps. Left triceps grade not recorded. | DOCUMENTED (right) / `UNK` (left) | Right | — |
| Pushing | Push-up-position planks "difficult for me because of my right triceps." | PATIENT REPORTED | Right | Sept 2026 |
| Pushing | Dips "difficult for my triceps"; patient asked to avoid them. | PATIENT REPORTED | Triceps (right implied) | Sept 2026 |
| Pushing | Neuromuscular condition "limits certain upper-body lifts." Which lifts: `UNK`. | PATIENT REPORTED | — | July 2026 |
| General exercise | "Exercise limitation due to focal arm weakness"; "weakness affecting exercise and physical activity." | DOCUMENTED (appeal letter / master brief) | Right arm | 5/2026 |
| Pulling | No limitation reported. Patient wants biceps loaded heavier. | `UNK` for rows/pulls specifically | — | Sept 2026 |
| Overhead | No limitation reported or documented. | `UNK` | — | — |
| Grip | Hand intrinsics normal on exam. No grip complaint. | OBSERVED/DOCUMENTED | — | 4/27/2026 |
| Upper-body daily function | MG-ADL brushing teeth/combing hair: 2 (8/2025) → 0 (3/2026). | DOCUMENTED, `HIST` for the 2 | — | 2025–2026 |
| Lower-body function | Lower-extremity strength normal on exam. MG-ADL "rising from chair" scored 1 on 3/30/2026 (Goldstein), 0 on 3/5/2026 (Preston). | DOCUMENTED, `UNC` | — | 3–4/2026 |
| Squat / hinge / carry / locomotion | Nothing reported or documented. | `UNK` | — | — |
| Balance / coordination | Patient reported no balance problems or other neurological symptoms in the May 2026 spine baseline. No formal testing. | PATIENT REPORTED (absence) | — | 5/2026 |
| Mobility / ROM | Not measured. Straighter-than-typical cervical curve was a Claude visual impression from phone photos of chiropractic X-rays, explicitly low confidence; no formal read in project. | `UNK` / `AI-PLAN` impression only | Neck | 5/2026 |
| Cardiovascular tolerance | "Reduced cardio capacity" as part of the 20–40% drop at afternoon sessions. | PATIENT REPORTED, `UNC` cause | — | Jul–Aug 2026 |
| Fatigue | General fatigue, body tension, "stress points," tightness. | PATIENT REPORTED | Not localized | 5/2026 |
| Fatigue | Estimated 20–40% reduced lifting capacity at 4–5 pm sessions; described as general low energy, not focal fatigable weakness; no eye, swallowing, or breathing change. | PATIENT REPORTED | General | Jul–Aug 2026 |
| Recovery | No data on between-session recovery. | `UNK` | — | — |
| Pain | None reported (May 2026 baseline). Triceps weakness described as painless. | PATIENT REPORTED + DOCUMENTED | — | 5/2026 |
| Vision | Double vision, worse in rightward and upward gaze; left lid droop worse on sustained upgaze. Exercise impact never reported. | DOCUMENTED | Left lid | 2026 |

**SUSPECTED (not established):** that the right-arm fatigue within a set is MG fatigability. The project frames it both ways; no clinician has confirmed.

---

## 4. PAIN / DISCOMFORT / SYMPTOM TRIGGERS

No biomechanical explanations are given; these are reported associations only.

### 4.1 Reported to worsen performance or symptoms

| Trigger | What happens | Label | Timeframe |
|---|---|---|---|
| Push-up-position planks | Difficult due to right triceps | `PR-FUNC` | Sept 2026 |
| Dips | Difficult for triceps | `PR-FUNC` | Sept 2026 |
| Repeated reps within a set | Right triceps weakness builds as the set goes on | `PR-FUNC` | Sept 2026 |
| Afternoon sessions (4–5 pm) during appetite suppression | Estimated 20–40% lower lifting and cardio capacity; cause unconfirmed | `PR-FUNC`, `UNC` | Jul–Aug 2026 |
| Sustained upward gaze | Left eyelid droop worsens (exam finding, not an exercise observation) | `TEST` | 2/25/2026, 8/7/2026 |
| Tirzepatide dose step-ups and travel | More gas, bloating, bowel urgency (GI, not musculoskeletal) | `PR-SYM` | Aug 2026 |
| Alcohol on tirzepatide | Hangovers "notably tougher" | `PR-SYM` | July 2026 |

### 4.2 Proposed but not observed (do not treat as known triggers)

- Heat, infection, and illness worsening MG: stated in S3/S7 from general MG literature (`AI-PLAN`). Patient has not reported heat sensitivity during training.
- Friday sessions feeling flatter because of Friday tirzepatide dosing: a Claude caution in S3 (`AI-PLAN`), not a patient observation.
- Weights traveling over the face if the right arm fails: a Claude safety design choice in S5 (`AI-PLAN`), not a reported event.

### 4.3 Movements or circumstances that appear tolerated

| Item | Evidence | Label |
|---|---|---|
| Ongoing trainer-led circuit weight training, 3×/week | Continued through Jul–Sept 2026; patient chose to keep it despite the capacity drop | `PR`, `CUR` (tolerance of specific exercises `UNK`) |
| Biceps work | Normal biceps on exam; patient wants biceps prioritized for heavier weights | `TEST` + `PR-GOAL` (actual loads tolerated `UNK`) |
| Leg lifts with back on bench | Patient: "I can definitely start with things like leg lifts" | `PR` expectation, not yet a tolerance report |
| DailyAbs lying/seated core program | **Not started** as of Sept 2026 | `UNK` |
| DailyArms home program | Built Sept 2026; whether started `UNK` | `UNK` |

---

## 5. STRENGTH ASYMMETRIES OR PRIORITY AREAS

| Area | Finding | Laterality | Label | Notes |
|---|---|---|---|---|
| Triceps strength | 3/5 vs 4/5 | Right | `TEST`, `UNC` grade | Patient confirms 3/5 in Sept 2026. |
| Triceps endurance | Weakness builds within a set | Right | `PR-FUNC` | Conflicts with Feb 2026 history. |
| Triceps reflex | Absent bilaterally (Houston) vs "trace right" (S2) | Bilateral / right | `TEST`, `UNC` | Reflex, not strength. |
| Brachioradialis | >10% RNS decrement, uncertain significance | Right | `TEST` | Electrical finding, no strength deficit reported. |
| Cervical foramen | C6-7 foraminal stenosis | Right | `TEST` | Houston judged it not the likely cause. |
| Nerve root | Mild chronic C8-T1 radiculopathy | Right | `TEST` (per S2 summary of clinic notes) | Source test not specified in project. |
| Eyelid | Ptosis, MRD1 1 mm vs 4 mm | Left | `TEST` | Not a training asymmetry, but a monitored symptom. |
| Muscle atrophy | Not documented anywhere in the project | — | `UNK` | No circumference or visual atrophy finding recorded. |
| Arm size symmetry | Not measured | — | `UNK` | A Claude chat speculated the right arm may not fill out to match the left (`AI-PLAN`), not an observation. |

**Areas being rebuilt or monitored**

- Right triceps: monitored via a weak-arm rep log built into DailyArms for medical appointments (`CUR` tool, data `UNK`). Patient framed right triceps as "the weak link" (`PR-GOAL`).
- Patient stated priority for Vyvgart response: eyes first; would consider 50% triceps recovery a win (`PR-GOAL`, 8/7/2026).
- Lean mass overall during weight loss (`PR-GOAL`, non-negotiable).
- Posture themes (deep neck flexors, scapular stability, thoracic mobility, posterior chain) appear in S4 as topics to discuss with a PT (`AI-PLAN`). No PT has assessed or prescribed these.

---

## 6. SURGERIES / PROCEDURES / INJURIES RELEVANT TO TRAINING

| Event | Date | Region | Status | Recovery info | Restrictions | Temporary / current | Unanswered |
|---|---|---|---|---|---|---|---|
| Surgical muscle biopsy (UWMC, Sam Emerson) | 2/20/2026 | Muscle sampled: `UNK` | Completed. Result: neurogenic changes, no primary muscle disease. | PRN acetaminophen and ibuprofen listed "related to biopsy." | **None recorded** in project. | No restriction to carry forward. | Biopsy site; any post-op instructions; wound healing status (presumed complete but not documented). |
| Neurosurgery consult (Houston) | 4/27/2026 | Cervical spine / right arm | Completed. No surgery recommended. | n/a | None given in project. | n/a | None. |
| Procedure visit, EvergreenHealth Sport & Spine (Zehnder) | 2/29/2024 | Inferred spine-directed; nature `UNK` | `HIST` | `UNK` | `UNK` | `HIST` | What was done; any lasting effect. |
| Procedure visit, EvergreenHealth Neurosciences (Dalwadi) | 3/17/2025 | `UNK` | `HIST` | `UNK` | `UNK` | `HIST` | Nature of procedure. |
| EMG/NCS studies | 7/8/2024, 6/23/2025 | Neuromuscular | `HIST` diagnostic | n/a | n/a | n/a | Full findings beyond S2 summary. |
| MRI (cervical, per Houston's review) | 7/25/2025 | Cervical spine | `HIST` diagnostic | n/a | n/a | n/a | — |
| Chiropractic X-rays (Bourree) | 5/19/2026 | Full spine | Chiropractor's read and measurements **not in project** | n/a | `UNK` | `UNK` | Chiropractor's findings and any exercise advice. |
| Emergency department visit (Overlake) | 12/22/2024 | `UNK` | `HIST` | `UNK` | `UNK` | `UNK` | Reason for visit. |
| Physical therapy, Vida Integrated Health | Started 10/31/2023 | Right arm | `HIST`. "Did not help." | n/a | `UNK` | `HIST` | Any exercises prescribed or restrictions given. |
| Chiropractic care for triceps weakness | 2022–2023 | Right arm / spine | `HIST`. "Did not help." | n/a | `UNK` | `HIST` | — |
| Thymectomy | Not done | Chest | Deferred future consideration (Preston, 8/7/2026) | n/a | n/a | n/a | Would change training context if ever scheduled. |

**Injuries:** "Known physical injuries: none major" (`PR`, May 2026).

---

## 7. MEDICATIONS / TREATMENTS POTENTIALLY RELEVANT TO EXERCISE

Only effects that are known, reported, or written in the project are stated. Anything else is marked "verify with clinician."

| Treatment | Status | Relevance category | Known / reported effects | Verify with clinician |
|---|---|---|---|---|
| Mycophenolate mofetil 1,500 mg BID | `CUR` | Immune, scheduling | Mild lymphopenia 1.2 on 6/1/2026 labs (`TEST`). Project docs note increased infection risk (general drug information, not a clinician instruction). Taken morning and evening with supplement spacing rules (`AI-PLAN` timing protocol). | Whether infection risk warrants any gym-hygiene or illness-day rules. |
| Methimazole 5 mg daily | `CUR` | Cardiovascular (via thyroid control) | No exercise effect reported. | Heart-rate considerations during training. |
| Compounded tirzepatide (+ pyridoxine B6), weekly on Fridays | `CUR`. 2 mg from July 2026; 3 mg (30 units) from 8/21/2026. Mid-Sept the patient referred to being at "40 or 50 units" (4–5 mg) (`UNC` current dose). | Fatigue, hydration, recovery, scheduling | Reported: strong appetite suppression; GI effects (gas, bloating, looser stools), worse after dose increases and during travel; tougher hangovers; the 20–40% exertional capacity drop began during this course (causation not established). | Whether the B6 component matters during the neuromuscular workup (handed to neurology and endocrinology by the prescriber; **disclosure messages drafted but not confirmed sent**). Hydration needs on training days. |
| Vyvgart Hytrulo (efgartigimod SC) | **Prescribed, not started.** Denied by insurer 4/10, 5/12, 9/2/2026. Peer-to-peer review is the next step. | Scheduling, immune, fatigue | If started: weekly SC injection × 4 weeks, then 4 weeks off, repeated cycles; self-administered. Project docs (from the label) list infection risk, hypersensitivity/injection reactions, and no live vaccines. S7 reports the label lists **no exercise-specific restrictions**. S3 notes some patients feel mildly worse in the first weeks (general drug information). | Any training adjustments during cycles. The "hold volume steady during cycles 1–2" rule in S3 is `AI-PLAN`. |
| Pyridostigmine | `HIST`. Stopped 8/4/2025, no benefit. | — | — | — |
| Corticosteroids | Never taken. Could come up if insurer requires it. | Strength, recovery, weight | Not applicable now. Preston was asked (open question) whether a steroid trial risks steroid myopathy confounding the picture. | If ever started, training implications should be re-verified. |
| Creatine monohydrate 5 g/day | In supplement plan; also in pre-workout stack | Strength, hydration | No effect reported. S3 lists "confirm creatine with Dr. Preston before Vyvgart" (`AI-PLAN` question, unanswered). | Yes, per project's own open question. |
| Pre-workout (Mr. Hyde Signature V2) + bulk citrulline | `CUR` | Cardiovascular, sleep | Used before afternoon sessions; did not prevent the capacity drop (`PR`). Project caffeine rule: last ~200 mg by ~5–6 PM (`AI-PLAN`). Master doc elsewhere states a noon caffeine cutoff (`AI-PLAN`, conflicting). | Stimulant use with Graves' and HR swings. |
| Topical minoxidil (beard) | `CUR`, ~twice daily, no tolerance issues reported | Cardiovascular (possible HR effect flagged in project) | None reported. Project flagged disclosure to endocrinology as outstanding. | Yes, per project's own open item. |
| Sildenafil 25 mg PRN | On chart; current use `UNK` | Cardiovascular | None reported. | Status on chart. |

---

## 8. CLINICIAN OR TRAINER GUIDANCE

### 8.1 CURRENT GUIDANCE

| Source | Guidance (practical meaning preserved) | Evidence quality |
|---|---|---|
| Dr. Matthew Preston, neurologist (UW) | **Cleared for resistance training.** | `PR` only. Patient statement, Sept 2026. No note, date, scope, or limits in the project. |
| Dr. Preston, 8/7/2026 visit | Eyes are the most likely site of improvement with Vyvgart; the triceps may not return to full strength, possibly due to underlying nerve injury. Reassess at roughly 3 months / a couple of cycles, not a year. | `CLIN` (visit transcript/summary in S1) |
| Dr. Stephen Houston, neurosurgery, 4/27/2026 | Surgery would not improve the triceps weakness; other treatments for other neurologic conditions would be more worthwhile. | `CLIN`. Not a training instruction. |
| Alloy Fitness trainer | Programs around the patient's arm limitation and MG (patient's characterization). | `PR`. Specific exercises, modifications, loads, and rules are `UNK`. |
| Rocki Elam, ARNP (tirzepatide) | Minimum effective dose; 1 mg increments; no sooner than every 3–4 weeks; based on 2–3 week weight trend. | `CLIN`. Not exercise guidance, but affects appetite and scheduling. |

### 8.2 HISTORICAL GUIDANCE

| Source | Guidance | Status |
|---|---|---|
| Dr. Laura Goldstein, 8/4/2025 | Pyridostigmine stopped (no benefit). | `HIST` |
| Dr. Goldstein | Advised against a steroid path due to long-term side effects. | `HIST`, still referenced |
| Chiropractor (2022–2023) | Suggested a neurology referral. | `HIST` |
| Vida Integrated Health PT (from 10/31/2023) | Content of any exercise program `UNK`. | `HIST` |
| EvergreenHealth Sport & Spine (2024) | Content `UNK`. | `HIST` |

### 8.3 UNCLEAR WHETHER STILL CURRENT

- Dr. David Bourree (chiropractic, May 2026 X-rays): no findings or advice recorded in the project.
- Dr. Eugene May, 8/24/2026: "Steroids work great for ocular MG and may be a good option"; eye pressure borderline, not worrisome. Not training guidance; relevant only if steroids begin.

### 8.4 CLAUDE-AUTHORED "RULES" INSIDE THE HEALTH PROJECT (`AI-PLAN`, not clinician or trainer guidance)

Listed so the Training OS knows they exist and knows their provenance. None has been confirmed by a clinician.

- S3 "General MG Workout Rules (Non-Negotiable)": stop before failure with 2–3 reps in reserve; avoid overheating; stop immediately if ptosis worsens during a session; rest-pause encouraged; morning sessions preferred; track sessions.
- S3 4-phase plan: RPE 5–6 and no HIIT before Vyvgart; hold volume during first two Vyvgart cycles; progressive overload after stabilization; heart-rate monitoring for "Graves' cardiac awareness."
- S5 DailyArms brief: never train to failure; stop at first sign of the arm fading; exclude free-weight chest presses, French presses/skull crushers, and overhead presses where a failing right arm could drop weight on the face, head, or shoulder; prefer unilateral, supported, and lighter/slower work; allow uneven per-side doses.
- S5/C1 DailyAbs: no weight through a straight right arm, no push-up-position planks, no mountain climbers, no bird-dogs, no bear crawls. (Only the push-up-position item traces to a patient report. The rest were extrapolated by Claude.)
- S7 research report: keep sessions 45–60 minutes, leave 1–3 reps in reserve, walking as default cardio, reduce volume before protein during fatigue or illness. Literature-based synthesis.
- Stop-and-call lists in S3/S4/S5 (breathing or swallowing difficulty, significant new weakness, rapidly worsening droop or double vision, neck weakness, etc.). Compiled by Claude from general MG and spine red-flag knowledge. No clinician-issued threshold exists in the project.

---

## 9. HARD TRAINING CONSTRAINT CANDIDATES

**Clinician-established hard constraints: NONE ESTABLISHED.**

No physician, therapist, or trainer restriction is documented anywhere in the Health Project.

**Patient-directed exclusions (the patient's own explicit instructions; not clinical restrictions):**

| Constraint | Source / reason | Current status | Confidence | Clinician-confirmed |
|---|---|---|---|---|
| No dips | Patient: "Let's avoid any dips (in my case) since that is difficult for my triceps." | `CUR` (Sept 2026) | High that this is the patient's wish | No |
| No push-up-position planks | Patient: push-up-position planks "are difficult for me because of my right triceps"; accepted their exclusion in DailyAbs. | `CUR` (Sept 2026) | Medium-high (stated as "difficult," not as a prohibition) | No |

Recommendation for the receiving system: treat these two as user-set exclusions until the user says otherwise, and label them in-app as user preference, not medical restriction.

---

## 10. SOFT TRAINING CONSTRAINT / CAUTION CANDIDATES

These warrant conservative selection, slower progression, monitoring, or user confirmation. **None is an established prohibition.**

| # | Area | Basis in the project | Status |
|---|---|---|---|
| S-1 | Loaded right-triceps extension and pressing movements | Right triceps 3/5–4/5, weakness builds within a set, dips and push-up position difficult (`TEST` + `PR-FUNC`). No clinician has addressed loading. | Ask user; confirm with neurologist |
| S-2 | Set termination for the right arm | Within-set fade reported (`PR-FUNC`). "Stop at first fade / no failure" rules exist only as `AI-PLAN`. | Soft; user-confirm |
| S-3 | Pressing where a failed rep could bring weight over the face, head, or shoulder | `AI-PLAN` safety design (S5). No event reported. | Soft; currently used as a default filter in DailyArms |
| S-4 | Straight-arm weight bearing beyond push-up planks (mountain climbers, bird-dogs, bear crawls) | `AI-PLAN` extrapolation from the push-up-plank report. Tolerance never tested. | Soft; user-confirm |
| S-5 | Session capacity at 4–5 pm while appetite is suppressed | 20–40% capacity drop, unresolved (`PR-FUNC`, `UNC`). | Monitor; do not auto-progress on low-capacity days |
| S-6 | Weight-loss phase | Lean-mass preservation is a stated non-negotiable (`PR-GOAL`). | Bias toward maintaining strength and volume over aggressive progression targets |
| S-7 | Disease activity trend | MG-ADL 5 → 8 between Mar and Aug 2026; exam worsening noted 8/7/2026 (`TEST`). | Monitor symptom state before sessions |
| S-8 | Vyvgart cycle weeks (if treatment starts) | Weekly injections × 4; general drug information on infection risk and early transient worsening. Volume-hold rule is `AI-PLAN`. | Future; verify with neurologist when treatment starts |
| S-9 | Illness / infection days | On mycophenolate with mild lymphopenia (`TEST`). Illness-day volume reduction is `AI-PLAN`. | Soft |
| S-10 | Heat | General MG literature cited in S3/S7 (`AI-PLAN`). No patient report of heat intolerance. | Low-priority caution |
| S-11 | Cervical spine | Multilevel stenosis, right-sided foraminal stenosis (`TEST`). No clinician restriction. Patient has no neck pain or radiating symptoms (`PR`, May 2026). | Soft; ask user before heavy neck-loading or axial-loading choices if the system cares |
| S-12 | Heart-rate response | Graves' disease, RHR swings, stimulant pre-workout, topical minoxidil (`TEST`/`PR`). No clinician guidance. | Monitor only |
| S-13 | Sleep deficit days | ~5.2 h average in June–July wearable data (`UNC` currency). | Monitor; use as a readiness input |
| S-14 | Friday sessions (tirzepatide dose day) and post-increase weeks | GI effects after increases reported (`PR-SYM`); energy effect on Fridays is `AI-PLAN` speculation. | Monitor |
| S-15 | Travel weeks (2–3 trips/month) | Schedule disruption; GI worse in transit (`PR`). | Scheduling input |
| S-16 | Upward-gaze positions | Left ptosis worsens on sustained upgaze; diplopia worse in upward/rightward gaze (`TEST`). No exercise impact ever reported or addressed. | Very low confidence relevance; do not restrict without user report |

---

## 11. TRAINING GOALS

### 11.1 CURRENT

| Goal | Detail | Label | Timeframe |
|---|---|---|---|
| Weight target | ~160 lb from ~182 lb start (178 lb as of Aug 2026) | `PR-GOAL` | Active since July 2026 |
| Fat loss with lean-mass preservation | Stated as non-negotiable; "fat loss with vs. without muscle preservation" outcome difference exceeds any cosmetic intervention | `PR-GOAL` | Active |
| Build muscle, lean out | Stated when seeking a trainer | `PR-GOAL` | July 2026 |
| Arm and shoulder development | "More defined and fuller arms and shoulders," target Halloween week 2026 (~30-day block) | `PR-GOAL` | Sept 2026 |
| Biceps emphasis | Concentrate heavier loading on biceps; biceps element on shoulder days | `PR-GOAL` | Sept 2026 |
| Right triceps | Treat as "the weak link"; 50% recovery with treatment would be a win | `PR-GOAL` | Aug–Sept 2026 |
| Core | Daily ab program (DailyAbs) intended; not yet started | `PR-GOAL` | Sept 2026 |
| Protein intake | 130–160 g/day | `PR-GOAL` | Active |
| Appearance | Jawline/facial definition from weight loss discussed as the main visual outcome | `PR-GOAL` (discussion context) | Aug 2026 |

**Prioritization established by the project:** lean-mass preservation is the only goal explicitly ranked as non-negotiable. Treatment priority "eyes first" relates to MG treatment, not training. No other ranking among training goals is established.

### 11.2 OLDER GOALS, POSSIBLY INACTIVE

| Goal | Source | Why possibly inactive |
|---|---|---|
| 160 lb by ~Oct 1, 2026 | S6/S7 (May–June 2026) | Weight plateaued at 178 in August; date not restated since |
| "Keep 2 group lifts + add 1 full-body session" | S6/S7 | Superseded by the Mon/Wed/Fri trainer arrangement |
| Private trainer at apartment gym, 1–2×/week midday | C4 (July 2026) | Apparently superseded by Alloy Fitness; not confirmed either way |
| 4-phase MG workout progression tied to Vyvgart | S3 (`AI-PLAN`) | Vyvgart never started |
| 30/60/90-day posture and mobility framework | S4 (May 2026) | No progress data recorded |

---

## 12. TRAINING HISTORY AND CURRENT ACTIVITY

| Item | Detail | Label |
|---|---|---|
| Current environment | Alloy Fitness, Juanita Village, Kirkland: trainer-led circuit weight training | `CUR` |
| Current frequency | Mon/Wed/Fri, 4 pm onward | `CUR` |
| Schedule decision | Patient chose to keep afternoon trainer sessions rather than move to late morning; the fix being tested is pre-session fueling | `PR`, `CUR` |
| Home equipment | PowerBlock adjustable dumbbells ~10–80 lb per hand (plates shared with EZ curl bar; switching takes time); 2–3 kettlebells (~25 and ~33 lb); flat bench (not always out); yoga mat | `PR`, `CUR` |
| Other access | Apartment gym with free weights, Smith machine, cable machines (July 2026) | `PR`, currency `UNC` |
| Home programs | DailyArms (arms/shoulders, built Sept 2026, target Halloween week); DailyAbs (core, built, not started as of Sept 2026) | `CUR`; adherence `UNK` |
| Arm training frequency | Patient says he can train arms more than 3 days per week | `PR` |
| Experience level | Self-described "intermediate-level lifter" (July 2026); "beginner/intermediate" for core, "getting back into things" (Sept 2026) | `PR` |
| Walking / cardio | Recommended in project plans; actual habit `UNK` | `UNK` |
| Earlier structure | Two group lifting sessions per week referenced in May 2026 research report | `HIST`, `UNC` |
| Prior rehab | Chiropractic (2022–2023) and PT at Vida (from 10/31/2023) for the right arm; neither helped | `HIST` |
| Preferences | Values a trainer who programs around limitations; wants illustrations/explanations because he does not know every movement by name; wants a bench/no-bench option at home; prefers biceps included on shoulder days; wants honest, pressure-tested feedback | `PR` |
| Dislikes | Dips; push-up-position planks. The phrase "cardio you hate" appears in S7; whether the patient actually dislikes cardio is `UNC` | `PR` / `UNC` |
| Tolerated exercises | Not documented beyond continued participation in circuits | `UNK` |
| Coach modifications | Trainer "programs around arm limitation and MG"; specifics `UNK` | `UNK` |
| Travel | 2–3 trips per month, domestic and international | `PR`, `CUR` |
| Pre-workout routine | Mr. Hyde Signature V2 + citrulline + creatine; meal 2–3 h before and shake after as the fueling test | `PR` / `AI-PLAN` plan adopted |

---

## 13. RECOVERY AND FATIGUE CONTEXT

| Topic | Information | Label |
|---|---|---|
| Exertional capacity | Down an estimated 20–40% at 4–5 pm sessions from ~week 3–4 of tirzepatide through at least Aug 21, 2026. Quality: general low energy, not focal fatigable weakness; no eye, swallowing, or breathing change reported. Fueling test (meal 2–3 h prior, optional carb top-off, more hydration) in progress; **outcome not recorded**. The project's pre-committed rule: if properly fueled sessions still underperform, report to Dr. Preston. | `PR`, `UNC` |
| Time-of-day | Patient observation: afternoon sessions underperforming (confounded by fueling). A Feb 2026 clinic history recorded no worsening "over the course of the day." The "MG is better earlier in the day" statement in S3 is general knowledge (`AI-PLAN`), not a patient observation. | `UNC` |
| Within-session fatigue | Right triceps fades within a set | `PR-FUNC` |
| General fatigue | "General fatigue, body tension, stress points" | `PR-SYM` (May 2026) |
| Symptom fluctuation | MG-ADL 5 → 8 (Mar → Aug 2026); exam shows more restricted eye movement 8/7/2026 | `TEST` |
| Sleep | ~5.2 h average, onset ~2–3:30 AM, architecture normal (June–July wearable data). Late-July reports of 7–8 h. Longest restorative nights when falling asleep 2–3 AM with no morning obligations. | `TEST`-like data + `PR`, `UNC` currency |
| Overnight heart rate | ~15 bpm swings; one night RHR 78 (June 4) | Wearable data, not clinician-read |
| Between-session recovery | No data recorded | `UNK` |
| Alcohol | Charted ~4–5 standard drinks/week; tougher hangovers on tirzepatide | `TEST` (chart) + `PR` |
| Weekly medication timing | Tirzepatide Friday evening; Friday is a training day | `PR`, `CUR` |
| Illness | Resolving cold during July 2026 overlapped GI symptoms | `PR`, `HIST` |
| Fueling | Two meals (~500–650 cal, ~40–45 g protein each) + two 30 g protein shakes + fiber drink; target ~1,700+ cal. Low end of plan (~1,400 cal) is below the stated floor. | `PR` plan |

---

## 14. MONITORING SIGNALS FOR A TRAINING APP

User-reported state variables drawn from what the Health Project already tracks (MG weekly template in S1, spine weekly template in S4, weak-arm log in DailyArms, fueling test in S3). **No thresholds or medical decision rules are proposed here**; the project contains no clinician-issued thresholds.

**Pre-session**

1. Overall energy today (1–10)
2. Hours slept last night
3. Fueled per plan? (meal 2–3 h before: yes/no; hydration: yes/no)
4. Right triceps today vs usual (better / same / worse)
5. Eyelid droop today (none / mild / moderate / severe) and double vision today (none / occasional / constant)
6. Any new or unusual symptoms since last session (free text)
7. Days since last tirzepatide dose; dose increased in the last 2 weeks? (yes/no)
8. GI symptoms today (none / mild / significant)
9. Feeling unwell or signs of infection? (yes/no)
10. Alcohol in the last 24–48 h (yes/no)
11. Travel day or travel week (yes/no)
12. Vyvgart cycle status, if treatment ever starts (not started / week 1–4 on / off week) and injection date
13. Tightness: neck, upper back, low back (1–10 each, per S4 template)

**During / post-session**

14. Rep number at which the right arm began to fade, by exercise (the DailyArms weak-arm log already captures this)
15. Session capacity vs usual (percentage estimate, matching how the patient reported the 20–40% drop)
16. Did eyelid droop or double vision change during the session? (yes/no)
17. Session time of day
18. Any pain (location, 0–10); baseline is none
19. New numbness, tingling, or radiating symptoms (yes/no); baseline is none

**Weekly**

20. 7-day average weight
21. Average daily protein (g)
22. Self-scored MG-ADL (8 domains), matching the S1 template
23. Hours to feel recovered after sessions (S4 metric)

Note: the Health Project's documents list breathing difficulty, swallowing difficulty, speech or chewing changes, neck weakness, and rapidly worsening droop or double vision as "stop-and-call" signals. Those lists were compiled by Claude, not a clinician. The app can ask about them, but how to act on them should be confirmed with the neurologist.

---

## 15. OPEN QUESTIONS TO VERIFY

**Clearance and restrictions**
1. What exactly did Dr. Preston clear, when, and with any limits (loads, failure, triceps-specific work, pressing, overhead work)?
2. Does any clinician want loaded right-triceps work limited or avoided?
3. Is there any restriction related to the cervical stenosis findings (axial loading, neck position)?
4. Did the Vida PT (2023) or the chiropractor (2022–2023, May 2026) give any exercise instructions that still apply?

**Status of the right triceps**
5. Which grade is current: 3/5 or 4/5? Has a clinician re-graded it since April 2026?
6. Is the left triceps normal?
7. Is the right triceps weakness improving, stable, or worsening?
8. Does the within-set fade represent MG fatigability or something else? (The Sept 2026 report conflicts with the Feb 2026 history.)

**Capacity and fatigue**
9. What was the result of the fueling test? Has afternoon capacity returned?
10. Has the exertional-capacity note (and the B6 question) actually been sent to Dr. Preston?
11. What was the domain breakdown of the 8/7/2026 MG-ADL of 8? Does it include rising from a chair or grooming?

**Treatment**
12. Current tirzepatide dose (3, 4, or 5 mg)?
13. Will Vyvgart start, and when? Any training guidance from the neurologist for cycle weeks?
14. Is creatine cleared alongside the current and planned medications?
15. Any heart-rate or stimulant guidance from endocrinology given Graves' disease, pre-workout use, and minoxidil?

**Training specifics**
16. What does the Alloy trainer program, and what modifications are already in place?
17. Has DailyArms been started? DailyAbs?
18. Which exercises are known to be well tolerated?
19. Is the apartment gym still in use?
20. Does the user dislike cardio, and what walking/cardio is currently happening?
21. Current sleep duration (the June–July and late-July data conflict)?
22. Muscle biopsy site and whether any post-op issue remains?

---

## 16. MACHINE-READABLE TRAINING HANDOFF

```yaml
profile:
  name: PERSONAL TRAINING HEALTH PROFILE
  version: "0.1"
  date: "2026-09"
  subject: {sex: male, age: 41, height: "5'9\"", location: "Kirkland, WA"}
  provenance: "Health Claude Project only; no external knowledge added as fact"
  evidence_types: [DX, TEST, CLIN, PR-SYM, PR-FUNC, PR-GOAL, HIST, CUR, UNC, UNK, AI-PLAN]
  note: "AI-PLAN = written by Claude in the Health Project; not clinician- or trainer-issued"

HEALTH_CONTEXT:
  - item: "Focal right triceps weakness, long-standing, cause contested"
    status: current
    laterality: right
    evidence_type: [TEST, PR-FUNC]
    confidence: high (existence) / low (cause)
    source_timeframe: "2022 onset; exams 2026-04-27, 2026-05-06; patient report 2026-09"
    current_vs_historical: current
    notes: "3/5 vs 4/5 unreconciled; weakness builds within set per patient"
  - item: "MG diagnosis on chart with treating-neurologist uncertainty"
    status: current
    evidence_type: [DX, CLIN, UNC]
    confidence: medium
    source_timeframe: "2026-06-26 problem list; 2026-08-07 visit"
    current_vs_historical: current
  - item: "Resistance training clearance from neurologist"
    status: current
    evidence_type: [PR]
    confidence: low-medium (no written record)
    source_timeframe: "2026-09"
    current_vs_historical: current
    notes: "Scope and limits unknown"
  - item: "Unresolved 20-40% exertional capacity drop at afternoon sessions"
    status: unresolved
    evidence_type: [PR-FUNC, UNC]
    confidence: medium
    source_timeframe: "2026-07 to 2026-08-21"
    current_vs_historical: current (last known)
  - item: "Active weight-loss phase on compounded tirzepatide"
    status: current
    evidence_type: [PR, CUR]
    confidence: high
    source_timeframe: "2026-07 onward"
  - item: "Immunosuppression (mycophenolate); Vyvgart prescribed not started"
    status: current
    evidence_type: [CUR, TEST]
    confidence: high
    source_timeframe: "2026-09"

CURRENT_CONDITIONS:
  - condition: "Myasthenia gravis, AChR-antibody positive (G70.00)"
    status: current
    evidence_type: [DX, UNC]
    confidence: medium
    source_timeframe: "dx listed 2026-06-26"
    current_vs_historical: current
    notes: "SFEMG normal 2025-06-23 (eyelid only); RNS largely negative; biopsy neurogenic; MG-ADL 8 on 2026-08-07"
  - condition: "Right triceps weakness with cervical findings (possible radiculopathy vs MG)"
    status: current
    laterality: right
    evidence_type: [TEST, UNC]
    confidence: medium
    source_timeframe: "2024-2026"
    notes: "C6-7 right foraminal stenosis; multilevel stenosis C5-6/C6-7; mild chronic right C8-T1 radiculopathy; neurosurgery: not highly consistent with C7 radiculopathy; no surgery"
  - condition: "Graves' disease"
    status: current
    evidence_type: [DX, TEST]
    confidence: high
    source_timeframe: "labs 2026-06-01"
    notes: "Methimazole 5 mg; TSH 0.559; TRAb rising 1.64"
  - condition: "Thyroid eye disease"
    status: uncertain
    evidence_type: [HIST, UNC]
    confidence: low (activity status)
    source_timeframe: "Tepezza 2023; conflicting 2025-2026 specialist reads"
  - condition: "Delayed/short sleep (wearable-data finding, not clinical dx)"
    status: uncertain currency
    evidence_type: [TEST-like wearable data, PR]
    confidence: medium
    source_timeframe: "2026-06 to 2026-07"

FUNCTIONAL_LIMITATIONS:
  - limitation: "Right triceps strength reduced"
    laterality: right
    evidence_type: [TEST, PR-FUNC]
    confidence: high
    source_timeframe: "2026-04-27 (3/5); 2026-05-06 (4/5); 2026-09 patient confirms 3/5"
    current_vs_historical: current
  - limitation: "Right triceps weakness builds within a set"
    laterality: right
    evidence_type: [PR-FUNC, UNC]
    confidence: medium
    source_timeframe: "2026-09"
    notes: "Conflicts with 2026-02 history ('not necessarily worse with activity')"
  - limitation: "Push-up-position planks difficult"
    laterality: right
    evidence_type: [PR-FUNC]
    confidence: high
    source_timeframe: "2026-09"
  - limitation: "Dips difficult"
    laterality: triceps (right implied)
    evidence_type: [PR-FUNC]
    confidence: high
    source_timeframe: "2026-09"
  - limitation: "Reduced lifting and cardio capacity at 4-5 pm sessions (est. 20-40%)"
    evidence_type: [PR-FUNC, UNC]
    confidence: medium
    source_timeframe: "2026-07 to 2026-08"
  - limitation: "Rising from chair MG-ADL 1 (one scorer)"
    evidence_type: [TEST, UNC]
    confidence: low
    source_timeframe: "2026-03-30"
    notes: "Scored 0 by treating neurologist 2026-03-05; lower-extremity strength normal 2026-04-27"
  - limitation: "Other domains (squat, hinge, carry, overhead, balance, mobility, recovery)"
    evidence_type: [UNK]
    notes: "Not documented; do not assume normal or impaired"

ASYMMETRIES:
  - item: "Triceps strength"
    laterality: right weaker
    evidence_type: [TEST]
    confidence: high
    notes: "Left triceps grade not recorded"
  - item: "Triceps reflex"
    laterality: bilateral absent (Houston) vs trace right (S2)
    evidence_type: [TEST, UNC]
    confidence: low
  - item: "Brachioradialis RNS decrement >10%"
    laterality: right
    evidence_type: [TEST]
    confidence: medium
    notes: "Uncertain significance; no strength deficit reported"
  - item: "Eyelid ptosis MRD1 1 mm vs 4 mm"
    laterality: left
    evidence_type: [TEST]
    confidence: high
    source_timeframe: "2026-02-25"
  - item: "Muscle atrophy / girth difference"
    evidence_type: [UNK]

HARD_CONSTRAINTS:
  clinician_established: "NONE ESTABLISHED"
  patient_directed_exclusions:
    - constraint: "No dips"
      source: "Patient instruction, DailyArms chat"
      status: current
      confidence: high
      clinician_confirmed: false
      source_timeframe: "2026-09"
    - constraint: "No push-up-position planks"
      source: "Patient report of difficulty; accepted exclusion in DailyAbs"
      status: current
      confidence: medium-high
      clinician_confirmed: false
      source_timeframe: "2026-09"

SOFT_CONSTRAINTS:
  - {id: S-1, item: "Loaded right-triceps extension and pressing", evidence_type: [TEST, PR-FUNC], confidence: medium, laterality: right, notes: "No clinician guidance on loading"}
  - {id: S-2, item: "Right-arm set termination at first fade / no failure", evidence_type: [PR-FUNC, AI-PLAN], confidence: medium}
  - {id: S-3, item: "Pressing where failed rep lands weight over face/head/shoulder", evidence_type: [AI-PLAN], confidence: low-medium}
  - {id: S-4, item: "Straight-arm weight bearing beyond push-up planks", evidence_type: [AI-PLAN], confidence: low}
  - {id: S-5, item: "Low-capacity afternoon sessions during appetite suppression", evidence_type: [PR-FUNC, UNC], confidence: medium}
  - {id: S-6, item: "Weight-loss phase; lean-mass preservation priority", evidence_type: [PR-GOAL], confidence: high}
  - {id: S-7, item: "MG activity trend worsening Mar-Aug 2026", evidence_type: [TEST], confidence: medium}
  - {id: S-8, item: "Vyvgart cycle weeks if treatment starts", evidence_type: [AI-PLAN], confidence: low, notes: "Not started"}
  - {id: S-9, item: "Illness/infection days on immunosuppression", evidence_type: [TEST, AI-PLAN], confidence: medium}
  - {id: S-10, item: "Heat", evidence_type: [AI-PLAN], confidence: low, notes: "No patient report"}
  - {id: S-11, item: "Cervical stenosis findings", evidence_type: [TEST], confidence: low (training relevance), notes: "Asymptomatic neck per patient 2026-05"}
  - {id: S-12, item: "Heart-rate response (Graves', stimulant pre-workout, minoxidil)", evidence_type: [TEST, PR], confidence: low}
  - {id: S-13, item: "Sleep deficit", evidence_type: [TEST-like data, UNC], confidence: medium}
  - {id: S-14, item: "Friday dose day and post-increase weeks", evidence_type: [PR-SYM, AI-PLAN], confidence: low}
  - {id: S-15, item: "Travel weeks", evidence_type: [PR], confidence: high (frequency)}
  - {id: S-16, item: "Upward-gaze positions", evidence_type: [TEST], confidence: very low (training relevance)}

KNOWN_SYMPTOM_TRIGGERS:
  - {trigger: "Push-up-position planks", effect: "difficult, right triceps", evidence_type: [PR-FUNC], timeframe: "2026-09"}
  - {trigger: "Dips", effect: "difficult, triceps", evidence_type: [PR-FUNC], timeframe: "2026-09"}
  - {trigger: "Repeated reps within a set", effect: "right triceps fades", evidence_type: [PR-FUNC], timeframe: "2026-09"}
  - {trigger: "4-5 pm sessions under appetite suppression", effect: "est. 20-40% lower capacity", evidence_type: [PR-FUNC, UNC], timeframe: "2026-07 to 2026-08"}
  - {trigger: "Sustained upgaze", effect: "left ptosis worsens (exam)", evidence_type: [TEST], timeframe: "2026"}

KNOWN_WELL_TOLERATED_MOVEMENTS:
  documented: "NONE SPECIFICALLY DOCUMENTED"
  indirect:
    - {item: "Ongoing trainer-led circuit training 3x/week", evidence_type: [PR], notes: "Specific exercises unknown"}
    - {item: "Biceps work", evidence_type: [TEST, PR-GOAL], notes: "Normal biceps on exam; user wants heavier biceps loading; tolerated loads unknown"}
    - {item: "Leg lifts lying on bench", evidence_type: [PR], notes: "User expectation, not a tolerance report"}

CLINICIAN_GUIDANCE:
  current:
    - {source: "Dr. Preston (neurology)", guidance: "Cleared for resistance training", evidence_type: [PR], confidence: low-medium, notes: "No written record; scope unknown"}
    - {source: "Dr. Preston 2026-08-07", guidance: "Eyes most likely to improve; triceps may not return to full strength; reassess ~3 months", evidence_type: [CLIN]}
    - {source: "Dr. Houston 2026-04-27", guidance: "No surgery; would not improve triceps", evidence_type: [CLIN]}
    - {source: "Alloy trainer", guidance: "Programs around arm limitation and MG", evidence_type: [PR], notes: "Specifics unknown"}
  historical:
    - {source: "Dr. Goldstein 2025-08-04", guidance: "Pyridostigmine stopped", evidence_type: [CLIN, HIST]}
    - {source: "Dr. Goldstein", guidance: "Advised against steroids", evidence_type: [CLIN, HIST]}
    - {source: "PT Vida 2023; chiropractic 2022-2023", guidance: "Unknown", evidence_type: [UNK, HIST]}
  unclear_currency:
    - {source: "Dr. Bourree chiropractic 2026-05", guidance: "Not recorded", evidence_type: [UNK]}
  ai_authored_not_clinical:
    - "No failure / 1-3 reps in reserve"
    - "Stop session if ptosis worsens"
    - "Avoid overheating"
    - "Prefer morning sessions"
    - "Hold volume during first two Vyvgart cycles"
    - "Exclude free-weight chest press, skull crushers, face-over overhead pressing"
    - "No straight-arm weight bearing, mountain climbers, bird-dogs, bear crawls"
    - "Stop-and-call symptom lists"

CURRENT_TREATMENTS:
  - {treatment: "Mycophenolate 1500 mg BID", status: current, relevance: [immune, scheduling], evidence_type: [CUR], notes: "Lymphocytes 1.2 on 2026-06-01"}
  - {treatment: "Methimazole 5 mg daily", status: current, relevance: [cardiovascular via thyroid], evidence_type: [CUR]}
  - {treatment: "Compounded tirzepatide + B6, weekly Friday", status: current, dose: "3 mg from 2026-08-21; possibly 4-5 mg mid-Sept (UNC)", relevance: [fatigue, hydration, recovery, scheduling], evidence_type: [CUR, PR-SYM, UNC]}
  - {treatment: "Vyvgart Hytrulo", status: "prescribed, not started; denied 3x", relevance: [scheduling, immune, fatigue], evidence_type: [CUR]}
  - {treatment: "Creatine 5 g/day", status: current, evidence_type: [PR], notes: "Clearance with neurologist listed as open question"}
  - {treatment: "Pre-workout (Mr. Hyde V2) + citrulline", status: current, relevance: [cardiovascular, sleep], evidence_type: [PR]}
  - {treatment: "Topical minoxidil", status: current, relevance: [cardiovascular (flagged)], evidence_type: [PR]}
  - {treatment: "Pyridostigmine", status: "discontinued 2025-08-04", evidence_type: [HIST]}
  - {treatment: "Corticosteroids", status: "never taken", evidence_type: [CUR], notes: "Possible future insurer-driven option"}

RECOVERY_FACTORS:
  - {factor: "Exertional capacity drop, fueling test outcome unrecorded", evidence_type: [PR, UNC], timeframe: "2026-07 to 2026-08"}
  - {factor: "Sleep ~5.2 h avg, late onset (vs later 7-8 h reports)", evidence_type: [TEST-like data, PR, UNC], timeframe: "2026-06 to 2026-07"}
  - {factor: "Calorie floor ~1,700; plan low end ~1,400", evidence_type: [PR-GOAL]}
  - {factor: "Protein 130-160 g/day", evidence_type: [PR-GOAL]}
  - {factor: "Alcohol ~4-5 drinks/week charted", evidence_type: [TEST]}
  - {factor: "Travel 2-3x/month", evidence_type: [PR]}
  - {factor: "Friday tirzepatide dose on a training day", evidence_type: [PR]}
  - {factor: "Between-session recovery", evidence_type: [UNK]}

TRAINING_GOALS:
  current:
    - {goal: "~160 lb from ~182 lb (178 as of 2026-08)", evidence_type: [PR-GOAL]}
    - {goal: "Fat loss with lean-mass preservation (non-negotiable)", evidence_type: [PR-GOAL], priority: explicit}
    - {goal: "Build muscle, lean out", evidence_type: [PR-GOAL], timeframe: "2026-07"}
    - {goal: "Fuller, more defined arms and shoulders by Halloween week 2026", evidence_type: [PR-GOAL]}
    - {goal: "Biceps prioritized for heavier loading", evidence_type: [PR-GOAL]}
    - {goal: "Right triceps treated as weak link; 50% recovery with treatment = win", evidence_type: [PR-GOAL]}
    - {goal: "Daily core program (not started)", evidence_type: [PR-GOAL]}
  possibly_inactive:
    - {goal: "160 lb by ~2026-10-01", source_timeframe: "2026-05/06"}
    - {goal: "2 group lifts + 1 full-body session/week", source_timeframe: "2026-05/06"}
    - {goal: "Apartment-gym private trainer 1-2x/week", source_timeframe: "2026-07"}
    - {goal: "4-phase Vyvgart-linked progression (AI-PLAN)", source_timeframe: "2026-06/08"}
    - {goal: "30/60/90 posture framework", source_timeframe: "2026-05"}

TRAINING_HISTORY:
  current_environment: "Alloy Fitness, Juanita Village, Kirkland; trainer-led circuits"
  frequency: "Mon/Wed/Fri, 4 pm onward"
  home_equipment: "PowerBlock ~10-80 lb/hand (plates shared with EZ bar); kettlebells ~25 and ~33 lb (2-3 total); flat bench (not always out); mat"
  other_access: "Apartment gym: free weights, Smith machine, cables (2026-07; currency UNC)"
  home_programs: {DailyArms: "built 2026-09; started UNK", DailyAbs: "built; not started as of 2026-09"}
  arm_frequency_tolerance: "User says >3 days/week OK (PR)"
  experience: "Self-described intermediate lifter (2026-07); beginner/intermediate core (2026-09)"
  prior_rehab: "Chiropractic 2022-2023 and PT 2023 for right arm; neither helped (HIST)"
  preferences: ["trainer who programs around limitations", "movement illustrations/explanations", "bench/no-bench option", "biceps on shoulder days", "honest feedback"]
  dislikes: ["dips", "push-up-position planks", "cardio (UNC)"]
  coach_modifications: UNK

MONITORING_VARIABLES:
  pre_session: [energy_1_10, sleep_hours, fueled_meal_2_3h, hydrated, right_triceps_vs_usual, ptosis_today, diplopia_today, new_symptoms_text, days_since_tirzepatide_dose, recent_dose_increase, gi_symptoms, unwell_or_infection, alcohol_24_48h, travel, vyvgart_cycle_status_if_started, tightness_neck_upperback_lowback]
  intra_post_session: [right_arm_fade_rep_by_exercise, capacity_vs_usual_pct, ptosis_or_diplopia_change_during_session, session_time_of_day, pain_location_0_10, new_numbness_tingling_radiating]
  weekly: [weight_7day_avg, avg_protein_g, self_mg_adl_8_domains, recovery_hours_after_sessions]
  note: "No clinician-issued thresholds exist; stop-and-call lists in the Health Project are AI-authored and need neurologist confirmation"

OPEN_QUESTIONS:
  - "Scope, date, and limits of neurologist's resistance-training clearance"
  - "Any clinician limit on loaded right-triceps work, pressing, or overhead work"
  - "Any restriction related to cervical stenosis"
  - "Current right triceps grade (3/5 vs 4/5); left triceps grade"
  - "Is right triceps improving, stable, or worsening"
  - "Is within-set fade MG fatigability (conflicting histories)"
  - "Fueling test outcome; has afternoon capacity returned"
  - "Was exertional-capacity note and B6 question sent to neurologist"
  - "8/7/2026 MG-ADL domain breakdown"
  - "Current tirzepatide dose"
  - "Vyvgart start date and cycle-week training guidance"
  - "Creatine clearance"
  - "Endocrinology view on heart rate, stimulants, minoxidil"
  - "What the Alloy trainer programs and modifies"
  - "DailyArms / DailyAbs started?"
  - "Known well-tolerated exercises"
  - "Apartment gym still in use"
  - "Cardio preference and current walking habit"
  - "Current sleep duration"
  - "Biopsy site and any residual issue"
  - "PT (2023) and chiropractic instructions, if any"
```

---

*End of Version 0.1. This profile should be re-reconciled whenever the Health Project records a new clinician visit, a Vyvgart start, a dose change, or a re-graded right triceps. Where this document says UNKNOWN, the Training OS should ask the user rather than fill the gap.*
</content>
