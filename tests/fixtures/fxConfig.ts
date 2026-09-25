/**
 * FX-CONFIG (§3.1) and a synthesized FX-EQUIP baseline (§3.2), built for the engine
 * test suite. §3.2's table cells describe equipment by range/group in prose ("EQ001–
 * EQ003, EQ008, ... AVAILABLE"), not as one row per ID, so — rather than re-parsing that
 * prose — this file encodes the same documented availability rules directly as
 * `EquipmentState[]`, covering every equipment_id actually referenced by FX-META's
 * `equipment_options` (computed from loadFxMeta()) plus the named concept/setting ids.
 * This is test-fixture construction, not an engine rule.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { EngineConfigValues, EquipmentState } from '../../src/contracts';
import { EngineConfigValuesSchema } from '../../src/contracts';
import { loadFxMeta } from './loadFixtures';

const SEED_DATAPACK_PATH = path.join(__dirname, '../../dev-data/seed-datapack.json');

/** §3.1: "All §R defaults of config 0.2.0" — the dev seed datapack carries exactly
 * that config (same version, same documented override values), so it is reused here
 * rather than hand-transcribing 30+ constants a second time. */
export function loadFxConfig(): EngineConfigValues {
  const raw = JSON.parse(readFileSync(SEED_DATAPACK_PATH, 'utf8'));
  return EngineConfigValuesSchema.parse(raw.config.values);
}

const NOT_AVAILABLE_IDS = new Set(['EQ_SUSP', 'EQ_BAND', 'EQ_WHEEL', 'EQ_ROLLER', 'EQ_TRAPBAR']);
const UNKNOWN_IDS = new Set(['EQ011_INCLINE', 'EQ_CABLE_ADJ']);
const UNKNOWN_LOADS_IDS = new Set(['EQ006', 'EQ007', 'EQ010']);

const KNOWN_LOADS: Record<string, number[]> = { EQ009: [25, 30, 35, 40, 45] };
const KNOWN_MAX_CONFIRMED: Record<string, number> = { EQ009: 45, EQ010: 50 };
const KNOWN_STATION: Record<string, string> = {
  EQ004: 'RACK_AREA',
  EQ005: 'RACK_AREA',
  EQ006: 'RACK_AREA',
  EQ007: 'RACK_AREA',
  EQ011: 'BENCH_2',
  EQ011_INCLINE: 'BENCH_2',
  EQ003: 'DIP',
};

/** §3.2 FX-EQUIP, synthesized to cover every equipment_id FX-META references. */
export function fxEquipmentBaseline(): EquipmentState[] {
  const pool = loadFxMeta();
  const ids = new Set<string>();
  for (const row of pool) {
    for (const set of row.equipment_options) {
      for (const id of set) ids.add(id);
    }
  }
  // machines EQ017-EQ021 are named in §3.2 even though "no rows in FX-META" reference them
  for (let i = 17; i <= 21; i++) ids.add(`EQ0${i}`);

  return [...ids].map((equipment_id) => {
    const availability = NOT_AVAILABLE_IDS.has(equipment_id) ? 'NOT_AVAILABLE' : UNKNOWN_IDS.has(equipment_id) ? 'UNKNOWN' : 'AVAILABLE';
    const loads = UNKNOWN_LOADS_IDS.has(equipment_id) ? null : (KNOWN_LOADS[equipment_id] ?? null);
    const max_confirmed_load = KNOWN_MAX_CONFIRMED[equipment_id] ?? null;
    const station_group = KNOWN_STATION[equipment_id] ?? (/^EQ0(1[7-9]|2[01])$/.test(equipment_id) ? equipment_id : 'NONE');
    return {
      env_id: 'ENV-APT',
      equipment_id,
      availability,
      loads,
      max_confirmed_load,
      station_group,
      confirmed_on: null,
    } satisfies EquipmentState;
  });
}
