import { computed, ref, watch, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/types/entities/connection.entity';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';

const metadataCache = new Map<string, MongoRawQueryMetadata>();
const databaseCache = new Map<string, string[]>();
const pendingMetadataKeys = new Set<string>();
const pendingDatabaseKeys = new Set<string>();

export function useMongoScriptMetadata(options: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
  collectionContext?: Ref<string | undefined>;
}) {
  const metadata = ref<MongoRawQueryMetadata>({
    collections: [],
    fieldsByCollection: {},
  });
  const metadataByDatabase = ref<Record<string, MongoRawQueryMetadata>>({});
  const databases = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const connectionKey = computed(() => options.connection.value?.id ?? '');
  const databaseKey = (databaseName: string) =>
    `${connectionKey.value}:${databaseName}`;

  const fetchDatabaseNames = async () => {
    if (!connectionKey.value) return;
    const cached = databaseCache.get(connectionKey.value);
    if (cached) {
      databases.value = cached;
      return;
    }
    if (pendingDatabaseKeys.has(connectionKey.value)) return;
    pendingDatabaseKeys.add(connectionKey.value);
    try {
      const response = await $fetch<{ databases: string[] }>(
        '/api/mongodb/databases',
        {
          method: 'POST',
          body: getConnectionParams(options.connection.value),
        }
      );
      const names = [...response.databases].sort((a, b) => a.localeCompare(b));
      databaseCache.set(connectionKey.value, names);
      databases.value = names;
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      pendingDatabaseKeys.delete(connectionKey.value);
    }
  };

  const ensureDatabaseMetadata = async (databaseName: string) => {
    if (!connectionKey.value || !databaseName) return;
    const key = databaseKey(databaseName);
    const cached = metadataCache.get(key);
    if (cached) {
      metadataByDatabase.value = {
        ...metadataByDatabase.value,
        [databaseName]: cached,
      };
      return cached;
    }
    if (pendingMetadataKeys.has(key)) return;
    pendingMetadataKeys.add(key);
    isLoading.value = true;
    error.value = null;
    try {
      const value = await $fetch<MongoRawQueryMetadata>(
        '/api/mongodb/raw-query-metadata',
        {
          method: 'POST',
          body: {
            connectionId: options.connection.value!.id,
            ...getConnectionParams(options.connection.value),
            database: databaseName,
            collectionContext:
              options.databaseName?.value &&
              databaseName === options.databaseName.value
                ? options.collectionContext?.value
                : undefined,
          },
        }
      );
      metadataCache.set(key, value);
      metadataByDatabase.value = {
        ...metadataByDatabase.value,
        [databaseName]: value,
      };
      if (
        options.databaseName?.value &&
        databaseName === options.databaseName.value
      )
        metadata.value = value;
      return value;
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      pendingMetadataKeys.delete(key);
      isLoading.value = false;
    }
  };

  const refresh = async () => {
    await fetchDatabaseNames();
    if (!options.databaseName?.value) return;
    const value = await ensureDatabaseMetadata(options.databaseName.value);
    if (value) metadata.value = value;
  };

  const metadataForDatabase = (databaseName?: string) => {
    if (!databaseName) return metadata.value;
    return (
      metadataByDatabase.value[databaseName] ?? {
        collections: [],
        fieldsByCollection: {},
      }
    );
  };

  watch(
    connectionKey,
    () => {
      metadataByDatabase.value = {};
      metadata.value = { collections: [], fieldsByCollection: {} };
      databases.value = [];
      void refresh();
    },
    { immediate: true }
  );

  watch(
    () => [options.databaseName?.value, options.collectionContext?.value],
    () => {
      void refresh();
    }
  );

  return {
    metadata,
    metadataByDatabase,
    databases,
    isLoading,
    error,
    refresh,
    ensureDatabaseMetadata,
    metadataForDatabase,
  };
}
