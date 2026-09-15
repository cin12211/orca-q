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
const lazyPostgresExplainAction = defineAsyncComponent(
  () => import('../../components/pg/RawQueryPostgresExplainAction.vue')
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

export const postgresResultProfile: RawQueryResultProfile =
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RESULT],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.EXPLAIN, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.EXPLAIN],
        availability: {
          ...successOnly,
          when: context =>
            context.activeTab?.metadata.statementQuery
              ?.trimStart()
              .toUpperCase()
              .startsWith('EXPLAIN')
              ? { enabled: true }
              : {
                  enabled: false,
                  reason: 'Available only for EXPLAIN queries',
                },
        },
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

export const postgresPlugin = defineRawQueryPlugin({
  name: 'postgres-plugin',
  databaseType: DatabaseClientType.POSTGRES,
  isFormatSupported: true,
  isVariableSupported: true,
  header: {},
  footer: {
    leftComponents: [lazyCursorInfo, lazySqlGuide],
    rightComponents: [
      lazySqlFormatAction,
      lazyPostgresExplainAction,
      lazyExecuteAction,
    ],
  },
  result: postgresResultProfile,
  resolveStatement: (view: EditorView) => {
    if (!view) return null;
    const { currentStatements } = getCurrentStatement(view);
    if (!currentStatements || currentStatements.length === 0) return null;

    const from = Math.min(...currentStatements.map(s => s.from));
    const to = Math.max(...currentStatements.map(s => s.to));
    const text = currentStatements.map(s => s.text).join('\n');

    return { text, from, to };
  },
  execute: async (ctx: RawQueryExecutionContext) => {
    await ctx.context.onExecuteCurrent?.();
    return { success: true };
  },
  contextMenu: {
    getItems: (ctx: RawQueryContextMenuContext) => {
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
    },
  },
});

export const postgresRawQueryProfile = postgresPlugin;
