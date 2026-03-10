<script setup lang="ts">
import { DynamicTable } from '#components';
import { Badge } from '~/components/ui/badge';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import type { ViewMeta } from '~/core/types';
import IndexesTab from './IndexesTab.vue';
import RlsTab from './RlsTab.vue';
import RulesTab from './RulesTab.vue';
import TableMetaInfo from './TableMetaInfo.vue';
import TriggersTab from './TriggersTab.vue';
import ViewDependencies from './ViewDependencies.vue';
import ViewIndexesTab from './ViewIndexesTab.vue';
import ViewMetaInfo from './ViewMetaInfo.vue';
import VirtualTableDefinition from './VirtualTableDefinition.vue';
import {
  getStructureTableHeightPx,
  STRUCTURE_TABLE_MAX_HEIGHT_PX,
} from './tableSizing';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionId?: string;
  isVirtualTable?: boolean;
  virtualTableId?: string;
}>();

const STRUCTURE_TABLE_COLUMN_KEYS = [
  'column_name',
  'data_type',
  'is_nullable',
  'default_value',
  'foreign_keys',
  'on_update',
  'on_delete',
  'column_comment',
] as const;

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch('/api/tables/structure', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    tableName: props.tableName,
  })),
  key: `${props.schema}.${props.tableName}`,
});

const mappedColumns = computed(() => {
  const rows = (data.value || []) as Record<string, unknown>[];
  if (rows.length > 0) {
    return buildMappedColumnsFromRows(rows);
  }

  return buildMappedColumnsFromKeys(STRUCTURE_TABLE_COLUMN_KEYS);
});

const schemaStore = useSchemaStore();
const structureCacheKey = computed(() => `${props.schema}.${props.tableName}`);

const { data: rlsState } = useFetch<{ enabled: boolean }>('/api/tables/rls', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    table: props.tableName,
  })),
  key: `rls-${structureCacheKey.value}`,
  immediate: !props.isVirtualTable,
});

const { data: viewMeta } = useFetch<ViewMeta>('/api/views/meta', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    viewName: props.tableName,
  })),
  key: `view-meta-struct-${structureCacheKey.value}`,
  immediate: !!props.isVirtualTable,
  getCachedData: () => {
    if (!props.isVirtualTable) return undefined;
    return schemaStore.viewMetaMap[structureCacheKey.value] as
      | ViewMeta
      | undefined;
  },
  onResponse({ response }) {
    if (response._data && props.isVirtualTable) {
      schemaStore.viewMetaMap[structureCacheKey.value] = response._data;
    }
  },
});

const isMaterializedView = computed(
  () => (viewMeta.value as ViewMeta | undefined)?.type === 'materialized'
);

const columnsTableHeight = computed(() => {
  const rowCount = ((data.value || []) as Record<string, unknown>[]).length;
  return `${getStructureTableHeightPx(rowCount)}px`;
});
</script>

<template>
  <div class="h-full overflow-y-auto p-1.5">
    <div class="space-y-3 pb-2">
      <template v-if="!isVirtualTable">
        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Meta Info</h3>
            <p class="text-xs text-muted-foreground">
              Table type and storage metadata
            </p>
          </div>
          <TableMetaInfo
            :schema="schema"
            :tableName="tableName"
            :connectionId="connectionId"
          />
        </section>
      </template>

      <template v-else>
        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Meta Info</h3>
            <p class="text-xs text-muted-foreground">
              View type and storage metadata
            </p>
          </div>
          <ViewMetaInfo
            :connectionId="connectionId"
            :schema="schema"
            :viewName="tableName"
          />
        </section>
      </template>

      <section class="space-y-1">
        <div>
          <h3 class="text-sm font-medium">Columns</h3>
          <p class="text-xs text-muted-foreground">
            Table column structure and constraints
          </p>
        </div>
        <div
          class="relative"
          :style="{
            maxHeight: `${STRUCTURE_TABLE_MAX_HEIGHT_PX}px`,
            height: columnsTableHeight,
          }"
        >
          <LoadingOverlay :visible="status === 'pending'" />
          <DynamicTable
            :columns="mappedColumns"
            :data="data || []"
            class="h-full border rounded-md"
            columnKeyBy="field"
          />
        </div>
      </section>

      <template v-if="!isVirtualTable">
        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Indexes</h3>
            <p class="text-xs text-muted-foreground">
              Available indexes and definitions
            </p>
          </div>
          <div class="rounded-md border">
            <IndexesTab
              :schema="schema"
              :tableName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>

        <section class="space-y-1">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium">RLS</h3>
              <Badge
                v-if="rlsState"
                :variant="rlsState.enabled ? 'default' : 'secondary'"
                class="h-5 px-1.5 text-[10px]"
              >
                {{ rlsState.enabled ? 'Enabled' : 'Disabled' }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground">
              Row-level security status and policies
            </p>
          </div>
          <div class="rounded-md border">
            <RlsTab
              :schema="schema"
              :tableName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>

        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Rules</h3>
            <p class="text-xs text-muted-foreground">
              Rewrite rules configured on this table
            </p>
          </div>
          <div class="rounded-md border">
            <RulesTab
              :schema="schema"
              :tableName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>

        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Triggers</h3>
            <p class="text-xs text-muted-foreground">
              Trigger status and trigger definitions
            </p>
          </div>
          <div class="rounded-md border">
            <TriggersTab
              :schema="schema"
              :tableName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>
      </template>

      <template v-else>
        <section v-if="virtualTableId" class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Definition</h3>
            <p class="text-xs text-muted-foreground">View SQL definition</p>
          </div>
          <VirtualTableDefinition
            :connectionId="connectionId"
            :schema="schema"
            :viewName="tableName"
            :viewId="virtualTableId"
          />
        </section>

        <section v-if="isMaterializedView" class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Indexes</h3>
            <p class="text-xs text-muted-foreground">
              Indexes on materialized view
            </p>
          </div>
          <div class="rounded-md border">
            <ViewIndexesTab
              :schema="schema"
              :viewName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>

        <section class="space-y-1">
          <div>
            <h3 class="text-sm font-medium">Dependencies</h3>
            <p class="text-xs text-muted-foreground">
              Objects referenced by this view
            </p>
          </div>
          <div class="rounded-md border">
            <ViewDependencies
              :schema="schema"
              :viewName="tableName"
              :connectionId="connectionId"
            />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
