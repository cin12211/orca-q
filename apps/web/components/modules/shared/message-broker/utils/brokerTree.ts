import type { FileNode } from '~/components/base/tree-folder/types';

export interface BrokerTreeItem<T extends object> {
  id: string;
  name: string;
  data: T;
  /** Overrides the group's item icon for this item. */
  icon?: string;
  iconClass?: string;
}

export interface BrokerTreeGroupData {
  groupCount: number;
}

export interface BrokerTreeGroup<T extends object> {
  id: string;
  label: string;
  icon: string;
  iconClass?: string;
  itemIcon: string;
  itemIconClass?: string;
  /** Shown on the right of the group row, like item counts. */
  count?: number;
  /** Leave the group out entirely when it has no items (e.g. no admins). */
  isHiddenWhenEmpty?: boolean;
  items: BrokerTreeItem<T>[];
}

/**
 * Build `FileTree` nodes: one folder per group (Queues, Topics, ...) with
 * the broker objects as files, filtered by the sidebar search.
 */
export function buildBrokerTree<T extends object>(
  groups: BrokerTreeGroup<T>[],
  search = ''
): Record<string, FileNode<T | BrokerTreeGroupData>> {
  const query = search.trim().toLowerCase();
  const nodes: Record<string, FileNode<T | BrokerTreeGroupData>> = {};

  for (const group of groups) {
    if (group.isHiddenWhenEmpty && !group.items.length) continue;

    const items = group.items.filter(
      item => !query || item.name.toLowerCase().includes(query)
    );

    nodes[group.id] = {
      id: group.id,
      parentId: null,
      name: group.label,
      type: 'folder',
      depth: 0,
      iconOpen: group.icon,
      iconClose: group.icon,
      iconClass: group.iconClass,
      children: items.map(item => item.id),
      data: { groupCount: group.count ?? group.items.length },
    };

    for (const item of items) {
      nodes[item.id] = {
        id: item.id,
        parentId: group.id,
        name: item.name,
        type: 'file',
        depth: 1,
        iconOpen: item.icon ?? group.itemIcon,
        iconClose: item.icon ?? group.itemIcon,
        iconClass: item.iconClass ?? group.itemIconClass,
        data: item.data,
      };
    }
  }

  return nodes;
}
