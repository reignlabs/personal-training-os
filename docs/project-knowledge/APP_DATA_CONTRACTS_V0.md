---
file: APP_DATA_CONTRACTS_V0.md
class: DATA CONTRACTS (SYSTEM_DESIGN)
status: FINAL. Implementation contract, issued 2026-09-24. contract_version 1.0.0; app_schema_version 1. Supersedes the proposed draft of the same date.
implements: engine contracts Q.1–Q.12 (ENGINE_WORKOUT_GENERATOR_V0_2_1.md), UX §14 extensions (PRODUCT_UX_SPEC_V0.md), decisions D-096 to D-120 (APP_TECH_ARCHITECTURE_V0.md §20)
source_schemas: claude_v0-exercise-db_canonical_exercise_schema.json (evidence layer, unchanged; projected for display)
                claude_v0-exercise-db_system_metadata_schema.json (reserved layer; see §5.1.3)
                equipment_library.json (catalog; projected for display)
                PERSONAL_user_profile.yaml, PERSONAL_constraints.yaml (read through a whitelist, never copied)
pending: EI-09, EI-10, D-111 (APP_TECH_ARCHITECTURE_V0.md §21); marked where they touch a field
engine_rules_changed: none
---

# APP DATA CONTRACTS V0: Personal Training OS

## 0. Purpose and scope

This document defines every document the app stores, every file it imports or exports, and every derived structure the engine returns, with identifiers, relationships, invariants, and versioning. Implementation expresses each declaration as a Zod schema in `src/contracts` (D-099); the declarations below are normative.

The engine's Q contracts are the minimum fields the engine reads. Fields added here are marked `// ext` and are ignored by the engine and by replay (UX §14).

**Evidence discipline in data.** Research evidence classes (ALLOY_DOCUMENTED, ALLOY_OBSERVED, SUPPORTED_PATTERN) appear only in the evidence display projection (§5.1.1). Every rule-bearing field elsewhere is SYSTEM_DESIGN. Personal logs never carry an Alloy evidence class (D-015, D-071).

---

## 1. Conventions

### 1.1 Notation

TypeScript-style declarations. Every field is required unless marked `?`. `| null` means present with a null value. Enum spellings copy the engine spec exactly, including its lowercase check-in values (§A.3), so no mapping layer exists.

Markers: `// engine` read by the engine · `// ext` product-only, ignored by engine and replay · `// snapshot` copied at write time so the record stays meaningful if its source changes.

### 1.2 Primitive types

```ts
type UtcTs     = string;  // ISO 8601 UTC with milliseconds and 'Z'
type LocalDate = string;  // "YYYY-MM-DD" in settings.tz
type LocalTime = string;  // "HH:mm"
type IanaTz    = string;  // "America/Los_Angeles"
type SemVer    = string;
type Hash64    = string;  // 16 lowercase hex chars, FNV-1a 64 over canonical JSON
type Load      = number;  // environment load unit (lb in V0); ≥ 0; multiple of 0.5
type Minutes   = number;  // ≤ 2 decimals
type Int       = number;  // integer
```

### 1.3 Canonical JSON

Keys sorted by code point, no insignificant whitespace, shortest round-trip numbers, UTF-8. Used for `Hash64` values (state digest, config hash) and by the datapack tool's content hash (SHA-256, computed in Node only).

---

## 2. Identifiers

| Entity | ID field | Format | Assigned by | Rules |
|---|---|---|---|---|
| Library exercise | `exercise_id` | `EX\d{3}` | evidence dataset | Never reused, renumbered, or deleted (retired by status) |
| Supplemental exercise | `exercise_id` | `SX\d{3}` | EXERCISE_METADATA.md, user-approved (Q.2) | Same |
| Equipment, physical item | `equipment_id` | `EQ\d{3}` | equipment_library.json | Never reused |
| Equipment, setting of an item | `equipment_id` | `EQ\d{3}_[A-Z]+` (`EQ011_INCLINE`) | EQUIPMENT_MODEL.md | `parent_equipment_id` required |
| Equipment, concept not in the gym | `equipment_id` | `EQ_[A-Z0-9_]+` (`EQ_SUSP`, `EQ_TRAPBAR`) | EQUIPMENT_MODEL.md | Lets V-00f validate options that reference absent equipment |
| Station group | `station_group` | `[A-Z][A-Z0-9_]*` or `NONE` | EQUIPMENT_MODEL.md | |
| Environment | `env_id` | `ENV-[A-Z]+` | EQUIPMENT_MODEL.md | V0: `ENV-APT`, `ENV-ALLOY`, `ENV-OTHER` |
| Constraint | `constraint_id` | `HC-\d{2}`, `SC-\d{2}` | PERSONAL_constraints.yaml | |
| Goal, question | `goal_id`, `question_id` | `G-\d{2}`; `B\d[a-d]?`, `UQ-G\d{2}`, `OQ-\d{2}`, `P-\d{2}` | PERSONAL files | |
| Datapack | `datapack_id` | `dp_<pack_version>_<first 8 hex of content SHA-256>` | datapack tool | Deterministic from content |
| Check-in document | `id` | `ci_<uuid>` | device | |
| Generation document | `id` | `gen_<uuid>` | device, passed to the engine | Engine `generation_id` |
| Workout document | `id` | `wo_<uuid>` | device | Engine `session_id` |
| Workout item | `item_key` | `<slot>#<seq>` (`A1#0`, `A1#1` after a swap) | device | Unique in its workout |
| Set | (`item_key`, `side`, `set_no`) | composite | device | |
| Alloy session document | `id` | `ext_alloy_<LocalDate>` | device | One per local date (§L.4, D-105) |
| Other external session | `id` | `ext_<uuid>` | device | |
| Event document | `id` | `ev_<uuid>` | device | |
| Singletons | `id` | `settings`, `meta`, `pack_history`, `state_summary`, `datapack` | fixed | |
| Import batch | `import_batch_id` | `imp_<uuid>` | import tool (FUTURE) | |
| Alloy slot | `slot_key` | `<LocalDate>T<LocalTime>` | derived from schedule | |
| Progression line key | — | `<exercise_id>|<role>|<side>` | engine | §H.1 |
| Anchor key | — | `<family>|<role>|<sub_target or ->` | engine | §E.1 |

`<uuid>` = `crypto.randomUUID()`. The seed `user_id` is the literal `"nelson"` and must never change.

---

## 3. Document model

Every stored document has this base and is stored in the single IndexedDB object store `docs` (key path `id`).

```ts
type DocType = 'meta' | 'settings' | 'datapack' | 'pack_history' | 'state_summary'
             | 'check_in' | 'generation' | 'workout' | 'external_session' | 'event';

interface DocBase {
  id: string;
  type: DocType;
  created_at: UtcTs;
  updated_at: UtcTs;       // = created_at for immutable documents
}
```

