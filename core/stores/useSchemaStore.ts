import { defineStore, storeToRefs } from 'pinia';
import { ref, computed } from 'vue';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import type {
  ReservedTableSchemas,
  TableIndex,
  RLSPolicy,
  TableRule,
  TableTrigger,
  ViewMeta,
} from '~/core/types';
import type {
  FunctionSchema,
  TableDetailMetadata,
  TableDetails,
  ViewSchema,
  ViewDetails,
} from '~/core/types';
import type { Connection } from './managementConnectionStore';
import { useWSStateStore } from './useWSStateStore';

export interface Schema {
  id: string;
  connectionId: string;
  workspaceId: string;
  name: string;
  tableDetails?: TableDetails | null;
  tables: string[];
  views: ViewSchema[];
  viewDetails?: ViewDetails | null;
  functions: FunctionSchema[];
}

export const PUBLIC_SCHEMA_ID = 'public';

export const useSchemaStore = defineStore(
  'schema-store',
  () => {
    const wsStateStore = useWSStateStore();
    const { connectionId } = useWorkspaceConnectionRoute();
    const { wsState, schemaId } = storeToRefs(wsStateStore);

    const schemas = ref<Record<string, Schema[]>>({});

    // Store reserved schemas per connection: Record<string (connectionId), ReservedTableSchemas[]>
    const reservedSchemas = ref<Record<string, ReservedTableSchemas[]>>({});

    // Store loading state per connection: Record<string (connectionId), boolean>
    const loading = ref<Record<string, boolean>>({});

    // Advanced objects cache: Record<"schema.table", T[]>
    const indexesMap = ref<Record<string, TableIndex[]>>({});
    const rlsMap = ref<Record<string, RLSPolicy[]>>({});
    const rulesMap = ref<Record<string, TableRule[]>>({});
    const triggersMap = ref<Record<string, TableTrigger[]>>({});

    // View meta cache: Record<"schema.viewName", ViewMeta>
    const viewMetaMap = ref<Record<string, ViewMeta>>({});

    const activeSchema = computed(() => {
      const currentSchemas = schemas.value[connectionId.value] || [];
      return currentSchemas.find(
        schema =>
          schema.connectionId === connectionId.value &&
          schema.workspaceId === wsState.value?.id &&
          schema.name === schemaId.value
      );
    });

    const activeSchemas = computed(() => {
      return schemas.value[connectionId.value] || [];
    });

    const schemasByContext = computed(() => {
      const currentSchemas = schemas.value[connectionId.value] || [];
      return currentSchemas.filter(
        schema =>
          schema.connectionId === connectionId.value &&
          schema.workspaceId === wsState.value?.id
      );
    });

    const activeReservedSchemas = computed(() => {
      return reservedSchemas.value[connectionId.value] || [];
    });

    const isLoading = computed(() => {
      return loading.value[connectionId.value] || false;
    });

    /**
     * Fetch reserved table schemas (reverse engineering info)
     */
    const fetchReservedSchemas = async ({
      connectionId: connId,
      connection,
    }: {
      connectionId: string;
      connection?: Connection;
    }) => {
      if (!connId || (!connection?.connectionString && !connection?.host))
        return;

      if (reservedSchemas.value[connId]?.length) return;

      try {
        const result = await $fetch('/api/metadata/reverse-schemas', {
          method: 'POST',
          body: {
            ...getConnectionParams(connection),
          },
        });
        reservedSchemas.value[connId] = result.result;
      } catch (error) {
        console.error('Failed to fetch reserved schemas:', error);
      }
    };

    /**
     * Fetch schemas metadata for a connection
     */
    const fetchSchemas = async ({
      connectionId: connId,
      workspaceId: wsId,
      connection,
      isRefresh = false,
    }: {
      connectionId: string;
      workspaceId: string;
      connection?: Connection;
      isRefresh?: boolean;
    }) => {
      if (
        !connId ||
        !wsId ||
        (!connection?.connectionString && !connection?.host)
      )
        return;

      if (isRefresh) {
        delete schemas.value[connId];
        delete reservedSchemas.value[connId];
      } else {
        if (schemas.value[connId]?.length) return;
      }

      loading.value[connId] = true;
      try {
        const databaseSource = await $fetch('/api/metadata/meta-data', {
          method: 'POST',
          body: {
            ...getConnectionParams(connection),
          },
        });

        const newSchemas: Schema[] = [];
        let includedPublic = false;

        databaseSource.forEach(schema => {
          const id = `${wsId}-${connId}-${schema.name}`;

          // Note: When refactoring to `Record`, we don't have existing array to check against globally.
          // But technically for `connId` we cleared it if refreshing.
          // If NOT refreshing, we already checked `if (existing) return;` so `schemas.value[connId]` is likely empty/new.

          if (schema.name === PUBLIC_SCHEMA_ID) {
            includedPublic = true;
          }

          newSchemas.push({
            id,
            workspaceId: wsId,
            connectionId: connId,
            name: schema.name,
            functions: schema.functions || [],
            tables: schema.tables || [],
            views: schema.views || [],
            tableDetails: schema?.table_details || null,
            viewDetails: schema?.view_details || null,
          });
        });

        schemas.value[connId] = newSchemas;

        return {
          schemas: newSchemas,
          includedPublic,
          firstSchemaName: databaseSource[0]?.name,
        };
      } catch (error) {
        console.error('Failed to fetch schemas:', error);
        throw error;
      } finally {
        loading.value[connId] = false;
      }
    };

    const getTableInfoById = (
      tableId: string,
      schema: Schema
    ):
      | {
          tableName: string;
          tableInfo: TableDetailMetadata;
        }
      | undefined => {
      if (!schema?.tableDetails) {
        return undefined;
      }

      for (const [key, table] of Object.entries(schema.tableDetails)) {
        if (table.table_id === tableId) {
          return {
            tableName: key,
            tableInfo: table,
          };
        }
      }
      return undefined;
    };

    return {
      // State
      reservedSchemas, // Expose raw per-connection map
      schemas, // Expose raw per-connection map
      loading, // Expose raw per-connection map
      indexesMap,
      rlsMap,
      rulesMap,
      triggersMap,
      viewMetaMap,

      // Getters
      activeSchema,
      activeSchemas, // New convenience getter
      schemasByContext,
      activeReservedSchemas, // New convenience getter
      isLoading, // New convenience getter

      // Actions
      fetchSchemas,
      fetchReservedSchemas,
      getTableInfoById,
    };
  },
  {
    persist: false,
  }
);
