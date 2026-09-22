import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { useRawQueryEditorContextMenu } from '~/components/modules/raw-query/hooks/useRawQueryEditorContextMenu';

const ANALYZE_TITLE = 'Analyze Query';

const buildActions = () => ({
  onExecuteCurrent: vi.fn(),
  onHandleFormatCurrentStatement: vi.fn(),
  onHandleFormatCode: vi.fn(),
  isSupportFormat: ref(true),
  getEditorView: () => null,
});

const analyzeItem: ContextMenuItem = {
  type: ContextMenuItemType.ACTION,
  title: ANALYZE_TITLE,
  icon: 'hugeicons:analytics-01',
  shortcut: '⌘E',
  select: vi.fn(),
};

const titleOf = (item: ContextMenuItem) =>
  'title' in item ? item.title : item.type;

describe('useRawQueryEditorContextMenu', () => {
  it('includes engine-contributed items right after Execute', () => {
    const { contextMenuItems } = useRawQueryEditorContextMenu({
      ...buildActions(),
      extraItems: ref([analyzeItem]),
    });
    const { contextMenuItems: baseline } =
      useRawQueryEditorContextMenu(buildActions());

    const items = contextMenuItems.value;
    const index = items.findIndex(item => titleOf(item) === ANALYZE_TITLE);
    expect(index).toBe(1);
    expect(titleOf(items[0]!)).toBe('Execute');
    expect(items[index]).toMatchObject({
      icon: 'hugeicons:analytics-01',
      shortcut: '⌘E',
    });
    // Removing the contributed item yields exactly the baseline list.
    expect(items.filter((_, i) => i !== index).map(titleOf)).toEqual(
      baseline.value.map(titleOf)
    );
  });

  it('disables contributed actions when no statement is under the cursor', () => {
    const { contextMenuItems } = useRawQueryEditorContextMenu({
      ...buildActions(),
      extraItems: ref([analyzeItem]),
    });

    expect(contextMenuItems.value[1]).toMatchObject({ disabled: true });
  });

  it('omits them, with no stray separator, when none are contributed', () => {
    const { contextMenuItems } = useRawQueryEditorContextMenu(buildActions());

    const items = contextMenuItems.value;
    expect(items.map(titleOf)).toEqual([
      'Execute',
      ContextMenuItemType.SEPARATOR,
      'Format Current',
      'Format All',
      ContextMenuItemType.SEPARATOR,
      'Copy Statement',
      'Copy All',
      ContextMenuItemType.SEPARATOR,
      'Delete Statement',
    ]);
  });
});