```
DATAPACK (one active document)                        SOURCE DOCUMENTS
┌───────────────────────────────────────┐            ┌──────────────────────────────────────────────┐
│ exercises: ExerciseDisplay (EX)       │            │ settings (1)                                  │
│ exercise_metadata (EX/SX, status)     │◄─ ids ─────┤ check_in ──1:0..1──► generation (immutable)  │
│ supplemental, aliases, sources        │            │   │ alloy_answers         │ 1:0..1 (Start)     │
│ equipment_catalog (implement_type)    │            │   ▼                       ▼                    │
│ environments, equipment_baseline      │            │ external_session     workout ─► items ─► sets │
│ profile, constraints (+bindings)      │            │ (kind ALLOY | OTHER)                          │
│ config (+set_by), approvals           │            │ event (Q.8, append-only)                      │
└───────────────────────────────────────┘            └──────────────────────────────────────────────┘
 pack_history (manifests + configs of every activated pack)          │ replay (in memory, §B.1)
 state_summary (diff baseline only)                                   ▼
                                    DERIVED, NOT STORED: GeneratorState, CompletionDecision,
                                    MovementExposure, RecoveryCredit, ExerciseHistory
```

A check-in yields at most one generation; "Change" creates a new check-in with `revises_check_in_id`. A generation yields at most one workout.

---

## 4. Vocabularies

```ts
type Family = 'KD'|'HD'|'HPUSH'|'VPUSH'|'HPULL'|'VPULL'|'ANTI_EXT'|'ANTI_ROT'|'ANTI_LAT'
            | 'CARRY'|'GOAL_ACCESSORY'|'MOBILITY'|'CONDITIONING';            // §B.2
type Parent = 'LOWER'|'PUSH'|'PULL'|'CORE'|'CARRY'|'ACCESSORY'|'MOBILITY'|'CONDITIONING';
type Role = 'PRIMARY'|'SECONDARY'|'CORE'|'CARRY'|'ACCESSORY'|'MOBILITY'|'CONDITIONING';
type SubTarget = 'ELBOW_FLEXION'|'SHOULDER_ISOLATION'|'ELBOW_EXTENSION';
type BlockId = 'A'|'B'|'C'|'F';
type SlotId = 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'|'F1'|'F2';
type PrepId = 'PG'|'PM1'|'PM2'|'RAMP_A1'|'RAMP_A2';
type Side = 'BILATERAL'|'LEFT'|'RIGHT';
type Laterality = 'BILATERAL'|'UNILATERAL'|'ALTERNATING';
type LoadMode = 'EXTERNAL_LOAD'|'BODYWEIGHT'|'TIME'|'TIME_WITH_LOAD';
type Unit = 'REPS'|'SECONDS';
type HandSupport = 'NONE'|'FOREARM'|'QUADRUPED'|'HIGH_PLANK'|'PLANK_POSITION_UNCONFIRMED';
type PositionTag = 'straight_arm_weight_bearing'|'supine_press'|'overhead_press'|'dip'|'impact'|'ballistic'|'floor';
type SoreRegion = 'UPPER'|'LOWER'|'TRUNK';
type Involvement = 'NONE'|'SECONDARY'|'PRIMARY';
type EvidenceBasis = 'ALLOY_LIBRARY'|'ALLOY_LIBRARY_ADAPTED'|'SUPPLEMENTAL';
type MetadataStatus = 'ACTIVE'|'DRAFT'|'RETIRED';
type Availability = 'AVAILABLE'|'NOT_AVAILABLE'|'UNKNOWN';
type Effort = 'TOO_EASY'|'GOOD'|'HARD'|'TOO_HARD';
type FlagCode = 'TECHNIQUE_DIFFICULTY'|'UNCOMFORTABLE'|'STOPPED_SYMPTOM'|'RIGHT_ARM_FADE'|'EQUIPMENT_ISSUE';
type Posture = 'NORMAL'|'LIGHT';
type Capacity = 'below_usual'|'usual'|'above_usual';
type LineState = 'BUILDING'|'LOAD_CAPPED';
type LoadState = 'CALIBRATE'|'SEEDED'|'KNOWN'|'RETURN'|'IMPLEMENT_CHANGED'|'NONE';
type HfId = 'HF-01'|'HF-02'|'HF-03'|'HF-04'|'HF-05'|'HF-06'|'HF-07'|'HF-08'|'HF-09'|'HF-10'|'HF-11'|'HF-12'|'HF-13'|'HF-14';
type FilterOutcome = 'PASS'|'EXCLUDED'|'EXCLUDED_TODAY'|'HELD_PENDING_SCOPE'|'HELD_EQUIPMENT_UNKNOWN'
                   | 'HELD_PENDING_REVIEW'|'HELD_CAPABILITY_UNKNOWN'|'HELD_PREFERENCE_UNKNOWN'|'NOT_CANDIDATE'
                   | 'NOT_IN_POOL';                       // provisional, EI-09
type SelectionReason = string;   // exact engine strings (§E.3), e.g. "SUBSTITUTE_FOR_ANCHOR(HF-12)"; pattern-validated
type DecidedBy = 'K0'|'K1'|'K2'|'K3'|'K4'|'K5'|'K6'|'K7'|'ANCHOR_CANDIDATE'|'DRAW';
type DecisionCode = 'CALIBRATE'|'SEEDED'|'RETURN'|'IMPLEMENT_CHANGED'|'NOT_EVIDENCE'|'REDUCE'|'HOLD'
                  | 'HOLD(REDUCE_LIMIT)'|'REPS_UP'|'CONFIRM_TOP'|'LOAD_UP'|'EXTEND_RANGE'|'LOAD_CAPPED'|'AT_MINIMUM';
type FamilyReasonCode = 'STALEST_LOWER'|'STALEST_UPPER_PARENT'|'LOWER_ROLE_ALTERNATION'|'UPPER_ROLE_ALTERNATION'
  |'OTHER_UPPER_PARENT'|'STALEST_CORE'|'STALEST_C2'|'SORENESS_REPLACEMENT'|'R04_SWAP'|'CORE_STARVATION_SWAP'
  |'FALLBACK_SIBLING'|'FALLBACK_SAME_SIDE'|'FALLBACK_CORE'|'FALLBACK_NEXT_IN_POOL'|'SLOT_EMPTY'
  |'FINISH_GOAL_ACCESSORY'|'FINISH_CORE_OR_CARRY'|'FINISH_CONDITIONING'|'FINISH_MOBILITY';
type UnderfillCause = 'FIRST_SESSIONS'|'LIGHT_POSTURE'|'SLOTS_EMPTY'|'TIER_MAXIMUM'|'TIER_BOUNDARY';
type NoSessionReason = 'USER_SKIP'|'TOO_SHORT'|'NO_BLOCK_A'|'VALIDATION_FAILED';
type Weekday = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN';
type ImplementType = string;     // controlled vocabulary declared in EQUIPMENT_MODEL.md (e.g. DUMBBELL, KETTLEBELL,
                                 // BARBELL, PLATES, FLAT_BENCH, ADJUSTABLE_BENCH, RACK, PULLUP_BAR, DIP_STATION,
                                 // STABILITY_BALL, MAT, BIKE, TREADMILL, ELLIPTICAL, SELECTORIZED_MACHINE,
                                 // ADJUSTABLE_CABLE, SUSPENSION_TRAINER, BAND, AB_WHEEL, FOAM_ROLLER, TRAP_BAR)
```

Reason codes and decision codes are **append-only**: a code is never renamed or removed, so old generations always render (D-116).

---

## 5. Datapack

### 5.1 Exercises

"Exercise" is a view resolved at load time. Its parts are never merged in storage.

