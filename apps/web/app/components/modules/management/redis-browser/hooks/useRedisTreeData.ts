import type { Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';

export type RedisTreeNodeData = {
  kind: 'group' | 'key';
  redisKey?: string;
  keyType?: RedisKeyType;
  ttl?: number;
  memoryUsage?: number | null;
  memoryUsageHuman?: string | null;
  keyCount?: number;
};

export enum RedisKeyType {
  String = 'string',
  Hash = 'hash',
  List = 'list',
  Set = 'set',
  SortedSet = 'sortedSet',
  Vector = 'vector',
  Stream = 'stream',
  Bitmap = 'bitmap',
  Bitfield = 'bitfield',
  Geo = 'geo',
  Json = 'json',
  Probabilistic = 'probabilistic',
  TimeSeries = 'timeSeries',
}

type RedisRawKeyType = RedisKeyType | 'zset';

const dataTypeIconMap: Record<RedisKeyType, string> = {
  [RedisKeyType.String]: 'hugeicons:text-font',
  [RedisKeyType.Hash]: 'hugeicons:hashtag',
  [RedisKeyType.List]: 'hugeicons:menu-01',
  [RedisKeyType.Set]: 'hugeicons:layers-01',
  [RedisKeyType.SortedSet]: 'hugeicons:3rd-bracket',
  [RedisKeyType.Vector]: 'hugeicons:brain-circuit',
  [RedisKeyType.Stream]: 'hugeicons:activity-01',
  [RedisKeyType.Bitmap]: 'hugeicons:grid-3x3',
  [RedisKeyType.Bitfield]: 'hugeicons:binary',
  [RedisKeyType.Geo]: 'hugeicons:pin-location-03',
  [RedisKeyType.Json]: 'hugeicons:file-json',
  [RedisKeyType.Probabilistic]: 'lucide:flask-conical',
  [RedisKeyType.TimeSeries]: 'lucide:line-chart',
};

const redisKeyTypeAliasMap: Record<RedisRawKeyType, RedisKeyType> = {
  [RedisKeyType.String]: RedisKeyType.String,
  [RedisKeyType.Hash]: RedisKeyType.Hash,
  [RedisKeyType.List]: RedisKeyType.List,
  [RedisKeyType.Set]: RedisKeyType.Set,
  [RedisKeyType.SortedSet]: RedisKeyType.SortedSet,
  zset: RedisKeyType.SortedSet,
  [RedisKeyType.Vector]: RedisKeyType.Vector,
  [RedisKeyType.Stream]: RedisKeyType.Stream,
  [RedisKeyType.Bitmap]: RedisKeyType.Bitmap,
  [RedisKeyType.Bitfield]: RedisKeyType.Bitfield,
  [RedisKeyType.Geo]: RedisKeyType.Geo,
  [RedisKeyType.Json]: RedisKeyType.Json,
  [RedisKeyType.Probabilistic]: RedisKeyType.Probabilistic,
  [RedisKeyType.TimeSeries]: RedisKeyType.TimeSeries,
};

const dataTypeIconClassMap: Partial<Record<RedisKeyType, string>> = {
  [RedisKeyType.Hash]: 'text-emerald-500',
  [RedisKeyType.List]: 'text-sky-500',
  [RedisKeyType.Set]: 'text-violet-500',
  [RedisKeyType.SortedSet]: 'text-amber-500',
  [RedisKeyType.Vector]: 'text-fuchsia-500',
  [RedisKeyType.Stream]: 'text-orange-500',
  [RedisKeyType.Bitmap]: 'text-cyan-500',
  [RedisKeyType.Bitfield]: 'text-indigo-500',
  [RedisKeyType.Geo]: 'text-rose-500',
  [RedisKeyType.Json]: 'text-lime-500',
  [RedisKeyType.Probabilistic]: 'text-red-500',
  [RedisKeyType.TimeSeries]: 'text-teal-500',
};

const GROUP_OPEN_ICON = 'material-icon-theme:folder-database-open';
const GROUP_CLOSED_ICON = 'material-icon-theme:folder-database';

export function normalizeRedisKeyType(type: string): RedisKeyType | undefined {
  return redisKeyTypeAliasMap[type as RedisRawKeyType];
}

export function getRedisKeyIcon(type: string) {
  const normalizedType = normalizeRedisKeyType(type);

  return normalizedType
    ? dataTypeIconMap[normalizedType]
    : 'hugeicons:database-02';
}

export function getRedisKeyIconClass(type: string) {
  const normalizedType = normalizeRedisKeyType(type);

  return normalizedType
    ? (dataTypeIconClassMap[normalizedType] ?? 'text-primary')
    : 'text-primary';
}

function getGroupNodeId(path: string) {
  return `redis-group:${path}`;
}

function getKeyNodeId(key: string) {
  return `redis-key:${key}`;
}

function getKeyDisplayName(key: string) {
  const segments = key.split(':').filter(Boolean);

  if (segments.length <= 1) {
    return key;
  }

  return segments[segments.length - 1] || key;
}

function sortChildren(
  nodes: Record<string, FileNode<RedisTreeNodeData>>,
  children: string[]
) {
  return [...children].sort((leftId, rightId) => {
    const left = nodes[leftId];
    const right = nodes[rightId];

    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export function useRedisTreeData(
  keys: Ref<RedisKeyListItem[]>,
  searchQuery: Ref<string>
) {
  const normalizedSearch = computed(() =>
    searchQuery.value.trim().toLowerCase()
  );

  const visibleKeys = computed(() => {
    if (!normalizedSearch.value) {
      return keys.value;
    }

    return keys.value.filter(item =>
      item.key.toLowerCase().includes(normalizedSearch.value)
    );
  });

  const treeState = computed(() => {
    const nodes: Record<string, FileNode<RedisTreeNodeData>> = {};
    const expandedFolderIds: string[] = [];
    const groupStats = new Map<
      string,
      { keyCount: number; memoryUsage: number | null }
    >();

    for (const item of visibleKeys.value) {
      const segments = item.key.split(':').filter(Boolean);

      if (segments.length <= 1) {
        const keyNodeId = getKeyNodeId(item.key);
        const normalizedKeyType = normalizeRedisKeyType(item.type);

        nodes[keyNodeId] = {
          id: keyNodeId,
          parentId: null,
          name: getKeyDisplayName(item.key),
          type: 'file',
          depth: 0,
          iconOpen: getRedisKeyIcon(item.type),
          iconClose: getRedisKeyIcon(item.type),
          iconClass: getRedisKeyIconClass(item.type),
          data: {
            kind: 'key',
            redisKey: item.key,
            keyType: normalizedKeyType,
            ttl: item.ttl,
            memoryUsage: item.memoryUsage,
            memoryUsageHuman: item.memoryUsageHuman,
          },
        };
        continue;
      }

      let parentId: string | null = null;
      let currentPath = '';

      for (const [index, segment] of segments.slice(0, -1).entries()) {
        currentPath = currentPath ? `${currentPath}:${segment}` : segment;
        const groupNodeId = getGroupNodeId(currentPath);

        if (!nodes[groupNodeId]) {
          nodes[groupNodeId] = {
            id: groupNodeId,
            parentId,
            name: segment,
            type: 'folder',
            depth: index,
            iconOpen: GROUP_OPEN_ICON,
            iconClose: GROUP_CLOSED_ICON,
            children: [],
            data: {
              kind: 'group',
            },
          };

          expandedFolderIds.push(groupNodeId);

          if (parentId) {
            nodes[parentId].children = [
              ...(nodes[parentId].children ?? []),
              groupNodeId,
            ];
          }
        }

        const previousStats = groupStats.get(groupNodeId) ?? {
          keyCount: 0,
          memoryUsage: 0,
        };

        groupStats.set(groupNodeId, {
          keyCount: previousStats.keyCount + 1,
          memoryUsage:
            previousStats.memoryUsage === null
              ? item.memoryUsage
              : previousStats.memoryUsage + (item.memoryUsage ?? 0),
        });

        parentId = groupNodeId;
      }

      const keyNodeId = getKeyNodeId(item.key);
      const normalizedKeyType = normalizeRedisKeyType(item.type);

      nodes[keyNodeId] = {
        id: keyNodeId,
        parentId,
        name: getKeyDisplayName(item.key),
        type: 'file',
        depth: segments.length - 1,
        iconOpen: getRedisKeyIcon(item.type),
        iconClose: getRedisKeyIcon(item.type),
        iconClass: getRedisKeyIconClass(item.type),
        data: {
          kind: 'key',
          redisKey: item.key,
          keyType: normalizedKeyType,
          ttl: item.ttl,
          memoryUsage: item.memoryUsage,
          memoryUsageHuman: item.memoryUsageHuman,
        },
      };

      if (parentId) {
        nodes[parentId].children = [
          ...(nodes[parentId].children ?? []),
          keyNodeId,
        ];
      }
    }

    Object.values(nodes).forEach(node => {
      if (node.type === 'folder') {
        const stats = groupStats.get(node.id);

        if (stats) {
          node.data = {
            ...(node.data ?? { kind: 'group' as const }),
            keyCount: stats.keyCount,
            memoryUsage: stats.memoryUsage,
          };
        }
      }

      if (node.children?.length) {
        node.children = sortChildren(nodes, node.children);
      }
    });

    return {
      fileTreeData: nodes,
      defaultFolderOpenIds: expandedFolderIds,
    };
  });

  const flatFileTreeData = computed(() => {
    const nodes: Record<string, FileNode<RedisTreeNodeData>> = {};

    for (const item of visibleKeys.value) {
      const keyNodeId = getKeyNodeId(item.key);
      const normalizedKeyType = normalizeRedisKeyType(item.type);

      nodes[keyNodeId] = {
        id: keyNodeId,
        parentId: null,
        name: item.key,
        type: 'file',
        depth: -1,
        iconOpen: getRedisKeyIcon(item.type),
        iconClose: getRedisKeyIcon(item.type),
        iconClass: getRedisKeyIconClass(item.type),
        data: {
          kind: 'key',
          redisKey: item.key,
          keyType: normalizedKeyType,
          ttl: item.ttl,
          memoryUsage: item.memoryUsage,
          memoryUsageHuman: item.memoryUsageHuman,
        },
      };
    }

    return nodes;
  });

  return {
    visibleKeys,
    fileTreeData: computed(() => treeState.value.fileTreeData),
    flatFileTreeData,
    defaultFolderOpenIds: computed(() => treeState.value.defaultFolderOpenIds),
  };
}
