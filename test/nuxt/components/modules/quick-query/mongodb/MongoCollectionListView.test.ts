import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockMeasureElement = vi.fn();

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: (options: any) => ({
    value: {
      getVirtualItems: () =>
        Array.from({ length: options?.count ?? 1 }, (_, i) => ({
          index: i,
          key: i,
          start: i * 120,
        })),
      getTotalSize: () => (options?.count ?? 1) * 120,
      measureElement: (el: any) => mockMeasureElement(el),
      measure: () => {},
      scrollToIndex: () => {},
    },
  }),
}));

describe('MongoCollectionListView', () => {
  const mountComponent = (template: string, setupFn: () => any) => {
    return mount(
      {
        components: { MongoCollectionListView, TooltipProvider },
        template,
        setup: setupFn,
      },
      {
        global: {
          stubs: {
            BaseCodeEditor: {
              template: '<div class="stub-code-editor" />',
            },
          },
        },
      }
    );
  };

  it('renders items via MongoCollectionListItem and manages edit mode', async () => {
    const documents = [
      {
        _id: 'doc-1',
        name: 'John',
        address: { city: 'Hanoi', country: 'Vietnam' },
      },
    ];

    const onUpdate = vi.fn();
    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView
            :documents="documents"
            @update-document="onUpdate"
          />
        </TooltipProvider>
      `,
      () => ({ documents, onUpdate })
    );
    await flushPromises();

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    expect(listItem.exists()).toBe(true);
    expect(listItem.props('isEditing')).toBe(false);

    // Trigger start-edit
    await listItem.vm.$emit('start-edit');
    await flushPromises();

    expect(listItem.props('isEditing')).toBe(true);

    // Save triggers update-document emit
    await listItem.vm.$emit('save', { name: 'John Doe' });
    await flushPromises();

    expect(
      wrapper.findComponent(MongoCollectionListView).emitted('update-document')
    ).toEqual([[{ id: 'doc-1', document: { name: 'John Doe' } }]]);
  });

  it('resets edit mode on cancel-edit', async () => {
    const documents = [{ _id: 'doc-1', name: 'John' }];

    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView :documents="documents" />
        </TooltipProvider>
      `,
      () => ({ documents })
    );
    await flushPromises();

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    await listItem.vm.$emit('start-edit');
    await flushPromises();
    expect(listItem.props('isEditing')).toBe(true);

    await listItem.vm.$emit('cancel-edit');
    await flushPromises();
    expect(listItem.props('isEditing')).toBe(false);
  });

  it('enforces single active editor across multiple documents', async () => {
    const documents = [
      { _id: 'doc-1', name: 'First' },
      { _id: 'doc-2', name: 'Second' },
    ];

    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView :documents="documents" />
        </TooltipProvider>
      `,
      () => ({ documents })
    );
    await flushPromises();

    const items = wrapper.findAllComponents(MongoCollectionListItem);
    expect(items).toHaveLength(2);

    // Start editing doc-1
    await items[0].vm.$emit('start-edit');
    await flushPromises();
    expect(items[0].props('isEditing')).toBe(true);
    expect(items[1].props('isEditing')).toBe(false);

    // Start editing doc-2 -> doc-1 is closed
    await items[1].vm.$emit('start-edit');
    await flushPromises();
    expect(items[0].props('isEditing')).toBe(false);
    expect(items[1].props('isEditing')).toBe(true);
  });

  it('exposes onExitEditMode and scrollToTop', async () => {
    const documents = [{ _id: 'doc-1', name: 'John' }];

    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView ref="listView" :documents="documents" />
        </TooltipProvider>
      `,
      () => ({ documents })
    );
    await flushPromises();

    const listView = (wrapper.vm as any).$refs.listView;
    expect(typeof listView.scrollToTop).toBe('function');
    expect(typeof listView.onExitEditMode).toBe('function');

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    await listItem.vm.$emit('start-edit');
    await flushPromises();
    expect(listItem.props('isEditing')).toBe(true);

    // Calling with non-matching id does nothing
    listView.onExitEditMode('other-id');
    await flushPromises();
    expect(listItem.props('isEditing')).toBe(true);

    // Calling with matching id closes edit mode
    listView.onExitEditMode('doc-1');
    await flushPromises();
    expect(listItem.props('isEditing')).toBe(false);
  });

  it('toggles document expansion and handles item resize', async () => {
    mockMeasureElement.mockClear();
    const documents = [{ _id: 'doc-1', name: 'John' }];

    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView :documents="documents" />
        </TooltipProvider>
      `,
      () => ({ documents })
    );
    await flushPromises();

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    expect(listItem.props('isExpanded')).toBe(false);

    await listItem.vm.$emit('toggle-expand');
    await flushPromises();
    expect(listItem.props('isExpanded')).toBe(true);

    await listItem.vm.$emit('toggle-expand');
    await flushPromises();
    expect(listItem.props('isExpanded')).toBe(false);

    // Item resize
    await listItem.vm.$emit('resize');
    await flushPromises();
    expect(mockMeasureElement).toHaveBeenCalled();
  });

  it('forwards delete event from item as delete-document', async () => {
    const documents = [{ _id: 'doc-1', name: 'John' }];
    const onDelete = vi.fn();

    const wrapper = mountComponent(
      `
        <TooltipProvider>
          <MongoCollectionListView
            :documents="documents"
            deleting-doc-id="doc-1"
            @delete-document="onDelete"
          />
        </TooltipProvider>
      `,
      () => ({ documents, onDelete })
    );
    await flushPromises();

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    expect(listItem.props('isDeleting')).toBe(true);

    await listItem.vm.$emit('delete');
    await flushPromises();

    expect(onDelete).toHaveBeenCalledWith('doc-1');
  });
});
