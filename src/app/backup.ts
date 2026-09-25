/**
 * Data export / import (backup) — APP_TECH_ARCHITECTURE_V0.md §10.9 / §18.J,
 * APP_DATA_CONTRACTS_V0.md §9.
 *
 * DEVIATION FROM contracts/backup.ts's `BackupSchema`, documented per this project's
 * evidence-discipline rule (never silently pass off a SYSTEM_DESIGN choice as the
 * approved shape): that schema assumes two things this app doesn't have yet —
 * (1) full replay (D-103; `engine_state` is still carried forward incrementally, see
 * claude/B5_GENERATOR_BUILD_STATUS.md), and (2) the full canonical `Generation` record
 * (§6.2); this app persists a deliberately simplified `stored_generation` wrapper
 * instead (claude/UI_CORE_LOOP_BUILD_STATUS.md decision #1). Rather than fabricate
 * fields to satisfy `BackupSchema`, or silently relabel `stored_generation` as a
 * canonical `Generation`, this file defines its own `AppBackupSchema`: a self-contained,
 * versioned export of every document this app actually persists, verbatim. It meets
 * D-107's requirement (one JSON file, share sheet or download, import replaces with
 * confirmation) without misrepresenting what's inside it.
 */
import { z } from 'zod';
import { APP_SCHEMA_VERSION } from '../contracts';
import type { StoredDoc } from '../store/StorageAdapter';
import { canonicalHash64 } from '../domain/hash';
import { version as PACKAGE_VERSION } from '../../package.json';

export const APP_VERSION: string = PACKAGE_VERSION;

/** Every stored document, kept exactly as persisted (`id`/`type` required, everything
 * else passed through) — deliberately not re-validated per-canonical-type here, since
 * app-internal types (`engine_state`, `stored_generation`) have no canonical Zod schema
 * to validate against. `restoreFromBackup` is the trust boundary: `replaceAll` writes
 * these back verbatim, and a subsequent `init()` re-derives everything from them, the
 * same as a normal app launch would. */
const BackupDocumentSchema = z.object({ id: z.string().min(1), type: z.string().min(1) }).passthrough();

export const AppBackupSchema = z.object({
  format: z.literal('pto-backup-v0'),
  app_schema_version: z.number().int(),
  app_version: z.string(),
  exported_at: z.string(),
  device_label: z.string(),
  /** document count by type, shown on the import confirmation screen so the person can
   * sanity-check the file before replacing everything (D-107's "with confirmation"). */
  counts: z.record(z.string(), z.number().int()),
  /** Hash64 (FNV-1a 64 over canonical JSON) of the document array, for a quick
   * "did this restore correctly" comparison — not a security signature. */
  state_digest: z.string().regex(/^[0-9a-f]{16}$/),
  documents: z.array(BackupDocumentSchema),
});
export type AppBackup = z.infer<typeof AppBackupSchema>;

export function buildBackup(args: { documents: StoredDoc[]; deviceLabel: string; now: string }): AppBackup {
  const counts: Record<string, number> = {};
  for (const d of args.documents) counts[d.type] = (counts[d.type] ?? 0) + 1;
  return {
    format: 'pto-backup-v0',
    app_schema_version: APP_SCHEMA_VERSION,
    app_version: APP_VERSION,
    exported_at: args.now,
    device_label: args.deviceLabel,
    counts,
    state_digest: canonicalHash64(args.documents),
    documents: args.documents as unknown as AppBackup['documents'],
  };
}

/** `pto-backup_<YYYY-MM-DD>_<HHmm>.json`, per APP_DATA_CONTRACTS_V0.md §9 — using
 * `exported_at` (UTC) rather than the device clock, so the name is stable regardless of
 * timezone. */
export function backupFileName(backup: AppBackup): string {
  const d = new Date(backup.exported_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `pto-backup_${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}.json`;
}

export type BackupParseResult = { ok: true; backup: AppBackup } | { ok: false; error: string };

/** Parse -> format/shape -> version (D-108: refuse a newer version outright; there are
 * no migrations to run for an older one yet, since APP_SCHEMA_VERSION has only ever
 * been 1 — see Meta's loadOrSeedMeta for the same downgrade check on normal load). */
export function parseBackup(text: string): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t valid JSON.' };
  }
  const parsed = AppBackupSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'That doesn’t look like a Personal Training OS backup file.' };
  }
  if (parsed.data.app_schema_version > APP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `This backup is from a newer app version (data version ${parsed.data.app_schema_version}; this app understands ${APP_SCHEMA_VERSION}). Update the app before importing it.`,
    };
  }
  return { ok: true, backup: parsed.data };
}
