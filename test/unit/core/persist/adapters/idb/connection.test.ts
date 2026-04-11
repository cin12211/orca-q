import { isProxy, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/components/modules/connection/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { connectionIDBAdapter } from '~/core/persist/adapters/idb/connection';

const localforageMock = vi.hoisted(() => ({
  keys: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('localforage', () => ({
  __esModule: true,
  default: {
    createInstance: vi.fn(() => ({
      keys: localforageMock.keys,
      getItem: localforageMock.getItem,
      setItem: localforageMock.setItem,
      removeItem: localforageMock.removeItem,
    })),
  },
}));

describe('connectionIDBAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localforageMock.keys.mockResolvedValue([]);
    localforageMock.getItem.mockResolvedValue(null);
    localforageMock.setItem.mockResolvedValue(undefined);
    localforageMock.removeItem.mockResolvedValue(undefined);
  });

  it('serializes reactive tag arrays before persisting on create', async () => {
    const connection = reactive({
      id: 'conn-1',
      workspaceId: 'ws-1',
      name: 'Tagged DB',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      createdAt: '2024-01-01T00:00:00.000Z',
      tagIds: ['tag-dev', 'tag-prod'],
    });

    await connectionIDBAdapter.create(connection as any);

    const saved = localforageMock.setItem.mock.calls[0][1];
    expect(saved.tagIds).toEqual(['tag-dev', 'tag-prod']);
    expect(isProxy(saved)).toBe(false);
    expect(isProxy(saved.tagIds)).toBe(false);
  });

  it('serializes reactive nested fields before persisting on update', async () => {
    localforageMock.getItem.mockResolvedValue({
      id: 'conn-1',
      workspaceId: 'ws-1',
      name: 'Existing DB',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const connection = reactive({
      id: 'conn-1',
      tagIds: ['tag-stage'],
      ssl: {
        mode: 'require',
      },
    });

    await connectionIDBAdapter.update(connection as any);

    const saved = localforageMock.setItem.mock.calls[0][1];
    expect(saved.tagIds).toEqual(['tag-stage']);
    expect(saved.ssl).toEqual({ mode: 'require' });
    expect(isProxy(saved)).toBe(false);
    expect(isProxy(saved.tagIds)).toBe(false);
    expect(isProxy(saved.ssl)).toBe(false);
  });
});
