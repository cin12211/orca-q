import { defineStore, storeToRefs } from 'pinia';
import { ref, computed } from 'vue';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { isSqlFamilyConnection } from '~/core/constants/connection-capabilities';
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
  Schema,
  TableDetailMetadata,
  TableDetails,
  ViewSchema,
  ViewDetails,
} from '~/core/types';
import type { Connection } from './managementConnectionStore';
import { useWSStateStore } from './useWSStateStore';

export type { Schema };

export const PUBLIC_SCHEMA_ID = 'public';
const SCHEMA_LOAD_WAIT_TIMEOUT_MS = 5000;

function hasConnectionTransport(connection?: Connection) {
  if (!connection) {
    return false;
  }

  return Boolean(
    connection.connectionString ||
      connection.host ||
      connection.filePath ||
      (connection.providerKind && connection.managedSqlite)
  );
}

function supportsSchemaMetadata(connection?: Connection) {
  return (
    hasConnectionTransport(connection) &&
    !!connection &&
    isSqlFamilyConnection(connection)
  );
}

export type SchemaLoadStatus =
  | 'idle'
  | 'loading'
  | 'waiting'
  | 'completed'
  | 'failed';

export interface SchemaLoadSession {
  connectionId: string;
  status: SchemaLoadStatus;
  startedAt?: string;
  updatedAt: string;
  statusMessage?: string;
  schemaCount?: number;
  errorMessage?: string;
}