```ts
interface Exercise {                      // resolved view (not stored)
  exercise_id: string;
  display_name: string;                   // metadata.display_name ?? display.canonical_name
  display: ExerciseDisplay | null;        // null for SX rows
  metadata: ExerciseMetadata | null;      // null → loggable (e.g. at Alloy) but never generated
  supplemental: SupplementalInfo | null;
  aliases: string[];
  sources: EvidenceSource[];
  pool_status: 'IN_POOL' | 'NO_METADATA' | 'DRAFT' | 'RETIRED' | 'REJECTED' | 'NOT_APPROVED';
  rejected_by: string[];                  // V-00 ids when REJECTED
}
```

`IN_POOL` requires: metadata present, `status = ACTIVE`, passes V-00a–g, family order approved (§5.1.5), and for SX rows `approved_by_user_on` set.

#### 5.1.1 ExerciseDisplay (evidence layer projection; display only)

Projected by the tool from `claude_v0-exercise-db_exercise_dataset.json` (validated against the canonical schema first). The full evidence rows stay in the project; the app needs only these fields.

```ts
interface ExerciseDisplay {
  exercise_id: string;                    // EX###
  canonical_name: string;                 // engine reads this for display only (§A.1)
  tier: 1 | 2;
  alloy_observed: boolean;
  evidence_classification: 'ALLOY_DOCUMENTED' | 'ALLOY_OBSERVED' | 'SUPPORTED_PATTERN';
  documented_coaching_cues: string | null; // How-to, labeled "Alloy's published cues" (D-076)
  source_ids: string[];
}
interface EvidenceSource { source_id: string; url: string | null; document: string; }            // sources.csv
interface ExerciseAlias  { alias: string; exercise_id: string; flagged_uncertain: boolean; }     // alias_table.csv
```

#### 5.1.2 ExerciseMetadata (SYSTEM_METADATA layer; Q.1)

```ts
interface ExerciseMetadata {
  exercise_id: string;                    // engine; EX### or SX###
  status: MetadataStatus;                 // ext for the engine; the loader admits only ACTIVE rows to the pool
  display_name: string;                   // engine (display)
  family: Family;                         // engine; V-00b
  sub_target: SubTarget | null;           // engine; required iff family = GOAL_ACCESSORY
  roles_allowed: Role[];                  // engine; ≥ 1; V-00c
  laterality: Laterality;                 // engine
  per_side_logging: boolean;              // engine
  load_mode: LoadMode;                    // engine
  equipment_options: string[][];          // engine; ordered option sets; [[]] = bodyweight; V-00f
  station: string;                        // engine; 'NONE' or station group
  heavy_lower: boolean;                   // engine; V-00d
  right_triceps_involvement: Involvement; // engine
  hand_support: HandSupport;              // engine; V-00a
  position_tags: PositionTag[];           // engine
  sore_regions: SoreRegion[];             // engine; V-00g
  capability_prereq: string | null;       // engine (HF-08)
  evidence_basis: EvidenceBasis;          // engine (K6)
  default_order: Int;                     // engine (K7); unique within family among ACTIVE rows; V-00e
  library_order: Int | null;              // display
  executed_as: string | null;             // required if ALLOY_LIBRARY_ADAPTED
  demo_ref: string | null;                // UX
  authoring_note: string | null;          // ext; reason for a judgment call (Q.1.1)
}
```

Validation is exactly V-00a to V-00g (§Q.1.2), applied to ACTIVE rows.

#### 5.1.3 Relation to the reserved system metadata schema

ExerciseMetadata is the populated SYSTEM_METADATA layer. The reserved placeholders `difficulty`, `personal_suitability`, `goal_scores`, `weakness_scores`, `progression_trees` are not V0 fields (engine D-033; FUTURE). `contraindications` is never used: exclusions come only from PERSONAL_constraints.yaml through constraint bindings (§5.5).

#### 5.1.4 SupplementalInfo (Q.2)

```ts
interface SupplementalInfo {
  exercise_id: string;                    // SX###
  source: 'SYSTEM_DESIGN';
  added_because: string;
  approved_by_user_on: LocalDate | null;  // null → NOT_APPROVED
}
```

#### 5.1.5 Family order approvals (D-111, pending confirmation)

```ts
interface FamilyOrderApproval {
  family: Family;
  approved_on: LocalDate;
  order_hash: Hash64;                     // hash of the family's ACTIVE exercise_ids in default_order
}
```

The tool recomputes each hash; a mismatch fails the build ("order changed since approval"). The loader marks a family without a valid approval NOT_APPROVED and generation reports NOT_READY listing that family.

### 5.2 EquipmentCatalogItem

```ts
interface EquipmentCatalogItem {
  equipment_id: string;
  kind: 'PHYSICAL' | 'SETTING' | 'CONCEPT';
  parent_equipment_id: string | null;     // required for SETTING
  implement_type: ImplementType;          // D-117; no engine effect in V0
  display_name: string;
  category: string | null;                // from equipment_library.json
  description: string | null;             // visible_name_or_description
  limitations: string | null;             // important_limitations
  confidence: string | null;
  evidence_source: string | null;
  load_unit: 'lb' | null;
}
```

`exercise_equipment_availability.json` is an authoring input for `equipment_options` and the §Q.3 substitution rule. It is not shipped; HF-06 over EquipmentState is the only runtime availability source.

### 5.3 GymEnvironment and EquipmentState

```ts
interface GymEnvironment {
  env_id: string;                         // 'ENV-APT' | 'ENV-ALLOY' | 'ENV-OTHER'
  name: string;
  kind: 'GENERATION_TARGET' | 'TRAINER_LED_EXTERNAL' | 'LOGGING_ONLY';
  generation_enabled: boolean;            // exactly one true in V0 (D-065)
  load_unit: 'lb';
  station_groups: { station_group: string; label: string; equipment_ids: string[] }[];  // §F.2, UNRESOLVED until confirmed
  general_warmup_order: string[];         // §C.6, ENV-APT: ['EQ002','EQ015','EQ016']
}

interface EquipmentState {                // Q.3; pack baseline, one per (env_id, equipment_id)
  env_id: string;
  equipment_id: string;                   // engine
  availability: Availability;             // engine
  loads: Load[] | null;                   // engine; ascending, unique; null = unknown increments
  max_confirmed_load: Load | null;        // engine [M-14]
  station_group: string;                  // engine
  confirmed_on: LocalDate | null;         // engine
}
```

Effective state = baseline, then CONFIRM_EQUIPMENT events for that environment in `event_at` order. Today's issues are check-in or swap inputs, never state (D-066).

### 5.4 UserProfile (runtime projection)

Built from PERSONAL_user_profile.yaml through PROFILE_PROJECTION.yaml (§5.8). Nothing outside this shape can enter the pack (D-101).

```ts
interface UserProfile {
  user_id: 'nelson';                      // engine (seed)
  display_name: string;
  profile_version: string;
  constraints_version: string;
  default_tz: IanaTz;
  units: 'lb';
  generation_env_id: 'ENV-APT';
  alloy_schedule_default: { weekday: Weekday; start: LocalTime }[];
  avoidances: { exercise_id: string; label: string }[];          // engine (HF-04); may be empty
  pending_questions: { question_id: string; status: 'OPEN' | 'ANSWERED'; question: string;
                       what_app_does_until_answered: string; answerable_in_app: boolean }[];   // P-07
  goals_display: { goal_id: string; text: string; status: string }[];   // P-02; text from the projection file
  presentation_preferences: string[];
  context_item_ids: string[];             // IDs only (engine §0; D-074)
}
```

