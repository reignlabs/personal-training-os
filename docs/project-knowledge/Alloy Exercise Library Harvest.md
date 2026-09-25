# **Alloy Personal Training: Comprehensive Exercise Database Architecture and Harvest**

The following architectural report establishes a functional, normalized data schema mapping the exercise taxonomy utilized by Alloy Personal Training. Extracted exclusively from publicly available first-party documentation, this harvest translates observed programming variables, pedagogical cues, and movement classifications into a structured inventory optimized for database ingestion. The overarching objective is to convert qualitative physical training philosophies and observed clinical guidelines into quantitative, structured data sets ready for migration into a normalized backend architecture.

## **Biomechanical Philosophy and Demographic Targeting**

An analysis of the exercise catalog reveals distinct, systemic methodologies governing movement selection, scalability, and metabolic conditioning. The data indicates a programming philosophy optimized for joint longevity, functional asymmetry, and high-density work capacity, tailored specifically for an adult demographic, primarily individuals over forty years of age1. The operational mandate for this population explicitly rejects the notion that older adults require universally lighter programming. Instead, the methodology prioritizes joint health, bone density, and movement quality alongside progressive resistance training1.  
The prevention and reversal of sarcopenia and bone density loss form the clinical underpinning of the exercise taxonomy. The prescription for combating muscle loss relies on a specific sequence of progressive resistance training executed two to three times a week3. This minimal effective dose is designed to respect systemic recovery while maximizing physiological adaptations, such as improved insulin sensitivity, elevated mood, and reduced overuse injury risk4. Furthermore, strength training is presented as a superior modality for long-term fat loss when compared to exclusive cardiovascular exercise, as it preserves lean muscle tissue in a caloric deficit and elevates the resting metabolic rate2. The foundational movements requested of the musculoskeletal system to achieve these adaptations are strictly categorized into squats, hinges, presses, rows, and carries3.  
A critical component of this programming architecture is the systemic approach to injury management and joint pathology, particularly concerning arthritis and chronic joint degradation. The clinical perspective dictates that joints are nourished by movement, and loading and unloading articulate fluid circulation6. However, the application of load is highly individualized. The database reveals a strict adherence to modifying exercises through load manipulation, range of motion adjustments, and tempo variations rather than defaulting to completely different, easier workouts6. The pedagogical directive is to change the range or the tool, not the fundamental movement pattern6. For example, a barbell press may be replaced by a dumbbell floor press to spare the anterior shoulder capsule, or a lunge may be replaced by a step-up or a goblet split squat to eliminate forward momentum and reduce shear force on the patellar tendon7.

## **Equipment Utility and Modality Optimization**

The exercise taxonomy heavily favors kettlebells, dumbbells, and suspension trainers over fixed barbells or machine-based isolation. The analytic rationale for this equipment bias is rooted in biomechanical freedom and group management efficacy. As explicitly documented in the foundational texts, a barbell forces the wrists, elbows, and shoulders into one fixed relationship6. In contrast, tools like dumbbells and kettlebells allow the scapula and peripheral joints to glide freely across their intended natural planes of motion9.  
The kettlebell, in particular, serves as the primary instrument for full-body integration within this methodology. Foundational kettlebell movements, such as the goblet squat, deadlift, suitcase lunge, bent-over row, clean, front squat, and overhead press, are utilized to simultaneously challenge muscular strength, core stability, and cardiovascular stamina10. The unilateral nature of many kettlebell exercises—such as the Single-Arm Kettlebell Clean, Single-Arm Kettlebell Overhead Press, and Contralateral Single Leg Deadlift—requires the kinetic chain to constantly resist rotational and lateral-flexion forces. This indicates that core training is treated as a dynamic, integrated stabilization requirement rather than an isolated spinal flexion event10.  
Suspension trainers are equally critical to the architectural framework, providing a highly scalable method for developing posterior chain strength and deep core stability. Movements such as the Suspension Pull-Up, Suspension Ys, Suspension Row, and Suspension Ab Rollout leverage gravity and body weight to dictate intensity13. The use of suspension tools aligns perfectly with the clinical mandate to avoid spinal flexion; exercises like the rollout force the core to act as an anti-extension stabilizer rather than a flexor, which is deemed significantly safer for the lumbar spine than traditional crunches14.

## **Metabolic Architectures and Workout Formatting**

