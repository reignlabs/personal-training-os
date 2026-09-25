import { describe, expect, it } from 'vitest';
import { SetPerformanceSchema, WorkoutSchema } from '../../src/contracts';

describe('SetPerformance contract', () => {
  const base = {
    set_no: 1,
    side: 'BILATERAL' as const,
    load: 40,
    reps: 8,
    seconds: null,
    is_working: true,
    logged_at: '2026-09-22T18:05:00.000Z',
    entry: 'AS_PLANNED' as const,
  };

  it('accepts a rep-based set', () => {
    expect(SetPerformanceSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a time-based set', () => {
    const timed = { ...base, reps: null, seconds: 30 };
    expect(SetPerformanceSchema.safeParse(timed).success).toBe(true);
  });

  it('rejects a set with neither reps nor seconds', () => {
    const bad = { ...base, reps: null, seconds: null };
    expect(SetPerformanceSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a set with both reps and seconds', () => {
    const bad = { ...base, reps: 8, seconds: 30 };
    expect(SetPerformanceSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects set_no = 0', () => {
    const bad = { ...base, set_no: 0 };
    expect(SetPerformanceSchema.safeParse(bad).success).toBe(false);
  });
});

describe('Workout contract', () => {
  const base = {
    id: 'wo_1',
    type: 'workout' as const,
    created_at: '2026-09-22T18:00:00.000Z',
    updated_at: '2026-09-22T18:40:00.000Z',
    generation_id: 'gen_1',
    check_in_id: 'ci_1',
    env_id: 'ENV-APT' as const,
    plan_local_date: '2026-09-22',
    status: 'COMPLETED' as const,
    started_at: '2026-09-22T18:05:00.000Z',
    ended_at: '2026-09-22T18:40:00.000Z',
    session_capacity: 'usual' as const,
    load_unit: 'lb' as const,
    blocks: [],
    items: [],
    warmup_completed: true,
    finish_method: 'FINISH_STEP' as const,
    note: null,
  };

  it('accepts a completed workout with ended_at >= started_at', () => {
    expect(WorkoutSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a completed workout with no ended_at', () => {
    const bad = { ...base, ended_at: null };
    expect(WorkoutSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects ended_at before started_at', () => {
    const bad = { ...base, ended_at: '2026-09-22T17:00:00.000Z' };
    expect(WorkoutSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts an in-progress workout with no ended_at', () => {
    const inProgress = { ...base, status: 'IN_PROGRESS' as const, ended_at: null, session_capacity: null, finish_method: null };
    expect(WorkoutSchema.safeParse(inProgress).success).toBe(true);
  });
});
