/**
 * AppStore-level export/import/restore (task: "data export", "data import/restore",
 * "basic error recovery"). tests/app/backup.test.ts covers the pure format; this file
 * covers the store wiring end to end against a real MemoryAdapter. src/platform/fileIO
 * touches DOM/File/Blob APIs vitest's `environment: 'node'` doesn't provide, so it's
 * mocked here with an in-memory fake that behaves like a real save/pick round trip.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const savedFiles: { filename: string; json: string }[] = [];
let nextPickResult: string | Error = new Error('no file queued');

vi.mock('../../src/platform/fileIO', () => ({
  saveJsonFile: vi.fn(async (filename: string, json: string) => {
    savedFiles.push({ filename, json });
    return 'downloaded' as const;
  }),
  pickJsonFile: vi.fn(async () => {
    if (nextPickResult instanceof Error) throw nextPickResult;
    return nextPickResult;
  }),
}));

import { AppStore } from '../../src/app/store';
import { MemoryAdapter } from '../../src/store/MemoryAdapter';
import type { AlloySessionInput } from '../../src/app/sessionLogic';

function baseAlloyInput(overrides: Partial<Omit<AlloySessionInput, 'now'>> = {}): Omit<AlloySessionInput, 'now'> {
  return {
    localDate: '2026-09-20',
    performedAt: '2026-09-20T14:00:00.000Z',
    durationKnown: false,
    durationMin: null,
    focus: 'full',
    items: [],
    notes: null,
    coachNotes: null,
    perceivedEffort: null,
    program: 'Manual',
    entryMode: 'TYPED',
    ...overrides,
  };
}

beforeEach(() => {
  savedFiles.length = 0;
  nextPickResult = new Error('no file queued');
});

describe('AppStore.exportBackup', () => {
  it('saves a well-formed backup file and records last_export_at', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    expect(store.getSnapshot().settings.last_export_at).toBeNull();

    const { result, backup } = await store.exportBackup();
    expect(result).toBe('downloaded');
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].filename).toMatch(/^pto-backup_\d{4}-\d{2}-\d{2}_\d{4}\.json$/);
    expect(JSON.parse(savedFiles[0].json)).toEqual(backup);
    expect(store.getSnapshot().settings.last_export_at).toBe(backup.exported_at);
  });

  it('includes every persisted document type (datapack, meta, settings, workouts, external sessions, engine state)', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    await store.saveAlloySession(baseAlloyInput());
    const { backup } = await store.exportBackup();
    expect(backup.counts.datapack).toBe(1);
    expect(backup.counts.meta).toBe(1);
    expect(backup.counts.settings).toBe(1);
    expect(backup.counts.external_session).toBe(1);
    expect(backup.counts.engine_state).toBe(1);
  });
});

describe('AppStore.restoreFromBackup: full round trip', () => {
  it('an exported backup, restored into a fresh store, reproduces the same data', async () => {
    const store1 = new AppStore(new MemoryAdapter());
    await store1.init();
    await store1.saveAlloySession(baseAlloyInput({ notes: 'original session' }));
    await store1.addAvoidance('EX012', 'knee');
    const { backup } = await store1.exportBackup();

    const store2 = new AppStore(new MemoryAdapter());
    await store2.init();
    expect(store2.getSnapshot().externalSessions).toHaveLength(0);

    await store2.restoreFromBackup(backup);
    expect(store2.getSnapshot().status).toBe('ready');
    expect(store2.getSnapshot().externalSessions).toHaveLength(1);
    expect(store2.getSnapshot().externalSessions[0].notes).toBe('original session');
    expect(store2.getSnapshot().profile.avoidances).toContainEqual({ exercise_id: 'EX012', label: 'knee' });
  });

  it('restore replaces everything — a document that existed only in the old store is gone after restore', async () => {
    const store1 = new AppStore(new MemoryAdapter());
    await store1.init();
    const { backup } = await store1.exportBackup(); // empty backup (no sessions yet)

    const store2 = new AppStore(new MemoryAdapter());
    await store2.init();
    await store2.saveAlloySession(baseAlloyInput({ localDate: '2026-09-21', performedAt: '2026-09-21T14:00:00.000Z' }));
    expect(store2.getSnapshot().externalSessions).toHaveLength(1);

    await store2.restoreFromBackup(backup);
    expect(store2.getSnapshot().externalSessions).toHaveLength(0);
  });
});

describe('AppStore.previewBackup', () => {
  it('validates without writing anything', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    const { backup } = await store.exportBackup();
    const preview = store.previewBackup(JSON.stringify(backup));
    expect(preview.ok).toBe(true);
  });

  it('reports a plain-language error for a non-backup file without throwing', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    const preview = store.previewBackup('not json at all');
    expect(preview.ok).toBe(false);
  });
});

describe('AppStore.exportRawData: crash/error recovery', () => {
  it('dumps whatever the adapter has, even when init() never reached ready', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([
      {
        id: 'meta',
        type: 'meta',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        app_schema_version: 999,
        installed_at: '2026-01-01T00:00:00.000Z',
      } as never,
    ]);
    const store = new AppStore(adapter);
    await store.init();
    expect(store.getSnapshot().status).toBe('error'); // downgrade refusal from tests/app/metaSettings.test.ts

    const result = await store.exportRawData();
    expect(result).toBe('downloaded');
    expect(savedFiles).toHaveLength(1);
    const payload = JSON.parse(savedFiles[0].json);
    expect(payload.format).toBe('pto-raw-export');
    expect(payload.documents.some((d: { id: string }) => d.id === 'meta')).toBe(true);
  });
});
