# Alloy Personal Training Public Exercise Harvest

## Harvest result

I built a normalized, database-oriented inventory of **229 unique exercise entries** from **36 first-party Alloy URLs**, producing **372 source-level observations**. The core evidence came from Alloy's corporate exercise/workout archive, especially the long-running Weekend Warrior series, supplemented by first-party Alloy franchise pages where a movement was publicly depicted or described. The archive alone contains years of named circuits, supersets, complexes, ladders, AMRAPs, timed intervals, strength prescriptions and mobility sequences. citeturn30view3turn30view4turn30view5turn30view6turn31view0turn31view1turn31view3turn32view0turn32view1turn32view2turn32view3turn32view4turn32view5

The master contains every requested field:

`canonical_name`, `original_Alloy_name`, `source_url`, `source_date`, `movement_family`, `secondary_pattern`, `upper_lower`, `push_pull`, `unilateral_bilateral`, `equipment`, `strength_flag`, `power_flag`, `conditioning_flag`, `core_function`, `observed_rep_ranges`, `observed_set_ranges`, `observed_pairings`, and `observed_workout_formats`.

I also added separate fields for `documented_regression`, `documented_progression`, `documented_technique_cue`, `documented_purpose`, evidence bucket, source count, and observation count.

| Coverage measure | Harvested |
|---|---:|
| Unique canonical exercises | **229** |
| Source-level observations | **372** |
| Distinct first-party source URLs represented | **36** |
| Exercises with observed rep prescriptions | **197** |
| Exercises with observed set/round prescriptions | **180** |
| Exercises with explicit pairings recorded | **34** |
| Exercises with observed workout formats | **214** |
| Exercises with an Alloy-documented regression | **6** |
| Exercises with an Alloy-documented progression | **14** |
| Exercises with an Alloy-documented technique cue | **29** |
| Exercises with an Alloy-documented purpose | **59** |
| Direct image-evidence rows | **6** |

The inventory intentionally extends beyond conventional barbell/dumbbell strength exercises. Alloy's public material also names bodyweight conditioning, suspension work, kettlebell complexes, core progressions, carries, crawls, mobility drills and warm-up movements. For example, a current Alloy Madison East first-party article explicitly names bike, brisk walking, rowing, ankle rocks, hip circles, shoulder rotations, spinal rotation, bodyweight squats, unloaded hip hinges and band pull-aparts as warm-up elements. citeturn25search6

## Evidence separation

The workbook keeps the three evidence classes separate rather than blending Alloy statements with analyst interpretation.

### Explicitly documented

An item enters this bucket when Alloy itself names the exercise, includes it in a published workout, specifies reps/sets, states a progression or regression, supplies a coaching cue, or describes a purpose.

This includes very specific public relationships. Alloy's 2019 core progression explicitly sequences **Knee Plank → Traditional Plank → Marching Plank → Plank with a Reach → Around-the-World Plank** and instructs users to maintain a neutral spine, prevent hip rocking and coordinate breathing with the reach. Alloy describes the progression in anti-extension and anti-rotation terms. citeturn28view2

Its posterior-chain progression explicitly sequences **Box Hip Bridge → Limited-ROM Kettlebell Deadlift → Kettlebell Deadlift → Barbell Deadlift**, with cues including pulling the shoulders toward the back pockets, creating a stable foot base, reaching the hips back, keeping weight on the heels, maintaining a neutral spine and feeling the hamstrings. citeturn28view1

The crawling progression likewise names **Bird Dogs → Quadruped Isometric Holds → Bear Crawls → Spider Crawls**, with increased crawl distance presented only after the earlier work is established. citeturn26search0turn32view5

Alloy also publishes genuine exercise modifications. In its 2020 Week 12 workout, an elevated hand position is explicitly recommended to make the push-up, burpee and mountain climber easier. citeturn32view1 In another public workout, Alloy specifically says to regress a burpee-with-push-up by removing the push-up. citeturn31view0 Those relationships are recorded as documented regressions rather than analyst-generated parent/child relationships.