Excluded by construction: diagnoses, medications, recovery factors, evidence labels, Health handoff quotes, clinician names, clinical grades, body metrics, performance baselines, monitoring variables, and all CONTEXT content.

### 5.5 Constraint

```ts
interface Constraint {
  constraint_id: string;
  kind: 'HARD' | 'SOFT';
  status: 'ACTIVE'|'ACTIVE_SCOPE_PENDING'|'ACTIVE_PARAMETERS_PENDING'|'CANDIDATE_PENDING_USER'|'NOT_ADOPTED'|'RETIRED';
  source: 'USER' | 'CLINICIAN' | 'TRAINER' | 'USER_ADOPTED_FROM_AI_PLAN';
  label_in_app: string;
  description_in_app: string;             // authored in the projection file; no clinical detail
  programming_effect_in_app: string;
  review_question: string | null;
  engine_bindings: EngineBinding[];       // engine; D-102
}

interface EngineBinding {
  filter: 'HF-01' | 'HF-02' | 'HF-03';
  outcome: 'EXCLUDED' | 'HELD_PENDING_SCOPE';
  where: {                                // a row matches if ANY listed condition holds
    position_tags_any?: PositionTag[];
    hand_support_in?: HandSupport[];
    exercise_ids?: string[];
  };
}
```

| Constraint | Bindings (equivalent to engine §D) |
|---|---|
| HC-01 ACTIVE | HF-01 EXCLUDED where `position_tags_any: [dip]` |
| HC-02 ACTIVE_SCOPE_PENDING | HF-01 EXCLUDED where `hand_support_in: [HIGH_PLANK]`; HF-02 HELD_PENDING_SCOPE where `hand_support_in: [PLANK_POSITION_UNCONFIRMED]` |
| SC-01 ACTIVE_PARAMETERS_PENDING | none (V0 effects are FIXED rules K3, R-04b, §H.6 and `ALLOW_UNEVEN_SIDE_DOSING`) |
| SC-02 to SC-05 CANDIDATE_PENDING_USER | none; recorded as `constraints_not_applied` |

Tool invariants: every HARD constraint with status ACTIVE or ACTIVE_SCOPE_PENDING has ≥ 1 binding; HF-03 bindings only for candidates adopted as HARD_EXCLUDE.

### 5.6 EngineConfig (Q.12)

```ts
interface EngineConfig {
  config_version: string;                 // "0.2.0"
  values: {
    MIN_SESSION_MINUTES: Int; TIER_AB_MINUTES: Int; TIER_ABC_MINUTES: Int; TIER_ABCF_MINUTES: Int;
    PREP_MINUTES_SHORT: Minutes; PREP_MINUTES: Minutes; PREP_GENERAL_MINUTES: Minutes; FIRST_SESSIONS_NO_FINISH: Int;
    FAMILY_ORDER: Family[]; PARENT_ORDER: ('PULL'|'PUSH')[]; CORE_STARVATION_DAYS: Int;
    FINISH_PRIORITY: ('GOAL_ACCESSORY'|'CORE_OR_CARRY'|'CONDITIONING'|'MOBILITY')[];
    GOAL_ACCESSORY_ENABLED: boolean; GOAL_ACCESSORY_MIN_HOURS: Int;
    CONDITIONING_OPT_IN: boolean; CONDITIONING_FORMAT: { minutes: Int; work_s: Int; easy_s: Int; non_impact_only: boolean };
    MIN_SETS_FOR_CREDIT: Int; REPEAT_EXCLUSION_DAYS: Int; HEAVY_LOWER_RECOVERY_HOURS: Int;
    ACCESSORY_ROTATION_EXPOSURES: Int; ENABLE_NOVEL_DRAW: boolean;
    ROLE_TABLE: Record<Role | 'CORE_TIME', { unit: Unit; range_min: Int; range_max: Int; step: Int;
                                              default_sets: Int; rest_after_pair_s: Int | null }>;
    PAIR_SET_MINUTES: { PRIMARY: Minutes; SECONDARY: Minutes; OTHER: Minutes };
    UNILATERAL_ADD_MINUTES: Minutes; BLOCK_SETUP_MINUTES: Minutes; RAMP_MINUTES: Minutes;
    STRAIGHT_SETS_ADD_MINUTES: Minutes; FINISH_MINUTES: Minutes; DURATION_TOLERANCE_MINUTES: Minutes;
    UNDERFILL_NOTICE_MINUTES: Minutes;
    LOAD_UP_CONFIRMATIONS: Int; NOMINAL_LOAD_STEP: Load; LOAD_CAP_EXTRA: Int; GAP_DAYS: Int; STALL_FLAG_EXPOSURES: Int;
    ALLOW_UNEVEN_SIDE_DOSING: boolean;
    ALLOY_SCHEDULE: { weekday: Weekday; start: LocalTime }[];   // default; device setting may override (D-112)
    ALLOY_PROMPT_LOOKBACK_HOURS: Int; ALLOY_MAX_PROMPTS: Int;
    ALLOY_DEFAULT_DURATION_MINUTES: Int; ALLOY_TIME_UNCERTAINTY_HOURS: Int;
  };
  set_by: Partial<Record<keyof EngineConfig['values'], 'ENGINE_DEFAULT' | string>>;   // question id, e.g. 'B2' (D-118)
}
```

Config 0.2.0 values are the §R defaults. `config_hash` = `Hash64` of the canonical JSON of `values` after the device Alloy-schedule override.

### 5.7 Datapack

```ts
interface Datapack extends DocBase {      // type 'datapack', id 'datapack' (only the active pack is stored)
  manifest: DatapackManifest;
  exercises: ExerciseDisplay[];
  evidence_sources: EvidenceSource[];
  aliases: ExerciseAlias[];
  exercise_metadata: ExerciseMetadata[];  // may be empty → generation NOT_READY
  supplemental: SupplementalInfo[];
  family_order_approvals: FamilyOrderApproval[];
  equipment_catalog: EquipmentCatalogItem[];
  environments: GymEnvironment[];
  equipment_baseline: EquipmentState[];
  profile: UserProfile;
  constraints: Constraint[];
  config: EngineConfig;
}

interface DatapackManifest {
  format: 'pto-datapack';
  datapack_id: string;
  pack_version: SemVer;
  built_at: UtcTs;
  tool_version: SemVer;
  contract_version: SemVer;               // "1.0.0"
  engine_compat: { min: SemVer; max_exclusive: SemVer };   // "0.2.1" .. "0.3.0"
  config_version: string;
  sources: { file: string; version: string | null; sha256: string }[];
  counts: Record<string, Int>;
}
```

### 5.8 Source file formats (authored in the project; read by the datapack tool)

