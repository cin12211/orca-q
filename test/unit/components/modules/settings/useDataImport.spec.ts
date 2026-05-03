import { isProxy } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDataImport } from '~/components/modules/settings/hooks/useDataImport';

const {
  idbMergeAllMock,
  checkImportCompatibilityMock,
  runMigrationsMock,
  migrationStateGetMock,
  migrationStateSaveMock,
  loadPersistDataMock,
  loadTagsMock,
  storageSetItemMock,
} = vi.hoisted(() => ({
  idbMergeAllMock: vi.fn(),
  checkImportCompatibilityMock: vi.fn(),
  runMigrationsMock: vi.fn(),
  migrationStateGetMock: vi.fn(),
  migrationStateSaveMock: vi.fn(),
  loadPersistDataMock: vi.fn(),
  loadTagsMock: vi.fn(),
  storageSetItemMock: vi.fn(),
}));

vi.mock('~/core/helpers/environment', () => ({
  isElectron: () => false,
}));

vi.mock('~/core/persist/adapters/electron/primitives', () => ({
  persistMergeAll: vi.fn(),
}));

vi.mock('~/core/persist/adapters/idb/primitives', () => ({
  idbMergeAll: idbMergeAllMock,
}));

vi.mock('~/core/persist/migration', () => ({
  checkImportCompatibility: checkImportCompatibilityMock,
  runMigrations: runMigrationsMock,
}));

vi.mock('~/core/persist/storage-adapter', () => ({
  getPlatformStorage: () => ({
    setItem: storageSetItemMock,
    getItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

vi.mock('~/core/storage/entities/MigrationStateStorage', () => ({
  migrationStateStorage: {
    get: migrationStateGetMock,
    save: migrationStateSaveMock,
  },
}));

vi.mock('~/core/stores/agentStore', () => ({
  useAgentStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

vi.mock('~/core/stores/appConfigStore', () => ({
  useAppConfigStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

vi.mock('~/core/stores/managementConnectionStore', () => ({
  useManagementConnectionStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

vi.mock('~/core/stores/managementExplorerStore', () => ({
  useManagementExplorerStore: () => ({
    $hydrate: vi.fn(),
  }),
}));

vi.mock('~/core/stores/useActivityBarStore', () => ({
  useActivityBarStore: () => ({
    $hydrate: vi.fn(),
  }),
}));

vi.mock('~/core/stores/useEnvironmentTagStore', () => ({
  useEnvironmentTagStore: () => ({
    loadTags: loadTagsMock,
  }),
}));

vi.mock('~/core/stores/useExplorerFileStore', () => ({
  useExplorerFileStore: () => ({}),
}));

vi.mock('~/core/stores/useQuickQueryLogs', () => ({
  useQuickQueryLogs: () => ({}),
}));

vi.mock('~/core/stores/useTabViewsStore', () => ({
  useTabViewsStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

vi.mock('~/core/stores/useWSStateStore', () => ({
  useWSStateStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

vi.mock('~/core/stores/useWorkspacesStore', () => ({
  useWorkspacesStore: () => ({
    loadPersistData: loadPersistDataMock,
  }),
}));

describe('useDataImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    checkImportCompatibilityMock.mockReturnValue({
      compatible: true,
      unknownMigrations: [],
    });
    runMigrationsMock.mockResolvedValue(undefined);
    migrationStateGetMock.mockResolvedValue(null);
    migrationStateSaveMock.mockResolvedValue(undefined);
    loadPersistDataMock.mockResolvedValue(undefined);
    loadTagsMock.mockResolvedValue(undefined);
    storageSetItemMock.mockReset();
    idbMergeAllMock.mockImplementation(async (_collection, values) => {
      expect(isProxy(values)).toBe(false);

      for (const value of values) {
        expect(isProxy(value)).toBe(false);
      }
    });
  });

  it('keeps staged backup data plain through confirmation before writing to IDB', async () => {
    const backup = JSON.stringify({
      persist: {
        workspaces: [{ id: 'ws-1', name: 'Workspace 1' }],
      },
      schemaVersion: [],
    });

    const dataImport = useDataImport();

    await dataImport.importFromText(backup);

    expect(dataImport.showImportWarningDialog.value).toBe(true);

    await dataImport.confirmImport();

    expect(dataImport.error.value).toBeNull();
    expect(dataImport.success.value).toBe(true);
    expect(idbMergeAllMock).toHaveBeenCalledWith('workspaces', [
      { id: 'ws-1', name: 'Workspace 1' },
    ]);
  });

  it('imports the real backup fixture without proxying persisted collections', async () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'test/fixtures/backup/orcaq-backup-v1.json'
    );
    const backup = fs.readFileSync(fixturePath, 'utf8');

    const dataImport = useDataImport();

    await dataImport.importFromText(backup);
    expect(dataImport.showImportWarningDialog.value).toBe(true);

    await dataImport.confirmImport();

    expect(dataImport.error.value).toBeNull();
    expect(dataImport.success.value).toBe(true);
    expect(idbMergeAllMock).toHaveBeenCalledTimes(10);
  });
});
