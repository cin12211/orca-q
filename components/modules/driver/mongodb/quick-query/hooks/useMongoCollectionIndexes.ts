import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoIndexInfo } from '../types';

export function useMongoCollectionIndexes(params: {
  connection: Ref<Connection | undefined>;
  collectionName: Ref<string>;
  databaseName?: Ref<string | undefined>;
}) {
  const indexes = ref<MongoIndexInfo[]>([]);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchIndexes = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<{ indexes: MongoIndexInfo[] }>(
        '/api/mongodb/collection-indexes',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
            collection: params.collectionName.value,
          },
        }
      );
      indexes.value = response.indexes;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { indexes, isLoading, error, fetchIndexes };
}
