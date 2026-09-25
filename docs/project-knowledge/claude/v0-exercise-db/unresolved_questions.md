# Unresolved Classification Questions — V0 Exercise Database

This file is a required deliverable, not an appendix. Per the project's evidence-discipline
rule ("flag uncertain duplicates rather than silently merging them" / "preserve uncertainty"),
every genuine ambiguity found while building `exercise_dataset.json` is recorded here instead
of being resolved by guessing. Nothing below has been "fixed" in the dataset — these are open
questions for a human (or a future harvest pass) to close.

## 0. The most important limitation: two of the four RAW documents are summaries of data this build could not access

`Alloy Exercise Library Harvest 2.md` describes a 229-exercise / 36-source / 372-observation
dataset and repeatedly links to an Excel workbook, a master CSV, a master JSONL, and a SQLite
database. `RAW_01_ALLOY_FORENSIC_REPORT_STRONG_2.md` similarly describes a 72-workout corpus and
links to a CSV/JSON/schema file. **All of these links point at `sandbox:/mnt/data/...` paths from
a prior, unrelated session's temporary filesystem — they do not exist in this project and were not
retrievable.** Both documents' *prose* is real evidence and was mined for this build (progression
chains, specific workout line-items, taxonomy tables, dedup rules), but their headline exercise
counts (229 unique exercises, 372 observations, 72 workouts) describe data this build never had
in hand. **The 103-exercise dataset delivered here is everything that could actually be
recovered as text from the four documents' visible content — it is not, and should not be
mistaken for, the full 229-exercise harvest those documents advertise.** If the original Excel/
CSV/SQLite/JSON files can be located and attached to this project, a second harvest pass should
re-run against them; it would likely more than double this dataset and resolve several of the
duplicate questions below with real per-row data instead of inference.

## 1. Auto-detected canonical-name collision (flagged programmatically in alias_table.csv)

**`Dumbbell Bench Press`** is simultaneously:
- an **alias** of `Dumbbell Floor Press` (EX041) per Harvest 1's own `original_Alloy_name` column
  (`"Floor Press, Dumbbell Bench Press"`), and
- a **standalone canonical exercise** (EX054) per RAW_STRONG's "3x2 Workout" Appendix A sample,
  which names a bench-supported "Dumbbell Bench Press" as its own station, distinct from a
  floor-supported press.

Both are real, sourced claims from different documents about what may or may not be the same
movement. **Not merged.** `alias_table.csv` carries an explicit `flagged_uncertain=True` row
documenting this exact conflict. A human should decide whether "floor press" and "bench press"
are the same canonical exercise in this personal system (they are biomechanically different —
floor press has a shortened ROM at the bottom — which argues for keeping them separate) or
whether Harvest 1's own alias mapping should override the forensic report's naming.

## 2. Cross-document canonical-naming conflicts (not simple aliases)

| Case | Harvest 1 calls it | Another document calls it | Status |
|---|---|---|---|
| Suspension bodyweight horizontal row | `TRX Row` (its own canonical name, EX044) | Harvest 2 explicitly canonicalizes the *same class* of movement as `Suspension Bodyweight Row`, with "TRX Row" demoted to an alias, whenever the source establishes the suspension apparatus | Kept as Harvest 1's `TRX Row`; `Suspension Bodyweight Row` added to the alias table pointing at it, `flagged_uncertain=True`. This is a genuine methodological disagreement between the two harvest documents' own naming conventions, not something this build should silently pick a winner on. |
| Anti-rotation/anti-extension quadruped hold | `Bird Dog Plank` (EX003) | Harvest 2's crawling-progression chain calls its base step `Bird Dogs` | Treated as the same exercise on matching purpose language, but flagged low-confidence — "Bird Dog Plank" (a held plank position with a limb lift) and "Bird Dogs" (classically a rep-based quadruped exercise) are not always the same drill in general strength-training usage, and neither source disambiguates. |

## 3. Uncertain exercise-level duplicates carried as SEPARATE rows (not merged)

Each of these pairs may describe the same underlying movement observed through two different
documents' vocabulary, or may be genuinely distinct Alloy exercises. Evidence was insufficient
either way, so **both rows were kept** and cross-referenced in each row's `notes` field:

- **Single-Leg Deadlift** (EX0xx, Tier 2, dumbbell/unspecified implement, from RAW_STRONG's 3x2
  workout and WW53) vs. **Contralateral Single Leg Deadlift** (EX047, Tier 1, kettlebell-specific,
  from the Fab 4 workout). Same movement pattern; implement and naming differ across sources.
