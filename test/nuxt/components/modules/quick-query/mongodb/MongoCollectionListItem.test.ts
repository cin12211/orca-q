import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VueJsonPretty from 'vue-json-pretty';
import { EditorTheme } from '~/components/base/code-editor/constants';
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

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

  it('shows Discard button when dirty and clicking Discard reverts changes without exiting edit mode', async () => {
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

    // Pristine: discard button should not exist
    expect(wrapper.find('[data-testid="btn-discard-document"]').exists()).toBe(
      false
    );

    // Modify draft JSON
    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    (itemComponent.vm as any).draftJson = JSON.stringify(
      { ...sampleDoc, title: 'Changed' },
      null,
      2
    );
    await flushPromises();

    // Dirty: discard button should exist
    const discardBtn = wrapper.find('[data-testid="btn-discard-document"]');
    expect(discardBtn.exists()).toBe(true);

    // Click discard
    await discardBtn.trigger('click');
    await flushPromises();

    // Changes reverted, save & discard buttons disappear, did not emit cancel-edit
    expect(wrapper.find('[data-testid="btn-discard-document"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-testid="btn-save-document"]').exists()).toBe(
      false
    );
    expect(itemComponent.emitted('cancel-edit')).toBeFalsy();
    expect(JSON.parse((itemComponent.vm as any).draftJson)).toEqual(sampleDoc);
  });

  it('triggers save on Cmd+S keyboard shortcut when dirty', async () => {
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

    // Cmd+S when pristine does nothing
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true })
    );
    await flushPromises();
    expect(itemComponent.emitted('save')).toBeFalsy();

    // Make dirty
    (itemComponent.vm as any).draftJson = JSON.stringify(
      { ...sampleDoc, title: 'Shortcut Saved' },
      null,
      2
    );
    await flushPromises();

    // Cmd+S when dirty triggers save
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true })
    );
    await flushPromises();

    expect(itemComponent.emitted('save')).toBeTruthy();
    expect(itemComponent.emitted('save')?.[0]?.[0]).toEqual({
      _id: 'doc-123',
      title: 'Shortcut Saved',
      count: 42,
    });
  });

  it('toggles fullscreen zoom in / zoom out and restores on Escape key', async () => {
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

    const zoomBtn = wrapper.find('[data-testid="btn-toggle-fullscreen"]');
    expect(zoomBtn.exists()).toBe(true);

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    expect((itemComponent.vm as any).isFullscreen).toBe(false);

    // Toggle fullscreen
    await zoomBtn.trigger('click');
    await flushPromises();

    expect((itemComponent.vm as any).isFullscreen).toBe(true);
    expect(itemComponent.emitted('resize')).toBeTruthy();

    // Press Escape to exit fullscreen
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await flushPromises();

    expect((itemComponent.vm as any).isFullscreen).toBe(false);
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

  it('updates VueJsonPretty theme class according to editor theme in settings', async () => {
    const store = useAppConfigStore();
    store.codeEditorConfigs.theme = EditorTheme.Dracula;

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

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.exists()).toBe(true);
    expect(jsonPretty.props('theme')).toBe('dark');
    expect(jsonPretty.classes()).toContain('vjs-theme-dracula');

    // Change setting to AyuLight
    store.codeEditorConfigs.theme = EditorTheme.AyuLight;
    await flushPromises();

    expect(jsonPretty.props('theme')).toBe('light');
    expect(jsonPretty.classes()).toContain('vjs-theme-ayu-light');
  });

  it('updates VueJsonPretty font size according to editor font size in settings', async () => {
    const store = useAppConfigStore();
    store.codeEditorConfigs.fontSize = 14;

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

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.exists()).toBe(true);
    expect(jsonPretty.attributes('style')).toContain('font-size: 14pt');

    // Change setting to 16
    store.codeEditorConfigs.fontSize = 16;
    await flushPromises();

    expect(jsonPretty.attributes('style')).toContain('font-size: 16pt');
  });

  it('renders delete button in read mode and emits delete on click', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="false"
              :is-saving="false"
              :is-deleting="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const deleteBtn = wrapper.find('[data-testid="btn-delete-document"]');
    expect(deleteBtn.exists()).toBe(true);
    expect(deleteBtn.attributes('disabled')).toBeUndefined();

    await deleteBtn.trigger('click');
    await flushPromises();

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    expect(itemComponent.emitted('delete')).toBeTruthy();
  });

  it('disables delete button when isDeleting or isSaving is true', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="false"
              :is-saving="false"
              :is-deleting="true"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const deleteBtn = wrapper.find('[data-testid="btn-delete-document"]');
    expect(deleteBtn.exists()).toBe(true);
    expect(deleteBtn.attributes('disabled')).toBeDefined();

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    await deleteBtn.trigger('click');
    expect(itemComponent.emitted('delete')).toBeFalsy();
  });
});
