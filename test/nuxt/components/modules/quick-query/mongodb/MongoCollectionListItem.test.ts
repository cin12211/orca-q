import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VueJsonPretty from 'vue-json-pretty';
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockToastError = vi.fn();
vi.mock('vue-sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

beforeEach(() => {
  mockToastError.mockReset();
});

describe('MongoCollectionListItem', () => {
  const sampleDoc = {
    _id: 'doc-123',
    title: 'Sample Item',
    count: 42,
  };

  it('renders read mode with VueJsonPretty and edit button', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="false"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('_id: doc-123');
    expect(wrapper.findComponent(VueJsonPretty).exists()).toBe(true);

    const editBtn = wrapper.find('[data-testid="btn-edit-document"]');
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger('click');

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    expect(itemComponent.emitted('start-edit')).toBeTruthy();
  });

  it('shows Cancel and only shows Save button when content is dirty in edit mode', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="true"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const cancelBtn = wrapper.find('[data-testid="btn-cancel-edit"]');
    expect(cancelBtn.exists()).toBe(true);

    // Initially pristine: save button should not exist
    expect(wrapper.find('[data-testid="btn-save-document"]').exists()).toBe(
      false
    );

    // Simulate modifying draft JSON
    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    (itemComponent.vm as any).draftJson = JSON.stringify(
      { ...sampleDoc, title: 'Updated Title' },
      null,
      2
    );
    await flushPromises();

    // Now dirty: save button must be visible
    const saveBtn = wrapper.find('[data-testid="btn-save-document"]');
    expect(saveBtn.exists()).toBe(true);

    await saveBtn.trigger('click');
    await flushPromises();

    expect(itemComponent.emitted('save')).toBeTruthy();
    expect(itemComponent.emitted('save')?.[0]?.[0]).toEqual({
      _id: 'doc-123',
      title: 'Updated Title',
      count: 42,
    });
  });

  it('prevents saving invalid JSON and shows error toast', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="true"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    (itemComponent.vm as any).draftJson = '{ invalid json : ';
    await flushPromises();

    const saveBtn = wrapper.find('[data-testid="btn-save-document"]');
    expect(saveBtn.exists()).toBe(true);

    await saveBtn.trigger('click');
    await flushPromises();

    expect(mockToastError).toHaveBeenCalledWith('Invalid JSON syntax');
    expect(itemComponent.emitted('save')).toBeFalsy();
  });
});
