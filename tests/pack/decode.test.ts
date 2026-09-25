import { describe, expect, it } from 'vitest';
import {
  decodeCommaList,
  decodeEquipmentOptions,
  decodeLaterality,
  decodeLoadList,
  decodeLoadMode,
  decodeNullableText,
  decodeRoles,
  decodeYesNo,
} from '../../src/pack/decode';

describe('decodeEquipmentOptions', () => {
  it('decodes a single-item option', () => {
    expect(decodeEquipmentOptions('[EQ010]')).toEqual([['EQ010']]);
  });

  it('decodes alternatives joined by "or"', () => {
    expect(decodeEquipmentOptions('[EQ009] or [EQ010]')).toEqual([['EQ009'], ['EQ010']]);
  });

  it('decodes combined equipment joined by "+"', () => {
    expect(decodeEquipmentOptions('[EQ005+EQ009] or [EQ005+EQ010]')).toEqual([
      ['EQ005', 'EQ009'],
      ['EQ005', 'EQ010'],
    ]);
  });

  it('decodes bodyweight as [[]]', () => {
    expect(decodeEquipmentOptions('[]')).toEqual([[]]);
  });
});

describe('decodeRoles', () => {
  it('decodes each role letter', () => {
    expect(decodeRoles('PS')).toEqual(['PRIMARY', 'SECONDARY']);
    expect(decodeRoles('C')).toEqual(['CORE']);
    expect(decodeRoles('Y')).toEqual(['CARRY']);
    expect(decodeRoles('M')).toEqual(['MOBILITY']);
  });

  it('throws on an unrecognized letter', () => {
    expect(() => decodeRoles('X')).toThrow();
  });
});

describe('decodeLaterality / decodeLoadMode', () => {
  it('decodes laterality codes', () => {
    expect(decodeLaterality('B')).toBe('BILATERAL');
    expect(decodeLaterality('U')).toBe('UNILATERAL');
    expect(decodeLaterality('A')).toBe('ALTERNATING');
  });

  it('decodes load-mode codes', () => {
    expect(decodeLoadMode('EXT')).toBe('EXTERNAL_LOAD');
    expect(decodeLoadMode('BW')).toBe('BODYWEIGHT');
    expect(decodeLoadMode('T')).toBe('TIME');
    expect(decodeLoadMode('TL')).toBe('TIME_WITH_LOAD');
  });
});

describe('decodeCommaList / decodeNullableText / decodeYesNo', () => {
  it('decodes "-" as empty / null', () => {
    expect(decodeCommaList('-')).toEqual([]);
    expect(decodeNullableText('-')).toBeNull();
  });

  it('decodes a comma list', () => {
    expect(decodeCommaList('UPPER,LOWER,TRUNK')).toEqual(['UPPER', 'LOWER', 'TRUNK']);
  });

  it('decodes Y/N', () => {
    expect(decodeYesNo('Y')).toBe(true);
    expect(decodeYesNo('N')).toBe(false);
  });
});

describe('decodeLoadList', () => {
  it('decodes a bracketed list', () => {
    expect(decodeLoadList('[25, 30, 35, 40, 45]')).toEqual([25, 30, 35, 40, 45]);
  });

  it('decodes "unknown" as null', () => {
    expect(decodeLoadList('unknown')).toBeNull();
  });
});
