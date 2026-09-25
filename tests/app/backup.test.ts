/**
 * Data export/import format (src/app/backup.ts) — buildBackup / parseBackup, the
 * deliberately app-specific AppBackupSchema (see that file's header for why it isn't
 * contracts/backup.ts's canonical BackupSchema).
 */
import { describe, expect, it } from 'vitest';
import { buildBackup, backupFileName, parseBackup, AppBackupSchema } from '../../src/app/backup';
import { APP_SCHEMA_VERSION } from '../../src/contracts';
import type { StoredDoc } from '../../src/store/StorageAdapter';

const SAMPLE_DOCS: StoredDoc[] = [
  { id: 'datapack', type: 'datapack', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' },
  { id: 'wo_1', type: 'workout', created_at: '2026-09-02T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' },
  { id: 'wo_2', type: 'workout', created_at: '2026-09-03T00:00:00.000Z', updated_at: '2026-09-03T00:00:00.000Z' },
];

describe('buildBackup', () => {
  it('produces a well-formed AppBackup matching AppBackupSchema', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'Test device', now: '2026-09-24T18:30:00.000Z' });
    expect(() => AppBackupSchema.parse(backup)).not.toThrow();
    expect(backup.format).toBe('pto-backup-v0');
    expect(backup.app_schema_version).toBe(APP_SCHEMA_VERSION);
  });

  it('counts documents by type', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'Test device', now: '2026-09-24T18:30:00.000Z' });
    expect(backup.counts).toEqual({ datapack: 1, workout: 2 });
  });

  it('the same documents produce the same state_digest (deterministic)', () => {
    const a = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'A', now: '2026-09-24T18:30:00.000Z' });
    const b = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'B', now: '2026-09-25T00:00:00.000Z' });
    expect(a.state_digest).toBe(b.state_digest); // digest covers documents, not device_label/exported_at
  });

  it('different documents produce a different state_digest', () => {
    const a = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'A', now: '2026-09-24T18:30:00.000Z' });
    const b = buildBackup({ documents: SAMPLE_DOCS.slice(0, 2), deviceLabel: 'A', now: '2026-09-24T18:30:00.000Z' });
    expect(a.state_digest).not.toBe(b.state_digest);
  });
});

describe('backupFileName', () => {
  it('formats as pto-backup_<YYYY-MM-DD>_<HHmm>.json in UTC', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'A', now: '2026-09-24T18:05:00.000Z' });
    expect(backupFileName(backup)).toBe('pto-backup_2026-09-24_1805.json');
  });
});

describe('parseBackup: parse -> shape -> version', () => {
  it('round-trips a real backup through JSON.stringify/parse unchanged', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'Test device', now: '2026-09-24T18:30:00.000Z' });
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup).toEqual(backup);
  });

  it('rejects invalid JSON with a plain-language error', () => {
    const result = parseBackup('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid JSON/i);
  });

  it('rejects a file that is valid JSON but not a backup', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/backup file/i);
  });

  it('refuses a backup from a newer app_schema_version than this build understands (D-108)', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'A', now: '2026-09-24T18:30:00.000Z' });
    const fromTheFuture = { ...backup, app_schema_version: APP_SCHEMA_VERSION + 1 };
    const result = parseBackup(JSON.stringify(fromTheFuture));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/newer app version/i);
  });

  it('accepts a backup at the current or an older app_schema_version', () => {
    const backup = buildBackup({ documents: SAMPLE_DOCS, deviceLabel: 'A', now: '2026-09-24T18:30:00.000Z' });
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
  });
});
