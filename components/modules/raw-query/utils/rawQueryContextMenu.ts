import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryDialectPlugin,
} from '../registry/rawQueryPlugin.types';

export interface DefaultEditActions {
  copyStatement: () => void;
  copyAll: () => void;
  deleteStatement: () => void;
}

export const SECTION_ORDER: RawQueryContextMenuSection[] = [
  RawQueryContextMenuSection.EXECUTION,
  RawQueryContextMenuSection.ANALYSIS,
  RawQueryContextMenuSection.FORMAT,
  RawQueryContextMenuSection.TOOLS,
  RawQueryContextMenuSection.EDIT,
];

export function buildContextMenuItems<TDialectState = unknown>(
  ctx: RawQueryContextMenuContext<TDialectState>,
  plugin?: RawQueryDialectPlugin<TDialectState>,
  editActions?: DefaultEditActions
): ContextMenuItem[] {
  // 1. If plugin?.contextMenu?.buildMenu is defined, return plugin.contextMenu.buildMenu(ctx) directly.
  if (plugin?.contextMenu?.buildMenu) {
    return plugin.contextMenu.buildMenu(ctx);
  }

  // 2. Otherwise get dialectItems from plugin?.contextMenu?.getItems?.(ctx) ?? [].
  const dialectItems = plugin?.contextMenu?.getItems?.(ctx) ?? [];

  // 3. If editActions provided, build standard edit items in EDIT section
  const defaultEditItems: ContextMenuItem[] = editActions
    ? [
        {
          type: ContextMenuItemType.ACTION,
          title: 'Copy Statement',
          label: 'Copy Statement',
          disabled: !ctx.statement,
          icon: 'hugeicons:copy-01',
          select: editActions.copyStatement,
          action: editActions.copyStatement,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
        {
          type: ContextMenuItemType.ACTION,
          title: 'Copy All',
          label: 'Copy All',
          icon: 'hugeicons:copy-02',
          select: editActions.copyAll,
          action: editActions.copyAll,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
        {
          type: ContextMenuItemType.ACTION,
          title: 'Delete Statement',
          label: 'Delete Statement',
          disabled: !ctx.statement,
          icon: 'hugeicons:delete-02',
          select: editActions.deleteStatement,
          action: editActions.deleteStatement,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
      ]
    : [];

  const allItems = [...dialectItems, ...defaultEditItems];

  // 4. Group all items into a map by section (defaulting to TOOLS if not specified).
  const sectionMap = new Map<string, ContextMenuItem[]>();
  for (const item of allItems) {
    const sec = (item as any).section || RawQueryContextMenuSection.TOOLS;
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, []);
    }
    sectionMap.get(sec)!.push(item);
  }

  // 5. Assemble items in order of SECTION_ORDER.
  // If result has previous items and new section has items, push a separator.
  const result: ContextMenuItem[] = [];
  for (const section of SECTION_ORDER) {
    const items = sectionMap.get(section);
    if (!items || items.length === 0) continue;

    if (result.length > 0) {
      result.push({ type: ContextMenuItemType.SEPARATOR });
    }
    result.push(...items);
  }

  // 6. Return the assembled items array.
  return result;
}
