import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDatabaseStats } from '../types';

export function useMongoDatabaseStats(params: {
  connection: Ref<Connection | undefined>;
}) {
  const stats = ref<MongoDatabaseStats | undefined>();
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchStats = async (databaseName: string) => {
    isLoading.value = true;
    error.value = undefined;
    try {
      stats.value = await $fetch<MongoDatabaseStats>(
        '/api/mongodb/database-stats',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            database: databaseName,
          },
        }
      );
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { stats, isLoading, error, fetchStats };
}
