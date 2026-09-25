/**
 * Unit tests for the LOG ALLOY SESSION / EQUIPMENT / PROFILE additions to sessionLogic.ts
 * (the pure, testable bridge layer — no I/O, no store). These prove the pieces the
 * AppStore-level tests (tests/app/store.test.ts) wire together: incomplete-data
 * tolerance in buildAlloySession, correct crediting derivation, the CONFIRM_EQUIPMENT
 * event shape, and profile/avoidance patching.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { DatapackSchema, ExternalSessionSchema, type Datapack } from '../../src/contracts';
import { loadPool, type PoolExercise } from '../../src/engine/pool';
import { createEmptyState } from '../../src/engine/state';
import {
  lookupExercise,
  buildAlloySession,
  deriveAlloyCreditInput,
  creditFromAlloySession,
  buildConfirmEquipmentEvent,
  applyProfilePatch,
  addAvoidance,
  removeAvoidance,
  type AlloySessionInput,
  type AlloyItemInput,
} from '../../src/app/sessionLogic';
import { applyUserActionEvent } from '../../src/engine/completion';

function loadPack(): Datapack {
  const raw = readFileSync(path.join(__dirname, '..', '..', 'dev-data', 'seed-datapack.json'), 'utf8');
  return DatapackSchema.parse(JSON.parse(raw));
}

function blankItem(overrides: Partial<AlloyItemInput> = {}): AlloyItemInput {
  return {
    slotLabel: null,
    exerciseId: null,
    freeText: null,
    manualFamilyTag: null,
    sets: null,
    reps: null,
    load: null,
    doseText: null,
    isFinisher: false,
    coachModified: false,
    coachNote: null,
    ...overrides,
  };
}

function baseSessionInput(overrides: Partial<AlloySessionInput> = {}): AlloySessionInput {
  return {
    localDate: '2026-09-23',
    performedAt: '2026-09-23T14:00:00.000Z',
    durationKnown: false,
    durationMin: null,
    focus: 'full',
    items: [],
    notes: null,
    coachNotes: null,
    perceivedEffort: null,
    program: 'Manual',
    entryMode: 'TYPED',
    now: '2026-09-23T15:00:00.000Z',
    ...overrides,
  };
}

describe('lookupExercise', () => {
  let pool: PoolExercise[];
  beforeAll(() => {
    const pack = loadPack();
    const knownEquipmentIds = new Set(pack.equipment_catalog.map((c) => c.equipment_id));
    pool = loadPool(pack.exercise_metadata, knownEquipmentIds).pool;
  });

  it('matches by partial display name, case-insensitively', () => {
    const hits = lookupExercise(pool, 'goblet');
    expect(hits.map((e) => e.exercise_id)).toContain('EX012');
  });

  it('matches by exact exercise_id', () => {
    const hits = lookupExercise(pool, 'ex012');
    expect(hits.map((e) => e.exercise_id)).toEqual(['EX012']);
  });

  it('returns nothing for an empty/whitespace query rather than the whole pool', () => {
    expect(lookupExercise(pool, '')).toEqual([]);
    expect(lookupExercise(pool, '   ')).toEqual([]);
  });

  it('returns nothing for a query matching no exercise (manual entry fallback territory)', () => {
    expect(lookupExercise(pool, 'zzz-not-a-real-exercise')).toEqual([]);
  });
});

describe('buildAlloySession: graceful acceptance of incomplete historical information', () => {
  let pool: PoolExercise[];
  beforeAll(() => {
    const pack = loadPack();
    const knownEquipmentIds = new Set(pack.equipment_catalog.map((c) => c.equipment_id));
    pool = loadPool(pack.exercise_metadata, knownEquipmentIds).pool;
  });

  it('a bare SUMMARY log (no items at all) is a complete, valid document', () => {
    const session = buildAlloySession(baseSessionInput(), pool);
    expect(session.log_mode).toBe('SUMMARY');
    expect(session.items).toEqual([]);
    expect(() => ExternalSessionSchema.parse(session)).not.toThrow();
  });

  it('duration defaults to +55min when not known, per schema comment', () => {
    const session = buildAlloySession(baseSessionInput({ durationKnown: false }), pool);
    expect(session.ended_at).toBe('2026-09-23T14:55:00.000Z');
    expect(session.duration_min).toBeNull();
  });

  it('a known duration is honored for ended_at and duration_min', () => {
    const session = buildAlloySession(baseSessionInput({ durationKnown: true, durationMin: 40 }), pool);
    expect(session.ended_at).toBe('2026-09-23T14:40:00.000Z');
    expect(session.duration_min).toBe(40);
  });

  it('an item with a matched exercise_id gets exercise_name_snapshot and family_tag from METADATA', () => {
    const session = buildAlloySession(baseSessionInput({ items: [blankItem({ slotLabel: 'A1', exerciseId: 'EX012' })] }), pool);
    expect(session.log_mode).toBe('FULL');
    const item = session.items[0];
    expect(item.exercise_id).toBe('EX012');
    expect(item.exercise_name_snapshot).toBe('Goblet Squat');
    expect(item.family_tag).toBe('KD');
    expect(item.family_tag_source).toBe('METADATA');
    expect(item.free_text).toBeNull();
    expect(() => ExternalSessionSchema.parse(session)).not.toThrow();
  });

  it('manual entry fallback: no exercise_id match, free text + user-chip family tag', () => {
    const session = buildAlloySession(
      baseSessionInput({ items: [blankItem({ slotLabel: 'B1', freeText: 'Cable woodchop', manualFamilyTag: 'ANTI_ROT' })] }),
      pool,
    );
    const item = session.items[0];
    expect(item.exercise_id).toBeNull();
    expect(item.free_text).toBe('Cable woodchop');
    expect(item.family_tag).toBe('ANTI_ROT');
    expect(item.family_tag_source).toBe('USER_CHIP');
    expect(() => ExternalSessionSchema.parse(session)).not.toThrow();
  });

  it('manual entry with nothing typed at all still produces a valid item (placeholder free_text)', () => {
    const session = buildAlloySession(baseSessionInput({ items: [blankItem({ slotLabel: 'A2' })] }), pool);
    const item = session.items[0];
    expect(item.exercise_id).toBeNull();
    expect(item.free_text).toBe('Unnamed exercise');
    expect(item.family_tag).toBeNull();
    expect(item.family_tag_source).toBe('NONE');
    expect(() => ExternalSessionSchema.parse(session)).not.toThrow();
  });

  it('A1/A2 pairing: slot_label carries through untouched, items keep independent item_no', () => {
    const session = buildAlloySession(
      baseSessionInput({
        items: [blankItem({ slotLabel: 'A1', exerciseId: 'EX012' }), blankItem({ slotLabel: 'A2', exerciseId: 'EX066' })],
      }),
      pool,
    );
    expect(session.items.map((i) => i.slot_label)).toEqual(['A1', 'A2']);
    expect(session.items.map((i) => i.item_no)).toEqual([1, 2]);
  });

  it('sets/reps/load are independently optional — any subset of the three may be null', () => {
    const session = buildAlloySession(
      baseSessionInput({
        items: [
          blankItem({ exerciseId: 'EX012', sets: 3, reps: null, load: 30 }),
          blankItem({ exerciseId: 'EX066', sets: null, reps: 10, load: null, doseText: 'moderate' }),
        ],
      }),
      pool,
    );
    expect(session.items[0]).toMatchObject({ sets: 3, reps: null, load: 30 });
    expect(session.items[1]).toMatchObject({ sets: null, reps: 10, load: null, dose_text: 'moderate' });
    expect(() => ExternalSessionSchema.parse(session)).not.toThrow();
  });

  it('notes, coach modification, and coach note all persist through untouched', () => {
    const session = buildAlloySession(
      baseSessionInput({
        notes: 'felt strong today',
        coachNotes: 'coach says push harder next time',
        items: [blankItem({ exerciseId: 'EX012', coachModified: true, coachNote: 'reduced range to protect knee' })],
      }),
      pool,
    );
    expect(session.notes).toBe('felt strong today');
    expect(session.coach_notes).toBe('coach says push harder next time');
    expect(session.items[0].coach_modified).toBe(true);
    expect(session.items[0].coach_note).toBe('reduced range to protect knee');
  });

  it('editing (id + createdAt passed through) preserves the original id and created_at', () => {
    const session = buildAlloySession(
      baseSessionInput({ id: 'ext_alloy_2026-09-23', createdAt: '2026-09-23T14:05:00.000Z', now: '2026-09-24T09:00:00.000Z' }),
      pool,
    );
    expect(session.id).toBe('ext_alloy_2026-09-23');
    expect(session.created_at).toBe('2026-09-23T14:05:00.000Z');
    expect(session.updated_at).toBe('2026-09-24T09:00:00.000Z');
  });

  it('without an explicit id, the canonical ext_alloy_<local_date> id is derived', () => {
    const session = buildAlloySession(baseSessionInput({ localDate: '2026-09-23' }), pool);
    expect(session.id).toBe('ext_alloy_2026-09-23');
  });
});

describe('deriveAlloyCreditInput / creditFromAlloySession: real history credit, not cosmetic', () => {
  let pool: PoolExercise[];
  beforeAll(() => {
    const pack = loadPack();
    const knownEquipmentIds = new Set(pack.equipment_catalog.map((c) => c.equipment_id));
    pool = loadPool(pack.exercise_metadata, knownEquipmentIds).pool;
  });

  it('a SUMMARY (no items) full-focus log credits all three parent patterns and nothing else', () => {
    const session = buildAlloySession(baseSessionInput({ focus: 'full' }), pool);
    const state = creditFromAlloySession(createEmptyState(), session);
    expect(state.parent_last_trained.LOWER).toBe(session.ended_at);
    expect(state.parent_last_trained.PUSH).toBe(session.ended_at);
    expect(state.parent_last_trained.PULL).toBe(session.ended_at);
    expect(Object.keys(state.family_last_trained).length).toBe(0);
    expect(Object.keys(state.exercise_last_used).length).toBe(0);
  });

  it('an upper-focus SUMMARY log credits PUSH/PULL only, not LOWER', () => {
    const session = buildAlloySession(baseSessionInput({ focus: 'upper' }), pool);
    const state = creditFromAlloySession(createEmptyState(), session);
    expect(state.parent_last_trained.PUSH).toBe(session.ended_at);
    expect(state.parent_last_trained.PULL).toBe(session.ended_at);
    expect(state.parent_last_trained.LOWER).toBeUndefined();
  });

  it('a FULL log (items present) additionally credits the specific families and exercise_last_used from tagged items', () => {
    const session = buildAlloySession(
      baseSessionInput({
        focus: 'full',
        items: [blankItem({ slotLabel: 'A1', exerciseId: 'EX012' }), blankItem({ slotLabel: 'A2', exerciseId: 'EX066' })],
      }),
      pool,
    );
    const state = creditFromAlloySession(createEmptyState(), session);
    expect(state.family_last_trained.KD).toBe(session.ended_at);
    expect(state.family_last_trained.HPULL).toBe(session.ended_at);
    expect(state.exercise_last_used.EX012).toBe(session.ended_at);
    expect(state.exercise_last_used.EX066).toBe(session.ended_at);
  });

  it('CORE/CARRY/GOAL_ACCESSORY/MOBILITY/CONDITIONING families are never credited from an Alloy log (§L.3)', () => {
    const session = buildAlloySession(
      baseSessionInput({
        focus: 'full',
        items: [
          blankItem({ freeText: 'plank', manualFamilyTag: 'ANTI_EXT' }),
          blankItem({ exerciseId: 'EX046' }), // CARRY
          blankItem({ exerciseId: 'EX101' }), // MOBILITY
        ],
      }),
      pool,
    );
    const state = creditFromAlloySession(createEmptyState(), session);
    expect(state.family_last_trained.ANTI_EXT).toBeUndefined();
    expect(state.family_last_trained.CARRY).toBeUndefined();
    expect(state.family_last_trained.MOBILITY).toBeUndefined();
    // but exercise_last_used IS still set for every tagged item regardless of family
    expect(state.exercise_last_used.EX046).toBe(session.ended_at);
    expect(state.exercise_last_used.EX101).toBe(session.ended_at);
  });

  it('never touches progression lines, anchors, preferences, or holds (§L.1, D-025)', () => {
    const session = buildAlloySession(baseSessionInput({ items: [blankItem({ exerciseId: 'EX012' })] }), pool);
    const before = createEmptyState();
    const state = creditFromAlloySession(before, session);
    expect(state.lines).toEqual(before.lines);
    expect(state.review_hold).toEqual(before.review_hold);
    expect(state.preference).toEqual(before.preference);
  });

  it('an OTHER-kind session is stored but never credited (D-106)', () => {
    const session = buildAlloySession(baseSessionInput({ items: [blankItem({ exerciseId: 'EX012' })] }), pool);
    const otherSession = { ...session, kind: 'OTHER' as const, env_id: 'ENV-OTHER' as const, focus: null, log_mode: null };
    const before = createEmptyState();
    const state = creditFromAlloySession(before, otherSession);
    expect(state).toEqual(before);
  });

  it('re-crediting the same session twice is idempotent (max-of-timestamps, not additive)', () => {
    const session = buildAlloySession(baseSessionInput({ items: [blankItem({ exerciseId: 'EX012' })] }), pool);
    const once = creditFromAlloySession(createEmptyState(), session);
    const twice = creditFromAlloySession(once, session);
    expect(twice).toEqual(once);
  });
});

describe('buildConfirmEquipmentEvent + applyUserActionEvent: equipment corrections reach GeneratorState.equipment_overrides', () => {
  it('builds a well-formed CONFIRM_EQUIPMENT event and folds it into equipment_overrides', () => {
    const event = buildConfirmEquipmentEvent({
      id: 'evt_test1',
      now: '2026-09-23T10:00:00.000Z',
      envId: 'ENV-APT',
      equipmentId: 'EQ009',
      availability: 'NOT_AVAILABLE',
      loads: null,
      maxConfirmedLoad: null,
      stationGroup: null,
    });
    expect(event.event_type).toBe('CONFIRM_EQUIPMENT');
    const state = applyUserActionEvent(createEmptyState(), event);
    expect(state.equipment_overrides.EQ009?.availability).toBe('NOT_AVAILABLE');
  });
});

describe('applyProfilePatch / addAvoidance / removeAvoidance', () => {
  it('applyProfilePatch merges only the given fields and bumps updated_at', () => {
    const pack = loadPack();
    const next = applyProfilePatch(pack, { display_name: 'Nelson Y.' }, '2026-09-23T10:00:00.000Z');
    expect(next.profile.display_name).toBe('Nelson Y.');
    expect(next.updated_at).toBe('2026-09-23T10:00:00.000Z');
    expect(next.profile.avoidances).toEqual(pack.profile.avoidances);
    // original untouched
    expect(pack.profile.display_name).not.toBe('Nelson Y.');
  });

  it('addAvoidance appends a new avoidance and is idempotent for the same exercise_id', () => {
    const pack = loadPack();
    const once = addAvoidance(pack, 'EX012', 'knee', '2026-09-23T10:00:00.000Z');
    expect(once.profile.avoidances).toContainEqual({ exercise_id: 'EX012', label: 'knee' });
    const twice = addAvoidance(once, 'EX012', 'knee (again)', '2026-09-23T11:00:00.000Z');
    expect(twice.profile.avoidances.filter((a) => a.exercise_id === 'EX012').length).toBe(1);
  });

  it('removeAvoidance removes exactly the matching exercise_id', () => {
    const pack = loadPack();
    const withTwo = addAvoidance(addAvoidance(pack, 'EX012', 'a', '2026-09-23T10:00:00.000Z'), 'EX066', 'b', '2026-09-23T10:00:01.000Z');
    const removed = removeAvoidance(withTwo, 'EX012', '2026-09-23T11:00:00.000Z');
    expect(removed.profile.avoidances.map((a) => a.exercise_id)).toEqual(['EX066']);
  });
});
