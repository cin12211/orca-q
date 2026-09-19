import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoCollectionName } from '../types';

interface MongoDatabaseSummaryResponse {
  collections: MongoCollectionName[];
  totalSize: number;
}

export function useMongoDatabaseSummary(params: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string>;
}) {
  const collections = ref<MongoCollectionName[]>([]);
  const totalSize = ref(0);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchSummary = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<MongoDatabaseSummaryResponse>(
        '/api/mongodb/collection-names',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            database: params.databaseName.value,
          },
        }
      );
      collections.value = response.collections;
      totalSize.value = response.totalSize;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { collections, totalSize, isLoading, error, fetchSummary };
}
