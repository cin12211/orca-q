import { defineAsyncComponent, ref, type Ref } from 'vue';
import type { EditorView } from '@codemirror/view';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ViewMode } from '../../interfaces';
import { useMongoApproval, type MongoPendingApproval } from '../../mongo/hooks';
import { formatMongoScript } from '../../mongo/utils/formatMongoScript';
import { resolveMongoScriptSource } from '../../mongo/utils/resolveMongoScriptSource';
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

const MongoResultTabRenderer = defineAsyncComponent(
  () =>
    import('../../components/result-tab/adapters/MongoResultTabRenderer.vue')
);
const MongoConsoleTabRenderer = defineAsyncComponent(
  () =>
    import('../../components/result-tab/adapters/MongoConsoleTabRenderer.vue')
);
const lazyMongoHeaderBadge = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoHeaderBadge.vue')
);
const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
);
const lazyMongoGuide = defineAsyncComponent(
  () =>
    import('../../mongo/components/MongoRawQueryVariableUsageGuidePopover.vue')
);
const lazyMongoFormatAction = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoFormatAction.vue')
);
const lazyMongoExecuteAction = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoExecuteAction.vue')
);

const successOnly = {
  execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: RawQueryResultExecutionPolicy.ERROR_ONLY,
  disabledReason: 'This execution has no errors',
};

export const mongoResultProfile: RawQueryResultProfile =
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: MongoResultTabRenderer,
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.RAW, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.INFO, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.INFO],
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.CONSOLE, {
        component: MongoConsoleTabRenderer,
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });

export interface MongoDialectState {
  badgeText: Ref<string>;
  clickCount: Ref<number>;
  incrementCount: () => void;
  resetCount: () => void;
  pendingApproval?: Ref<MongoPendingApproval | null>;
  confirmPendingWrite?: () => Promise<unknown>;
  cancelPendingWrite?: () => void;
}

export const mongoPlugin = defineRawQueryPlugin<MongoDialectState>({
  name: 'mongo-plugin',
  databaseType: DatabaseClientType.MONGODB,
  isFormatSupported: true,
  isVariableSupported: false,
  header: {
    leftComponents: [lazyMongoHeaderBadge],
  },
  footer: {
    leftComponents: [lazyCursorInfo, lazyMongoGuide],
    rightComponents: [lazyMongoFormatAction, lazyMongoExecuteAction],
  },
  result: mongoResultProfile,
  createDialectState: (): MongoDialectState => {
    const badgeText = ref('MongoDB Beta');
    const clickCount = ref(0);
    const approval = useMongoApproval();

    const incrementCount = () => {
      clickCount.value++;
    };

    const resetCount = () => {
      clickCount.value = 0;
    };

    return {
      badgeText,
      clickCount,
      incrementCount,
      resetCount,
      pendingApproval: approval.pendingApproval,
      confirmPendingWrite: approval.confirmPendingWrite,
      cancelPendingWrite: approval.cancelPendingWrite,
    };
  },
  resolveStatement: (view: EditorView) => {
    if (!view) return null;
    return resolveMongoScriptSource(view);
  },
  formatCode: async (code: string) => {
    return formatMongoScript(code);
  },
  execute: async (ctx: RawQueryExecutionContext<MongoDialectState>) => {
    await ctx.context.onExecuteCurrent?.();
    return { success: true };
  },
  contextMenu: {
    getItems: (ctx: RawQueryContextMenuContext<MongoDialectState>) => {
      const items: (ContextMenuItem & {
        section?: RawQueryContextMenuSection;
        action?: () => void;
        label?: string;
      })[] = [
        {
          section: RawQueryContextMenuSection.EXECUTION,
          type: ContextMenuItemType.ACTION,
          title: 'Execute Script',
          label: 'Execute Script',
          shortcut: '⌘⏎',
          icon: 'hugeicons:play',
          select: () => ctx.context.onExecuteCurrent?.(),
          action: () => ctx.context.onExecuteCurrent?.(),
        },
        {
          section: RawQueryContextMenuSection.FORMAT,
          type: ContextMenuItemType.ACTION,
          title: 'Format Script',
          label: 'Format Script',
          icon: 'hugeicons:align-left',
          select: () => ctx.context.onFormatAll?.(),
          action: () => ctx.context.onFormatAll?.(),
        },
      ];

      if (ctx.hasSelection && ctx.selectionText) {
        items.push({
          section: RawQueryContextMenuSection.TOOLS,
          type: ContextMenuItemType.ACTION,
          title: 'Wrap with toArray()',
          label: 'Wrap with toArray()',
          icon: 'hugeicons:code',
          select: () => {
            const sel = ctx.editorView.state.selection.main;
            ctx.editorView.dispatch({
              changes: {
                from: sel.from,
                to: sel.to,
                insert: `${ctx.selectionText}.toArray()`,
              },
            });
          },
          action: () => {
            const sel = ctx.editorView.state.selection.main;
            ctx.editorView.dispatch({
              changes: {
                from: sel.from,
                to: sel.to,
                insert: `${ctx.selectionText}.toArray()`,
              },
            });
          },
        });
      }

      return items;
    },
  },
});

export const mongoRawQueryProfile = mongoPlugin;
