/**
 * navigator.storage.persist() — APP_TECH_ARCHITECTURE_V0.md §10.8: WebKit can evict
 * site data under storage pressure or after a week of inactivity in a plain Safari tab;
 * requesting persistent storage (granted by browser heuristics, which include Home
 * Screen installation) reduces that risk. Pure browser API glue — no app/contracts
 * knowledge (platform -> domain only).
 */

export interface StoragePersistStatus {
  /** false on a browser with no Storage Manager API at all (shown as N/A, not a warning). */
  supported: boolean;
  persisted: boolean;
}

function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') return null;
  if (!navigator.storage || typeof navigator.storage.persisted !== 'function') return null;
  return navigator.storage;
}

/** Read-only status check — safe to call anytime, never prompts. */
export async function getStoragePersistStatus(): Promise<StoragePersistStatus> {
  const storage = storageManager();
  if (!storage) return { supported: false, persisted: false };
  try {
    return { supported: true, persisted: await storage.persisted() };
  } catch {
    return { supported: true, persisted: false };
  }
}

/** Best-effort request, safe to call unconditionally (e.g. once on app mount): a
 * browser without the API is reported as unsupported rather than throwing, and a
 * refusal is reported as `persisted: false` rather than rejecting. */
export async function requestStoragePersistence(): Promise<StoragePersistStatus> {
  const storage = storageManager();
  if (!storage || typeof storage.persist !== 'function') return { supported: false, persisted: false };
  try {
    const already = await storage.persisted();
    if (already) return { supported: true, persisted: true };
    const granted = await storage.persist();
    return { supported: true, persisted: granted };
  } catch {
    return { supported: true, persisted: false };
  }
}