The observed workout formats dictate how individual exercises within the database are sequenced to elicit specific bioenergetic responses. The programming architecture captures several recurring metabolic structures designed to tax multiple energy systems concurrently.  
Time-under-tension intervals constitute a significant portion of the conditioning protocols. Formats like the "15/15 Workout" involve selecting two movements, typically a push-pull pairing, and performing one movement for fifteen seconds followed by fifteen seconds of rest. This is immediately followed by the second movement for fifteen seconds, with the cycle repeating continuously for ten minutes17. This specific structure allows for sufficient rest between exercises to facilitate heavy loading while maintaining a high enough overall volume to generate a profound cardiovascular response17.  
Compound sets represent another primary structural component of the database, designed specifically to maximize motor unit recruitment and muscular fatigue. A compound set workout sequences an explosive power movement directly into a strength movement utilizing a very heavy load for the same muscle group18. An observed example from the data includes pairing three repetitions of a Jump Squat immediately with six repetitions of a heavy Goblet Squat, or three Explosive Broad Jumps followed immediately by six heavy Deadlifts18.  
Repetition ladders and "Every Minute On the Minute" (EMOM) structures are utilized to continuously aggregate volume under strict time constraints, demanding high systemic recovery rates. The "5-10-15-20-25 Workout" is a prime example of an ascending rep ladder that sequences five distinct exercises with escalating repetition requirements for an effective full-body conditioning effect without the need for equipment19. Similarly, "Top of the Minute" formats require the practitioner to complete a stated number of repetitions within a sixty-second window, rewarding faster execution with longer rest periods before the top of the subsequent minute triggers the next set20.

## **Relational Schema Definitions**

To optimize the output for later conversion into a structured exercise database, the inventory is normalized into three distinct data domains. This structure maintains the integrity of the qualitative source material while providing the necessary relational classifications for backend programmatic filtering algorithms.  
The first domain, **Explicitly Documented**, houses data points directly quoted or explicitly stated in the source documentation. This includes the canonical name established for the database, the original naming variants observed in the Alloy ecosystem, the source URL, the equipment required, and any explicit technique cues, stated physiological purposes, regressions, and progressions. Date fields are included in the schema but remain unpopulated due to the absence of timestamp data in the primary source material.  
The second domain, **Directly Observed**, extrapolates data from published workout routines, detailing how each specific movement is practically applied in real-world programming. This domain captures the observed repetition ranges, set ranges, exercise pairings, and overarching workout formats, providing a quantitative footprint of the exercise's systemic application.  
The third domain, **Analytic Classification**, provides the kinesiological metadata derived from the biomechanics of the movement. This domain classifies each exercise by its primary movement family, secondary pattern, upper or lower body bias, push or pull designation, and symmetry (unilateral or bilateral). Furthermore, it applies boolean flags for Strength, Power, and Conditioning, alongside specific core functions, to power automated workout generation and filtering architectures.

## **Exercise Harvest: Explicitly Documented Database**

