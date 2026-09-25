import { describe, expect, it } from 'vitest';
import { daySeed, drawIndex, mulberry32, slotDraw } from '../../src/domain/seed';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

// ECR-02 provisional default (APP_TECH_ARCHITECTURE_V0.md §21):
// seed = FNV-1a-32("user_id|local_date|apartment_sessions_completed")
// per slot: r = mulberry32(FNV-1a-32(seed + "|" + slot))()
describe('daySeed / slotDraw determinism (ECR-02 default)', () => {
  it('same-day regeneration returns identical draws (engine §0 determinism, §E.4)', () => {
    const seed1 = daySeed('nelson', '2026-09-22', 6);
    const seed2 = daySeed('nelson', '2026-09-22', 6);
    expect(seed1).toBe(seed2);
    expect(slotDraw(seed1, 'C1')).toBe(slotDraw(seed2, 'C1'));
  });

  it('changes when the session count changes (a new apartment session was completed)', () => {
    const seed1 = daySeed('nelson', '2026-09-22', 6);
    const seed2 = daySeed('nelson', '2026-09-22', 7);
    expect(seed1).not.toBe(seed2);
  });

  it('different slots on the same day draw independently', () => {
    const seed = daySeed('nelson', '2026-09-22', 6);
    expect(slotDraw(seed, 'C1')).not.toBe(slotDraw(seed, 'C2'));
  });

  it('drawIndex stays within [0, n)', () => {
    const seed = daySeed('nelson', '2026-09-22', 6);
    for (let n = 1; n <= 5; n++) {
      const idx = drawIndex(seed, `slot-${n}`, n);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });
});
