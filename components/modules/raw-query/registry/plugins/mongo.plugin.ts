import { ref, type Ref } from 'vue';
import type { EditorView } from '@codemirror/view';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { useMongoApproval, type MongoPendingApproval } from '../../mongo/hooks';
import { formatMongoScript } from '../../mongo/utils/formatMongoScript';
import { resolveMongoScriptSource } from '../../mongo/utils/resolveMongoScriptSource';
import {
  defineRawQueryPlugin,
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryExecutionContext,
} from '../rawQueryPlugin.types';

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
            const { from, to } = ctx.editorView.state.selection.main;
            ctx.editorView.dispatch({
              changes: {
                from,
                to,
                insert: `${ctx.selectionText}.toArray()`,
              },
            });
          },
          action: () => {
            const { from, to } = ctx.editorView.state.selection.main;
            ctx.editorView.dispatch({
              changes: {
                from,
                to,
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
