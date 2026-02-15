import { defineStore } from 'pinia';
import { ref, computed, toRefs } from 'vue';
import type { ReservedTableSchemas } from '~/server/api/get-reverse-table-schemas';
import type {
  FunctionSchema,
  TableDetailMetadata,
  TableDetails,
  ViewSchema,
  ViewDetails,
} from '~/server/api/get-schema-meta-data';
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
    const { wsState, connectionId, schemaId } = toRefs(wsStateStore);

    const schemas = ref<Record<string, Schema[]>>({});

    // Store reserved schemas per connection: Record<string (connectionId), ReservedTableSchemas[]>
    const reservedSchemas = ref<Record<string, ReservedTableSchemas[]>>({});

    // Store loading state per connection: Record<string (connectionId), boolean>
    const loading = ref<Record<string, boolean>>({});

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
      dbConnectionString,
    }: {
      connectionId: string;
      dbConnectionString: string;
    }) => {
      if (!connId || !dbConnectionString) return;

      // If we already have reserved schemas for this connection, we might want to skip or refresh
      // For now, let's allow re-fetching to be safe or add a check if needed.
      // But typically reserved schemas shouldn't change that often.
      // Let's implement a simple check: if exists, don't fetch unless we want to force refresh (not implemented yet).
      if (reservedSchemas.value[connId]?.length) return;

      try {
        const result = await $fetch('/api/get-reverse-table-schemas', {
          method: 'POST',
          body: {
            dbConnectionString,
          },
        });
        reservedSchemas.value[connId] = result.result;
      } catch (error) {
        console.error('Failed to fetch reserved schemas:', error);
        // Optionally handle error state
      }
    };

    /**
     * Fetch schemas metadata for a connection
     */
    const fetchSchemas = async ({
      connectionId: connId,
      workspaceId: wsId,
      dbConnectionString,
      isRefresh = false,
    }: {
      connectionId: string;
      workspaceId: string;
      dbConnectionString: string;
      isRefresh?: boolean;
    }) => {
      if (!connId || !wsId || !dbConnectionString) return;

      if (isRefresh) {
        // Remove existing schemas for this connection if refreshing
        delete schemas.value[connId];
        // Also clear reserved schemas if hard refresh? Maybe not necessary as they are separate.
        // But for consistency let's clear reserved schemas too if we are modifying the structure
        delete reservedSchemas.value[connId];
      } else {
        // Check if we already have schemas for this connection
        if (schemas.value[connId]?.length) return;
      }

      loading.value[connId] = true;
      try {
        const databaseSource = await $fetch('/api/get-schema-meta-data', {
          method: 'POST',
          body: {
            dbConnectionString,
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