| File | Status | Format |
|---|---|---|
| `claude_v0-exercise-db_exercise_dataset.json`, `_sources.csv`, `_alias_table.csv` | existing, unchanged | as delivered |
| `equipment_library.json` | existing, unchanged | as delivered |
| `PERSONAL_user_profile.yaml`, `PERSONAL_constraints.yaml` | existing, unchanged | read only through the projection |
| `EXERCISE_METADATA.md` | new (B6) | Section 1: one Markdown table using the FX-META encoding (GENERATOR_ACCEPTANCE_TESTS_V0_2.md Appendix A: `id, name, fam, roles, lat, load, equipment_options, station, heavy, rtri, hand_support, tags, sore, prereq, basis, ord`) plus columns `sub, ps, status, executed_as, note`. Section 2: supplemental rows (same columns plus `added_because, approved_on`). Section 3: family order approvals table (`family, approved_on, order_hash`) |
| `EQUIPMENT_MODEL.md` | new (B2/B6) | Tables: implement-type vocabulary; catalog additions and `implement_type`/`display_name`/`kind` for every item; environments; ENV-APT baseline state using the FX-EQUIP encoding (`equipment, availability, loads, max_confirmed_load, station group`); station groups; warm-up order |
| `PROFILE_PROJECTION.yaml` | new (B2) | `user_id`, display name, goal display texts, pending-question texts, constraint `description_in_app` / `programming_effect_in_app` / `engine_bindings`, presentation preferences. SYSTEM_DESIGN, reviewable; the only place app-facing profile text is written |
| `ENGINE_CONFIG_0.2.0.json` | new (B2) | `{ config_version, values, set_by }` per §5.6 |

The same Markdown-table parser reads the acceptance fixtures directly from the test document (D-119), so fixture data is never transcribed by hand.

---

## 6. Source documents

### 6.1 CheckIn (Readiness; Q.4)

```ts
interface CheckIn extends DocBase {       // type 'check_in'; immutable after its generation
  local_date: LocalDate;
  tz: IanaTz;
  env_id: 'ENV-APT';                      // D-117
  revises_check_in_id: string | null;
  R01: Int | null;                        // engine; required to generate
  R02: 'low' | 'normal' | 'high' | null;  // engine
  R03: 'poor' | 'ok' | 'good' | null;     // recorded only (D-034)
  R04: 'worse' | 'same' | 'better' | null;// engine
  R04b: 'as_usual' | 'swap' | null;       // engine; only if R04 = worse
  R05: ('upper' | 'lower' | 'trunk')[] | null;   // engine; [] = none
  R06: 'no' | 'yes' | null;               // engine; required
  R06_choice: 'normal' | 'lighter' | 'skip' | null;   // engine; required if R06 = yes
  R07: 'yes' | 'no' | null;               // recorded only
  equipment_issues: string[];             // engine (EQ-?)
  alloy_answers: AlloyAnswer[];           // engine (replayed, §B.1)
  defaulted_fields: ('R02' | 'R04' | 'R04b' | 'R05')[];   // engine record; R01 and R06 are never defaulted (§M)
  normal_day_shortcut: boolean;           // ext (D-081)
}

interface AlloyAnswer {
  slot_key: string;
  scheduled_start: UtcTs;
  answer: 'yes' | 'no' | 'not_sure' | 'unanswered';
  created_external_session_id: string | null;   // set when yes
}
```

Invariants: `R06 = 'yes'` ⇒ `R06_choice` set; `R04b` only with `R04 = 'worse'`.

### 6.2 Generation (Q.10 + Q.11 in one immutable document)

```ts
interface Generation extends DocBase {    // type 'generation'; never modified
  check_in_id: string;
  env_id: 'ENV-APT';
  local_date: LocalDate;                  // plan date; expires at local midnight if not started
  generated_at: UtcTs;                    // = engine now
  datapack_id: string;
  engine_version: SemVer;
  config_version: string;
  config_hash: Hash64;
  app_version: SemVer;
  state_digest: Hash64;                   // digest of the GeneratorState the engine received
  result: 'SESSION' | 'NO_SESSION';
  session: GeneratedSession | null;
  no_session: { reason: NoSessionReason; validator_ids: string[]; sentence: string } | null;
  record: GenerationRecord;               // §J.1, verbatim
  why: { slot: SlotId | PrepId; movement: string; exercise: string; dose: string }[];   // rendered §J.3 text (D-116)
}

interface GeneratedSession {              // Q.10
  posture: Posture;
  tier: 'A' | 'AB' | 'ABC' | 'ABCF';
  prep: PrepItem[];
  blocks: WorkoutBlock[];
  items: PlannedExercise[];               // execution order (§F.3)
  finish_choice: 'GOAL_ACCESSORY' | 'CORE_OR_CARRY' | 'CONDITIONING' | 'MOBILITY' | 'NONE';
  duration_estimate_min: Minutes;
  underfill: { planned_min: Minutes; available_min: Int; cause: UnderfillCause } | null;
  notices: string[];                      // plan notice codes (UX §4.4)
}

interface PrepItem {
  prep_id: PrepId;
  kind: 'GENERAL' | 'MOBILITY' | 'RAMP';
  exercise_id: string | null;
  equipment_id: string | null;
  minutes: Minutes | null;
  sets: Int | null; target: Int | null; unit: Unit | null;
  ramp_loads: Load[] | null;              // text only, never logged (D-095)
}

interface WorkoutBlock { block_id: BlockId; mode: 'PAIRED' | 'STRAIGHT_SETS'; slots: SlotId[]; }

interface PlannedExercise {
  slot: SlotId; block_id: BlockId;
  exercise_id: string;
  family: Family; sub_target: SubTarget | null; role: Role;
  implement: string[];                    // option set chosen today [M-13, M-20]
  sets: Int; target: Int; unit: Unit;
  load: Load | null; load_state: LoadState;
  rest_after_pair_s: Int | null;
  per_side: boolean;
  notes: string[];
}

interface GenerationRecord {              // §J.1 field set
  generation_id: string; engine_version: SemVer; config_version: string; generated_at: UtcTs; seed: Int;
  input_versions: { profile: string; constraints: string; equipment: string; metadata: string; supplemental: string };
                                          // from the datapack manifest source versions and datapack_id
  metadata_rejected: { exercise_id: string; validator: string }[];
  check_in: Omit<CheckIn, keyof DocBase>;
  posture: Posture; posture_reason: string;
  tier: string; blocks_included: BlockId[]; finish_choice: string; finish_reason: string;
  unservable: { family: Family; unblocking_question: string | null }[];
  family_plan: { slot: SlotId; family: Family; role: Role; reason_code: FamilyReasonCode;
                 family_last_trained: UtcTs | null; family_last_primary: UtcTs | null;
                 parent_last_trained: UtcTs | null; parent_last_primary: UtcTs | null;
                 source_of_timestamp: 'APARTMENT' | 'ALLOY_FULL' | 'ALLOY_SUMMARY' | 'ALLOY_PROMPT' | null }[];
  alloy: { prompts_asked: string[]; answers: AlloyAnswer[]; credits_applied: string[]; recovery_credits_applied: UtcTs[] };
  unfillable: { family: Family; reason: string; unblocking_question: string | null }[];
  constraints_applied: { id: string; filter: HfId; items_affected: string[] }[];
  constraints_not_applied: { id: string; status: string }[];
  context_items_shown: string[];
  validators: { id: string; result: 'PASS' | 'REPAIRED' | 'FAIL'; repairs: string[] }[];
  duration_estimate: Minutes; trims_applied: string[];
  underfill: { planned_min: Minutes; available_min: Int; cause: UnderfillCause } | null;
  items: {
    slot: SlotId | PrepId; exercise_id: string; evidence_basis: EvidenceBasis; role: Role;
    family_reason_code: FamilyReasonCode | null;
    implement: string[];
    selection: { reason_code: SelectionReason; decided_by: DecidedBy | null; anchor_before: string | null;
                 anchor_candidate_if_substitute: string | null; anchor_after_if_performed: string | null; note: string | null };
    alternatives: { exercise_id: string; outcome: string }[];     // "LOST(K5)" | HfId | "NOT_IN_POOL"
    recent_training: { what: string; when: UtcTs; source: string }[];
    prescription: { sets: Int; target: Int; unit: Unit; load: Load | null; rest: Int | null; per_side: boolean; line_state: string };
    progression: { line_state: string; last_decision: DecisionCode | null; why_this_load: string; reduce_locked: boolean };
    constraint_effects: { id: string; effect: string }[];
    station: { group: string; block_mode: 'PAIRED' | 'STRAIGHT_SETS'; reselect_detail: string | null };
  }[];
}
```

