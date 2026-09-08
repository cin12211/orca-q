import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';

export function useMongoServerDatabases(params: {
  connection: Ref<Connection | undefined>;
}) {
  const databases = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchDatabases = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<{ databases: string[] }>(
        '/api/mongodb/databases',
        {
          method: 'POST',
          body: getConnectionParams(params.connection.value),
        }
      );
      databases.value = response.databases;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { databases, isLoading, error, fetchDatabases };
}
