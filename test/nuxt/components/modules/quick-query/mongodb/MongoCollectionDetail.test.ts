import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionDetail from '~/components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockFetch = vi.fn().mockResolvedValue({
  documents: [{ _id: '1', name: 'Alice' }],
  total: 1,
  queryTime: 1,
});
vi.stubGlobal('$fetch', mockFetch);

describe('MongoCollectionDetail', () => {
  it('renders the table view by default and switches to list view on mode change', async () => {
    const wrapper = mount(
      {
        components: { MongoCollectionDetail, TooltipProvider },
        template: `<TooltipProvider><MongoCollectionDetail v-bind="$attrs" /></TooltipProvider>`,
      },
      {
        attrs: {
          connectionId: 'c1',
          workspaceId: 'w1',
          databaseName: 'shop',
          collectionName: 'users',
        },
      }
    );
    await flushPromises();

    expect(
      wrapper.findComponent({ name: 'MongoCollectionTableView' }).exists()
    ).toBe(true);

    await wrapper
      .get('[data-testid="mongo-view-mode-list"]')
      .trigger('mousedown', { button: 0 });

    expect(
      wrapper.findComponent({ name: 'MongoCollectionTableView' }).exists()
    ).toBe(false);
    expect(
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(true);
  });
});
