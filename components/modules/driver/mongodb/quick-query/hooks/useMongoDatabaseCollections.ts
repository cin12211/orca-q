import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoCollectionSummary } from '../types';

export function useMongoDatabaseCollections(params: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
}) {
  const collections = ref<MongoCollectionSummary[]>([]);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchCollections = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<{ collections: MongoCollectionSummary[] }>(
        '/api/mongodb/collections',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
          },
        }
      );
      collections.value = response.collections;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { collections, isLoading, error, fetchCollections };
}
