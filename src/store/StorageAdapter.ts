/**
 * The storage adapter interface (APP_TECH_ARCHITECTURE_V0.md §10.1): the *only*
 * persistence API in the app. `IndexedDbAdapter` is the production implementation;
 * `MemoryAdapter` backs tests. A future sync layer wraps this interface without
 * touching the rest of the app (§18.6).
 */
import type { DocBase } from '../contracts';

/** A document as stored: the common base plus whatever fields its type carries. */
export type StoredDoc = DocBase & Record<string, unknown>;

export interface StorageAdapter {
  loadAll(): Promise<StoredDoc[]>;
  /** One transaction; all or nothing. */
  putMany(docs: StoredDoc[]): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  /** One transaction (import, migration). */
  replaceAll(docs: StoredDoc[]): Promise<void>;
}
