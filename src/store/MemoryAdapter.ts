/**
 * In-memory StorageAdapter (APP_TECH_ARCHITECTURE_V0.md §15): backs integration and
 * store tests. Not durable — nothing here touches IndexedDB or the filesystem.
 */
import type { StorageAdapter, StoredDoc } from './StorageAdapter';

export class MemoryAdapter implements StorageAdapter {
  private docs = new Map<string, StoredDoc>();

  async loadAll(): Promise<StoredDoc[]> {
    return Array.from(this.docs.values()).map((d) => ({ ...d }));
  }

  async putMany(docs: StoredDoc[]): Promise<void> {
    // "One transaction; all or nothing" — validate shape before mutating anything.
    for (const doc of docs) {
      if (!doc.id || !doc.type) {
        throw new Error('putMany: every document requires id and type');
      }
    }
    for (const doc of docs) {
      this.docs.set(doc.id, { ...doc });
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.docs.delete(id);
    }
  }

  async replaceAll(docs: StoredDoc[]): Promise<void> {
    for (const doc of docs) {
      if (!doc.id || !doc.type) {
        throw new Error('replaceAll: every document requires id and type');
      }
    }
    this.docs = new Map(docs.map((d) => [d.id, { ...d }]));
  }
}
