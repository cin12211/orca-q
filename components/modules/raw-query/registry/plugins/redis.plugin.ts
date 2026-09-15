import type { EditorView } from '@codemirror/view';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  defineRawQueryPlugin,
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryExecutionContext,
} from '../rawQueryPlugin.types';

export const redisPlugin = defineRawQueryPlugin({
  name: 'redis-plugin',
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