### 6.3 Workout, WorkoutExercise, SetPerformance (Q.5)

```ts
interface Workout extends DocBase {       // type 'workout'
  generation_id: string;                  // engine
  check_in_id: string;
  env_id: 'ENV-APT';                      // D-117
  plan_local_date: LocalDate;             // plan keeps its start date past midnight
  status: 'IN_PROGRESS' | 'COMPLETED';    // discarded workouts are deleted
  started_at: UtcTs;                      // engine (performed_at)
  ended_at: UtcTs | null;                 // engine
  session_capacity: Capacity | null;      // engine
  load_unit: 'lb';
  blocks: (WorkoutBlock & { mode_actual: 'PAIRED' | 'STRAIGHT_SETS' })[];   // ext mode_actual
  items: WorkoutExercise[];
  warmup_completed: boolean;              // ext (resume)
  finish_method: 'FINISH_STEP' | 'END_SESSION' | 'FINISHED_LATER' | null;  // ext (D-072)
  note: string | null;                    // ext
}

interface WorkoutExercise {
  item_key: string;
  slot: SlotId;                           // engine
  block_id: BlockId;
  exercise_id: string;                    // engine
  exercise_name_snapshot: string;         // snapshot
  family: Family;                         // snapshot; replay reads it (provisional, EI-10)
  sub_target: SubTarget | null;
  role: Role;                             // engine
  anchor_pick_reason: SelectionReason;    // engine
  implement: string[];                    // engine
  swapped_from: string | null;            // engine; exercise_id replaced
  swapped_from_item_key: string | null;   // ext
  swap_type: 'USER_SWAP' | 'USER_REPLACE' | null;   // engine
  status: 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED' | 'SWAPPED_OUT' | 'STOPPED';   // ext
  prescription: { sets: Int; target: Int; unit: Unit; load: Load | null; load_state: LoadState;
                  per_side: boolean; rest_after_pair_s: Int | null };   // snapshot
  effort: { BILATERAL?: Effort | null; LEFT?: Effort | null; RIGHT?: Effort | null };   // engine
  flags: { code: FlagCode; side: Side | null; rep: Int | null; text: string | null; flagged_at: UtcTs }[];  // engine (+ext flagged_at)
  sets: SetPerformance[];                 // engine
  note: string | null;                    // ext
}

interface SetPerformance {
  set_no: Int;                            // engine; ≥ 1, contiguous per (item, side)
  side: Side;                             // engine
  load: Load | null;                      // engine
  reps: Int | null;                       // engine
  seconds: Int | null;                    // engine
  is_working: boolean;                    // engine
  logged_at: UtcTs;                       // ext; also used to derive rest state on resume
  entry: 'AS_PLANNED' | 'ADJUSTED' | 'TIMED_AUTO' | 'TIMED_STOPPED';   // ext (OBS-02)
}
```

Invariants: COMPLETED ⇒ `ended_at ≥ started_at`; exactly one of `reps` / `seconds` per set matching the unit; per-side items log LEFT and RIGHT only; `swap_type` set ⇔ `swapped_from` set; SWAPPED_OUT items keep their sets; preferences are events, not flags.

### 6.4 ExternalSession (Q.6 and Q.7; D-106)

```ts
interface ExternalSession extends DocBase {   // type 'external_session'
  kind: 'ALLOY' | 'OTHER';                // engine reads ALLOY only; OTHER stored, not read (B2)
  env_id: 'ENV-ALLOY' | 'ENV-OTHER';
  local_date: LocalDate;                  // engine
  performed_at: UtcTs;                    // engine; class time, never entry time
  ended_at: UtcTs;                        // engine
  duration_known: boolean;                // ext; false → ended_at = performed_at + 55 min
  source: 'USER_ENTRY' | 'CHECKIN_PROMPT';// engine (Q.6)
  import_batch_id: string | null;         // ext; FUTURE history import (§10)
  // ALLOY fields
  log_mode: 'SUMMARY' | 'FULL' | null;    // engine; ALLOY: FULL iff items non-empty; OTHER: null
  focus: 'full' | 'upper' | 'lower' | null;   // engine; required for ALLOY
  perceived_effort: Effort | null;        // engine field; not collected in V0
  coach_notes: string | null;             // ext
  coach_notes_reviewed_at: UtcTs | null;  // ext
  // OTHER fields (Q.7)
  program: 'DailyArms' | 'DailyAbs' | 'Walking' | 'Manual' | null;
  focus_tags: string[];
  duration_min: Int | null;
  // shared
  notes: string | null;
  entry_mode: 'CHIPS' | 'TYPED' | 'DICTATED' | 'PROMPT' | 'IMPORT';   // ext
  items: ExternalItem[];
}

interface ExternalItem {
  item_no: Int;
  slot_label: string | null;              // ext
  exercise_id: string | null;             // engine
  exercise_name_snapshot: string | null;  // snapshot
  free_text: string | null;               // engine
  family_tag: Family | null;              // engine; from metadata if the exercise has it, else user chip
  family_tag_source: 'METADATA' | 'USER_CHIP' | 'NONE';   // ext
  sets: Int | null; reps: Int | null; load: Load | null;  // engine (recorded)
  dose_text: string | null;               // ext
  is_finisher: boolean;                   // ext
  coach_modified: boolean;                // ext
  coach_note: string | null;              // ext
  coach_note_reviewed: boolean;           // ext
}
```

Invariants: kind ALLOY ⇔ id `ext_alloy_<local_date>` and `env_id = ENV-ALLOY`; exactly one of `exercise_id` / `free_text` per item; a free-text "Core" chip gives `family_tag = null`; a USER_ENTRY write for a date replaces the CHECKIN_PROMPT document with the same ID (§L.2); future dates rejected; personal logs never become research evidence (D-071).

### 6.5 UserActionEvent (Q.8; append-only)

```ts
interface UserActionEvent extends DocBase {   // type 'event'
  event_at: UtcTs;                        // engine; when it applies
  event_type: 'CLEAR_HOLD'|'CLEAR_REVIEW'|'SET_PREFERENCE'|'USER_REPLACE'|'CONFIRM_CAPABILITY'|'CONFIRM_EQUIPMENT'|'ALLOY_SKIPPED';
  payload:
    | { exercise_id: string }                                                   // CLEAR_HOLD
    | { exercise_id: string; role: Role | null; side: Side | null }             // CLEAR_REVIEW [M-10]
    | { exercise_id: string; value: 'PREFER' | 'DISLIKE' | null }               // SET_PREFERENCE
    | { family: Family; role: Role; sub_target: SubTarget | null; exercise_id: string; replaced_exercise_id: string | null } // USER_REPLACE
    | { capability_prereq: string; exercise_ids: string[] }                    // CONFIRM_CAPABILITY
    | { env_id: string; equipment_id: string; availability: Availability; loads: Load[] | null;
        max_confirmed_load: Load | null; station_group: string | null }         // CONFIRM_EQUIPMENT
    | { slot_key: string };                                                     // ALLOY_SKIPPED
  context: { workout_id?: string; generation_id?: string } | null;             // ext
}
```