| canonical\_name | original\_Alloy\_name | source\_url | source\_date | equipment | regressions | progressions | explicit\_cues | purpose |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Push-Up | Push Up, Pushups with shoulder touch, Suspension push-ups | https://alloypersonaltraining.com/deck-cards-exercise-snapshot-push/ | NULL | Bodyweight, Suspension Trainer, Dumbbells | Knee Push-Up, Elevated Push-Up | Resisted Push-Up, Explosive Push-Up | Place hands firmly on ground under shoulders. Tighten core, engage glutes and hamstrings, flatten back. Tuck chin in. Lower body until chest touches floor. Keep elbows tucked. | Strengthens chest, triceps, shoulders, and anterior/posterior anti-extension core muscles. Safer for shoulders than traditional horizontal pushes. |
| Jump Lunges | Jump Lunges, Split Squat Jump | https://alloypersonaltraining.com/15-minute-no-equipment-workout/ | NULL | Bodyweight | NULL | NULL | NULL | Bodyweight anaerobic conditioning and explosive lower body power. |
| Bird Dog Plank | Bird Dog Plank | https://alloypersonaltraining.com/15-minute-no-equipment-workout/ | NULL | Bodyweight | NULL | NULL | NULL | Strengthens the core via anti-extension and anti-rotation, building immense core strength. |
| Touch Down Squats | Touch Down Squats | https://alloypersonaltraining.com/15-minute-no-equipment-workout/ | NULL | Bodyweight | NULL | NULL | NULL | Bodyweight conditioning and lower body endurance. |
| Yard Sprint | Run 50 yards, 25 Yard run | https://alloypersonaltraining.com/15-minute-no-equipment-workout/ | NULL | Bodyweight | NULL | NULL | NULL | Cardiovascular conditioning and anaerobic threshold training. |
| Burpee | Burpees | https://alloypersonaltraining.com/5-10-15-20-25-workout/ | NULL | Bodyweight | Elevated hands on surface | NULL | NULL | Total body anaerobic conditioning and metabolic demand. |
| Overhead Squat | Overhead squats (arms in a "Y") | https://alloypersonaltraining.com/5-10-15-20-25-workout/ | NULL | Bodyweight | NULL | NULL | Hold arms in a "Y" position while descending into a squat. | Full body mobility, thoracic extension, and lower body strength. |
| Single-Arm Kettlebell Swing | Single-Arm Kettlebell Swing, SA KB Swing | https://alloypersonaltraining.com/power-5-workout/ | NULL | Kettlebell | NULL | Load and ROM increases | Keep glutes tight throughout the swing to protect the spine and recruit powerful muscles. | Builds explosive leg power, tones and strengthens glutes via hip-dominant movement. |
| Single-Arm Kettlebell Clean | Single-Arm Kettlebell Clean, SA KB Clean, Kettlebell Clean | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Start with a hip hinge. Grip handle. Explosively extend hips, bringing kettlebell to shoulder keeping elbow close to body. | Essential kettlebell proficiency exercise. Strengthens shoulders, forearms, upper back, and grip. |
| Squat to Cable Row | Squat to Cable Row, Squat to Row | https://alloypersonaltraining.com/power-5-workout/ | NULL | Cable / Suspension | NULL | NULL | NULL | Full-body exercise. Horizontal rowing improves posture, builds upper back muscle; squat increases lower body engagement. |
| Kettlebell Deadlift | Kettlebell Deadlift \- Single or Double Arm, Deadlift | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Stand feet hip-width. Hinge at hips, keep back flat. Grip handle. Drive through heels, extend hips and knees. Maintain neutral spine. | Strengthens posterior chain, enhances hip/knee stability, develops grip strength, improves posture. |
| Goblet Squat | Goblet Squat | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | Box Squat | NULL | Hold kettlebell close to chest. Descend into squat keeping back straight. Return to starting position. | Targets lower body. Builds strong legs, keeps torso upright to reduce back strain, enhances core stability. |
| Goblet Split Squat | Goblet Split Squat | https://alloypersonaltraining.com/goblet-split-squat/ | NULL | Kettlebell | Step-up | NULL | Set up in bottom lunge position. Vertical front shin. Hold kettlebell under chin. Vertical torso, drive through front heel. | Targets entire lower body. Eliminates forward momentum, providing pain-free lunging for individuals with knee issues. |
| Kettlebell Bent Over Row | Single Arm Bent Over Row, Kettlebell Bent Over Row, 2 Pt Row | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Hinge at hips, flat back. Pull kettlebell toward ribcage, keeping elbow close to body and squeezing shoulder blades. | Targets upper back muscles. Improves posture, spinal stability, and grip strength. |
| Kettlebell Overhead Press | Single Arm Overhead Press, Kettlebell Overhead Press, SA KB Overhead press | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Start in rack position. Keep wrist neutral. Press overhead keeping core engaged and body stable. | Targets shoulders, triceps, core. Builds shoulder stability and upper body strength. |
| Single Arm Kettlebell Thruster | Single Arm Kettlebell Thruster | https://alloypersonaltraining.com/power-5-exercise-1/ | NULL | Kettlebell | NULL | NULL | NULL | Full-body strength/conditioning. Works shoulders, triceps, glutes, quads, core. Used as benchmark to determine workout load. |
| Kettlebell Suitcase Lunge | Kettlebell Suitcase Lunge | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Hold kettlebell in one hand by side. Step forward with opposite leg. Lower back knee to ground. Push through front foot. | Challenges core stability. Improves single-leg strength, coordination, and hip mobility. |
| Kettlebell Front Squat | Kettlebell Front Squat | https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/ | NULL | Kettlebell | NULL | NULL | Hold kettlebell by horns in front of chest. Descend into squat pushing hips back. Drive through heels. | Challenges balance and stability. Develops functional strength and improves hip/ankle mobility. |
| Swing to Squat | Swing to Squat | https://alloypersonaltraining.com/exercises-you-should-be-doing-swing-to-squat/ | NULL | Kettlebell | NULL | Heavier bell, deeper squat | Swing kettlebell, catch by handles at top position, perform goblet squat. Keep glutes tight. | Combines hip-dominant and knee-dominant movements. Ideal for time constraints and fat loss circuits. |
| Speed Squat | Speed Squat | https://alloypersonaltraining.com/category/lower-body/page/8/ | NULL | Bodyweight | NULL | NULL | NULL | Teaches how to jump squat properly without having to leave the ground. |
| Assisted Single-Leg Lowering | Assisted Single-Leg Lowering | https://alloypersonaltraining.com/category/lower-body/page/8/ | NULL | Roller / Bodyweight | NULL | NULL | Lie on back. Place both feet on roller. | Mobility drill that improves hip mobility and stability, helps with core activation and fixing asymmetries. |
| Half Kneeling Low to High Chop | Half Kneeling Low to High Chop | https://alloypersonaltraining.com/category/lower-body/page/8/ | NULL | Cable / Band | NULL | NULL | Assume a half-kneeling position. | Improves core strength and hip stability. Half-kneeling position stretches quads and tight hip flexors. |
| Lateral Band Walk | Lateral Band Walk | https://alloypersonaltraining.com/category/lower-body/page/8/ | NULL | Resistance Band | NULL | NULL | NULL | Mobility drill improving hip stability. Strengthens hip abductors (gluteus medius) to prevent knee pain. |
| Single-Arm Kettlebell Snatch | Single-Arm Kettlebell Snatch | https://alloypersonaltraining.com/category/lower-body/page/8/ | NULL | Kettlebell | NULL | NULL | NULL | Promotes strength, power, conditioning. Utilizes quads, hips, glutes, core, hamstrings with high muscle activation at top. |
| Plank With Shoulder Touch | Plank With Shoulder Touch | https://alloypersonaltraining.com/15-min-home-workout/ | NULL | Bodyweight | NULL | NULL | NULL | Core stabilization challenging anti-rotation via limb lifting. |
| Suspension Ys | Suspension Ys | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Suspension Trainer | NULL | NULL | NULL | Targets posterior deltoids, rhomboids, and lower traps for shoulder health. |
| Assisted Squats | Assisted squats | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Suspension Trainer | NULL | NULL | NULL | Provides mechanical assistance for deeper squat ranges of motion. |
| Suspension Hip Bridge to Leg Curl | Suspension hip bridge to leg curl | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Suspension Trainer | NULL | NULL | NULL | Isolates hamstrings and glutes while requiring intense core stabilization. |
| Stability Ball Rollout | Stability Ball Rollout, Suspension Ab rollouts | https://alloypersonaltraining.com/category/core/page/6/ | NULL | Stability Ball, Suspension Trainer | NULL | NULL | Goal is to resist movement as opposed to entering spinal flexion. | Strengthens core deeply. Safer than crunches as it avoids spinal flexion by utilizing anti-extension mechanics. |
| Skaters | Skaters | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Bodyweight | NULL | NULL | NULL | Lateral plyometric movement for athletic conditioning. |
| Reverse Lunges | Reverse Lunges | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Bodyweight | NULL | NULL | NULL | Knee-dominant lower body strength pattern. |
| Mountain Climbers | Mountain Climbers | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Bodyweight | Elevate hands | NULL | NULL | High-intensity cardiovascular conditioning and core stability. |
| Box Row | Row from Box | https://alloypersonaltraining.com/category/workout/page/13/ | NULL | Box / Dumbbells | NULL | NULL | NULL | Horizontal pulling strength from a mechanically supported position. |
| Renegade Row | Renegade Row | https://alloypersonaltraining.com/category/training/page/14/ | NULL | Dumbbells / Kettlebells | NULL | NULL | NULL | Highly effective upper body strength exercise focusing on abs/core due to immense stabilization required. |
| Suspension Flutter | Suspension Flutter | https://alloypersonaltraining.com/category/training/page/14/ | NULL | Suspension Trainer | NULL | NULL | Stay nice and flat from back of head down to heels. Keeping body flat works the core. | Fantastic suspension core exercise targeting deep structural stabilizers. |
| Standing External Rotation Hip Stretch | Standing External Rotation Hip Stretch | https://alloypersonaltraining.com/category/training/page/13/ | NULL | Bodyweight | NULL | NULL | NULL | Mobility drill to loosen tight hips and alleviate lower back pain. |
| Quad Cross-Body Foam Roller Stretch | Quad Cross-Body Foam Roller Stretch | https://alloypersonaltraining.com/category/training/page/13/ | NULL | Foam Roller | NULL | NULL | NULL | Mobility drill to improve upper back mobility, correct posture from chronic sitting, and reduce injury risk. |
| Spiderman Stretch | Spiderman | https://alloypersonaltraining.com/category/training/page/13/ | NULL | Bodyweight | NULL | NULL | NULL | Movement prep exercise lengthening multiple leg muscle groups and groin to increase flexibility and speed. |
| Single-Arm Suspension Pull Up | Single-Arm Susupension Pull Up | https://alloypersonaltraining.com/category/training/page/13/ | NULL | Suspension Trainer | NULL | NULL | NULL | Very effective for developing strength and power in upper back (lats), biceps, and core. |
| Suspension Halo | Suspension Halo | https://alloypersonaltraining.com/category/training/page/13/ | NULL | Suspension Trainer | NULL | NULL | Start in push up position, body flat. Take both hands around head to create the halo. | Fantastic TRX core exercise challenging multi-planar stabilization. |
| Dumbbell Floor Press | Floor Press, Dumbbell Bench Press | https://middleton.alloypersonaltraining.com/blog/how-small-group-training-is-individualized/ | NULL | Dumbbells | NULL | NULL | Lie on back, press weights upward. | Replaces barbell bench press to modify range of motion and preserve the anterior shoulder joint. |
| Jump Squat | Jump Squat | https://alloypersonaltraining.com/compound-set-workouts/ | NULL | Bodyweight | NULL | NULL | NULL | Explosive power development utilized as the primary primer in compound sets. |
| Explosive Ball Slams | Explosive Ball Slams | https://alloypersonaltraining.com/compound-set-workouts/ | NULL | Medicine Ball | NULL | NULL | NULL | Explosive full-body power generation targeting anterior core and lats. |
| TRX Row | TRX Row | https://alloypersonaltraining.com/compound-set-workouts/ | NULL | Suspension Trainer | NULL | NULL | NULL | Horizontal pull utilizing bodyweight to safely tax the upper back. |
| Explosive Broad Jump | Explosive Broad Jump | https://alloypersonaltraining.com/compound-set-workouts/ | NULL | Bodyweight | NULL | NULL | NULL | Explosive horizontal force production. |
| Farmer's Carry | Farmer's Carry, Racked Carry, Single Arm Kettlebell Carry, Loaded carry | https://alloypersonaltraining.com/kettlebell-complex-workout/ | NULL | Kettlebells | NULL | NULL | Hold kettlebell by side (Farmer's) or at chest level (Racked) and walk. | Finisher mechanism for trunk strength, grip development, and total body endurance. |
| Contralateral Single Leg Deadlift | Contralateral Single Leg Deadlift | https://alloypersonaltraining.com/fab-4-workout/ | NULL | Kettlebell | NULL | NULL | NULL | Builds total body strength, improves anaerobic conditioning, challenges anti-rotation. |
| Chin Up | Chin Up | https://alloypersonaltraining.com/fab-4-workout/ | NULL | Pull-up Bar | NULL | NULL | NULL | Vertical pulling strength targeting lats and biceps. |
| Figure 8 | Figure 8 | https://alloypersonaltraining.com/weekend-warrior-65/ | NULL | Kettlebell | NULL | NULL | NULL | Dynamic rotational core control and coordination. |
| Trap Bar Deadlift | Trap Bar Deadlift, Hinge pattern from elevated surface | https://cary.alloypersonaltraining.com/personalized-exercise-programming | NULL | Trap Bar | Elevated surface | NULL | NULL | Bilateral hinging pattern used to build foundational strength while sparing lumbar shear force. |
| Box Squat | Box Squat | https://middleton.alloypersonaltraining.com/blog/strength-training-for-runners-and-cyclists-over-40/ | NULL | Box, Dumbbell / Kettlebell | NULL | NULL | NULL | Regression pattern for squatting to ensure depth control and joint safety. |
| Step-Up | Step-up | https://middleton.alloypersonaltraining.com/blog/how-small-group-training-is-individualized/ | NULL | Box, Dumbbells | NULL | NULL | NULL | Used as a safer unilateral replacement for lunging to mitigate knee sheer forces. |

