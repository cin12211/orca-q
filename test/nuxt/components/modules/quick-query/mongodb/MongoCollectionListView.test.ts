import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import VueJsonPretty from 'vue-json-pretty';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: () => ({
    value: {
      getVirtualItems: () => [{ index: 0, key: 0, start: 0 }],
      getTotalSize: () => 120,
      measureElement: () => {},
      measure: () => {},
    },
  }),
}));

describe('MongoCollectionListView', () => {
  it('renders document list and toggles nested keys expansion on button click', async () => {
    const documents = [
      {
        _id: 'doc-1',
        name: 'John',
        address: { city: 'Hanoi', country: 'Vietnam' },
      },
    ];

    const wrapper = mount({
      components: { MongoCollectionListView, TooltipProvider },
      template: `<TooltipProvider><MongoCollectionListView :documents="documents" /></TooltipProvider>`,
      setup() {
        return { documents };
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.exists()).toBe(true);
    expect(jsonPretty.props('deep')).toBe(1);

    const toggleBtn = wrapper.find('button');
    expect(toggleBtn.exists()).toBe(true);

    await toggleBtn.trigger('click');
    await flushPromises();

    expect(jsonPretty.props('deep')).toBe(99);

    await toggleBtn.trigger('click');
    await flushPromises();

    expect(jsonPretty.props('deep')).toBe(1);
  });
});
