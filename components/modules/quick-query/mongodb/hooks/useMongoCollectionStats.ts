import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoCollectionName } from '../types';

interface MongoCollectionStatsResponse {
  collections: MongoCollectionName[];
}

/**
 * Per-collection size/count for one database, fetched separately from the
 * fast collection listing (`useMongoDatabaseSummary`) — this runs a
 * `collStats` command per collection, so it's only worth calling for the
 * database the user actually selects.
 */
export function useMongoCollectionStats(params: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string>;
}) {
  const collections = ref<MongoCollectionName[]>([]);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchStats = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<MongoCollectionStatsResponse>(
        '/api/mongodb/collection-stats',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            database: params.databaseName.value,
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

  return { collections, isLoading, error, fetchStats };
}
