import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoValidationInfo } from '../types';

export function useMongoCollectionValidation(params: {
  connection: Ref<Connection | undefined>;
  collectionName: Ref<string>;
  databaseName?: Ref<string | undefined>;
}) {
  const validation = ref<MongoValidationInfo | undefined>();
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchValidation = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      validation.value = await $fetch<MongoValidationInfo>(
        '/api/mongodb/collection-validation',
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
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { validation, isLoading, error, fetchValidation };
}
