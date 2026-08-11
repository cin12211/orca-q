import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

const mockFetch = vi.fn(async (url: string) => {
  if (url === '/api/mongodb/databases') {
    return { databases: ['admin', 'orcaq_fixture'] };
  }

  return { collections: [] };
});
vi.stubGlobal('$fetch', mockFetch);

describe('useMongoSchemaTreeData', () => {
  it('builds one folder node per database with collection leaf nodes tagged with TabViewType', async () => {
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (url === '/api/mongodb/databases') {
        return { databases: ['admin', 'orcaq_fixture'] };
      }

      if (options.body.database === 'orcaq_fixture') {
        return { collections: [{ name: 'users', documentCount: 3 }] };
      }

      return { collections: [] };
    });

    const connection = ref({ id: 'c1' } as any);
    const { fileTreeData } = useMongoSchemaTreeData(connection);
    await flushPromises();

    const adminFolder = fileTreeData.value.admin;
    expect(adminFolder.type).toBe('folder');
    expect(adminFolder.data?.tabViewType).toBe(
      TabViewType.MongoDatabaseOverview
    );
    expect(adminFolder.children).toEqual([]);

    const fixtureFolder = fileTreeData.value.orcaq_fixture;
    expect(fixtureFolder.children).toEqual(['orcaq_fixture.users']);

    const collectionNode = fileTreeData.value['orcaq_fixture.users'];
    expect(collectionNode.type).toBe('file');
    expect(collectionNode.parentId).toBe('orcaq_fixture');
    expect(collectionNode.data?.tabViewType).toBe(
      TabViewType.MongoCollectionDetail
    );
  });

  it('filters to databases with a matching collection when search is set', async () => {
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (url === '/api/mongodb/databases') {
        return { databases: ['admin', 'orcaq_fixture'] };
      }

      if (options.body.database === 'orcaq_fixture') {
        return {
          collections: [
            { name: 'users', documentCount: 3 },
            { name: 'orders', documentCount: 2 },
          ],
        };
      }

      return { collections: [] };
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
