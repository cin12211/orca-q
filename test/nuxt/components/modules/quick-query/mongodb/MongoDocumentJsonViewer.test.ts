import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import VueJsonPretty from 'vue-json-pretty';
import { EditorTheme } from '~/components/base/code-editor/constants';
import MongoDocumentJsonViewer from '~/components/modules/quick-query/mongodb/components/MongoDocumentJsonViewer.vue';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

describe('MongoDocumentJsonViewer', () => {
  const sampleDocument = {
    _id: '65dc0bbc24edc357f3c23be1',
    title: 'Sample Document',
    count: 42,
    isActive: true,
    createdAt: "ISODate('2026-08-27T08:04:10.633Z')",
  };

  it('renders VueJsonPretty with document data', async () => {
    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        isExpanded: true,
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.exists()).toBe(true);
    expect(jsonPretty.props('deep')).toBe(99);
    expect(jsonPretty.classes()).toContain('mongo-json-tree');
  });

  it('sets deep to 1 when isExpanded is false', async () => {
    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        isExpanded: false,
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.props('deep')).toBe(1);
  });

  it('respects explicit deep prop override', async () => {
    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        deep: 5,
        isExpanded: false,
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.props('deep')).toBe(5);
  });

  it('renders custom ISODate UTC view in value node', async () => {
    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        isExpanded: true,
      },
    });
    await flushPromises();

    const utcView = wrapper.find('[data-testid="mongo-isodate-utc-view"]');
    expect(utcView.exists()).toBe(true);
    expect(utcView.text()).toBe('(2026-08-27 08:04:10.633 UTC)');
  });

  it('renders right-aligned MongoDB type annotations for document fields', async () => {
    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        isExpanded: true,
      },
    });
    await flushPromises();

    const typeNodes = wrapper.findAll('[data-testid="mongo-node-type-info"]');
    expect(typeNodes.length).toBeGreaterThan(0);
    const types = typeNodes.map(node => node.text());
    expect(types).toContain('String');
    expect(types).toContain('Number');
    expect(types).toContain('Boolean');
    expect(types).toContain('Date');
  });

  it('updates theme class and font size based on appConfigStore', async () => {
    const store = useAppConfigStore();
    store.codeEditorConfigs.theme = EditorTheme.Dracula;
    store.codeEditorConfigs.fontSize = 15;

    const wrapper = mount(MongoDocumentJsonViewer, {
      props: {
        document: sampleDocument,
        isExpanded: false,
      },
    });
    await flushPromises();

    const jsonPretty = wrapper.findComponent(VueJsonPretty);
    expect(jsonPretty.props('theme')).toBe('dark');
    expect(jsonPretty.classes()).toContain('vjs-theme-dracula');
    expect(jsonPretty.attributes('style')).toContain('font-size: 15pt');
  });
});
