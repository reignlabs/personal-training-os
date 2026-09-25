# Personal Training OS | Alloy-Inspired — V0 Canonical Exercise Database

This is the V0 data-engineering deliverable: a normalized, provenance-preserving exercise model
built from the four RAW documents in this project (`Alloy Exercise Library Harvest.md`,
`Alloy Exercise Library Harvest 2.md`, `RAW_01_ALLOY_FORENSIC_REPORT_STRONG.md`,
`RAW_01_ALLOY_FORENSIC_REPORT_STRONG_2.md`). No workout-generation logic, difficulty scoring, or
personal-suitability judgment is included — this is exercise-library construction only, per the
project's evidence-discipline and modular-architecture rules.

**Read `unresolved_questions.md` first**, especially §0. Two of the four RAW documents describe
larger underlying datasets (a 229-exercise harvest, a 72-workout corpus) that were packaged as
Excel/CSV/SQLite/JSON files in a prior session and are not retrievable in this project — only
those documents' narrative text was available here. This dataset (103 exercises) is everything
recoverable as text from all four documents; it is not the full 229-exercise harvest those
documents describe, and should not be cited as such.

## Files

| File | What it is |
|---|---|
| `canonical_exercise_schema.json` | JSON Schema for one exercise record — every field defined, typed, and annotated with which evidence domain populates it and why it's null where it's null. Read this before reading the dataset. |
| `exercise_dataset.json` | The canonical dataset, full fidelity (list-valued fields kept as arrays). 103 rows. |
| `exercise_dataset.csv` | Same 103 rows, flattened for spreadsheet use (list fields joined with `; `). |
| `alias_table.csv` | Every original/variant name found across all four documents, mapped to one `exercise_id`, with a dedup rationale, a confidence level, and a `flagged_uncertain` boolean for merges that are not certain. |
| `sources.csv` | Registry of every source referenced by the dataset: a real resolvable Alloy URL where one exists, or (for the two forensic-report documents' internal research citations) the origin document plus the citation marker as printed, honestly marked as having no resolvable URL in the visible text. |
| `exercise_evidence.csv` | The authoritative fact-level table: one row per `(exercise_id, source_id, evidence_classification)`, with the specific fact text that classification supports. **This is the source of truth for provenance** — `exercise_dataset`'s `evidence_classification` column is a lossy single-value rollup of this table. |
| `system_metadata_schema.json` | Schema only, deliberately zero rows, for the separate SYSTEM_METADATA layer (difficulty, contraindications, goal/weakness scores, progression trees) the project instructions say must stay isolated from source-derived evidence. |
| `unresolved_questions.md` | Every uncertain duplicate, cross-document naming conflict, real evidentiary contradiction found in the sources, and the backlog of thinly-evidenced exercise names not promoted to full rows. |

## How the 103 rows break down

- **Tier 1 — 52 exercises** transcribed directly from `Alloy Exercise Library Harvest.md`'s three
  aligned tables (Explicitly Documented / Directly Observed / Analytic Classification). Full
  evidence triad: equipment, cues, purpose, regressions/progressions, observed reps/sets/pairings/
  formats, and analyst movement classification, each tied to a real per-exercise Alloy URL.
- **Tier 2 — 51 exercises** named with concrete, citable evidence in the two forensic reports and
  Harvest 2's narrative (a dated workout appearance with reps/sequence, an explicit documented
  progression/regression chain, or its own taxonomy-table definition) but without the full Tier-1
  triad. Most fields on these rows are genuinely `null` — that is an honest evidence gap, not a
  data-entry omission. `tier2.py`'s module docstring states the exact inclusion bar used.

Every row's evidence is classified using the project's four-level scheme:
`ALLOY_DOCUMENTED` (Alloy stated it directly) / `ALLOY_OBSERVED` (recovered in a specific public
workout or demonstration) / `SUPPORTED_PATTERN` (an inferred pattern already present in the
source research, not invented by this build) / `SYSTEM_DESIGN` (a rule this application creates —
used nowhere in this dataset; reserved for `system_metadata_schema.json` only).

## Verification performed before delivery

- No duplicate `canonical_name` / `exercise_id` values.
- Every `exercise_id` referenced by `alias_table.csv` and `exercise_evidence.csv` exists in
  `exercise_dataset.json`.
- Every `source_id` referenced anywhere resolves to a row in `sources.csv`.
- Every exercise has a computed `evidence_classification` rollup (no silent gaps).
- An automated pass cross-checked every alias string against every canonical name in the dataset
  and flagged the one real collision found (`Dumbbell Bench Press` — see `unresolved_questions.md`
  §1) rather than letting it merge silently.

## Suggested next steps (not part of this delivery)

1. Locate and attach the original Harvest-2 Excel/CSV/SQLite files and the RAW_STRONG_2 workout
   corpus CSV/JSON if they still exist anywhere, and re-run a second harvest pass against them —
   see `unresolved_questions.md` §0.
2. Resolve the naming conflicts in `unresolved_questions.md` §1–3 with a human call, or with
   additional primary-source lookups.
3. Build a single controlled `primary_pattern` vocabulary (§5) as an explicit SYSTEM_DESIGN
   decision, recorded in SYSTEM_METADATA, not merged into this evidence layer.
4. Cross-check `equipment_requirements` strings against this project's separate Equipment Library.
