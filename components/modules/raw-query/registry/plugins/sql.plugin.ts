import { defineAsyncComponent } from 'vue';
import type { EditorView } from '@codemirror/view';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ViewMode } from '../../interfaces';
import {
  defineRawQueryPlugin,
  RawQueryContextMenuSection,
  RawQueryResultExecutionPolicy,
  type RawQueryContextMenuContext,
  type RawQueryExecutionContext,
  type RawQueryPlugin,
  type RawQueryResultProfile,
} from '../rawQueryPlugin.types';
import {
  DEFAULT_RAW_QUERY_RESULT_RENDERERS,
  defineRawQueryResultProfile,
  defineRawQueryResultView,
} from '../rawQueryResultDefaults';

const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
);
const lazySqlGuide = defineAsyncComponent(
  () => import('../../components/common/RawQueryVariableUsageGuidePopover.vue')
);
const lazySqlFormatAction = defineAsyncComponent(
  () => import('../../components/common/RawQuerySqlFormatAction.vue')
);
const lazyExecuteAction = defineAsyncComponent(
  () => import('../../components/common/RawQueryExecuteAction.vue')
);

const successOnly = {
  execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: RawQueryResultExecutionPolicy.ERROR_ONLY,
  disabledReason: 'This execution has no errors',
};

/**
 * Standard SQL Raw Query Result Profile
 * Used for MySQL, MySQL2, MariaDB, SQLite3, Better SQLite3, MSSQL, Oracle, Snowflake
 * Tabs: Result, Raw, Info, Chart, Error
 */
export const createStandardSqlResultProfile = (): RawQueryResultProfile =>
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RESULT],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.RAW, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.INFO, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.INFO],
      }),
      defineRawQueryResultView(ViewMode.CHART, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.CHART],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });

export const sqlStatementResolver = (view: EditorView) => {
  if (!view) return null;
  const { currentStatements } = getCurrentStatement(view);
  if (!currentStatements || currentStatements.length === 0) return null;

  const from = Math.min(...currentStatements.map(s => s.from));
  const to = Math.max(...currentStatements.map(s => s.to));
  const text = currentStatements.map(s => s.text).join('\n');

  return { text, from, to };
};

export const getStandardSqlContextMenuItems = (
  ctx: RawQueryContextMenuContext
) => {
  const items: (ContextMenuItem & {
    section?: RawQueryContextMenuSection;
    action?: () => void;
    label?: string;
  })[] = [
    {
      section: RawQueryContextMenuSection.EXECUTION,
      type: ContextMenuItemType.ACTION,
      title: 'Run Current Query',
      label: 'Run Current Query',
      shortcut: '⌘⏎',
      icon: 'hugeicons:play',
      disabled: !ctx.statement,
      select: () => ctx.context.onExecuteCurrent?.(),
      action: () => ctx.context.onExecuteCurrent?.(),
    },
  ];

  if (ctx.context.isExplainSupported) {
    items.push({
      section: RawQueryContextMenuSection.ANALYSIS,
      type: ContextMenuItemType.ACTION,
      title: 'Explain Query',
      label: 'Explain Query',
      icon: 'hugeicons:dashboard-speed-01',
      disabled: !ctx.statement,
      select: () => ctx.context.onExplainAnalyzeCurrent?.(),
      action: () => ctx.context.onExplainAnalyzeCurrent?.(),
    });
  }

  if (ctx.context.isFormatSupported) {
    items.push(
      {
        section: RawQueryContextMenuSection.FORMAT,
        type: ContextMenuItemType.ACTION,
        title: 'Format Statement',
        label: 'Format Statement',
        icon: 'hugeicons:text-align-left',
        disabled: !ctx.statement,
        select: () => ctx.context.onFormatCurrentStatement?.(),
        action: () => ctx.context.onFormatCurrentStatement?.(),
      },
      {
        section: RawQueryContextMenuSection.FORMAT,
        type: ContextMenuItemType.ACTION,
        title: 'Format All',
        label: 'Format All',
        icon: 'hugeicons:align-left',
        select: () => ctx.context.onFormatAll?.(),
        action: () => ctx.context.onFormatAll?.(),
      }
    );
  }

  return items;
};

/**
 * Standard SQL Plugin factory for MySQL, MariaDB, MSSQL, Oracle, Snowflake
 */
export const createStandardSqlPlugin = (
  databaseType: DatabaseClientType = DatabaseClientType.MYSQL
): RawQueryPlugin => {
  return defineRawQueryPlugin({
    name: 'sql-plugin',
    databaseType,
    isFormatSupported: true,
    isVariableSupported: true,
    header: {},
    footer: {
      leftComponents: [lazyCursorInfo, lazySqlGuide],
      rightComponents: [lazySqlFormatAction, lazyExecuteAction],
    },
    result: createStandardSqlResultProfile(),
    resolveStatement: sqlStatementResolver,
    execute: async (ctx: RawQueryExecutionContext) => {
      await ctx.context.onExecuteCurrent?.();
      return { success: true };
    },
    contextMenu: {
      getItems: getStandardSqlContextMenuItems,
    },
  });
};

export const createStandardSqlRawQueryProfile = createStandardSqlPlugin;