Explicit pairing data are similarly conservative. The Compound Set Workout pairs **Explosive Push-Up + Floor Press**, **Jump Squat + Goblet Squat**, **Explosive Ball Slam + TRX Row**, and **Explosive Broad Jump + Deadlift**, with Alloy explaining that the first exercise is explosive and the second is a very heavy strength movement for the same muscle group. citeturn25search3 A separate 2019 workout explicitly pairs See-Saw Incline Dumbbell Press with Chest-Supported Row, Step-Ups with Stability-Ball Leg Curl, and a Half-Kneeling Low-to-High Chop with Plank under different set/rep schemes. citeturn32view4

### Directly observed

This bucket is reserved for movements publicly depicted on first-party Alloy-hosted franchise pages rather than inferred from generic marketing language. The direct-image evidence sheet records examples such as a weighted plank, kettlebell squat, band-assisted pull-up, dumbbell bench/chest press, overhead carries and sled pushing where first-party imagery supports the movement identification. citeturn24search7turn24search11

These are deliberately separated from normal workout-post evidence so a downstream database can distinguish `"Alloy named this in text"` from `"Alloy publicly demonstrated this in first-party imagery"`.

### Analytic classification

`movement_family`, `secondary_pattern`, `upper_lower`, `push_pull`, `unilateral_bilateral`, standardized equipment, the three training flags, and `core_function` are **analyst-added taxonomy**, not silently presented as Alloy terminology.

That distinction matters because Alloy sometimes supplies its own pattern language. In older public material, Alloy describes training in terms including pushing, pulling, squatting, hip hinging/lunging, and anti-extension/anti-rotation core work. citeturn4search17 But the database's more granular categories, such as `horizontal pull`, `lunge / single-leg knee-dominant`, or `anti-extension; bracing`, remain explicitly analytic.

## Deduplication and relationship rules

Deduplication was intentionally conservative. Simple spelling, abbreviation, plurality and word-order variants were consolidated. Examples include `DB RDL` and `Dumbbell RDL` under **Dumbbell Romanian Deadlift**, `Squat Jumps` under **Jump Squat**, `Box Bridge` under **Box Hip Bridge**, and `TRX Row` under **Suspension Bodyweight Row** when the source explicitly establishes the suspension apparatus. Alloy's public archive repeatedly uses such abbreviated and variant naming across workouts. citeturn30view5turn30view6turn31view0turn31view3

Material exercise variants were **not** collapsed merely because they belong to the same family. The database therefore preserves separate entries such as:

| Preserved separately | Reason |
|---|---|
| Push-Up / Elevated Push-Up / Dead-Stop Push-Up / Slow-Motion Push-Up / Explosive Push-Up / Suspension Push-Up | Alloy publicly names distinct variants or uses them under materially different execution constraints. citeturn32view0turn32view3turn31view1turn25search3 |
| Kettlebell Deadlift / Limited-ROM Kettlebell Deadlift / Double-Kettlebell Deadlift / Kettlebell Suitcase Deadlift | The public sources distinguish ROM, load arrangement or implement configuration. citeturn28view1turn31view1turn25search2 |
| Plank / Marching Plank / Plank with Reach / Around-the-World Plank / Side Plank with Row / Plank Lat Pull-Through | Alloy publishes these as separate exercises or progression steps. citeturn28view2turn30view5turn32view0 |
| Split Squat / Goblet Split Squat / Banded Split Squat / Suspension Single-Leg Squat / Single-Leg Squat to Box | Loading, assistance or movement setup differs explicitly in the source naming. citeturn30view2turn30view5turn30view6turn32view3 |
| Kettlebell Swing / Single-Arm Kettlebell Swing | Alloy itself distinguishes the two-arm movement from its single-arm relative. citeturn33search5 |