- **Racked Kettlebell Squat** (Tier 2, single KB at shoulder) vs. **Kettlebell Front Squat**
  (EX018, Tier 1, KB held by horns at chest) vs. **Goblet Squat** (EX012, Tier 1, KB cupped at
  chest). All three are anteriorly-loaded KB squat variants; the source material treats rack
  position, "by the horns," and "goblet" as meaningfully different holds, but does not prove they
  are never used interchangeably by Alloy coaches in practice.
- **3-Point Row** (Tier 2, RAW_STRONG's 3x2 workout) vs. **2-Point Row** (Tier 2, RAW_STRONG_2)
  vs. **Kettlebell Bent Over Row** (EX014, Tier 1, whose own alias list already includes "2 Pt
  Row"). Three different ground-contact-point counts for what may be one hinge-supported row
  family with a variable base of support.
- **Thruster** (Tier 2, implement/laterality unstated, WW90 ascending ladder) vs. **Single Arm
  Kettlebell Thruster** (EX016, Tier 1, explicitly single-arm, used as a benchmark load test).
- **Power Wheel Rollout** (Tier 2) vs. **Stability Ball Rollout** (EX029, Tier 1, whose own alias
  list already includes "Suspension Ab rollouts"). Same anti-extension rollout pattern, different
  implement named in different sources — implement may or may not matter for how this application
  should treat equipment substitution here.
- **Turkish Get-Up** (Tier 2) vs. **Get-Up Sit-Up** (Tier 2). Both appear in the same general
  corpus era; "Get-Up Sit-Up" may be a simplified floor-based derivative of the Turkish Get-Up
  rather than an unrelated exercise, but no source states the relationship directly.
- **Kettlebell Halo** (Tier 2, KB-in-hand, paired with a lateral lunge in WW40) vs. **Suspension
  Halo** (EX040, Tier 1, TRX/push-up-position based). Same "halo" name, different implement and
  body position — very likely genuinely distinct exercises that happen to share a name, but
  flagged for confirmation rather than assumed.

## 4. A direct evidentiary contradiction about barbells (not an exercise-dedup issue — a data-conflict issue)

RAW_STRONG's Section I quantitative table reports **0% barbell frequency across a 30-workout
sample of "general-population metabolic workouts"** and states barbells are "explicitly absent
from all sampled general-population metabolic workouts." Yet the same document's own Appendix E
progression chain culminates in a **Barbell Deadlift**, RAW_STRONG_2 identifies **Weekend Warrior
81** as "a full-body barbell strength workout," and RAW_STRONG_2's equipment table lists barbells
under "directly observed." **This is a genuine tension inside the source material, not something
this build introduced or can resolve**: barbells appear to be present in some Alloy programming
contexts (heavier/older, or non-"metabolic," strength-block work) and absent from others (rapid-
transition metabolic circuits). The `Barbell Deadlift` row's `notes` field states this explicitly.
Treat any downstream rule like "Alloy never uses barbells" as false; it is only true for the
specific metabolic-circuit sample RAW_STRONG measured.

## 5. No single agreed movement/pattern taxonomy across the four source documents

This is the largest structural gap, and it affects `primary_pattern`, `secondary_patterns`,
`horizontal_vertical`, `stance`, and `plane` on nearly every row. The four documents each use a
**different classification vocabulary** for the same underlying kinesiology:

- Harvest 1's "Analytic Classification" table: free-text `movement_family` / `secondary_pattern`
  pairs (e.g. "Hinge" / "Core Stabilization").
- RAW_STRONG's "Movement Taxonomy" (Section K / Appendix C): a fixed 9-token system — HD, KD,
  H-PUSH, H-PULL, V-PUSH, V-PULL, CORE/ANTI, LOC, EMO.
- RAW_STRONG_2's "Exercise taxonomy" table: a differently-organized 16-family list (Knee dominant,
  Hip dominant, Horizontal push, Vertical push, Horizontal pull, Vertical pull, Loaded carry,
  Anti-extension core, Anti-rotation core, Anti-lateral-flexion core, Rotation, Locomotion, Power,
  Conditioning, Mobility, Corrective) that explicitly labels itself analyst-created, not Alloy's.
- Harvest 2 mentions Alloy sometimes states its own pattern language ("pushing, pulling,
  squatting, hip hinging/lunging, anti-extension/anti-rotation") but does not give a full mapping.

**No cross-walk between these four vocabularies exists in the source material**, and this build
did not invent one (that would be exactly the kind of SYSTEM_DESIGN-into-evidence contamination
the project's rules prohibit). The practical consequence: `primary_pattern` values in this
dataset are **verbatim from whichever document produced that row** and are not guaranteed
comparable across rows from different tiers/documents. Building a single controlled
`primary_pattern` enum for the Programming Rules module is real, necessary future work — and
must be done as an explicit SYSTEM_DESIGN decision recorded in SYSTEM_METADATA, not smuggled into
this evidence layer.

## 6. Interpretive caveat on what "ALLOY_OBSERVED" actually proves

RAW_STRONG_2 explicitly warns: *"That is more defensible than assuming that current in-studio
training looks like the historical Weekend Warrior metabolic circuits, which were public
standalone workouts and not necessarily literal member programming."* Nearly every
`ALLOY_OBSERVED` fact in `exercise_evidence.csv` comes from these public Weekend-Warrior-style
posts. **An `ALLOY_OBSERVED` classification means "this exercise was prescribed, with these
numbers, in a specific public Alloy post" — it does NOT mean "this is what a current in-studio
Alloy client's individualized program contains."** RAW_STRONG_2's own executive findings describe
real evolution from a shared-daily-template era toward six individualized member programs by
2024–2026, and the public post archive may skew toward an earlier, more standardized
"metabolic finisher" style of content that current 1:1 programming does not necessarily
resemble. This matters for the eventual Programming Rules module: treat `observed_rep_ranges` /
`observed_pairings` / `observed_workout_formats` as **"Alloy has publicly prescribed this,"** not
as **"this is Alloy's current default."**

## 7. Undated Tier-1 backbone vs. an era-stratified source

Harvest 1 sets `source_date = NULL` for every single one of its 52 rows ("Date fields are
included in the schema but remain unpopulated due to the absence of timestamp data in the primary
source material"). RAW_STRONG_2, by contrast, is built specifically around era stratification
(1992–2019 licensing era vs. 2019–2023 franchise pivot vs. 2024–2026 current franchise era) and
finds the personalization model changed materially between eras. **This dataset cannot currently
filter Tier-1 exercises by era**, even though era plausibly matters for some of them (e.g. is
"Box Row" from a 2016-era Weekend Warrior post, or current programming?). Recovering approximate
dates for the Tier-1 URLs (several are still-live franchise/category pages that could be
re-fetched and checked for a publish date) is flagged as follow-up work, not attempted in this
pass since it would require live web research beyond the four RAW documents.

## 8. Backlog: named exercises mentioned in source prose but NOT promoted to full rows

These appear only as name-drops inside narrative lists (Harvest 2's "practical exercise coverage"
paragraphs, RAW_STRONG_2's taxonomy-table example lists) with no recovered reps/sets/sequence and
no dedicated taxonomy-row or progression-chain evidence of their own. Per this build's stated
inclusion bar (§ top of `tier2.py`), they were deliberately **not** given exercise_id rows, to
avoid manufacturing plausible-looking but evidence-thin database entries. They are listed here so
a future harvest pass (ideally against the original 229-row Excel/CSV file, see §0) can evaluate
them properly instead of them silently vanishing:

Barbell Back Squat, Landmine Goblet Squat, Single-Arm Landmine Press, Landmine Press, See-Saw
Overhead Press, SA Chest Press, Elevated Reverse Lunge, Contralateral Racked Reverse Lunge,
Goblet Reverse Lunge, Walk-Through Lunge, Goblet Lateral Lunge, Single-Leg Squat, Single-Leg
Squat (unboxed variant), Suspension Single-Leg Squat, Jump Split Squat, Jump Step Lunge, Weighted
Plank, Side Plank with Row, Plank Hip Slap, Plank Lat Pull-Through, Plank Floor Drag / Plank with
DB Drag, Slider Ab Rollout, Barbell Rollout, Bear Hold, Suspension 90-Degree Pull-Up,
Single-Arm Suspension Row (non-pull-up TRX row variant), Kneeling Pulldown (half-kneeling vs.
tall-kneeling ambiguity), Band-Assisted Pull-Up, Sled Push, Box Runs, Lateral Shuffle, Combo
Workout's named exercises (title only recovered), Deck-of-Cards workout's suit-to-exercise
mapping beyond Hearts=push-ups/Diamonds=2-point-rows (Clubs/Spades not recovered), Cinco Workout's
five station exercises (format described, exercises not recovered).

## 9. Equipment strings not yet validated against the project's Equipment Library

`equipment_requirements` is populated as free text exactly as each source states it (e.g. "Box,
Dumbbell / Kettlebell"). This has not been cross-checked against the separate Equipment Library
module described in the project's modular architecture. That reconciliation (e.g. does this
personal apartment gym actually have a "Stability Ball," a "Power Wheel," a "Trap Bar"?) is
explicitly a downstream integration step, not a data-engineering question, and is out of scope
for this pass.