## **Exercise Harvest: Directly Observed Implementation**

| canonical\_name | observed\_rep\_ranges | observed\_set\_ranges | observed\_pairings | observed\_workout\_formats |
| :---- | :---- | :---- | :---- | :---- |
| Push-Up | 15, 20 | 3, 4 | Paired with Floor Press in compound sets; Burpees in AMRAPs | 5-10-15-20-25 Ladder, EMOM, AMRAP, Compound Sets |
| Jump Lunges | 10, 20, Ascending | 3, 4+ | Sequenced with Burpees and Pushups | EMOMs, Ladders, Timed Ascending Circuits |
| Bird Dog Plank | 20 | 3 | Sequenced after plyometrics to enforce static stability | EMOM (Top of the Minute) |
| Touch Down Squats | NULL | 3 | Sequenced within bodyweight circuits | EMOM (Top of the Minute) |
| Yard Sprint | 25, 50 yards | 3, 4 | Placed at the end of ladders as a cardiovascular spike | EMOM, Ladders |
| Burpee | 5, 15 | 4+ | Sequenced with Jump Lunges and Pushups | 5-10-15-20-25 Ladder, 20-min AMRAP |
| Overhead Squat | 20 | 4+ | Follows pushups in conditioning ladders | 5-10-15-20-25 Ladder |
| Single-Arm Kettlebell Swing | 5 | 5 | Initiator for the "Power of 5" complex | Complexes, Conditioning Circuits |
| Single-Arm Kettlebell Clean | 5, 8, 10, 15 | 3, 4, 5 | Flowed directly into Squats or Presses without dropping weight | Kettlebell Complexes, Circuits |
| Squat to Cable Row | 5 | 5 | Sequenced dynamically after KB Cleans | Continuous Conditioning Circuit |
| Kettlebell Deadlift | 5, 6, 12 | 4, 5 | Paired with Explosive Broad Jumps in compound sets | Complexes, Compound Sets |
| Goblet Squat | 6, 10, 12 | 4 | Paired with Jump Squats in Compound Sets; follows Swing | Circuit Training, Compound Sets |
| Goblet Split Squat | 8 | 4 | Paired with Contralateral Single Leg Deadlifts and Chin Ups | Timed Circuit (Fab 4 Workout) |
| Kettlebell Bent Over Row | 8, 10, 15, Ascending | 3, 4 | Sequenced with Cleans, Squats, Presses in single-sided complexes | Unilateral complexes, Timed ladders |
| Kettlebell Overhead Press | 8, 10, 15, Ascending | 3, 4 | Sequenced after Squats in complex routines | Unilateral Complexes, AMRAPs |
| Single Arm Kettlebell Thruster | 5 | NULL | Benchmark weight test for extended complexes | Benchmark Load Testing |
| Kettlebell Suitcase Lunge | 12 | 4 | NULL | Standard set/rep protocols |
| Kettlebell Front Squat | 8 | 4 | NULL | Standard set/rep protocols |
| Swing to Squat | High reps | NULL | Standalone flow movement | Fat loss circuits, Finishers |
| Speed Squat | NULL | NULL | NULL | Movement Prep / Warm-up |
| Assisted Single-Leg Lowering | NULL | NULL | NULL | Dynamic Warm-up |
| Half Kneeling Low to High Chop | NULL | NULL | NULL | Dynamic Warm-up / Core Blocks |
| Lateral Band Walk | NULL | NULL | NULL | Dynamic Warm-up |
| Single-Arm Kettlebell Snatch | NULL | NULL | NULL | Power Development Blocks |
| Plank With Shoulder Touch | 1, Ascending | 4+ | Sequenced after Jump Lunges | Ascending Ladders |
| Suspension Ys | 15 | 3 | Sequenced within TRX circuits | Timed Circuits |
| Assisted Squats | 15 | 3 | Sequenced within TRX circuits | Timed Circuits |
| Suspension Hip Bridge to Leg Curl | 15 | 3 | Sequenced within TRX circuits | Timed Circuits |
| Stability Ball Rollout | 15 | 3 | Sequenced within TRX circuits | Core Blocks |
| Skaters | 15 | As many as possible | Paired with Pushups and Burpees | 20-min AMRAP |
| Reverse Lunges | 15 | As many as possible | Paired with Mountain Climbers | 20-min AMRAP |
| Mountain Climbers | 15 | As many as possible | Paired with Reverse Lunges | 20-min AMRAP |
| Box Row | Ascending | 5 | Sequenced in rep ladders | Repetition Ladders |
| Renegade Row | NULL | NULL | NULL | Upper Body / Core Blocks |
| Suspension Flutter | NULL | NULL | NULL | Core Finishers |
| Standing External Rotation Hip Stretch | NULL | NULL | NULL | Mobility / Recovery |
| Quad Cross-Body Foam Roller Stretch | NULL | NULL | NULL | Mobility / Recovery |
| Spiderman Stretch | NULL | NULL | NULL | Movement Prep |
| Single-Arm Suspension Pull Up | 5 | 5 | Paired with heavy kettlebell power movements | Strength Circuits |
| Suspension Halo | NULL | NULL | NULL | Core Blocks |
| Dumbbell Floor Press | 6, 15 | 4 | Paired with Explosive Push-Ups in Compound Sets | Compound Sets, Minute Intervals |
| Jump Squat | 3 | 4 | Primer movement before Goblet Squat | Compound Sets |
| Explosive Ball Slams | 3 | 4 | Primer movement before TRX Row | Compound Sets |
| TRX Row | 6 | 4 | Strength follow-up to Ball Slams | Compound Sets |
| Explosive Broad Jump | 3 | 4 | Primer movement before Deadlift | Compound Sets |
| Farmer's Carry | 1 Lap | 3 | Active recovery at the end of exhaustive kettlebell complexes | Kettlebell Complex Finisher |
| Contralateral Single Leg Deadlift | 8 | 4 | Sequenced with Goblet Split Squats | Timed Circuit (Fab 4 Workout) |
| Chin Up | 8 | 4 | Sequenced with Burpees | Timed Circuit (Fab 4 Workout) |
| Figure 8 | 10 each way | 4 | Sequenced within full body kettlebell circuits | Circuit Training |
| Trap Bar Deadlift | NULL | NULL | Utilized alongside elevated regressions | Heavy Strength Blocks |
| Box Squat | NULL | NULL | Replaces free squats for beginners/rehab clients | Scaled Strength Blocks |
| Step-Up | NULL | NULL | Replaces lunges for knee health | Scaled Strength Blocks |

