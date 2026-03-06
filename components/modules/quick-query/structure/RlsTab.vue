<script setup lang="ts">
import { DynamicTable } from '#components';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import type { RLSPolicy } from '~/core/types';
import {
  getStructureTableHeightPx,
  STRUCTURE_TABLE_MAX_HEIGHT_PX,
} from './tableSizing';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionString: string;
}>();

const RLS_COLUMN_KEYS = [
  'policy_name',
  'permissive',
  'command',
  'roles',
  'using_expression',
  'with_check_expression',
] as const;

const schemaStore = useSchemaStore();
const cacheKey = computed(() => `${props.schema}.${props.tableName}`);

const error = ref<string | null>(null);

const { data, status } = useFetch<{
  enabled: boolean;
  policies: RLSPolicy[];
}>('/api/tables/rls', {
  method: 'POST',
  body: {
    dbConnectionString: props.connectionString,
    schema: props.schema,
    table: props.tableName,
  },
  key: `rls-${cacheKey.value}`,
  getCachedData: () => {
    const cached = schemaStore.rlsMap[cacheKey.value];
    if (cached?.length) {
      return { enabled: true, policies: cached };
    }
    return undefined;
  },
  onResponse({ response }) {
    if (response._data?.policies) {
      schemaStore.rlsMap[cacheKey.value] = response._data.policies;
    }
  },
  onResponseError({ response }) {
    error.value = response._data?.message || 'Failed to load RLS policies';
  },
});

const normalizeRoles = (roles: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles.map(role => String(role));
  }

  if (typeof roles !== 'string') {
    return [];
  }

  const value = roles.trim();
  if (!value) return [];

  const normalized =
    value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;
  if (!normalized) return [];

  return normalized
    .split(',')
    .map(role => role.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
};

const policyRows = computed<Record<string, unknown>[]>(() =>
  (data.value?.policies || []).map(policy => ({
    policy_name: policy.policyName,
    permissive: policy.permissive,
    command: policy.command,
    roles: normalizeRoles(policy.roles).join(', ') || '—',
    using_expression: policy.usingExpression || '—',
    with_check_expression: policy.withCheckExpression || '—',
  }))
);

const mappedColumns = computed(() => {
  if (policyRows.value.length > 0) {
    return buildMappedColumnsFromRows(policyRows.value);
  }

  return buildMappedColumnsFromKeys(RLS_COLUMN_KEYS);
});

const tableHeight = computed(
  () => `${getStructureTableHeightPx(policyRows.value.length)}px`
);

const onRetry = () => {
  error.value = null;
  refreshNuxtData(`rls-${cacheKey.value}`);
};
</script>

<template>
  <div class="relative">
    <LoadingOverlay :visible="status === 'pending'" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="onRetry">Retry</Button>
        </AlertDescription>
      </Alert>
    </div>

    <template v-else-if="data">
      <div
        v-if="policyRows.length"
        :style="{
          maxHeight: `${STRUCTURE_TABLE_MAX_HEIGHT_PX}px`,
          height: tableHeight,
        }"
      >
        <DynamicTable
          :columns="mappedColumns"
          :data="policyRows"
          class="h-full"
          columnKeyBy="field"
        />
      </div>

      <div
        v-else-if="status !== 'pending'"
        class="flex items-center justify-center py-3"
      >
        <BaseEmpty
          title="No Policies"
          desc="No RLS policies are defined for this table."
        />
      </div>
    </template>
  </div>
</template>
