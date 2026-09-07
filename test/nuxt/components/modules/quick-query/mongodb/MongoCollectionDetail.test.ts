import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionDetail from '~/components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue';
import { MongoCollectionViewMode } from '~/components/modules/quick-query/mongodb/types';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockFetch = vi.fn().mockResolvedValue({
  documents: [{ _id: '1', name: 'Alice' }],
  total: 1,
  queryTime: 1,
});
vi.stubGlobal('$fetch', mockFetch);

describe('MongoCollectionDetail', () => {
  it('renders the list view by default and switches to table view on mode change', async () => {
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
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(true);

    const switcher = wrapper.findComponent({ name: 'MongoViewModeSwitcher' });
    switcher.vm.$emit('update:modelValue', MongoCollectionViewMode.Table);
    await flushPromises();

    expect(
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(false);
    expect(
      wrapper.findComponent({ name: 'MongoCollectionTableView' }).exists()
    ).toBe(true);
  });
});
