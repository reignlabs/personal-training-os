/**
 * FX-META / FX-EQUIP cell decoders (GENERATOR_ACCEPTANCE_TESTS_V0_2.md Appendix A;
 * APP_DATA_CONTRACTS_V0.md §5.8, D-119). These decode the compact cell grammar used by
 * both the acceptance fixtures and, later, EXERCISE_METADATA.md / EQUIPMENT_MODEL.md —
 * one parser and one set of decoders for fixtures and real data.
 *
 * pack/ owns this (not engine/): it is read-time data shaping, never a rule.
 */
import type { Role, Laterality, LoadMode } from '../contracts/vocab';

/**
 * "[EQ009] or [EQ010]" -> [["EQ009"], ["EQ010"]]
 * "[EQ005+EQ009] or [EQ005+EQ010]" -> [["EQ005","EQ009"], ["EQ005","EQ010"]]
 * "[]" -> [[]]  (bodyweight)
 */
export function decodeEquipmentOptions(cell: string): string[][] {
  const trimmed = cell.trim();
  if (trimmed === '[]') return [[]];
  const groups = trimmed.split(/\s+or\s+/i);
  return groups.map((group) => {
    const inner = group.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (inner === '') return [];
    return inner.split('+').map((id) => id.trim());
  });
}

const ROLE_LETTERS: Record<string, Role> = {
  P: 'PRIMARY',
  S: 'SECONDARY',
  C: 'CORE',
  Y: 'CARRY',
  M: 'MOBILITY',
};

/** "PS" -> [PRIMARY, SECONDARY]; "C" -> [CORE]; etc. (Appendix A legend). */
export function decodeRoles(cell: string): Role[] {
  const letters = cell.trim().split('');
  const roles = letters.map((l) => {
    const role = ROLE_LETTERS[l];
    if (!role) throw new Error(`Unrecognized role letter "${l}" in roles cell "${cell}"`);
    return role;
  });
  return roles;
}

const LATERALITY_CODES: Record<string, Laterality> = {
  B: 'BILATERAL',
  U: 'UNILATERAL',
  A: 'ALTERNATING',
};

export function decodeLaterality(cell: string): Laterality {
  const code = cell.trim();
  const lat = LATERALITY_CODES[code];
  if (!lat) throw new Error(`Unrecognized laterality code "${code}"`);
  return lat;
}

const LOAD_MODE_CODES: Record<string, LoadMode> = {
  EXT: 'EXTERNAL_LOAD',
  BW: 'BODYWEIGHT',
  T: 'TIME',
  TL: 'TIME_WITH_LOAD',
};

export function decodeLoadMode(cell: string): LoadMode {
  const code = cell.trim();
  const mode = LOAD_MODE_CODES[code];
  if (!mode) throw new Error(`Unrecognized load-mode code "${code}"`);
  return mode;
}

/** "-" -> [] ; "impact" -> ["impact"] ; "UPPER,LOWER,TRUNK" -> ["UPPER","LOWER","TRUNK"]. */
export function decodeCommaList(cell: string): string[] {
  const trimmed = cell.trim();
  if (trimmed === '' || trimmed === '-') return [];
  return trimmed.split(',').map((s) => s.trim());
}

/** "-" -> null ; otherwise the trimmed string. */
export function decodeNullableText(cell: string): string | null {
  const trimmed = cell.trim();
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

/** "Y" / "N" -> boolean. */
export function decodeYesNo(cell: string): boolean {
  const trimmed = cell.trim().toUpperCase();
  if (trimmed === 'Y') return true;
  if (trimmed === 'N') return false;
  throw new Error(`Unrecognized Y/N cell "${cell}"`);
}

/** Confirmed-load list cells, e.g. "[25, 30, 35, 40, 45]" -> [25,30,35,40,45]; "unknown" -> null. */
export function decodeLoadList(cell: string): number[] | null {
  const trimmed = cell.trim();
  if (trimmed === '' || /unknown/i.test(trimmed) || trimmed === '—' || trimmed === '-') return null;
  const inner = trimmed.replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
}
