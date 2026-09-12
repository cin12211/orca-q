import { isVNode } from 'vue';
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

  it('renders MongoDB ObjectId and ISODate literals with custom ISODate UTC view', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="true"
              :is-editing="false"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return {
          doc: {
            _id: 'doc-123',
            createdAt: "ISODate('2026-08-27T08:04:10.633Z')",
            createdById: "ObjectId('6a8e51bc8597426727b81a7b')",
          },
        };
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.vm.$slots.renderNodeValue).toBeDefined();

    const utcView = wrapper.find('[data-testid="mongo-isodate-utc-view"]');
    expect(utcView.exists()).toBe(true);
    expect(utcView.text()).toBe('(2026-08-27 08:04:10.633 UTC)');

    expect(wrapper.text()).toContain("ObjectId('6a8e51bc8597426727b81a7b')");
  });

  it('renders MongoDB type of key info badge on the right in VueJsonPretty', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="true"
              :is-editing="false"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return {
          doc: {
            _id: '65dc0bbc24edc357f3c23be1',
            title: 'Sample Item',
            count: 42,
            isActive: true,
            createdAt: "ISODate('2026-08-27T08:04:10.633Z')",
          },
        };
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.classes()).toContain('mongo-json-tree');

    const slot = jsonPretty.vm.$slots.renderNodeActions;
    expect(slot).toBeDefined();

    // Verify type resolution via slot #renderNodeActions
    const objectIdVNodes = slot!({
      node: {
        content: "ObjectId('65dc0bbc24edc357f3c23be1')",
        type: 'content',
        key: '_id',
        level: 1,
      },
    });
    expect(objectIdVNodes.length).toBe(1);
    expect(objectIdVNodes[0].props?.class).toContain('mongo-type-info');
    expect(objectIdVNodes[0].props?.class).not.toContain('border');
    expect(objectIdVNodes[0].props?.class).not.toContain('bg-');

    const stringVNodes = slot!({
      node: {
        content: 'Sample Item',
        type: 'content',
        key: 'title',
        level: 1,
      },
    });
    expect(stringVNodes.length).toBe(1);
    expect(stringVNodes[0].props?.class).toContain('mongo-type-info');

    const numberVNodes = slot!({
      node: {
        content: 42,
        type: 'content',
        key: 'count',
        level: 1,
      },
    });
    expect(numberVNodes.length).toBe(1);
    expect(numberVNodes[0].props?.class).toContain('mongo-type-info');

    const closingVNodes = slot!({
      node: {
        type: 'objectEnd',
        content: '}',
        level: 0,
      },
    });
    const renderedClosingInfo = closingVNodes.find((v: any) =>
      v.props?.class?.includes('mongo-type-info')
    );
    expect(renderedClosingInfo).toBeUndefined();

    // Verify rendered type info in DOM
    const typeElements = wrapper.findAll(
      '[data-testid="mongo-node-type-info"]'
    );
    expect(typeElements.length).toBeGreaterThan(0);
    const typeTexts = typeElements.map(b => b.text());
    expect(typeTexts).toContain('String');
    expect(typeTexts).toContain('Number');
    expect(typeTexts).toContain('Boolean');
    expect(typeTexts).toContain('Date');
  });

  it('renders nested Canonical EJSON values with Compass-style BSON literals', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="true"
              :is-editing="false"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return {
          doc: {
            _id: { $oid: '65c19f4018898af31684c4a7' },
            audit: { owner: { $oid: '6a8e51bc8597426727b81a7b' } },
            total: { $numberDecimal: '1.50' },
          },
        };
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.props('data')).toEqual({
      _id: "__orcaq_bson_literal__:ObjectId('65c19f4018898af31684c4a7')",
      audit: {
        owner: "__orcaq_bson_literal__:ObjectId('6a8e51bc8597426727b81a7b')",
      },
      total: "__orcaq_bson_literal__:Decimal128('1.50')",
    });
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