Events are never edited; a correction is a later event. Pre-start swaps are written at Start; USER_REPLACE at tap time (UX §4.4).

### 6.6 Settings

```ts
interface Settings extends DocBase {      // type 'settings', id 'settings'
  tz: IanaTz;                             // D-073
  units: 'lb';
  sound_rest_end: boolean;
  ask_sleep_and_fueling_every_time: boolean;   // D-082
  technical_details: boolean;
  alloy_schedule: { weekday: Weekday; start: LocalTime }[] | null;   // null = pack default (D-112)
  setup_completed_at: UtcTs | null;
  last_export_at: UtcTs | null;           // backup reminder
  device_label: string;
}
```

### 6.7 PackHistory (D-118)

```ts
interface PackHistory extends DocBase {   // type 'pack_history', id 'pack_history'
  entries: { activated_at: UtcTs; manifest: DatapackManifest; config: EngineConfig }[];   // append-only
}
```

### 6.8 StateSummary (diff baseline only)

```ts
interface StateSummary extends DocBase {  // type 'state_summary', id 'state_summary'; not exported
  engine_version: SemVer; datapack_id: string; state_digest: Hash64;
  lines: { key: string; state: LineState; next_load: Load | null; next_target: Int; implement: string[] }[];
  anchors: { key: string; exercise_id: string; rotate_due: boolean }[];
  holds: { exercise_id: string; cause: string }[];
}
```

### 6.9 Meta

```ts
interface Meta extends DocBase {          // type 'meta', id 'meta'; not exported
  app_schema_version: Int;                // 1
  installed_at: UtcTs;
}
```

---

## 7. Derived structures (returned by replay; never stored)

### 7.1 GeneratorState (Q.9 = §B.1)

```ts
interface GeneratorState {
  family_last_trained: Partial<Record<Family, UtcTs | null>>;
  parent_last_trained: Partial<Record<Parent, UtcTs | null>>;
  family_last_primary: Partial<Record<Family, UtcTs | null>>;
  parent_last_primary: { PUSH: UtcTs | null; PULL: UtcTs | null };
  lower_last_trained: UtcTs | null;
  recovery_credits: UtcTs[];
  exercise_last_used: Record<string, UtcTs | null>;
  anchors: Record<string, { exercise_id: string; exposures_as_anchor: Int; rotate_due: boolean;
                            rotate_cause: 'LOAD_CAPPED'|'EXPOSURES'|'DISLIKE'|'USER_REPLACE'|null;
                            note: 'NO_ALTERNATIVE_FOR_DISLIKE' | null }>;
  lines: Record<string, ProgressionLine>;
  review_hold: Record<string, { held: boolean; cause: 'STOPPED_SYMPTOM' | 'UNCOMFORTABLE_X2' | null }>;
  uncomfortable_streak: Record<string, Int>;
  preference: Record<string, 'PREFER' | 'DISLIKE' | null>;
  apartment_sessions_completed: Int;
  history_start: UtcTs | null;
  alloy_resolved: Record<string, 'LOGGED' | 'SKIPPED' | 'UNKNOWN'>;
  equipment_overrides: Record<string /* env|eq */, { availability: Availability; loads: Load[] | null; max_confirmed_load: Load | null }>;
}

interface ProgressionLine {               // §H.1
  exercise_id: string; role: Role; side: Side;
  range_min: Int; range_max: Int; step: Int; unit: Unit;
  state: LineState; next_load: Load | null; next_target: Int;
  implement: string[];
  top_confirmations: Int; extended: boolean; consecutive_holds: Int; reduce_locked: boolean;
  last_exposure_at: UtcTs | null;
  last_decision: { code: DecisionCode; reasons: string[] } | null;
}
```

### 7.2 CompletionDecision

```ts
interface CompletionDecision {
  workout_id: string; item_key: string; exercise_id: string; role: Role; side: Side;
  decision: DecisionCode; reasons: string[];          // incl. "REBASED", "(merged)" per §H.6
  line_before: ProgressionLine | null; line_after: ProgressionLine | null;
  flag_actions: string[];
  anchor_effect: 'NONE' | 'EXPOSURE+1' | 'SET' | 'ROTATE_DUE' | 'CLEARED';
}
```

### 7.3 MovementExposure and RecoveryCredit

```ts
interface MovementExposure {              // one per credit event (§B.3, §L.3); basis for "Patterns: last trained" and future weekly targets
  exposure_id: string;                    // "<source_doc_id>:<family or parent>"
  level: 'FAMILY' | 'PARENT';
  family: Family | null; parent: Parent | null;
  credited_at: UtcTs; local_date: LocalDate;
  source: 'APARTMENT' | 'ALLOY_FULL' | 'ALLOY_SUMMARY' | 'ALLOY_PROMPT';
  source_doc_id: string;
  env_id: string;
  role: Role | null;                      // apartment item role
  as_primary: boolean;
  working_sets: Int | null;               // null for Alloy
  exercise_ids: string[];
}

interface RecoveryCredit { slot_key: string; recovery_end: UtcTs; cause: 'PROMPT_YES' | 'NOT_SURE' | 'UNANSWERED'; superseded_by: string | null; }
```

### 7.4 ExerciseHistory (read model for H-04)

```ts
interface ExerciseHistory {
  exercise_id: string; display_name: string;
  last_used_at: UtcTs | null; last_used_source: 'APARTMENT' | 'ALLOY' | null;
  status_display: 'CALIBRATING'|'PROGRESSING'|'HOLDING'|'LOWERED'|'STALLED'|'AT_TOP_WEIGHT'|'ON_HOLD'|'NONE';
  lines: ProgressionLine[];
  preference: 'PREFER' | 'DISLIKE' | null;
  review_hold: { held: boolean; cause: string | null };
  exposures: { at: UtcTs; source: 'APARTMENT' | 'ALLOY'; doc_id: string; role: Role | null; side: Side | null;
               sets_summary: string; effort: Effort | null; decision: DecisionCode | null; qualifying: boolean | null }[];
}
```

---

## 8. Cross-document invariants

| # | Invariant | Checked |
|---|---|---|
| I-01 | Every `exercise_id` in a stored document exists in the active pack (any status); if not, the name snapshot is shown and the pack preview warns | pack import |
| I-02 | Every `equipment_id` in metadata options exists in the catalog (V-00f) | tool, loader |
| I-03 | At most one workout IN_PROGRESS | write |
| I-04 | At most one ALLOY external session per local date (ID scheme) | write |
| I-05 | A workout's `generation_id` references a stored generation | write, import |
| I-06 | Generations and events are never modified | store (no update path for these types) |
| I-07 | Profile and constraints contain only whitelisted fields | tool (test) |
| I-08 | Every active hard constraint has ≥ 1 binding | tool |
| I-09 | An exercise ID present in the previous pack is present in the new pack (possibly RETIRED) with the same identity | tool |
| I-10 | Each family with ACTIVE rows has a valid order approval, or generation is NOT_READY for that reason | loader |

---

## 9. Backup file

