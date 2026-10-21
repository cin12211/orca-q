import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MongoRawQuery from '~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue';

const { fileContentMock } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

const createFileContent = () => ({
  fileContents: ref(''),
  fileVariables: ref('{}'),
  currentFile: ref({
    id: 'file-1',
    title: 'script.mongo',
    icon: 'hugeicons:file-01',
  }),
  selectedConnectionId: ref(''),
  updateSelectedConnection: vi.fn(),
  updateFileContent: vi.fn(),
  updateFileVariables: vi.fn(),
  connection: ref(undefined),
  currentOpenedConnection: ref(undefined),
  connectionsByWsId: ref([]),
  updateFileCursorPos: vi.fn(),
  loadFileContent: vi.fn().mockResolvedValue(undefined),
  isFromCache: true,
});

const mountEntry = () =>
  mount(MongoRawQuery, {
    global: {
      stubs: {
        BaseCodeEditor: { template: '<div data-test="code-editor" />' },
        BaseEmpty: {
          props: ['title'],
          template: '<div data-test="empty">{{ title }}</div>',
        },
        Icon: true,
        LoadingOverlay: { template: '<div data-test="loading" />' },
        RawQueryConnectionConfirmDialog: true,
        RawQueryEditorContextMenu: { template: '<div><slot /></div>' },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        VariableEditor: { template: '<div data-test="variable-editor" />' },
      },
    },
  });

describe('MongoRawQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fileContentMock.mockImplementation(createFileContent);
  });

  it('renders the MongoDB script editor', () => {
    const wrapper = mountEntry();

    expect(wrapper.find('[data-test="code-editor"]').exists()).toBe(true);
  });

  it('shows the variables panel with the EJSON guide popover', () => {
    const wrapper = mountEntry();

    expect(wrapper.text()).toContain('Variables');
    expect(wrapper.find('[data-test="variable-editor"]').exists()).toBe(true);
  });

  it('does not render the shared header/footer variable usage popover', () => {
    const wrapper = mountEntry();

    // The core's colon-`:param` popover would be wrong for EJSON scripts;
    // MongoDB supplies its own via footer-extra instead.
    expect(
      wrapper
        .findComponent({ name: 'RawQueryVariableUsageGuidePopover' })
        .exists()
    ).toBe(false);
  });
});
