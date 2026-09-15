import type { EditorView } from '@codemirror/view';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
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

export const sqlitePlugin = defineRawQueryPlugin({
  name: 'sqlite-plugin',
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