I also avoided turning mere circuit adjacency into a `"pairing."` `observed_pairings` is populated only when Alloy explicitly presents a superset, compound set or clear A/B pairing. Everything else stays in `observed_workout_formats`. That prevents a database consumer from concluding, for example, that two movements are a prescribed pair merely because both happened to appear in the same five-exercise circuit.

The same restraint applies to equipment. Where a name or workout context clearly establishes an implement, it is captured. Where public text leaves the loading ambiguous, the record remains `unspecified / source-dependent` instead of guessing.

## Practical exercise coverage

The harvest spans a substantial range of public Alloy exercise vocabulary. Representative strength and power entries include Goblet Squat, Kettlebell Deadlift, Kettlebell Front Squat, Kettlebell Clean, Kettlebell Overhead Press, Dumbbell Romanian Deadlift, Dumbbell Front Squat, Dumbbell Floor Press, Barbell Deadlift, Barbell Back Squat, Barbell Floor Press, Landmine Goblet Squat, Single-Arm Landmine Press, Thruster, Broad Jump and multiple clean, swing and jump variants. Alloy's newer kettlebell article explicitly gives four-set prescriptions and technique/purpose descriptions for Goblet Squat, Kettlebell Deadlift, Suitcase Lunge, Bent-Over Row, Clean, Front Squat and Overhead Press. citeturn30view0turn5search4

The pull inventory includes 2-Point Row, Bent-Over Row, Dumbbell Bent-Over Row, Chest-Supported Row, Batwing Row, Banded Row, Suspension Bodyweight Row, Single-Arm Suspension Row, Suspension Pull-Up, Suspension 90-Degree Pull-Up, Pull-Up, Chin-Up and multiple half-kneeling pulldowns. Alloy's dedicated suspension-row material describes the bodyweight row as working the upper back, arms and core and explicitly notes that difficulty can be altered through body angle. citeturn5search3turn33search5 Alloy separately describes the 2-Point Row as a horizontal pulling exercise involving the lats, upper back, biceps and core. citeturn24search4

The single-leg inventory is similarly broad: Goblet Split Squat, Contralateral Single-Leg Deadlift, Single-Leg Deadlift, Banded Single-Leg Deadlift, Goblet Reverse Lunge, Elevated Reverse Lunge, Contralateral Racked Reverse Lunge, Walk-Through Lunge, Goblet Lateral Lunge, Step-Up, Single-Leg Squat, Single-Leg Squat to Box, Suspension Single-Leg Squat, Jump Lunge, Jump Split Squat and Jump Step Lunge, among others. The Fab 4 workout publicly combines Contralateral Single-Leg Deadlift, Goblet Split Squat, Chin-Up and Burpee for four rounds of eight reps. citeturn25search1 Alloy's dedicated Goblet Split Squat material describes it as a lower-body/core exercise and explicitly notes the stationary setup as an option when forward/reverse lunge momentum bothers the knee. citeturn23search0

Core and ground-based entries include Knee Plank, Plank, Weighted Plank, Marching Plank, Plank with Reach, Around-the-World Plank, Side Plank with Row, Plank Hip Slap, Deadbug, Deadbug Anti-Rotation Hold, Suspension Rollout, Slider Ab Rollout, Barbell Rollout, Bird Dog, Bird Dog Plank, Bear Hold, Bear Crawl, Spider Crawl, Sit-Out and several loaded plank-drag variations. Alloy's own core progression establishes anti-extension and anti-rotation as explicit purposes for several of these movements rather than merely analyst-inferred functions. citeturn28view2

Conditioning and locomotion entries include Burpee variants, Mountain Climbers, Skaters, Jumping Jacks, Floor Jacks, Jump Rope, Box Runs, running, sprinting, lateral shuffles, stationary bike work and crawling. Alloy repeatedly publishes these inside timed circuits, AMRAPs and for-time workouts; for example, Weekend Warrior 64 uses Bike, Burpee, Floor Jacks, Jump Squats and Plank in 40-second work/20-second rest intervals, while Weekend Warrior 69 uses Mountain Climbers, Squat Jumps, Push-Ups, Plank Hip-Slaps and Burpees under the same 40:20 structure. citeturn30view6turn30view5

