import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// ── Module imports ───────────────────────────────────────────────────

import { isElectron } from '~/core/helpers/environment';
import {
  persistGetAll as electronPersistGetAll,
  persistReplaceAll as electronPersistReplaceAll,
} from '~/core/persist/adapters/electron/primitives';
import {
  idbGetAll,
  idbReplaceAll,
} from '~/core/persist/adapters/idb/primitives';
import { runSchemaMigrations } from '~/core/persist/adapters/migration/migrationRunner';
import { setSchemaVersion } from '~/core/persist/adapters/migration/schemaVersionStore';
import type { VersionedMigration } from '~/core/persist/adapters/migration/types';

// ── Mocks (hoisted by Vitest before module imports) ──────────────────

vi.mock('~/core/helpers/environment', () => ({
  isElectron: vi.fn(() => false),
}));

const mockIdbStorage = new Map<string, unknown[]>();
vi.mock('~/core/persist/adapters/idb/primitives', () => ({
  idbGetAll: vi.fn(
    async (collection: string) => mockIdbStorage.get(collection) ?? []
  ),
  idbReplaceAll: vi.fn(async (collection: string, values: unknown[]) => {
    mockIdbStorage.set(collection, values);
  }),
}));

const mockElectronStorage = new Map<string, unknown[]>();
vi.mock('~/core/persist/adapters/electron/primitives', () => ({
  persistGetAll: vi.fn(
    async (collection: string) => mockElectronStorage.get(collection) ?? []
  ),
  persistReplaceAll: vi.fn(async (collection: string, values: unknown[]) => {
    mockElectronStorage.set(collection, values);
  }),
}));

