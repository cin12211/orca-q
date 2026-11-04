import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import * as mongoSchemaTreeStorage from '~/components/modules/management/schemas/mongodb/utils';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

const mockFetch = vi.fn(async (url: string) => {
  if (url === '/api/mongodb/schemas') {
    return {
      databases: [
        { database: 'admin', collections: [] },
        {
          database: 'orcaq_fixture',
          collections: [{ name: 'users', properties: [] }],
        },
      ],
    };
  }

  if (url === '/api/mongodb/collection-stats') {
    return {
      databases: [
        { database: 'admin', totalSize: 0, collections: [] },
        {
          database: 'orcaq_fixture',
          totalSize: 16384,
          collections: [{ name: 'users', size: 4096, count: 10 }],
        },
      ],
    };
  }

  return {};
});

vi.stubGlobal('$fetch', mockFetch);

describe('useMongoSchemaTreeData', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('builds one folder node per database with totalCollections and collection leaf nodes tagged with TabViewType, size, and count', async () => {
    const connection = ref({ id: 'c1', database: 'orcaq_fixture' } as any);
    const { fileTreeData, fetchDatabaseStats } =
      useMongoSchemaTreeData(connection);
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/schemas',
      expect.anything()
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/collection-stats',
      expect.objectContaining({
        body: expect.objectContaining({
          databases: expect.arrayContaining([
            expect.objectContaining({ database: 'orcaq_fixture' }),
          ]),
        }),
      })
    );

    const adminFolder = fileTreeData.value.admin;
    expect(adminFolder.type).toBe('folder');
    expect(adminFolder.iconOpen).toBe('hugeicons:database');
    expect(adminFolder.iconClose).toBe('hugeicons:database');
    expect(adminFolder.data?.tabViewType).toBe(
      TabViewType.MongoDatabaseOverview
    );
    expect(adminFolder.data?.totalCollections).toBe(0);
    expect(adminFolder.children).toEqual([]);

    await fetchDatabaseStats('orcaq_fixture');
    await flushPromises();

    const fixtureFolder = fileTreeData.value.orcaq_fixture;
    expect(fixtureFolder.data?.totalCollections).toBe(1);
    expect(fixtureFolder.data?.totalSize).toBe(16384);
    expect(fixtureFolder.children).toEqual(['orcaq_fixture.users']);

    const collectionNode = fileTreeData.value['orcaq_fixture.users'];
    expect(collectionNode.type).toBe('file');
    expect(collectionNode.iconOpen).toBe('hugeicons:files-01');
    expect(collectionNode.iconClose).toBe('hugeicons:files-01');
    expect(collectionNode.parentId).toBe('orcaq_fixture');
    expect(collectionNode.data?.tabViewType).toBe(
      TabViewType.MongoCollectionDetail
    );
    expect(collectionNode.data?.size).toBe(4096);
    expect(collectionNode.data?.count).toBe(10);
  });

  it('filters to databases with a matching collection when search is set', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/mongodb/schemas') {
        return {
          databases: [
            { database: 'admin', collections: [] },
            {
              database: 'orcaq_fixture',
              collections: [
                { name: 'users', properties: [] },
                { name: 'orders', properties: [] },
              ],
            },
          ],
        };
      }

      if (url === '/api/mongodb/collection-stats') {
        return {
          databases: [
            {
              database: 'orcaq_fixture',
              totalSize: 16384,
              collections: [
                { name: 'users', size: 4096, count: 10 },
                { name: 'orders', size: 2048, count: 5 },
              ],
            },
          ],
        };
      }

      return {};
    });

    const connection = ref({ id: 'c1' } as any);
    const search = ref('order');
    const { fileTreeData } = useMongoSchemaTreeData(connection, search);
    await flushPromises();

    expect(Object.keys(fileTreeData.value)).toEqual([
      'orcaq_fixture',
      'orcaq_fixture.orders',
    ]);
  });

  it('fetches stats for databases restored from LocalStorageManager expanded state', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/mongodb/schemas') {
        return {
          databases: [
            { database: 'admin', collections: [] },
            {
              database: 'persisted_db',
              collections: [{ name: 'products', properties: [] }],
            },
          ],
        };
      }
      if (url === '/api/mongodb/collection-stats') {
        return {
          databases: [
            {
              database: 'persisted_db',
              totalSize: 5000,
              collections: [{ name: 'products', size: 5000, count: 50 }],
            },
          ],
        };
      }
      return {};
    });

    const getSpy = vi
      .spyOn(mongoSchemaTreeStorage, 'getMongoSchemasTreeExpandedIds')
      .mockReturnValue(['persisted_db']);

    const connection = ref({ id: 'c_persisted' } as any);
    useMongoSchemaTreeData(connection);
    await flushPromises();

    expect(getSpy).toHaveBeenCalledWith('c_persisted');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/collection-stats',
      expect.objectContaining({
        body: expect.objectContaining({
          databases: [
            {
              database: 'persisted_db',
              collections: ['products'],
            },
          ],
        }),
      })
    );

    getSpy.mockRestore();
  });
});
