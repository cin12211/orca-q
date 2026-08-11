import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoDatabaseOverview from '~/components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue';

const openMongoCollectionTab = vi.fn();
vi.mock('~/core/composables/useTabManagement', () => ({
  useTabManagement: () => ({ openMongoCollectionTab }),
}));

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [{ name: 'users', documentCount: 3 }],
  })
);

describe('MongoDatabaseOverview', () => {
  it('lists collections and opens a Collection Detail tab on row click', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    expect(grid.props('rowData')).toEqual([
      { name: 'users', documentCount: 3 },
    ]);

    grid.vm.$emit('rowClicked', { data: { name: 'users', documentCount: 3 } });

    expect(openMongoCollectionTab).toHaveBeenCalledWith({
      databaseName: 'shop',
      collectionName: 'users',
    });
  });
});