export const useSchemaStore = defineStore(
  'schema-store',
  () => {
    const wsStateStore = useWSStateStore();
    const { connectionId } = useWorkspaceConnectionRoute();
    const { wsState, schemaId } = storeToRefs(wsStateStore);

    const schemas = ref<Record<string, Schema[]>>({});

    // Tracks which schemas have had their full table/view/function detail
    // loaded, keyed by `${connectionId}::${schemaName}`. `fetchSchemas` only
    // populates lightweight schema names; `fetchSchemaDetail` lazily loads
    // full metadata for one schema and marks it here so repeat selections
    // don't refetch.
    const schemaDetailLoaded = ref<Record<string, boolean>>({});
    // In-flight per-schema detail requests, used to dedupe concurrent calls
    // for the same schema (e.g. rapid clicks) without persisting Promises in
    // reactive state.
    const schemaDetailRequests = new Map<string, Promise<void>>();

    // Store reserved schemas per connection: Record<string (connectionId), ReservedTableSchemas[]>
    const reservedSchemas = ref<Record<string, ReservedTableSchemas[]>>({});

    // Store loading state per connection: Record<string (connectionId), boolean>
    const loading = ref<Record<string, boolean>>({});
    const schemaLoadSessions = ref<Record<string, SchemaLoadSession>>({});

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

    const activeLoadSession = computed(() => {
      if (!connectionId.value) {
        return undefined;
      }

      return schemaLoadSessions.value[connectionId.value];
    });

    const upsertSchemaLoadSession = (
      connId: string,
      next: Omit<SchemaLoadSession, 'connectionId' | 'updatedAt'>
    ) => {
      const existing = schemaLoadSessions.value[connId];
      const startedAt =
        next.startedAt ??
        existing?.startedAt ??
        (next.status === 'idle' ? undefined : new Date().toISOString());

      schemaLoadSessions.value[connId] = {
        connectionId: connId,
        ...next,
        startedAt,
        updatedAt: new Date().toISOString(),
      };
    };

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
      if (!connId || !supportsSchemaMetadata(connection)) return;

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
      if (!connId || !wsId || !supportsSchemaMetadata(connection)) {
        upsertSchemaLoadSession(connId, {
          status: 'idle',
          statusMessage:
            'Schema metadata is only available for SQL connections.',
          errorMessage: undefined,
          schemaCount: undefined,
        });
        return;
      }

      if (isRefresh) {
        delete schemas.value[connId];
        delete reservedSchemas.value[connId];
        const detailKeyPrefix = `${connId}::`;
        Object.keys(schemaDetailLoaded.value)
          .filter(key => key.startsWith(detailKeyPrefix))
          .forEach(key => delete schemaDetailLoaded.value[key]);
      } else {
        if (schemas.value[connId]?.length) {
          upsertSchemaLoadSession(connId, {
            status: 'completed',
            schemaCount: schemas.value[connId]?.length ?? 0,
            statusMessage: 'Schemas are ready.',
          });
          return;
        }
      }

      loading.value[connId] = true;
      const startedAt = new Date().toISOString();

      upsertSchemaLoadSession(connId, {
        status: 'loading',
        startedAt,
        statusMessage: 'Loading schemas...',
        errorMessage: undefined,
        schemaCount: undefined,
      });

      const waitingTimer = setTimeout(() => {
        if (!loading.value[connId]) {
          return;
        }

        upsertSchemaLoadSession(connId, {
          status: 'waiting',
          startedAt,
          statusMessage: 'Still loading schemas for this connection...',
          errorMessage: undefined,
          schemaCount: undefined,
        });
      }, SCHEMA_LOAD_WAIT_TIMEOUT_MS);

      try {
        const databaseSource = await $fetch('/api/metadata/meta-data', {
          method: 'POST',
          body: {
            ...getConnectionParams(connection),
            namesOnly: true,
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
            isSystem: schema.is_system ?? false,
            functions: schema.functions || [],
            tables: schema.tables || [],
            views: schema.views || [],
            tableDetails: schema?.table_details || null,
            viewDetails: schema?.view_details || null,
          });
        });

        schemas.value[connId] = newSchemas;

        upsertSchemaLoadSession(connId, {
          status: 'completed',
          startedAt,
          schemaCount: newSchemas.length,
          statusMessage:
            newSchemas.length > 0
              ? `Loaded ${newSchemas.length} schema${newSchemas.length === 1 ? '' : 's'}.`
              : 'No schemas were returned for this connection.',
          errorMessage: undefined,
        });

        return {
          schemas: newSchemas,
          includedPublic,
          firstSchemaName: databaseSource[0]?.name,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load schemas.';

        upsertSchemaLoadSession(connId, {
          status: 'failed',
          startedAt,
          statusMessage: 'Failed to load schemas.',
          errorMessage: message,
          schemaCount: undefined,
        });
        console.error('Failed to fetch schemas:', error);
        throw error;
      } finally {
        clearTimeout(waitingTimer);
        loading.value[connId] = false;
      }
    };

    /**
     * Lazily fetch full table/view/function metadata for a single schema.
     * `fetchSchemas` only loads lightweight schema names at connect time; a
     * schema's full detail (tables, columns, views, functions) is fetched
     * only when the user selects that schema (e.g. via the schema selector
     * or the connect flow's default active schema). Results are memoized
     * per `connectionId + schemaName` so repeat selections don't refetch,
     * and concurrent calls for the same schema share one in-flight request.
     */
    const fetchSchemaDetail = async ({
      connectionId: connId,
      workspaceId: wsId,
      connection,
      schemaName,
      isRefresh = false,
    }: {
      connectionId: string;
      workspaceId: string;
      connection?: Connection;
      schemaName: string;
      isRefresh?: boolean;
    }): Promise<void> => {
      if (
        !connId ||
        !wsId ||
        !schemaName ||
        !supportsSchemaMetadata(connection)
      ) {
        return;
      }

      const key = `${connId}::${schemaName}`;

      if (!isRefresh && schemaDetailLoaded.value[key]) {
        return;
      }

      const pending = schemaDetailRequests.get(key);
      if (!isRefresh && pending) {
        return pending;
      }

      const request = (async () => {
        try {
          const databaseSource = await $fetch('/api/metadata/meta-data', {
            method: 'POST',
            body: {
              ...getConnectionParams(connection),
              schemaName,
            },
          });

          const detail =
            databaseSource.find(schema => schema.name === schemaName) ??
            databaseSource[0];

          if (!detail) {
            return;
          }

          const existing = schemas.value[connId] || [];
          const index = existing.findIndex(
            schema => schema.name === schemaName
          );
          const id =
            index >= 0 ? existing[index].id : `${wsId}-${connId}-${schemaName}`;

          const updatedSchema: Schema = {
            id,
            workspaceId: wsId,
            connectionId: connId,
            name: schemaName,
            isSystem: index >= 0 ? existing[index].isSystem : false,
            functions: detail.functions || [],
            tables: detail.tables || [],
            views: detail.views || [],
            tableDetails: detail?.table_details || null,
            viewDetails: detail?.view_details || null,
          };

          const nextSchemas = [...existing];
          if (index >= 0) {
            nextSchemas.splice(index, 1, updatedSchema);
          } else {
            nextSchemas.push(updatedSchema);
          }
          schemas.value[connId] = nextSchemas;

          schemaDetailLoaded.value[key] = true;
        } catch (error) {
          console.error('Failed to fetch schema detail:', error);
          throw error;
        } finally {
          schemaDetailRequests.delete(key);
        }
      })();

      schemaDetailRequests.set(key, request);
      return request;
    };

    const isSchemaDetailLoaded = (connId: string, schemaName: string) => {
      return !!schemaDetailLoaded.value[`${connId}::${schemaName}`];
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
      schemaLoadSessions,
      schemaDetailLoaded, // Expose raw `${connId}::${schemaName}` -> loaded map
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
      activeLoadSession,

      // Actions
      fetchSchemas,
      fetchSchemaDetail,
      isSchemaDetailLoaded,
      fetchReservedSchemas,
      getTableInfoById,
    };
  },
  {
    persist: false,
  }
);
