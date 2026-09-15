import { defineAsyncComponent } from 'vue';
import type { EditorView } from '@codemirror/view';
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

const lazyRedisHeaderExtension = defineAsyncComponent(
  () => import('../../components/redis/RawQueryRedisHeaderExtension.vue')
);
const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
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

export const redisResultProfile: RawQueryResultProfile =
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
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });

export const redisPlugin = defineRawQueryPlugin({
  name: 'redis-plugin',
  databaseType: DatabaseClientType.REDIS,
  isFormatSupported: false,
  isVariableSupported: false,
  header: {
    rightComponents: [lazyRedisHeaderExtension],
  },
  footer: {
    leftComponents: [lazyCursorInfo],
    rightComponents: [lazyExecuteAction],
  },
  result: redisResultProfile,
  resolveStatement: (view: EditorView) => {
    if (!view) return null;
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    const text = line.text.trim();
    if (!text) return null;
    return { text, from: line.from, to: line.to };
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
          title: 'Execute Command at Cursor',
          label: 'Execute Command at Cursor',
          shortcut: '⌘⏎',
          icon: 'hugeicons:play',
          disabled: !ctx.statement,
          select: () => ctx.context.onExecuteCurrent?.(),
          action: () => ctx.context.onExecuteCurrent?.(),
        },
      ];

      return items;
    },
  },
});

export const redisRawQueryProfile = redisPlugin;
