<script setup lang="ts">
import { computed } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import type { NodeDataType } from 'vue-json-pretty/types/components/TreeNode';
import type { JSONDataType } from 'vue-json-pretty/types/utils';
import { cn } from '@/lib/utils';
import { useVueJsonPrettyTheme } from '~/core/composables/useVueJsonPrettyTheme';
import type { MongoDocument } from '../types';
import {
  formatMongoUtcDate,
  getMongoNodeType,
  isMongoDisplayLiteral,
  toMongoDisplayDocument,
  unwrapMongoDisplayLiteral,
} from '../utils';

interface Props {
  document?: MongoDocument | Record<string, unknown> | null;
  data?: JSONDataType;
  deep?: number;
  isExpanded?: boolean;
  showDoubleQuotes?: boolean;
  showLength?: boolean;
  showLine?: boolean;
  showIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  document: null,
  data: undefined,
  deep: undefined,
  isExpanded: false,
  showDoubleQuotes: true,
  showLength: true,
  showLine: false,
  showIcon: true,
});

const { themeMode, themeClass, themeStyle } = useVueJsonPrettyTheme();

const displayData = computed<JSONDataType>(() => {
  if (props.data !== undefined) {
    return props.data;
  }
  if (props.document) {
    return toMongoDisplayDocument(props.document) as JSONDataType;
  }
  return null;
});

const effectiveDeep = computed(() => {
  if (props.deep !== undefined) {
    return props.deep;
  }
  return props.isExpanded ? 99 : 1;
});

const getNodeRawContent = (node: NodeDataType): string | null => {
  if (typeof node.content !== 'string') return null;
  return isMongoDisplayLiteral(node.content)
    ? unwrapMongoDisplayLiteral(node.content)
    : node.content;
};

const getNodeUtcDate = (node: NodeDataType): string | null => {
  const raw = getNodeRawContent(node);
  return raw ? formatMongoUtcDate(raw) : null;
};

const isLiteralNode = (node: NodeDataType): boolean => {
  if (typeof node.content !== 'string') return false;
  if (isMongoDisplayLiteral(node.content)) return true;
  return /^(ObjectId|ISODate)\(['"].*['"]\)$/.test(node.content);
};
</script>

<template>
  <VueJsonPretty
    :data="displayData"
    :deep="effectiveDeep"
    :show-double-quotes="showDoubleQuotes"
    :show-length="showLength"
    :show-line="showLine"
    :show-icon="showIcon"
    :theme="themeMode"
    :class="cn(themeClass, 'mongo-json-tree')"
    :style="themeStyle"
  >
    <template #renderNodeValue="{ node, defaultValue }">
      <!-- 1. ISODate with UTC annotation -->
      <span
        v-if="getNodeUtcDate(node)"
        data-testid="mongo-isodate-value-container"
      >
        <span>{{ getNodeRawContent(node) }}</span>
        <span
          class="text-muted-foreground/60 select-none"
          data-testid="mongo-isodate-utc-view"
        >
          ({{ getNodeUtcDate(node) }})
        </span>
      </span>

      <!-- 2. Unquoted MongoDB BSON literal -->
      <template v-else-if="isLiteralNode(node)">
        {{ getNodeRawContent(node) }}
      </template>

      <!-- 3. Default JSON value -->
      <template v-else>
        {{ defaultValue }}
      </template>
    </template>

    <template #renderNodeActions="{ node }">
      <span
        v-if="getMongoNodeType(node)"
        class="mongo-type-info text-[11px] text-muted-foreground/80 select-none tracking-tight flex-shrink-0"
        data-testid="mongo-node-type-info"
      >
        {{ getMongoNodeType(node) }}
      </span>
    </template>
  </VueJsonPretty>
</template>

<style scoped>
.mongo-json-tree,
:deep(.mongo-json-tree) {
  min-width: 100%;
  width: max-content;
}

:deep(.vjs-tree-node),
:deep(.mongo-json-tree .vjs-tree-node),
:deep(.vjs-tree.mongo-json-tree .vjs-tree-node) {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  min-width: 100% !important;
  padding-right: 8px !important;
}

:deep(.vjs-tree-node .vjs-tree-node-actions),
:deep(.vjs-tree-node:hover .vjs-tree-node-actions),
:deep(.vjs-tree-node.is-highlight .vjs-tree-node-actions),
:deep(.mongo-json-tree .vjs-tree-node .vjs-tree-node-actions),
:deep(.mongo-json-tree .vjs-tree-node:hover .vjs-tree-node-actions),
:deep(.mongo-json-tree .vjs-tree-node.is-highlight .vjs-tree-node-actions) {
  display: inline-flex !important;
  position: relative !important;
  right: auto !important;
  top: auto !important;
  margin-left: auto !important;
  background-color: transparent !important;
  border: none !important;
  padding: 0 0 0 16px !important;
  align-self: center !important;
}

:deep(.vjs-tree-node-actions:not(:has(.mongo-type-info))),
:deep(.vjs-tree-node-actions:empty),
:deep(.mongo-json-tree .vjs-tree-node-actions:not(:has(.mongo-type-info))),
:deep(.mongo-json-tree .vjs-tree-node-actions:empty) {
  display: none !important;
}
</style>
