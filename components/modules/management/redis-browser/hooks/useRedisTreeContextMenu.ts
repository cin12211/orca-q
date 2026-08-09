import { computed, ref } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { RedisTreeNodeData } from './useRedisTreeData';

const GROUP_PREFIX = 'redis-group:';

export interface UseRedisTreeContextMenuOptions {
  resolveNode: (nodeId: string) => RedisTreeNodeData | null;
  onDeleteKey: (key: string) => void;
  onDeleteGroup: (prefix: string) => void;
}

export function useRedisTreeContextMenu(
  options: UseRedisTreeContextMenuOptions
) {
  const contextNodeId = ref<string | null>(null);

  const onRightClickItem = (nodeId: string) => {
    contextNodeId.value = nodeId;
  };

  const onClearContextMenu = () => {
    contextNodeId.value = null;
  };

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const nodeId = contextNodeId.value;

    if (!nodeId) {
      return [];
    }

    const data = options.resolveNode(nodeId);

    if (!data) {
      return [];
    }

    if (data.kind === 'key' && data.redisKey) {
      const key = data.redisKey;

      return [
        {
          title: 'Delete',
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: () => options.onDeleteKey(key),
        },
      ];
    }

    if (data.kind === 'group') {
      const prefix = nodeId.startsWith(GROUP_PREFIX)
        ? nodeId.slice(GROUP_PREFIX.length)
        : nodeId;
      const countLabel =
        typeof data.keyCount === 'number' ? ` ${data.keyCount}` : '';

      return [
        {
          title: `Delete${countLabel} keys...`,
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: () => options.onDeleteGroup(prefix),
        },
      ];
    }

    return [];
  });

  return {
    contextMenuItems,
    onRightClickItem,
    onClearContextMenu,
  };
}