The database also captures publicly documented workout-format observations instead of trying to derive programming rules from them. Examples in the source corpus include 5×5 strength work, 4×10 and 3×15 structures, EMOMs, 15- and 20-minute AMRAPs, descending and ascending ladders, deck-of-cards workouts, no-put-down complexes, supersets, tri-sets and timed 30:15, 40:20, 45:15, 50:20 and 60:20-style intervals. These are recorded as observations attached to the exercises and sources where they occur, not as assertions about Alloy's proprietary programming system. citeturn30view3turn30view4turn30view5turn31view0turn31view1turn31view2turn31view3turn32view0turn32view1

## Database package

The **Excel workbook is the recommended working artifact** because it keeps the normalized master and the evidence layers separate:

| Sheet | Purpose |
|---|---|
| `exercise_master` | One row per canonical exercise, with all requested fields plus documented-evidence fields |
| `direct_observations` | One row per source/exercise observation, preserving reps, sets, pairing and format |
| `documented_evidence` | Alloy-explicit regressions, progressions, technique cues and purposes |
| `direct_image_evidence` | First-party visual observations only |
| `analytic_classification` | Analyst-created taxonomy isolated from Alloy claims |
| `aliases_dedup` | Original Alloy wording mapped to canonical names, with dedup rationale |
| `sources` | First-party source registry with date precision |
| `data_dictionary` | Field definitions |
| `methodology` | Inclusion, deduplication and evidence-handling rules |

**[Download the complete Excel exercise harvest](sandbox:/mnt/data/alloy_exercise_harvest.xlsx)**

For direct ingestion into a table-oriented workflow:

**[Download the master CSV](sandbox:/mnt/data/alloy_exercise_harvest_master.csv)**

For pipelines that prefer one JSON object per canonical exercise:

**[Download the master JSONL](sandbox:/mnt/data/alloy_exercise_harvest_master.jsonl)**

For direct querying and later normalization, the same material is also packaged as a multi-table SQLite database:

**[Download the SQLite database](sandbox:/mnt/data/alloy_exercise_harvest.sqlite)**

## Coverage boundary and confidence

This should be treated as a **high-coverage public-source harvest, not a claim of mathematical exhaustiveness**. Alloy's indexed corporate workout archive reaches well beyond the 2019–2021 Weekend Warrior material and also contains older standalone workouts and dedicated exercise pages such as Combo Workout, Suspension Bodyweight Row, Kettlebell Swing, Bird Dog Plank and Single-Arm Kettlebell Thruster. citeturn33search1turn33search2turn34view9 The harvest incorporates the substantial publicly recoverable exercise vocabulary from those first-party sources, but it cannot establish that every historical social-media post, deleted article, video-only demonstration, unindexed franchise page or inaccessible legacy asset has been captured.

Source-date precision is therefore deliberately non-fictionalized. Posts whose titles establish `2019` or `2020` are stored at year precision when an exact publication day was not exposed in the retrievable text; legacy pages can be marked `legacy`, and search-index-derived dates are labeled approximate rather than converted into invented exact dates. The newer Madison East warm-up source, by contrast, exposes an exact publication date of **September 15, 2026**, so that date is retained at day precision. citeturn25search6

Most importantly, the package does **not** convert the public workout examples into a theory of Alloy's proprietary programming. A published 5×5, AMRAP, progression, pairing or regression remains an observed source fact attached to the specific public context in which Alloy showed it. That keeps the resulting dataset suitable for exercise-library construction while preserving a clean boundary between **EXPLICITLY DOCUMENTED**, **DIRECTLY OBSERVED**, and **ANALYTIC CLASSIFICATION** evidence.
