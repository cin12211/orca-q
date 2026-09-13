import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoDatabaseOverview from '~/components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue';

const openMongoCollectionTab = vi.fn();
vi.mock('~/core/composables/useTabManagement', () => ({
  useTabManagement: () => ({ openMongoCollectionTab }),
}));

const usersSummary = {
  name: 'users',
  properties: [],
  documentCount: 3,
  storageSize: 4096,
  dataSize: 2048,
  avgDocumentSize: 100,
  indexCount: 1,
  totalIndexSize: 512,
};

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [usersSummary],
  })
);

describe('MongoDatabaseOverview', () => {
  it('lists collections and opens a Collection Detail tab on row click', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    expect(grid.props('rowData')).toEqual([usersSummary]);

    grid.vm.$emit('rowClicked', { data: usersSummary });

    expect(openMongoCollectionTab).toHaveBeenCalledWith({
      databaseName: 'shop',
      collectionName: 'users',
    });
  });

  it('includes hash index column # at first position in columnDefs', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    const columnDefs = grid.props('columnDefs') as any[];
    expect(columnDefs[0].headerName).toBe('#');
  });
});
