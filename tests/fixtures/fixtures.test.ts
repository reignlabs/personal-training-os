import { describe, expect, it } from 'vitest';
import { loadFxEquip, loadFxMeta } from './loadFixtures';
import { ExerciseMetadataSchema } from '../../src/contracts';

// B1 exit criteria (APP_BUILD_SEQUENCE_V0.md): "fixture pack has 81 FX-META rows".
describe('FX-META fixture', () => {
  const rows = loadFxMeta();

  it('has exactly 81 rows', () => {
    expect(rows).toHaveLength(81);
  });

  it('every row validates against ExerciseMetadataSchema', () => {
    for (const row of rows) {
      const result = ExerciseMetadataSchema.safeParse(row);
      expect(result.success, `${row.exercise_id} failed: ${JSON.stringify(result.success ? null : result.error.issues)}`).toBe(true);
    }
  });

  it('exercise_ids are unique', () => {
    const ids = rows.map((r) => r.exercise_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('decodes known rows as described in §3.3', () => {
    const goblet = rows.find((r) => r.exercise_id === 'EX012')!;
    expect(goblet.family).toBe('KD');
    expect(goblet.default_order).toBe(1);
    expect(goblet.equipment_options).toEqual([['EQ009'], ['EQ010']]);
    expect(goblet.roles_allowed).toEqual(['PRIMARY', 'SECONDARY']);

    const boxSquat = rows.find((r) => r.exercise_id === 'EX051')!;
    expect(boxSquat.equipment_options).toEqual([['EQ005', 'EQ009'], ['EQ005', 'EQ010']]);

    const pushUp = rows.find((r) => r.exercise_id === 'EX001')!;
    expect(pushUp.equipment_options).toEqual([[]]);

    const trapBar = rows.find((r) => r.exercise_id === 'EX050')!;
    expect(trapBar.capability_prereq).toBeNull();

    const chinUp = rows.find((r) => r.exercise_id === 'EX048')!;
    expect(chinUp.capability_prereq).toBe('chin-up capability');

    const renegadeRow = rows.find((r) => r.exercise_id === 'EX034')!;
    expect(renegadeRow.sore_regions).toEqual(['UPPER', 'TRUNK']);
    expect(renegadeRow.hand_support).toBe('PLANK_POSITION_UNCONFIRMED');
  });

  it('VPULL rows require a capability (HF-08 will hold them; §3.3)', () => {
    const vpull = rows.filter((r) => r.family === 'VPULL' && r.capability_prereq !== null);
    expect(vpull.map((r) => r.exercise_id).sort()).toEqual(['EX048', 'EX067']);
  });

  it('exactly the documented rows carry PLANK_POSITION_UNCONFIRMED (§3.3: "and seven others")', () => {
    const unconfirmed = rows.filter((r) => r.hand_support === 'PLANK_POSITION_UNCONFIRMED');
    // EX003, EX075, EX085, EX092 (named in §3.3) + seven others = 11.
    expect(unconfirmed).toHaveLength(11);
    for (const id of ['EX003', 'EX075', 'EX085', 'EX092']) {
      expect(unconfirmed.map((r) => r.exercise_id)).toContain(id);
    }
  });
});

describe('FX-EQUIP fixture', () => {
  const rows = loadFxEquip();

  it('parses the equipment table', () => {
    expect(rows.length).toBeGreaterThan(0);
    const kettlebells = rows.find((r) => r.equipment.startsWith('EQ009'));
    expect(kettlebells?.availability).toBe('AVAILABLE');
    expect(kettlebells?.max_confirmed_load).toBe('45');
  });

  it('lists the not-available concept equipment (§3.2)', () => {
    const notAvailable = rows.find((r) => r.equipment.includes('EQ_TRAPBAR'));
    expect(notAvailable?.availability).toBe('NOT_AVAILABLE');
  });
});
