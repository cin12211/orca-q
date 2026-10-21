import { createPinia, setActivePinia } from 'pinia';
import type { Component } from 'vue';
import { nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MARIADB_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mariadb/raw-query/capabilities';
import MariadbRawQuery from '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue';
import { mariadbCommandResult } from '~/components/modules/driver/mariadb/raw-query/services';
import { MSSQL_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mssql/raw-query/capabilities';
import MssqlRawQuery from '~/components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue';
import { mssqlCommandResult } from '~/components/modules/driver/mssql/raw-query/services';
import { MYSQL_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mysql/raw-query/capabilities';
import MysqlRawQuery from '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue';
import { mysqlCommandResult } from '~/components/modules/driver/mysql/raw-query/services';
import { ORACLE_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/oracle/raw-query/capabilities';
import OracleRawQuery from '~/components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue';
import { oracleCommandResult } from '~/components/modules/driver/oracle/raw-query/services';
import { ExplainOptionsMenu } from '~/components/modules/driver/postgres/raw-query/components';
import { SQLITE_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/sqlite/raw-query/capabilities';
import SqliteRawQuery from '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue';
import { sqlite3CommandResult } from '~/components/modules/driver/sqlite/raw-query/services';
import type {
  CommandResultHandlerFactory,
  RawQueryCapabilities,
} from '~/components/modules/raw-query/contracts';
import type { ExecutedResultItem } from '~/components/modules/raw-query/interfaces';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import RawQueryShell from '~/components/modules/raw-query/shell/RawQueryShell.vue';

const { fileContentMock, resultTabsMock } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
  resultTabsMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

vi.mock('~/components/modules/raw-query/hooks/useResultTabs', () => ({
  useResultTabs: resultTabsMock,
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

const createTab = (): ExecutedResultItem =>
  ({
    id: 'query-1',
    metadata: {
      queryTime: 12,
      statementQuery: 'SELECT 1',
      executedAt: new Date('2026-05-21T00:00:00.000Z'),
      executeErrors: undefined,
      fieldDefs: [],
      connection: { id: 'conn-1', workspaceId: 'workspace' },
    },
    result: [{ value: 1 }],
    seqIndex: 1,
    view: ViewMode.RESULT,
  }) as unknown as ExecutedResultItem;

const createEmptyResultTabs = () => ({
  executedResults: shallowRef(new Map<string, ExecutedResultItem>()),
  activeResultTabId: ref(''),
  addResultTab: vi.fn(),
  refreshResultTab: vi.fn(),
  setActiveResultTab: vi.fn(),
  closeResultTab: vi.fn(),
  updateResultTabView: vi.fn(),
  closeOtherResultTabs: vi.fn(),
  closeResultTabsToRight: vi.fn(),
  updateResultTabResult: vi.fn(),
});

const createFilledResultTabs = () => ({
  ...createEmptyResultTabs(),
  executedResults: shallowRef(new Map([['query-1', createTab()]])),
  activeResultTabId: ref('query-1'),
});

const mountEntry = (component: Component) =>
  mount(component, {
    global: {
      stubs: {
        BaseCodeEditor: { template: '<div data-test="code-editor" />' },
        BaseEmpty: { template: '<div data-test="empty" />' },
        Icon: true,
        LoadingOverlay: { template: '<div data-test="loading" />' },
        AddVariableModal: true,
        MissingVariablesDialog: true,
        PureConnectionSelector: true,
        RawQueryConfigModal: true,
        RawQueryConnectionConfirmDialog: true,
        RawQueryEditorContextMenu: { template: '<div><slot /></div>' },
        ResultTabErrorView: true,
        ResultTabInfoView: true,
        ResultTabRawView: true,
        ResultTabResultView: {
          template: '<div data-test="default-result-view" />',
        },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        VariableEditor: { template: '<div data-test="variable-editor" />' },
      },
    },
  });

const entries: Array<
  [string, Component, RawQueryCapabilities, CommandResultHandlerFactory]
> = [
  ['mysql', MysqlRawQuery, MYSQL_RAW_QUERY_CAPABILITIES, mysqlCommandResult],
  [
    'mariadb',
    MariadbRawQuery,
    MARIADB_RAW_QUERY_CAPABILITIES,
    mariadbCommandResult,
  ],
  [
    'sqlite',
    SqliteRawQuery,
    SQLITE_RAW_QUERY_CAPABILITIES,
    sqlite3CommandResult,
  ],
  [
    'oracle',
    OracleRawQuery,
    ORACLE_RAW_QUERY_CAPABILITIES,
    oracleCommandResult,
  ],
  ['mssql', MssqlRawQuery, MSSQL_RAW_QUERY_CAPABILITIES, mssqlCommandResult],
];

describe('thin SQL raw query entries', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    setActivePinia(createPinia());
    fileContentMock.mockImplementation(createFileContent);
    resultTabsMock.mockImplementation(createEmptyResultTabs);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(entries)(
    'drives the shell with the %s descriptor and the shared SQL executor',
    (_name, component, capabilities, commandResultHandler) => {
      const wrapper = mountEntry(component);
      const shell = wrapper.findComponent(RawQueryShell);

      expect(shell.exists()).toBe(true);
      expect(shell.props('descriptor')).toEqual({
        capabilities,
        commandResultHandler,
      });
      expect(shell.props('executor')).toBe(sqlStreamingExecutor);
    }
  );

  it('keeps the MSSQL parameter style and enables SQLite variable support', () => {
    const mssql = mountEntry(MssqlRawQuery)
      .findComponent(RawQueryShell)
      .props('descriptor');
    const sqlite = mountEntry(SqliteRawQuery)
      .findComponent(RawQueryShell)
      .props('descriptor');

    expect(mssql.capabilities.parameterStyle).toBe('at');
    expect(sqlite.capabilities.supportsVariables).toBe(true);
  });

  it.each(entries)(
    'renders no explain controls on the %s entry',
    (_name, component) => {
      const wrapper = mountEntry(component);

      expect(wrapper.findComponent(ExplainOptionsMenu).exists()).toBe(false);
      expect(wrapper.text()).not.toContain('⌘E');
    }
  );

  it('renders the shell default result body when the entry supplies no result-view slot', async () => {
    resultTabsMock.mockImplementation(createFilledResultTabs);

    const wrapper = mountEntry(MysqlRawQuery);

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      true
    );
  });
});
