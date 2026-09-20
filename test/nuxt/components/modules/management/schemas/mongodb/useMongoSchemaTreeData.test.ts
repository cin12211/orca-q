import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

const mockFetch = vi.fn(async (url: string, options: any) => {
  if (url === '/api/mongodb/databases') {
    return { databases: ['admin', 'orcaq_fixture'] };
  }

  if (url === '/api/mongodb/collection-names') {
    if (options.body.database === 'orcaq_fixture') {
      return { collections: [{ name: 'users', properties: [] }] };
    }
    return { collections: [] };
  }

  if (url === '/api/mongodb/collection-stats') {
    return {
      collections: [{ name: 'users', properties: [], size: 4096, count: 10 }],
    };
  }

  throw new Error(`Unexpected fetch: ${url}`);
});
vi.stubGlobal('$fetch', mockFetch);

describe('useMongoSchemaTreeData', () => {
  it('builds one folder node per database (fast, no stats) and collection leaf nodes tagged with TabViewType', async () => {
    mockFetch.mockClear();
    const connection = ref({ id: 'c1' } as any);
    const { fileTreeData } = useMongoSchemaTreeData(connection);
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/collection-names',
      expect.anything()
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/mongodb/collection-stats',
      expect.anything()
    );

    const adminFolder = fileTreeData.value.admin;
    expect(adminFolder.type).toBe('folder');
    expect(adminFolder.iconOpen).toBe('hugeicons:database');
    expect(adminFolder.iconClose).toBe('hugeicons:database');
    expect(adminFolder.data?.tabViewType).toBe(
      TabViewType.MongoDatabaseOverview
    );
    expect(adminFolder.data?.collectionCount).toBe(0);
    expect(adminFolder.children).toEqual([]);

    const fixtureFolder = fileTreeData.value.orcaq_fixture;
    expect(fixtureFolder.data?.collectionCount).toBe(1);
    expect(fixtureFolder.children).toEqual(['orcaq_fixture.users']);

    const collectionNode = fileTreeData.value['orcaq_fixture.users'];
    expect(collectionNode.type).toBe('file');
    expect(collectionNode.iconOpen).toBe('hugeicons:files-01');
    expect(collectionNode.iconClose).toBe('hugeicons:files-01');
    expect(collectionNode.parentId).toBe('orcaq_fixture');
    expect(collectionNode.data?.tabViewType).toBe(
      TabViewType.MongoCollectionDetail
    );
    expect(collectionNode.data?.size).toBeUndefined();
    expect(collectionNode.data?.count).toBeUndefined();
  });

  it('loads collection stats for a database only when requested, and memoizes', async () => {
    mockFetch.mockClear();
    const connection = ref({ id: 'c1' } as any);
    const { fileTreeData, loadCollectionStats } =
      useMongoSchemaTreeData(connection);
    await flushPromises();

    await loadCollectionStats('orcaq_fixture');

    const collectionNode = fileTreeData.value['orcaq_fixture.users'];
    expect(collectionNode.data?.size).toBe(4096);
    expect(collectionNode.data?.count).toBe(10);

    const statsCallCount = mockFetch.mock.calls.filter(
      call => call[0] === '/api/mongodb/collection-stats'
    ).length;
    expect(statsCallCount).toBe(1);

    await loadCollectionStats('orcaq_fixture');
    const statsCallCountAfterRepeat = mockFetch.mock.calls.filter(
      call => call[0] === '/api/mongodb/collection-stats'
    ).length;
    expect(statsCallCountAfterRepeat).toBe(1);
  });

  it('filters to databases with a matching collection when search is set', async () => {
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (url === '/api/mongodb/databases') {
        return { databases: ['admin', 'orcaq_fixture'] };
      }

      if (url === '/api/mongodb/collection-names') {
        if (options.body.database === 'orcaq_fixture') {
          return {
            collections: [
              { name: 'users', properties: [] },
              { name: 'orders', properties: [] },
            ],
          };
        }
        return { collections: [] };
      }

      throw new Error(`Unexpected fetch: ${url}`);
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
});
