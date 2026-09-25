import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '../../src/store';
import type { StoredDoc } from '../../src/store';

function doc(id: string, extra: Record<string, unknown> = {}): StoredDoc {
  return {
    id,
    type: 'settings',
    created_at: '2026-09-22T18:00:00.000Z',
    updated_at: '2026-09-22T18:00:00.000Z',
    ...extra,
  };
}

describe('MemoryAdapter', () => {
  it('write and reload', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('settings'), doc('meta')]);
    const all = await adapter.loadAll();
    expect(all.map((d) => d.id).sort()).toEqual(['meta', 'settings']);
  });

  it('putMany upserts by id', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('settings', { tz: 'America/Los_Angeles' })]);
    await adapter.putMany([doc('settings', { tz: 'America/New_York' })]);
    const all = await adapter.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].tz).toBe('America/New_York');
  });

  it('deleteMany removes only the named documents', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('a'), doc('b'), doc('c')]);
    await adapter.deleteMany(['b']);
    const all = await adapter.loadAll();
    expect(all.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });

  it('replaceAll replaces the entire dataset', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('a'), doc('b')]);
    await adapter.replaceAll([doc('c')]);
    const all = await adapter.loadAll();
    expect(all.map((d) => d.id)).toEqual(['c']);
  });

  it('loadAll returns copies, not live references', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('a')]);
    const all = await adapter.loadAll();
    (all[0] as Record<string, unknown>).mutated = true;
    const again = await adapter.loadAll();
    expect((again[0] as Record<string, unknown>).mutated).toBeUndefined();
  });

  it('putMany rejects a document with no id (all-or-nothing)', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([doc('a')]);
    await expect(adapter.putMany([doc('b'), { type: 'settings' } as unknown as StoredDoc])).rejects.toThrow();
    const all = await adapter.loadAll();
    // Nothing from the failed batch should have been written.
    expect(all.map((d) => d.id)).toEqual(['a']);
  });
});
