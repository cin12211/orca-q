import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

const mockFetch = vi.fn(async (url: string, options: any) => {
  if (url === '/api/mongodb/databases') {
    return { databases: ['admin', 'orcaq_fixture'] };
  }

  if (options.body.database === 'orcaq_fixture') {
    return {
      collections: [{ name: 'users', properties: [], size: 4096 }],
      totalSize: 16384,
    };
  }

  return { collections: [], totalSize: 0 };
});
vi.stubGlobal('$fetch', mockFetch);

describe('useMongoSchemaTreeData', () => {
  it('builds one folder node per database (with totalSize) and collection leaf nodes tagged with TabViewType and size', async () => {
    const connection = ref({ id: 'c1' } as any);
    const { fileTreeData } = useMongoSchemaTreeData(connection);
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/collection-names',
      expect.anything()
    );

    const adminFolder = fileTreeData.value.admin;
    expect(adminFolder.type).toBe('folder');
    expect(adminFolder.iconOpen).toBe('hugeicons:database');
    expect(adminFolder.iconClose).toBe('hugeicons:database');
    expect(adminFolder.data?.tabViewType).toBe(
      TabViewType.MongoDatabaseOverview
    );
    expect(adminFolder.data?.totalSize).toBe(0);
    expect(adminFolder.children).toEqual([]);

    const fixtureFolder = fileTreeData.value.orcaq_fixture;
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
  });

  it('filters to databases with a matching collection when search is set', async () => {
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (url === '/api/mongodb/databases') {
        return { databases: ['admin', 'orcaq_fixture'] };
      }

      if (options.body.database === 'orcaq_fixture') {
        return {
          collections: [
            { name: 'users', properties: [], size: 4096 },
            { name: 'orders', properties: [], size: 2048 },
          ],
          totalSize: 16384,
        };
      }

      return { collections: [], totalSize: 0 };
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
