// One-off generator for dev-data/seed-datapack.json. Not part of the app; run with
// `node dev-data/generate-seed.mjs` to regenerate. Mirrors src/domain/{canonicalJson,hash}.ts
// (duplicated here in plain JS so this script has no build step / dependency on the
// compiled app) to compute real FNV-1a 64 order hashes for family_order_approvals,
// so the seed's hashes aren't just placeholder-shaped strings.
import { writeFileSync } from 'node:fs';

function sortValue(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (value[k] !== undefined) out[k] = sortValue(value[k]);
    }
    return out;
  }
  return value;
}
function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}
const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;
function fnv1a64Hex(input) {
  let hash = FNV64_OFFSET_BASIS;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV64_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}
function orderHash(exerciseIds) {
  return fnv1a64Hex(canonicalJson(exerciseIds));
}

const builtAt = '2026-09-24T18:00:00.000Z';

// A small, representative slice of Appendix A (GENERATOR_ACCEPTANCE_TESTS_V0_2.md) —
// one exercise per family, enough to exercise every part of the Datapack shape
// without transcribing the full 81-row fixture (that lives in tests/fixtures/).
const exercises = [
  { id: 'EX012', name: 'Goblet Squat', family: 'KD', roles: ['PRIMARY', 'SECONDARY'], lat: 'BILATERAL', load_mode: 'EXTERNAL_LOAD', equip: [['EQ009'], ['EQ010']], station: 'NONE', heavy: true, rtri: 'NONE', hand: 'NONE', tags: [], sore: ['LOWER'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX011', name: 'Kettlebell Deadlift', family: 'HD', roles: ['PRIMARY', 'SECONDARY'], lat: 'BILATERAL', load_mode: 'EXTERNAL_LOAD', equip: [['EQ009'], ['EQ010']], station: 'NONE', heavy: true, rtri: 'NONE', hand: 'NONE', tags: [], sore: ['LOWER'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX054', name: 'Dumbbell Bench Press', family: 'HPUSH', roles: ['PRIMARY', 'SECONDARY'], lat: 'BILATERAL', load_mode: 'EXTERNAL_LOAD', equip: [['EQ010', 'EQ011']], station: 'BENCH_2', heavy: false, rtri: 'SECONDARY', hand: 'NONE', tags: ['supine_press'], sore: ['UPPER'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX015', name: 'Kettlebell Overhead Press', family: 'VPUSH', roles: ['PRIMARY', 'SECONDARY'], lat: 'BILATERAL', load_mode: 'EXTERNAL_LOAD', equip: [['EQ009'], ['EQ010']], station: 'NONE', heavy: false, rtri: 'SECONDARY', hand: 'NONE', tags: ['overhead_press'], sore: ['UPPER'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX066', name: 'Dumbbell Bent-Over Row', family: 'HPULL', roles: ['PRIMARY', 'SECONDARY'], lat: 'BILATERAL', load_mode: 'EXTERNAL_LOAD', equip: [['EQ010']], station: 'NONE', heavy: false, rtri: 'NONE', hand: 'NONE', tags: [], sore: ['UPPER'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX090', name: 'Deadbug', family: 'ANTI_EXT', roles: ['CORE'], lat: 'ALTERNATING', load_mode: 'BODYWEIGHT', equip: [['EQ013']], station: 'NONE', heavy: false, rtri: 'NONE', hand: 'NONE', tags: ['floor'], sore: ['TRUNK'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX046', name: "Farmer's Carry", family: 'CARRY', roles: ['CARRY'], lat: 'BILATERAL', load_mode: 'TIME_WITH_LOAD', equip: [['EQ009'], ['EQ010']], station: 'NONE', heavy: false, rtri: 'NONE', hand: 'NONE', tags: [], sore: ['UPPER', 'LOWER', 'TRUNK'], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
  { id: 'EX101', name: 'Ankle Rocks', family: 'MOBILITY', roles: ['MOBILITY'], lat: 'UNILATERAL', load_mode: 'BODYWEIGHT', equip: [[]], station: 'NONE', heavy: false, rtri: 'NONE', hand: 'NONE', tags: [], sore: [], prereq: null, basis: 'ALLOY_LIBRARY', order: 1 },
];

const exerciseDisplay = exercises.map((e) => ({
  exercise_id: e.id,
  canonical_name: e.name,
  tier: 1,
  alloy_observed: true,
  evidence_classification: 'ALLOY_DOCUMENTED',
  documented_coaching_cues: null,
  source_ids: ['S-DEV'],
}));

const exerciseMetadata = exercises.map((e) => ({
  exercise_id: e.id,
  status: 'ACTIVE',
  display_name: e.name,
  family: e.family,
  sub_target: null,
  roles_allowed: e.roles,
  laterality: e.lat,
  per_side_logging: e.rtri !== 'NONE',
  load_mode: e.load_mode,
  equipment_options: e.equip,
  station: e.station,
  heavy_lower: e.heavy,
  right_triceps_involvement: e.rtri,
  hand_support: e.hand,
  position_tags: e.tags,
  sore_regions: e.sore,
  capability_prereq: e.prereq,
  evidence_basis: e.basis,
  default_order: e.order,
  library_order: e.order,
  executed_as: null,
  demo_ref: null,
  authoring_note: 'Dev seed row: a representative subset, not the authored EXERCISE_METADATA.md (B6).',
}));

const familyOrderApprovals = [...new Set(exercises.map((e) => e.family))].map((family) => {
  const ids = exercises.filter((e) => e.family === family).sort((a, b) => a.order - b.order).map((e) => e.id);
  return { family, approved_on: '2026-09-24', order_hash: orderHash(ids) };
});

const equipmentCatalog = [
  { equipment_id: 'EQ009', kind: 'PHYSICAL', parent_equipment_id: null, implement_type: 'KETTLEBELL', display_name: 'Kettlebells', category: 'free weight', description: 'Kettlebell set', limitations: null, confidence: 'confirmed', evidence_source: null, load_unit: 'lb' },
  { equipment_id: 'EQ010', kind: 'PHYSICAL', parent_equipment_id: null, implement_type: 'DUMBBELL', display_name: 'Dumbbells', category: 'free weight', description: 'Adjustable dumbbells', limitations: null, confidence: 'confirmed', evidence_source: null, load_unit: 'lb' },
  { equipment_id: 'EQ011', kind: 'PHYSICAL', parent_equipment_id: null, implement_type: 'ADJUSTABLE_BENCH', display_name: 'Adjustable bench', category: 'bench', description: 'Flat/incline adjustable bench', limitations: null, confidence: 'confirmed', evidence_source: null, load_unit: null },
  { equipment_id: 'EQ013', kind: 'PHYSICAL', parent_equipment_id: null, implement_type: 'MAT', display_name: 'Exercise mat', category: 'floor', description: 'Floor mat', limitations: null, confidence: 'confirmed', evidence_source: null, load_unit: null },
];

const equipmentBaseline = [
  { env_id: 'ENV-APT', equipment_id: 'EQ009', availability: 'AVAILABLE', loads: [25, 30, 35, 40, 45], max_confirmed_load: 45, station_group: 'NONE', confirmed_on: '2026-09-20' },
  { env_id: 'ENV-APT', equipment_id: 'EQ010', availability: 'AVAILABLE', loads: null, max_confirmed_load: 50, station_group: 'NONE', confirmed_on: '2026-09-20' },
  { env_id: 'ENV-APT', equipment_id: 'EQ011', availability: 'AVAILABLE', loads: null, max_confirmed_load: null, station_group: 'BENCH_2', confirmed_on: '2026-09-20' },
  { env_id: 'ENV-APT', equipment_id: 'EQ013', availability: 'AVAILABLE', loads: null, max_confirmed_load: null, station_group: 'NONE', confirmed_on: '2026-09-20' },
];

const datapack = {
  id: 'datapack',
  type: 'datapack',
  created_at: builtAt,
  updated_at: builtAt,
  manifest: {
    format: 'pto-datapack',
    datapack_id: 'dp_0.0.1-dev_00000000',
    pack_version: '0.0.1-dev',
    built_at: builtAt,
    tool_version: '0.0.1-dev',
    contract_version: '1.0.0',
    engine_compat: { min: '0.2.1', max_exclusive: '0.3.0' },
    config_version: '0.2.0',
    sources: [
      { file: 'dev-data/generate-seed.mjs', version: null, sha256: '0'.repeat(64) },
    ],
    counts: { exercises: exercises.length, equipment: equipmentCatalog.length },
  },
  exercises: exerciseDisplay,
  evidence_sources: [{ source_id: 'S-DEV', url: null, document: 'Dev seed (not a real Alloy source)' }],
  aliases: [],
  exercise_metadata: exerciseMetadata,
  supplemental: [],
  family_order_approvals: familyOrderApprovals,
  equipment_catalog: equipmentCatalog,
  environments: [
    {
      env_id: 'ENV-APT',
      name: 'Apartment gym',
      kind: 'GENERATION_TARGET',
      generation_enabled: true,
      load_unit: 'lb',
      station_groups: [{ station_group: 'BENCH_2', label: 'Adjustable bench', equipment_ids: ['EQ011'] }],
      general_warmup_order: ['EQ002', 'EQ015', 'EQ016'],
    },
    {
      env_id: 'ENV-ALLOY',
      name: 'Alloy Personal Training studio',
      kind: 'TRAINER_LED_EXTERNAL',
      generation_enabled: false,
      load_unit: 'lb',
      station_groups: [],
      general_warmup_order: [],
    },
    {
      env_id: 'ENV-OTHER',
      name: 'Other / manual',
      kind: 'LOGGING_ONLY',
      generation_enabled: false,
      load_unit: 'lb',
      station_groups: [],
      general_warmup_order: [],
    },
  ],
  equipment_baseline: equipmentBaseline,
  profile: {
    user_id: 'nelson',
    display_name: 'Nelson',
    profile_version: '0.0.1-dev',
    constraints_version: '0.0.1-dev',
    default_tz: 'America/Los_Angeles',
    units: 'lb',
    generation_env_id: 'ENV-APT',
    alloy_schedule_default: [
      { weekday: 'MON', start: '16:00' },
      { weekday: 'WED', start: '16:00' },
      { weekday: 'FRI', start: '16:00' },
    ],
    avoidances: [],
    pending_questions: [],
    goals_display: [],
    presentation_preferences: [],
    context_item_ids: [],
  },
  constraints: [
    {
      constraint_id: 'HC-01',
      kind: 'HARD',
      status: 'ACTIVE',
      source: 'USER',
      label_in_app: 'No dip-position exercises',
      description_in_app: 'Dip-position pressing is excluded.',
      programming_effect_in_app: 'Exercises tagged dip are excluded from selection.',
      review_question: null,
      engine_bindings: [{ filter: 'HF-01', outcome: 'EXCLUDED', where: { position_tags_any: ['dip'] } }],
    },
    {
      constraint_id: 'HC-02',
      kind: 'HARD',
      status: 'ACTIVE_SCOPE_PENDING',
      source: 'USER',
      label_in_app: 'No push-up-position planks (scope pending)',
      description_in_app: 'High-plank exercises are excluded; exercises whose plank position is unconfirmed are held.',
      programming_effect_in_app: 'HIGH_PLANK rows excluded; PLANK_POSITION_UNCONFIRMED rows held pending review.',
      review_question: 'Which plank-position exercises are safe for you?',
      engine_bindings: [
        { filter: 'HF-01', outcome: 'EXCLUDED', where: { hand_support_in: ['HIGH_PLANK'] } },
        { filter: 'HF-02', outcome: 'HELD_PENDING_SCOPE', where: { hand_support_in: ['PLANK_POSITION_UNCONFIRMED'] } },
      ],
    },
  ],
  config: {
    config_version: '0.2.0',
    values: {
      MIN_SESSION_MINUTES: 15,
      TIER_AB_MINUTES: 25,
      TIER_ABC_MINUTES: 35,
      TIER_ABCF_MINUTES: 45,
      PREP_MINUTES_SHORT: 4,
      PREP_MINUTES: 6,
      PREP_GENERAL_MINUTES: 3,
      FIRST_SESSIONS_NO_FINISH: 2,
      FAMILY_ORDER: ['KD', 'HD', 'HPULL', 'HPUSH', 'VPULL', 'VPUSH', 'ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY', 'GOAL_ACCESSORY'],
      PARENT_ORDER: ['PULL', 'PUSH'],
      CORE_STARVATION_DAYS: 7,
      FINISH_PRIORITY: ['GOAL_ACCESSORY', 'CORE_OR_CARRY', 'CONDITIONING', 'MOBILITY'],
      GOAL_ACCESSORY_ENABLED: false,
      GOAL_ACCESSORY_MIN_HOURS: 24,
      CONDITIONING_OPT_IN: false,
      CONDITIONING_FORMAT: { minutes: 8, work_s: 30, easy_s: 30, non_impact_only: true },
      MIN_SETS_FOR_CREDIT: 2,
      REPEAT_EXCLUSION_DAYS: 1,
      HEAVY_LOWER_RECOVERY_HOURS: 24,
      ACCESSORY_ROTATION_EXPOSURES: 4,
      ENABLE_NOVEL_DRAW: true,
      ROLE_TABLE: {
        PRIMARY: { unit: 'REPS', range_min: 6, range_max: 10, step: 1, default_sets: 3, rest_after_pair_s: 90 },
        SECONDARY: { unit: 'REPS', range_min: 8, range_max: 12, step: 1, default_sets: 3, rest_after_pair_s: 75 },
        CORE: { unit: 'REPS', range_min: 8, range_max: 12, step: 1, default_sets: 2, rest_after_pair_s: 45 },
        CORE_TIME: { unit: 'SECONDS', range_min: 20, range_max: 40, step: 5, default_sets: 2, rest_after_pair_s: 45 },
        CARRY: { unit: 'SECONDS', range_min: 30, range_max: 45, step: 5, default_sets: 2, rest_after_pair_s: 45 },
        ACCESSORY: { unit: 'REPS', range_min: 10, range_max: 15, step: 1, default_sets: 2, rest_after_pair_s: 45 },
        MOBILITY: { unit: 'SECONDS', range_min: 30, range_max: 45, step: 5, default_sets: 1, rest_after_pair_s: null },
        CONDITIONING: { unit: 'SECONDS', range_min: 0, range_max: 0, step: 0, default_sets: 1, rest_after_pair_s: null },
      },
      PAIR_SET_MINUTES: { PRIMARY: 3.0, SECONDARY: 2.75, OTHER: 2.0 },
      UNILATERAL_ADD_MINUTES: 0.5,
      BLOCK_SETUP_MINUTES: 1.0,
      RAMP_MINUTES: 2.0,
      STRAIGHT_SETS_ADD_MINUTES: 1.0,
      FINISH_MINUTES: 6,
      DURATION_TOLERANCE_MINUTES: 3,
      UNDERFILL_NOTICE_MINUTES: 10,
      LOAD_UP_CONFIRMATIONS: 1,
      NOMINAL_LOAD_STEP: 5,
      LOAD_CAP_EXTRA: 3,
      GAP_DAYS: 14,
      STALL_FLAG_EXPOSURES: 4,
      ALLOW_UNEVEN_SIDE_DOSING: false,
      ALLOY_SCHEDULE: [
        { weekday: 'MON', start: '16:00' },
        { weekday: 'WED', start: '16:00' },
        { weekday: 'FRI', start: '16:00' },
      ],
      ALLOY_PROMPT_LOOKBACK_HOURS: 72,
      ALLOY_MAX_PROMPTS: 3,
      ALLOY_DEFAULT_DURATION_MINUTES: 55,
      ALLOY_TIME_UNCERTAINTY_HOURS: 2,
    },
    set_by: {
      GOAL_ACCESSORY_ENABLED: 'ENGINE_DEFAULT',
      CONDITIONING_OPT_IN: 'ENGINE_DEFAULT',
    },
  },
};

writeFileSync(new URL('./seed-datapack.json', import.meta.url), JSON.stringify(datapack, null, 2) + '\n');
console.log('Wrote dev-data/seed-datapack.json');