## **Exercise Harvest: Analytic Classification Database**

| canonical\_name | movement\_family | secondary\_pattern | upper\_lower | push\_pull | unilateral\_bilateral | strength\_flag | power\_flag | conditioning\_flag | core\_function |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Push-Up | Push | Core Stabilization | Upper | Push | Bilateral | True | True | False | Anti-extension |
| Jump Lunges | Lunge | Plyometric | Lower | Push | Unilateral | False | True | True | Dynamic Stabilization |
| Bird Dog Plank | Core | Isometrics | Core | N/A | Contralateral | False | False | False | Anti-rotation / Anti-extension |
| Touch Down Squats | Squat | Bodyweight | Lower | Push | Bilateral | False | False | True | N/A |
| Yard Sprint | Locomotion | Sprint | Full | N/A | Alternating | False | True | True | N/A |
| Burpee | Full Body | Plyometric | Full | Push/Pull | Bilateral | False | True | True | Dynamic Stabilization |
| Overhead Squat | Squat | Thoracic Extension | Lower | Push | Bilateral | True | False | False | Anti-flexion |
| Single-Arm Kettlebell Swing | Hinge | Core Stabilization | Lower | Pull | Unilateral | False | True | True | Anti-rotation |
| Single-Arm Kettlebell Clean | Hinge | Vertical Pull | Full | Pull | Unilateral | True | True | True | Anti-rotation |
| Squat to Cable Row | Full Body | Squat \+ Horiz Pull | Full | Hybrid | Bilateral | True | False | True | Dynamic Stabilization |
| Kettlebell Deadlift | Hinge | Posterior Chain | Lower | Pull | Bilateral/Uni | True | False | False | Anti-flexion / Anti-rotation |
| Goblet Squat | Squat | Anterior Core | Lower | Push | Bilateral | True | False | False | Anti-flexion |
| Goblet Split Squat | Lunge | Squat | Lower | Push | Unilateral | True | False | False | Anti-flexion |
| Kettlebell Bent Over Row | Pull | Isometric Hinge | Upper | Pull | Unilateral | True | False | False | Anti-rotation |
| Kettlebell Overhead Press | Press | Core Stabilization | Upper | Push | Unilateral | True | False | False | Anti-lateral flexion |
| Single Arm Kettlebell Thruster | Full Body | Squat to Press | Full | Push | Unilateral | True | True | True | Anti-lateral flexion |
| Kettlebell Suitcase Lunge | Lunge | Unilateral Carry | Lower | Push | Unilateral | True | False | False | Anti-lateral flexion |
| Kettlebell Front Squat | Squat | Anterior Core | Lower | Push | Bilateral | True | False | False | Anti-flexion |
| Swing to Squat | Full Body | Hinge to Squat | Lower | Hybrid | Bilateral | True | True | True | Dynamic Stabilization |
| Speed Squat | Squat | Plyometric Prep | Lower | Push | Bilateral | False | True | False | N/A |
| Assisted Single-Leg Lowering | Mobility | Core Activation | Lower | N/A | Unilateral | False | False | False | N/A |
| Half Kneeling Low to High Chop | Core | Diagonal Rotation | Core | Hybrid | Unilateral | False | False | False | Anti-rotation / Dynamic Rotation |
| Lateral Band Walk | Mobility | Hip Abduction | Lower | Push | Bilateral | False | False | False | N/A |
| Single-Arm Kettlebell Snatch | Full Body | Explosive Hinge | Full | Pull | Unilateral | True | True | True | Anti-rotation |
| Plank With Shoulder Touch | Core | Isometric Hold | Core | Push | Unilateral | False | False | False | Anti-rotation |
| Suspension Ys | Pull | Scapular Retraction | Upper | Pull | Bilateral | True | False | False | N/A |
| Assisted Squats | Squat | Supported ROM | Lower | Push | Bilateral | True | False | False | N/A |
| Suspension Hip Bridge to Leg Curl | Hinge | Knee Flexion | Lower | Pull | Bilateral | True | False | False | Anti-extension |
| Stability Ball Rollout | Core | Shoulder Flexion | Core | N/A | Bilateral | True | False | False | Anti-extension |
| Skaters | Plyometric | Lateral Bound | Lower | Push | Unilateral | False | True | True | Dynamic Stabilization |
| Reverse Lunges | Lunge | Knee Dominant | Lower | Push | Unilateral | True | False | False | N/A |
| Mountain Climbers | Core | Hip Flexion | Full | Push | Alternating | False | False | True | Anti-extension |
| Box Row | Pull | Horiz Pull | Upper | Pull | Bilateral | True | False | False | N/A |
| Renegade Row | Pull | Core Stabilization | Upper | Pull | Unilateral | True | False | False | Anti-rotation |
| Suspension Flutter | Core | Hip Flex/Ext | Core | N/A | Alternating | False | False | False | Anti-extension |
| Standing External Rotation Hip Stretch | Mobility | Hip Flex/External Rot | Lower | N/A | Unilateral | False | False | False | N/A |
| Quad Cross-Body Foam Roller Stretch | Mobility | Thoracic Ext | Upper | N/A | Bilateral | False | False | False | N/A |
| Spiderman Stretch | Mobility | Hip Extension | Lower | N/A | Alternating | False | False | False | N/A |
| Single-Arm Suspension Pull Up | Pull | Core Stabilization | Upper | Pull | Unilateral | True | True | False | Anti-rotation |
| Suspension Halo | Core | Multi-planar | Core | N/A | Bilateral | True | False | False | Dynamic Stabilization |
| Dumbbell Floor Press | Push | Horiz Push | Upper | Push | Bilateral | True | False | False | N/A |
| Jump Squat | Squat | Plyometric | Lower | Push | Bilateral | False | True | True | N/A |
| Explosive Ball Slams | Full Body | Lats/Core | Full | Pull | Bilateral | False | True | True | Dynamic Flexion |
| TRX Row | Pull | Horiz Pull | Upper | Pull | Bilateral | True | False | False | N/A |
| Explosive Broad Jump | Plyometric | Horiz Bound | Lower | Push | Bilateral | False | True | False | N/A |
| Farmer's Carry | Carry | Locomotion | Full | N/A | Unilateral | True | False | True | Anti-lateral flexion |
| Contralateral Single Leg Deadlift | Hinge | Balance | Lower | Pull | Unilateral | True | False | False | Anti-rotation |
| Chin Up | Pull | Vertical Pull | Upper | Pull | Bilateral | True | False | False | N/A |
| Figure 8 | Core | Rotational Coordination | Full | N/A | Bilateral | False | False | False | Dynamic Rotation |
| Trap Bar Deadlift | Hinge | Bilateral Hinge | Lower | Pull | Bilateral | True | False | False | Anti-flexion |
| Box Squat | Squat | Target Depth | Lower | Push | Bilateral | True | False | False | Anti-flexion |
| Step-Up | Lunge | Knee Dominant | Lower | Push | Unilateral | True | False | False | N/A |

