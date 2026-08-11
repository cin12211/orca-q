import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [{ name: 'users', documentCount: 3 }],
  })
);

describe('useMongoSchemaTreeData', () => {
  it('builds a database root node with collection leaf nodes tagged with TabViewType', async () => {
    const connection = ref({ id: 'c1', database: 'shop' } as any);
    const { fileTreeData } = useMongoSchemaTreeData({ connection });
    await flushPromises();

    const root = fileTreeData.value.shop;
    expect(root.type).toBe('folder');
    expect(root.data?.tabViewType).toBe(TabViewType.MongoDatabaseOverview);
    expect(root.children).toEqual(['shop.users']);

    const collectionNode = fileTreeData.value['shop.users'];
    expect(collectionNode.type).toBe('file');
    expect(collectionNode.parentId).toBe('shop');
    expect(collectionNode.data?.tabViewType).toBe(
      TabViewType.MongoCollectionDetail
    );
  });
});
