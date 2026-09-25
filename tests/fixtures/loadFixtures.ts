/**
 * Fixture loader (APP_BUILD_SEQUENCE_V0.md B1): reads FX-EQUIP and FX-META directly
 * out of the copy of GENERATOR_ACCEPTANCE_TESTS_V0_2.md in this directory (§3.2, §3.3
 * + Appendix A), using the shared Markdown-table parser and FX cell decoders — never
 * transcribed by hand (D-119).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { tableAfterHeading, tableToObjects } from '../../src/domain/markdownTable';
import {
  decodeCommaList,
  decodeEquipmentOptions,
  decodeLaterality,
  decodeLoadMode,
  decodeNullableText,
  decodeRoles,
  decodeYesNo,
} from '../../src/pack/decode';
import type { ExerciseMetadata } from '../../src/contracts';

const FIXTURE_PATH = path.join(__dirname, 'GENERATOR_ACCEPTANCE_TESTS_V0_2.md');

export function readFixtureDoc(): string {
  return readFileSync(FIXTURE_PATH, 'utf8');
}

export interface FxEquipRow {
  equipment: string;
  availability: string;
  loads: string;
  max_confirmed_load: string;
  station_group: string;
}

/** §3.2 FX-EQUIP, parsed straight from the copied doc. */
export function loadFxEquip(doc = readFixtureDoc()): FxEquipRow[] {
  const table = tableAfterHeading(doc, '3.2 FX-EQUIP');
  if (!table) throw new Error('FX-EQUIP table not found in fixture doc');
  return tableToObjects(table).map((r) => ({
    equipment: r['Equipment'],
    availability: r['Availability'],
    loads: r['Loads'],
    max_confirmed_load: r['max_confirmed_load'],
    station_group: r['Station group'],
  }));
}

/**
 * §3.3 / Appendix A FX-META, decoded into ExerciseMetadata-shaped rows (minus the
 * fields Appendix A does not carry: status, capability_prereq beyond a bare label,
 * library_order, executed_as, demo_ref, authoring_note — those default sensibly).
 * `status` is set to ACTIVE for every fixture row (as the acceptance tests assume).
 */
export function loadFxMeta(doc = readFixtureDoc()): ExerciseMetadata[] {
  const table = tableAfterHeading(doc, 'Appendix A. FX-META');
  if (!table) throw new Error('FX-META (Appendix A) table not found in fixture doc');
  return tableToObjects(table).map((r) => {
    const roles = decodeRoles(r['roles']);
    const family = r['fam'] as ExerciseMetadata['family'];
    return {
      exercise_id: r['id'],
      status: 'ACTIVE',
      display_name: r['name'],
      family,
      sub_target: null,
      roles_allowed: roles,
      laterality: decodeLaterality(r['lat']),
      per_side_logging: r['rtri'] !== 'NONE',
      load_mode: decodeLoadMode(r['load']),
      equipment_options: decodeEquipmentOptions(r['equipment_options']),
      station: r['station'],
      heavy_lower: decodeYesNo(r['heavy']),
      right_triceps_involvement: r['rtri'] as ExerciseMetadata['right_triceps_involvement'],
      hand_support: r['hand_support'] as ExerciseMetadata['hand_support'],
      position_tags: decodeCommaList(r['tags']) as ExerciseMetadata['position_tags'],
      sore_regions: decodeCommaList(r['sore']) as ExerciseMetadata['sore_regions'],
      capability_prereq: decodeNullableText(r['prereq']),
      evidence_basis: r['basis'] as ExerciseMetadata['evidence_basis'],
      default_order: Number(r['ord']),
      library_order: Number(r['ord']),
      executed_as: null,
      demo_ref: null,
      authoring_note: null,
    } satisfies ExerciseMetadata;
  });
}
