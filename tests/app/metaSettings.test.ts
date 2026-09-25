/**
 * Schema/version metadata (D-108) and device settings (P-09) — real, persisted 'meta'
 * and 'settings' documents seeded by AppStore.init(), against a real MemoryAdapter.
 */
import { describe, expect, it } from 'vitest';
import { AppStore } from '../../src/app/store';
import { MemoryAdapter } from '../../src/store/MemoryAdapter';
import { APP_SCHEMA_VERSION } from '../../src/contracts';

describe('Meta: schema/version metadata', () => {
  it('seeds a meta doc on first run at the current app_schema_version', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    expect(store.getSnapshot().meta.app_schema_version).toBe(APP_SCHEMA_VERSION);
    expect(store.getSnapshot().meta.installed_at).toBeTruthy();
  });

  it('reuses the persisted meta doc (installed_at stable) across a fresh AppStore over the same adapter', async () => {
    const adapter = new MemoryAdapter();
    const store1 = new AppStore(adapter);
    await store1.init();
    const installedAt = store1.getSnapshot().meta.installed_at;

    const store2 = new AppStore(adapter);
    await store2.init();
    expect(store2.getSnapshot().meta.installed_at).toBe(installedAt);
  });

  it('refuses a downgrade: a stored app_schema_version newer than this build understands surfaces as a clear error, not silent misreading (D-108)', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([
      {
        id: 'meta',
        type: 'meta',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        app_schema_version: APP_SCHEMA_VERSION + 1,
        installed_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const store = new AppStore(adapter);
    await store.init();
    expect(store.getSnapshot().status).toBe('error');
    expect(store.getSnapshot().error).toMatch(/newer app build/i);
  });

  it('a corrupt meta doc does not block app start — treated as first run', async () => {
    const adapter = new MemoryAdapter();
    await adapter.putMany([{ id: 'meta', type: 'meta', created_at: 'x', updated_at: 'x', app_schema_version: 'not-a-number' as unknown as number } as never]);
    const store = new AppStore(adapter);
    await store.init();
    expect(store.getSnapshot().status).toBe('ready');
    expect(store.getSnapshot().meta.app_schema_version).toBe(APP_SCHEMA_VERSION);
  });
});

describe('Settings: device label and export bookkeeping', () => {
  it('seeds settings from the active pack profile on first run', async () => {
    const store = new AppStore(new MemoryAdapter());
    await store.init();
    const settings = store.getSnapshot().settings;
    expect(settings.tz).toBe(store.getSnapshot().profile.default_tz);
    expect(settings.units).toBe('lb');
    expect(settings.last_export_at).toBeNull();
    expect(settings.device_label).toBeTruthy();
  });

  it('updateSettings persists a device label edit across a fresh AppStore over the same adapter', async () => {
    const adapter = new MemoryAdapter();
    const store1 = new AppStore(adapter);
    await store1.init();
    await store1.updateSettings({ device_label: "Nelson's iPhone" });
    expect(store1.getSnapshot().settings.device_label).toBe("Nelson's iPhone");

    const store2 = new AppStore(adapter);
    await store2.init();
    expect(store2.getSnapshot().settings.device_label).toBe("Nelson's iPhone");
  });
});