## **Conclusion and Integration Readiness**

The public-facing exercise taxonomy of Alloy Personal Training reflects a highly sophisticated approach to human movement, heavily influenced by functional kinesiology, injury mitigation, and operational scalability. The database harvest yields a clear, quantifiable bias toward unilateral and contralateral kettlebell movements, suspension training, and systemic core integration. By structuring the harvest into Explicitly Documented, Directly Observed, and Analytic Classification data tables, the resulting dataset bypasses narrative ambiguity. This comprehensive, normalized architecture provides a robust relational schema ready for immediate migration into a NoSQL document database or standard SQL tables, enabling complex querying and programmatic filtering.

#### **Works cited**

> 1. Personalized Exercise Programming Cary, NC, [https://cary.alloypersonaltraining.com/personalized-exercise-programming](https://cary.alloypersonaltraining.com/personalized-exercise-programming)  
> 2. The Benefits of Strength Training For Adults Over 40, [https://overlandpark.alloypersonaltraining.com/blogs-post/benefits-of-strength-training-for-adults-over-40](https://overlandpark.alloypersonaltraining.com/blogs-post/benefits-of-strength-training-for-adults-over-40)  
> 3. Sarcopenia: The Muscle Loss Nobody Warns You About, [https://southtempe.alloypersonaltraining.com/blog/sarcopenia-muscle-loss-guide/](https://southtempe.alloypersonaltraining.com/blog/sarcopenia-muscle-loss-guide/)  
> 4. The Alloy Personal Training Method Explained \- YouTube, [https://www.youtube.com/watch?v=fzjGm9by\_Qw](https://www.youtube.com/watch?v=fzjGm9by_Qw)  
> 5. Cardio vs Strength Training: What's More Important for Fat Loss?, [https://alloypersonaltraining.com/cardio-vs-strength-training-for-fat-loss/](https://alloypersonaltraining.com/cardio-vs-strength-training-for-fat-loss/)  
> 6. Strength Training With Arthritis, Bad Knees, or an Old Injury | Alloy, [https://madisoneast.alloypersonaltraining.com/blog/strength-training-with-arthritis-and-old-injuries/](https://madisoneast.alloypersonaltraining.com/blog/strength-training-with-arthritis-and-old-injuries/)  
> 7. How One Coach Trains Six Different Bodies: Individualized, [https://middleton.alloypersonaltraining.com/blog/how-small-group-training-is-individualized/](https://middleton.alloypersonaltraining.com/blog/how-small-group-training-is-individualized/)  
> 8. Goblet Split Squat \- Alloy Personal Training, [https://alloypersonaltraining.com/goblet-split-squat/](https://alloypersonaltraining.com/goblet-split-squat/)  
> 9. Push Up \- Alloy Personal Training, [https://alloypersonaltraining.com/deck-cards-exercise-snapshot-push/](https://alloypersonaltraining.com/deck-cards-exercise-snapshot-push/)  
> 10. 7 Fundamental Kettlebell Workouts for Strength and Stamina, [https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/](https://alloypersonaltraining.com/7-fundamental-kettlebell-workouts-for-strength-and-stamina/)  
> 11. Fab 4 Workout \- Alloy Personal Training, [https://alloypersonaltraining.com/fab-4-workout/](https://alloypersonaltraining.com/fab-4-workout/)  
> 12. [https://alloypersonaltraining.com/power-5-workout/](https://alloypersonaltraining.com/power-5-workout/)  
> 13. Workout | Superior Personal Training For An Active Lifestyle, [https://alloypersonaltraining.com/category/workout/page/13/](https://alloypersonaltraining.com/category/workout/page/13/)  
> 14. Core | Superior Personal Training For An Active Lifestyle, [https://alloypersonaltraining.com/category/core/page/6/](https://alloypersonaltraining.com/category/core/page/6/)  
> 15. Training | Superior Personal Training For An Active Lifestyle, [https://alloypersonaltraining.com/category/training/page/13/](https://alloypersonaltraining.com/category/training/page/13/)  
> 16. Training | Superior Personal Training For An Active Lifestyle, [https://alloypersonaltraining.com/category/training/page/14/](https://alloypersonaltraining.com/category/training/page/14/)  
> 17. 15/15 Workout \- Alloy Personal Training, [https://alloypersonaltraining.com/1515-workout/](https://alloypersonaltraining.com/1515-workout/)  
> 18. Compound Set Workout \- Alloy Personal Training, [https://alloypersonaltraining.com/compound-set-workouts/](https://alloypersonaltraining.com/compound-set-workouts/)  
> 19. 5-10-15-20-25 Workout \- Alloy Personal Training, [https://alloypersonaltraining.com/5-10-15-20-25-workout/](https://alloypersonaltraining.com/5-10-15-20-25-workout/)  
> 20. 15-Minute, No-Equipment Workout \- Alloy Personal Training, [https://alloypersonaltraining.com/15-minute-no-equipment-workout/](https://alloypersonaltraining.com/15-minute-no-equipment-workout/)