```ts
interface Backup {
  format: 'pto-backup';
  app_schema_version: Int;
  contract_version: SemVer;
  exported_at: UtcTs;
  app_version: SemVer;
  engine_version: SemVer;
  device_label: string;
  datapack: Datapack;                     // active pack, embedded
  pack_history: PackHistory;
  settings: Settings;
  documents: {
    check_ins: CheckIn[]; generations: Generation[]; workouts: Workout[];
    external_sessions: ExternalSession[]; events: UserActionEvent[];
  };
  counts: { check_ins: Int; generations: Int; workouts: Int; external_sessions: Int; events: Int };
  state_digest: Hash64;                   // for comparison after restore on the same engine version
}
```

File name `pto-backup_<YYYY-MM-DD>_<HHmm>.json`. Import: parse → `format` → version (older: migrate; newer: refuse) → Zod validation of every document → counts → confirm → `replaceAll` → replay → if the engine version matches, compare `state_digest` and warn on mismatch.

---

## 10. History import bundle (reserved; FUTURE)

```ts
interface HistoryImportBundle {
  format: 'pto-history-import';
  import_batch_id: string;                // imp_<uuid>
  created_at: UtcTs;
  description: string;
  external_sessions: ExternalSession[];   // each with import_batch_id, entry_mode 'IMPORT', source 'USER_ENTRY'
}
```

Append-only and idempotent by document ID; previewed before writing; never produces workouts or generations (APP_TECH_ARCHITECTURE_V0.md §18.5). Not implemented in V0; defined so the ExternalSession fields it needs exist now.

---

## 11. When the exercise database changes

A new datapack never rewrites stored documents; replay recomputes state.

| Change | Documents | State after replay | UI |
|---|---|---|---|
| Exercise added (ACTIVE) | unchanged | Enters candidate lists; becomes an anchor only via rotation, DISLIKE, USER_REPLACE, or a family without an anchor (§E.1). Its family needs a fresh order approval (I-10) | Pack preview lists it |
| Exercise added as DRAFT | unchanged | Not in the pool; loggable at Alloy | Shown in P-09 as draft |
| Renamed | unchanged (snapshot keeps the old name) | Unaffected (keyed by ID) | Current name shown; logs show the logged name on detail |
| Metadata fields changed | unchanged | Filters re-evaluated; an anchor failing a static filter is cleared at its next slot (§D) | Diff lists affected anchors, lines, holds |
| `default_order` changed | unchanged | K7 and future anchor picks change; existing anchors stay (§E.1) | Requires re-approval (I-10) |
| Row rejected by V-00 | unchanged | Out of the pool; listed in every record (§Q.1.2); anchor handling EI-09 | P-09 rejected list |
| Row RETIRED | unchanged | Out of the pool; lines dormant; `exercise_last_used` kept; anchor handling EI-09 | History shows "retired from the library" |
| Family changed | unchanged; items keep the logged `family` | Past credits keep the logged family (EI-10); future sessions use the new family; lines persist | Diff |
| Evidence text changed | unchanged | none | How-to updates |
| Equipment added or catalog text changed | unchanged | none unless metadata references it | Equipment screens update |
| Baseline availability changed | unchanged | New baseline, then existing CONFIRM_EQUIPMENT events (events win); lines whose implement became NOT_AVAILABLE re-base at next exposure (§H.7 [M-20]) | Pack preview lists affected lines |
| Config changed | unchanged | Recomputed with new values; old generations keep their config hash | Pack preview shows the diff; pack history records it |
| ID reused or deleted | — | — | Forbidden: the tool fails (I-09) |

---

## 12. Versioning and migration

| Version | Scope | Bumps when | Now |
|---|---|---|---|
| `contract_version` | this document | any field, enum, or invariant change | 1.0.0 |
| `app_schema_version` | stored documents and backup format | any stored-shape change | 1 |
| `pack_version` | datapack content | any source file change | set by the tool |
| `engine_version` | engine rules | FIXED rule change (decision entry) | 0.2.1 |
| `config_version` | PARAM values | value change | 0.2.0 |

1. Optional additive fields: `contract_version` minor bump; no migration; the Zod schema supplies the default when reading older documents.
2. Renames, type changes, new required fields, enum removals: `app_schema_version` bump, migration `m<n>_to_<n+1>`, and a golden backup fixture of version n.
3. Migrations are pure and total over valid version-n data; unmappable user values move to `legacy` on the same document; results must validate before anything is written.
4. Engine and config changes never need a data migration.
5. A datapack outside the app's `engine_compat` or `contract_version` support is refused; the current pack stays active.
6. Sync readiness: UUID IDs, `updated_at` everywhere, append-only events, immutable generations, derived state. A sync layer adds tombstones when introduced.

---

## 13. Mapping

| Requested entity | Contract | Engine contract |
|---|---|---|
| Exercise | §5.1 view (ExerciseDisplay + ExerciseMetadata + SupplementalInfo + aliases) | Q.1, Q.2 |
| Equipment | §5.2 EquipmentCatalogItem, §5.3 EquipmentState | Q.3 |
| GymEnvironment | §5.3 | product (D-065, D-117) |
| UserProfile | §5.4 | A.1 profile, A.4 defaults |
| Workout | §6.3 (performed); its plan is §6.2 GeneratedSession | Q.5; Q.10 |
| WorkoutBlock | §6.2, shared by plan and log | Q.10 `blocks` |
| WorkoutExercise | §6.3 (performed); PlannedExercise §6.2 | Q.5 `items`; Q.10 `items` |
| SetPerformance | §6.3 | Q.5 `sets` |
| Readiness | §6.1 CheckIn | Q.4, §A.3 |
| GeneratorState | §7.1 | Q.9 = §B.1 |
| MovementExposure | §7.3 | derived from §B.3, §L.3 |
| ExerciseHistory | §7.4 | EI-08 queries |
| AlloyExternalSession | §6.4 ExternalSession with `kind = 'ALLOY'` | Q.6 |
| Constraint | §5.5 | A.1; §D HF-01..HF-03 |
| GenerationRecord | §6.2 `Generation.record` | Q.11 = §J.1 |

Also defined: EngineConfig (Q.12), Datapack, ExternalSession kind OTHER (Q.7), UserActionEvent (Q.8), Settings, PackHistory, StateSummary, Meta, CompletionDecision, RecoveryCredit, Backup, HistoryImportBundle (reserved).

---

## 14. Open data items

| ID | Item | Needed by |
|---|---|---|
| DQ-01 | Adopt the fixture IDs (`EQ_SUSP`, `EQ_BAND`, `EQ_WHEEL`, `EQ_ROLLER`, `EQ_TRAPBAR`, `EQ_CABLE_ADJ`, `EQ011_INCLINE`) as canonical equipment concept and setting IDs | B2 |
| DQ-02 | `implement_type` and `display_name` for every catalog item (EQUIPMENT_MODEL.md) | B2 |
| DQ-03 | PROFILE_PROJECTION.yaml text: goals, pending questions, constraint descriptions and effects, bindings | B2 |
| DQ-04 | ENV-APT baseline loads, `max_confirmed_load`, station groups (UQ-G02, G04, G05), or leave for T-00 step 1 | B7 |
| DQ-05 | EXERCISE_METADATA.md content and family approvals | B6 |
| DQ-06 | Confirm EI-09, EI-10, D-111 | B5 / B7 |
