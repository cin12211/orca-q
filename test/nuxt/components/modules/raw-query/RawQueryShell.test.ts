import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POSTGRES_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/postgres/raw-query/capabilities';
import { postgresCommandResult } from '~/components/modules/driver/postgres/raw-query/services';
import { REDIS_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/redis/raw-query/capabilities';
import { genericCommandResult } from '~/components/modules/driver/shared/raw-query/services';
import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import RawQueryShell from '~/components/modules/raw-query/shell/RawQueryShell.vue';

const { fileContentMock } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

const createFileContent = () => ({
  fieldDefs: ref([]),
  fileContents: ref(''),
  fileVariables: ref(''),
  currentFile: ref({
    id: 'file-1',
    title: 'query.sql',
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

const redisDescriptor: RawQueryDriverDescriptor = {
  capabilities: REDIS_RAW_QUERY_CAPABILITIES,
  commandResultHandler: genericCommandResult,
};

const postgresDescriptor: RawQueryDriverDescriptor = {
  capabilities: POSTGRES_RAW_QUERY_CAPABILITIES,
  commandResultHandler: postgresCommandResult,
};

const mountShell = (
  descriptor: RawQueryDriverDescriptor,
  slots: Record<string, string> = {}
) =>
  mount(RawQueryShell, {
    props: {
      descriptor,
      executor: sqlStreamingExecutor,
      resolveCommandResultHandler: () => descriptor.commandResultHandler,
    },
    slots,
    global: {
      stubs: {
        BaseCodeEditor: { template: '<div data-test="code-editor" />' },
        BaseEmpty: {
          props: ['title'],
          template: '<div data-test="empty">{{ title }}</div>',
        },
        Icon: true,
        LoadingOverlay: { template: '<div data-test="loading" />' },
        AddVariableModal: true,
        MissingVariablesDialog: true,
        PureConnectionSelector: true,
        RawQueryConfigModal: true,
        RawQueryConnectionConfirmDialog: true,
        RawQueryEditorContextMenu: { template: '<div><slot /></div>' },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        VariableEditor: { template: '<div data-test="variable-editor" />' },
      },
    },
  });

describe('RawQueryShell', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fileContentMock.mockImplementation(createFileContent);
  });

  it('renders engine contributions in the header and footer slots', () => {
    const wrapper = mountShell(redisDescriptor, {
      'header-extra': '<div data-testid="header-extra" />',
      'footer-extra': '<div data-testid="footer-extra" />',
    });

    expect(wrapper.find('[data-testid="header-extra"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="footer-extra"]').exists()).toBe(true);
  });

  it('disables the variables pane when the engine does not support them', () => {
    const wrapper = mountShell(redisDescriptor);

    expect(wrapper.text()).toContain('Variables not supported');
    expect(wrapper.find('[data-test="variable-editor"]').exists()).toBe(false);
  });

  it('shows the variable editor when the engine supports variables', () => {
    const wrapper = mountShell(postgresDescriptor);

    expect(wrapper.text()).not.toContain('Variables not supported');
    expect(wrapper.find('[data-test="variable-editor"]').exists()).toBe(true);
  });

  it('exposes the execution entry points to engine containers', () => {
    const wrapper = mountShell(postgresDescriptor);

    expect(typeof wrapper.vm.executeCurrentStatement).toBe('function');
    expect(typeof wrapper.vm.getEditorView).toBe('function');
    expect(wrapper.vm.getEditorView()).toBe(null);
  });
});
