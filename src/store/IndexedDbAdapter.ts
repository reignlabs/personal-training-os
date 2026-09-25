/**
 * The production StorageAdapter (APP_TECH_ARCHITECTURE_V0.md §10.2): database `pto`,
 * IndexedDB version 1 (it never needs to change: all shape changes are data
 * migrations), one object store `docs` with key path `id`. Hand-written, ~60 lines,
 * kept deliberately small (D-104: no wrapper library).
 *
 * Browser-only: this file is exercised by the on-device checklist and Playwright
 * (real IndexedDB adapter, §15), not by the Vitest unit/integration suite, which uses
 * MemoryAdapter instead.
 */
import type { StorageAdapter, StoredDoc } from './StorageAdapter';

const DB_NAME = 'pto';
const DB_VERSION = 1;
const STORE_NAME = 'docs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb();
    return this.dbPromise;
  }

  async loadAll(): Promise<StoredDoc[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as StoredDoc[]);
      req.onerror = () => reject(req.error);
    });
  }

  async putMany(docs: StoredDoc[]): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      for (const doc of docs) store.put(doc);
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      for (const id of ids) store.delete(id);
    });
  }

  async replaceAll(docs: StoredDoc[]): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const doc of docs) store.put(doc);
    });
  }
}
