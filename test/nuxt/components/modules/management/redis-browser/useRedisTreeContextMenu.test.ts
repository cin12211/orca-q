import { describe, expect, it, vi } from 'vitest';
import { ContextMenuItemType } from '~/components/base/context-menu/menuContext.type';
import { useRedisTreeContextMenu } from '~/components/modules/management/redis-browser/hooks/useRedisTreeContextMenu';
import { RedisKeyType } from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';

describe('useRedisTreeContextMenu', () => {
  it('builds a Delete action for a key node and calls onDeleteKey with its redis key', () => {
    const onDeleteKey = vi.fn();
    const onDeleteGroup = vi.fn();
    const { contextMenuItems, onRightClickItem } = useRedisTreeContextMenu({
      resolveNode: () => ({
        kind: 'key',
        redisKey: 'orders:1',
        keyType: RedisKeyType.String,
      }),
      onDeleteKey,
      onDeleteGroup,
    });

    onRightClickItem('redis-key:orders:1');

    const deleteAction = contextMenuItems.value.find(
      item => item.type === ContextMenuItemType.ACTION
    );
    deleteAction?.select?.();

    expect(deleteAction?.title).toBe('Delete');
    expect(onDeleteKey).toHaveBeenCalledWith('orders:1');
    expect(onDeleteGroup).not.toHaveBeenCalled();
  });

  it('builds a "Delete N keys..." action for a group node using the node id as the prefix', () => {
    const onDeleteKey = vi.fn();
    const onDeleteGroup = vi.fn();
    const { contextMenuItems, onRightClickItem } = useRedisTreeContextMenu({
      resolveNode: () => ({ kind: 'group', keyCount: 5 }),
      onDeleteKey,
      onDeleteGroup,
    });

    onRightClickItem('redis-group:orders');

    const deleteAction = contextMenuItems.value.find(
      item => item.type === ContextMenuItemType.ACTION
    );
    deleteAction?.select?.();

    expect(deleteAction?.title).toBe('Delete 5 keys...');
    expect(onDeleteGroup).toHaveBeenCalledWith('orders');
    expect(onDeleteKey).not.toHaveBeenCalled();
  });

  it('returns no items when nothing has been right-clicked yet', () => {
    const { contextMenuItems } = useRedisTreeContextMenu({
      resolveNode: () => null,
      onDeleteKey: vi.fn(),
      onDeleteGroup: vi.fn(),
    });

    expect(contextMenuItems.value).toEqual([]);
  });

  it('clears the menu on onClearContextMenu', () => {
    const { contextMenuItems, onRightClickItem, onClearContextMenu } =
      useRedisTreeContextMenu({
        resolveNode: () => ({ kind: 'key', redisKey: 'orders:1' }),
        onDeleteKey: vi.fn(),
        onDeleteGroup: vi.fn(),
      });

    onRightClickItem('redis-key:orders:1');
    expect(contextMenuItems.value.length).toBeGreaterThan(0);

    onClearContextMenu();
    expect(contextMenuItems.value).toEqual([]);
  });
});
