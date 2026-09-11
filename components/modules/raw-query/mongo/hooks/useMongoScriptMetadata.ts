import { computed, ref, watch, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/types/entities/connection.entity';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';

const metadataCache = new Map<string, MongoRawQueryMetadata>();

export function useMongoScriptMetadata(options: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
}) {
  const metadata = ref<MongoRawQueryMetadata>({
    collections: [],
    fieldsByCollection: {},
  });
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const key = computed(
    () =>
      `${options.connection.value?.id ?? ''}:${options.databaseName.value ?? ''}:${options.collectionContext.value ?? ''}`
  );
  const refresh = async () => {
    if (!options.connection.value?.id || !options.databaseName.value) return;
    const cached = metadataCache.get(key.value);
    if (cached) {
      metadata.value = cached;
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const value = await $fetch<MongoRawQueryMetadata>(
        '/api/mongodb/raw-query-metadata',
        {
          method: 'POST',
          body: {
            connectionId: options.connection.value.id,
            ...getConnectionParams(options.connection.value),
            database: options.databaseName.value,
            collectionContext: options.collectionContext.value,
          },
        }
      );
      metadataCache.set(key.value, value);
      metadata.value = value;
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      isLoading.value = false;
    }
  };
  watch(key, refresh, { immediate: true });
  return { metadata, isLoading, error, refresh };
}
