import { computed, markRaw, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RawQueryEditorHeader from '~/components/modules/raw-query/components/layout/RawQueryEditorHeader.vue';
import { RawQueryEditorLayout } from '~/components/modules/raw-query/constants';
import { RAW_QUERY_CONTEXT_KEY } from '~/components/modules/raw-query/hooks';
import { DatabaseClientType } from '~/core/constants/database-client-type';

function createMockContext(overrides: Record<string, any> = {}) {
  return {
    workspaceId: computed(() => 'ws-1'),
    selectedConnectionId: ref('conn-1'),
    connections: ref([]),
    connection: ref(undefined),
    databaseType: computed(() => DatabaseClientType.MONGODB),
    disableConnectionSwitch: computed(() => false),
    updateSelectedConnection: vi.fn(),
    currentFile: ref(undefined),
    fileContents: ref(''),
    fileVariables: ref(''),
    updateFileContent: vi.fn(),
    updateFileVariables: vi.fn(),
    isVariableSupported: computed(() => true),
    isFormatSupported: computed(() => true),
    isExplainSupported: computed(() => true),
    rawQueryEditor: { id: 'ctx-editor' } as any,
    codeEditorLayout: computed(() => RawQueryEditorLayout.horizontal),
    ...overrides,
  };
}

describe('RawQueryEditorHeader', () => {
  it('renders MongoDB Beta badge dynamically from registry for MongoDB database type', async () => {
    const wrapper = mount(RawQueryEditorHeader, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: createMockContext({
            databaseType: computed(() => DatabaseClientType.MONGODB),
          }),
        },
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
          Badge: { template: '<span><slot /></span>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('MongoDB Beta');
  });

  it('does not render MongoDB Beta badge for PostgreSQL database type', () => {
    const wrapper = mount(RawQueryEditorHeader, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: createMockContext({
            databaseType: computed(() => DatabaseClientType.POSTGRES),
          }),
        },
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
          Badge: { template: '<span><slot /></span>' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('MongoDB Beta');
  });

  it('renders customLeftComponents and customRightComponents correctly', () => {
    const CustomLeft = markRaw({
      props: ['context'],
      template:
        '<div class="custom-left">Left: {{ context?.databaseType }}</div>',
    });
    const CustomRight = markRaw({
      props: ['context'],
      template:
        '<div class="custom-right">Right: {{ context?.workspaceId }}</div>',
    });

    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        customLeftComponents: [CustomLeft],
        customRightComponents: [CustomRight],
      },
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: createMockContext({
            workspaceId: computed(() => 'ws-test'),
            databaseType: computed(() => DatabaseClientType.POSTGRES),
          }),
        },
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
        },
      },
    });

    expect(wrapper.find('.custom-left').text()).toContain('Left: postgres');
    expect(wrapper.find('.custom-right').text()).toContain('Right: ws-test');
  });

  it('passes rawQueryEditor to header component context', () => {
    const fakeEditor = { id: 'mock-editor' } as any;
    const CustomComponent = markRaw({
      props: ['context'],
      template:
        '<div class="editor-check">{{ context?.rawQueryEditor?.id }}</div>',
    });

    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        customRightComponents: [CustomComponent],
      },
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: createMockContext({
            rawQueryEditor: fakeEditor,
          }),
        },
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
        },
      },
    });

    expect(wrapper.find('.editor-check').text()).toBe('mock-editor');
  });

  it('reads from raw query context when props are omitted', () => {
    const fakeContext = {
      workspaceId: computed(() => 'ws-ctx'),
      selectedConnectionId: ref('conn-ctx'),
      connections: ref([]),
      connection: ref(undefined),
      databaseType: computed(() => DatabaseClientType.POSTGRES),
      disableConnectionSwitch: computed(() => false),
      updateSelectedConnection: vi.fn(),
      currentFile: ref(undefined),
      fileContents: ref(''),
      fileVariables: ref(''),
      updateFileContent: vi.fn(),
      updateFileVariables: vi.fn(),
      isVariableSupported: computed(() => true),
      isFormatSupported: computed(() => true),
      isExplainSupported: computed(() => true),
      rawQueryEditor: { id: 'ctx-editor' } as any,
      codeEditorLayout: computed(() => RawQueryEditorLayout.horizontal),
    };

    const CustomComponent = markRaw({
      props: ['context'],
      template:
        '<div class="ctx-check">{{ context?.workspaceId }}:{{ context?.rawQueryEditor?.id }}</div>',
    });

    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        customRightComponents: [CustomComponent],
      },
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: fakeContext,
        },
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
        },
      },
    });

    expect(wrapper.find('.ctx-check').text()).toBe('ws-ctx:ctx-editor');
  });
});