const versionMap = new Map<string, number>();
vi.mock('~/core/persist/adapters/migration/schemaVersionStore', () => ({
  getSchemaVersion: vi.fn(
    (collection: string) => versionMap.get(collection) ?? 0
  ),
  setSchemaVersion: vi.fn((collection: string, version: number) => {
    versionMap.set(collection, version);
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────

type Collection = VersionedMigration['collection'];

/** Build a migration step with minimal boilerplate. */
function mkStep(
  collection: Collection,
  version: number,
  up: (doc: unknown) => unknown,
  description = `v${version}`
): VersionedMigration {
  return { collection, version, description, up };
}

function seedIdb(collection: string, docs: unknown[]) {
  mockIdbStorage.set(collection, docs);
}

function seedElectron(collection: string, docs: unknown[]) {
  mockElectronStorage.set(collection, docs);
}

// ── Tests — web (IDB) ─────────────────────────────────────────────────

describe('runSchemaMigrations (web / IDB)', () => {
  beforeEach(() => {
    mockIdbStorage.clear();
    mockElectronStorage.clear();
    versionMap.clear();
    vi.mocked(isElectron).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns immediately when the migrations array is empty', async () => {
    await runSchemaMigrations([]);
    expect(idbGetAll).not.toHaveBeenCalled();
  });

  it('skips a collection that is already at the latest version', async () => {
    versionMap.set('workspaces', 2);
    seedIdb('workspaces', [{ id: 'ws-1', name: 'A' }]);

    await runSchemaMigrations([
      mkStep('workspaces', 1, doc => ({ ...(doc as object), _v: 1 })),
      mkStep('workspaces', 2, doc => ({ ...(doc as object), _v: 2 })),
    ]);

    expect(idbGetAll).not.toHaveBeenCalled();
    expect(idbReplaceAll).not.toHaveBeenCalled();
    expect(setSchemaVersion).not.toHaveBeenCalled();
  });

  it('applies a single pending step and saves the new version', async () => {
    versionMap.set('workspaces', 1);
    seedIdb('workspaces', [{ id: 'ws-1', name: 'Old Name', desc: 'hello' }]);

    await runSchemaMigrations([
      mkStep(
        'workspaces',
        2,
        doc => {
          const d = doc as { desc?: string; [k: string]: unknown };
          const { desc, ...rest } = d;
          return { ...rest, description: desc };
        },
        'Rename desc to description'
      ),
    ]);

    expect(idbReplaceAll).toHaveBeenCalledOnce();
    const [, written] = vi.mocked(idbReplaceAll).mock.calls[0]!;
    expect(written[0]).toMatchObject({ id: 'ws-1', description: 'hello' });
    expect((written[0] as Record<string, unknown>).desc).toBeUndefined();
    expect(setSchemaVersion).toHaveBeenCalledWith('workspaces', 2);
  });

  it('chains multiple pending steps in order', async () => {
    seedIdb('connections', [{ id: 'conn-1', host: 'localhost' }]);

    const order: number[] = [];
    await runSchemaMigrations([
      mkStep('connections', 1, doc => {
        order.push(1);
        return { ...(doc as object), v1: true };
      }),
      mkStep('connections', 2, doc => {
        order.push(2);
        return { ...(doc as object), v2: true };
      }),
    ]);

    expect(order).toEqual([1, 2]);
    const [, written] = vi.mocked(idbReplaceAll).mock.calls[0]!;
    expect(written[0]).toMatchObject({ id: 'conn-1', v1: true, v2: true });
    expect(setSchemaVersion).toHaveBeenCalledWith('connections', 2);
  });

  it('applies only the PENDING steps when some steps were already applied', async () => {
    versionMap.set('connections', 1); // step 1 already done
    seedIdb('connections', [{ id: 'conn-1', v1: true }]);

    const step1 = vi.fn((doc: unknown) => ({ ...(doc as object), v1: true }));
    const step2 = vi.fn((doc: unknown) => ({ ...(doc as object), v2: true }));

    await runSchemaMigrations([
      mkStep('connections', 1, step1),
      mkStep('connections', 2, step2),
    ]);

    expect(step1).not.toHaveBeenCalled();
    expect(step2).toHaveBeenCalledOnce();
    expect(setSchemaVersion).toHaveBeenCalledWith('connections', 2);
  });

  it('handles an empty collection (no documents) without errors', async () => {
    seedIdb('tabViews', []);

    await expect(
      runSchemaMigrations([mkStep('tabViews', 1, doc => doc)])
    ).resolves.toBeUndefined();
    expect(idbReplaceAll).toHaveBeenCalledWith('tabViews', []);
    expect(setSchemaVersion).toHaveBeenCalledWith('tabViews', 1);
  });

  it('handles migrations for multiple collections in one call', async () => {
    seedIdb('workspaces', [{ id: 'ws-1' }]);
    seedIdb('connections', [{ id: 'conn-1' }]);

    await runSchemaMigrations([
      mkStep('workspaces', 1, doc => ({ ...(doc as object), ws: true })),
      mkStep('connections', 1, doc => ({ ...(doc as object), conn: true })),
    ]);

    expect(setSchemaVersion).toHaveBeenCalledWith('workspaces', 1);
    expect(setSchemaVersion).toHaveBeenCalledWith('connections', 1);
  });

  it('calls onStep callback for each applied step', async () => {
    seedIdb('workspaces', [{ id: 'ws-1' }]);
    const onStep = vi.fn();

    await runSchemaMigrations(
      [
        mkStep(
          'workspaces',
          1,
          doc => ({ ...(doc as object), v1: true }),
          'First step'
        ),
        mkStep(
          'workspaces',
          2,
          doc => ({ ...(doc as object), v2: true }),
          'Second step'
        ),
      ],
      { onStep }
    );

    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenNthCalledWith(1, {
      collection: 'workspaces',
      version: 1,
      description: 'First step',
    });
    expect(onStep).toHaveBeenNthCalledWith(2, {
      collection: 'workspaces',
      version: 2,
      description: 'Second step',
    });
  });
});

// ── Tests — desktop (Electron) ────────────────────────────────────────

describe('runSchemaMigrations (desktop / Electron)', () => {
  beforeEach(() => {
    mockIdbStorage.clear();
    mockElectronStorage.clear();
    versionMap.clear();
    vi.mocked(isElectron).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses Electron primitives when isElectron() is true', async () => {
    seedElectron('workspaces', [{ id: 'ws-electron', name: 'Electron WS' }]);

    await runSchemaMigrations([
      mkStep('workspaces', 1, doc => ({ ...(doc as object), migrated: true })),
    ]);

    expect(electronPersistGetAll).toHaveBeenCalledWith('workspaces');
    expect(electronPersistReplaceAll).toHaveBeenCalledOnce();
    const [, written] = vi.mocked(electronPersistReplaceAll).mock.calls[0]!;
    expect((written as Record<string, unknown>[])[0]).toMatchObject({
      id: 'ws-electron',
      migrated: true,
    });
    // IDB must NOT be touched
    expect(idbGetAll).not.toHaveBeenCalled();
    expect(idbReplaceAll).not.toHaveBeenCalled();
  });
});
