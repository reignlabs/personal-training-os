import { describe, expect, it } from 'vitest';
import { CheckInSchema } from '../../src/contracts';

// APP_BUILD_SEQUENCE_V0.md B1: "schema accept/reject samples per contract".
describe('CheckIn contract', () => {
  const base = {
    id: 'ci_1',
    type: 'check_in' as const,
    created_at: '2026-09-22T18:00:00.000Z',
    updated_at: '2026-09-22T18:00:00.000Z',
    local_date: '2026-09-22',
    tz: 'America/Los_Angeles',
    env_id: 'ENV-APT' as const,
    revises_check_in_id: null,
    R01: 45,
    R02: null,
    R03: null,
    R04: null,
    R04b: null,
    R05: null,
    R06: 'no' as const,
    R06_choice: null,
    R07: null,
    equipment_issues: [],
    alloy_answers: [],
    defaulted_fields: [],
    normal_day_shortcut: true,
  };

  it('accepts a normal-day shortcut check-in (D-081)', () => {
    expect(CheckInSchema.safeParse(base).success).toBe(true);
  });

  it('rejects R06 = yes without R06_choice', () => {
    const bad = { ...base, R06: 'yes' as const, R06_choice: null };
    const result = CheckInSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('accepts R06 = yes with a choice', () => {
    const ok = { ...base, R06: 'yes' as const, R06_choice: 'lighter' as const };
    expect(CheckInSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects R04b set without R04 = worse', () => {
    const bad = { ...base, R04: 'same' as const, R04b: 'swap' as const };
    expect(CheckInSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts R04b when R04 = worse', () => {
    const ok = { ...base, R04: 'worse' as const, R04b: 'swap' as const };
    expect(CheckInSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects a malformed local_date', () => {
    const bad = { ...base, local_date: '09/22/2026' };
    expect(CheckInSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an invalid R01 (non-integer)', () => {
    const bad = { ...base, R01: 45.5 };
    expect(CheckInSchema.safeParse(bad).success).toBe(false);
  });
});
