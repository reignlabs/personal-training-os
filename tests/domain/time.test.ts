import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  calendarDaysBetween,
  hoursBetween,
  localDateTimeToUtc,
  toLocalDate,
  toLocalTime,
} from '../../src/domain/time';

const TZ = 'America/Los_Angeles';

describe('localDateTimeToUtc / toLocalDate round trip', () => {
  it('round-trips an ordinary date', () => {
    const utc = localDateTimeToUtc('2026-09-22', '18:00', TZ);
    expect(toLocalDate(utc, TZ)).toBe('2026-09-22');
    expect(toLocalTime(utc, TZ)).toBe('18:00');
  });
});

// DST cases required by APP_BUILD_SEQUENCE_V0.md B1: 2026-11-01 (fall back) and
// 2027-03-14 (spring forward), America/Los_Angeles.
describe('DST: fall back, 2026-11-01', () => {
  it('is UTC-7 (PDT) the day before the transition', () => {
    expect(localDateTimeToUtc('2026-10-31', '12:00', TZ)).toBe('2026-10-31T19:00:00.000Z');
  });

  it('is UTC-8 (PST) on and after the transition (2am local)', () => {
    expect(localDateTimeToUtc('2026-11-01', '12:00', TZ)).toBe('2026-11-01T20:00:00.000Z');
    expect(localDateTimeToUtc('2026-11-02', '12:00', TZ)).toBe('2026-11-02T20:00:00.000Z');
  });

  it('the fall-back day is 25 real hours, not 24', () => {
    const from = localDateTimeToUtc('2026-10-31', '00:00', TZ);
    const to = localDateTimeToUtc('2026-11-02', '00:00', TZ);
    expect(hoursBetween(from, to)).toBe(49); // two calendar days + the repeated hour
  });
});

describe('DST: spring forward, 2027-03-14', () => {
  it('is UTC-8 (PST) the day before the transition', () => {
    expect(localDateTimeToUtc('2027-03-13', '12:00', TZ)).toBe('2027-03-13T20:00:00.000Z');
  });

  it('is UTC-7 (PDT) on and after the transition', () => {
    expect(localDateTimeToUtc('2027-03-14', '12:00', TZ)).toBe('2027-03-14T19:00:00.000Z');
    expect(localDateTimeToUtc('2027-03-15', '12:00', TZ)).toBe('2027-03-15T19:00:00.000Z');
  });

  it('the spring-forward day is 23 real hours, not 24', () => {
    const from = localDateTimeToUtc('2027-03-13', '00:00', TZ);
    const to = localDateTimeToUtc('2027-03-15', '00:00', TZ);
    expect(hoursBetween(from, to)).toBe(47); // two calendar days minus the skipped hour
  });
});

describe('calendarDaysBetween', () => {
  it('counts calendar dates, unaffected by DST', () => {
    expect(calendarDaysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(calendarDaysBetween('2027-03-13', '2027-03-15')).toBe(2);
  });

  it('is negative when going backward', () => {
    expect(calendarDaysBetween('2026-09-22', '2026-09-20')).toBe(-2);
  });
});

describe('addLocalDays', () => {
  it('adds calendar days across a month boundary', () => {
    expect(addLocalDays('2026-09-29', 3)).toBe('2026-10-02');
  });
});
