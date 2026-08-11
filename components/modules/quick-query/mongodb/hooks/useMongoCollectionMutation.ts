import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';

export function useMongoCollectionMutation(params: {
  connection: Ref<Connection | undefined>;
}) {
  const isMutating = ref(false);
  const error = ref<string | undefined>();

  const createCollection = async (databaseName: string, name: string) => {
    isMutating.value = true;
    error.value = undefined;
    try {
      await $fetch('/api/mongodb/create-collection', {
        method: 'POST',
        body: {
          ...getConnectionParams(params.connection.value),
          database: databaseName,
          name,
        },
      });
      return true;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      return false;
    } finally {
      isMutating.value = false;
    }
  };

  const renameCollection = async (
    databaseName: string,
    fromName: string,
    toName: string
  ) => {
    isMutating.value = true;
    error.value = undefined;
    try {
      await $fetch('/api/mongodb/rename-collection', {
        method: 'POST',
        body: {
          ...getConnectionParams(params.connection.value),
          database: databaseName,
          fromName,
          toName,
        },
      });
      return true;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      return false;
    } finally {
      isMutating.value = false;
    }
  };

  const deleteCollection = async (databaseName: string, name: string) => {
    isMutating.value = true;
    error.value = undefined;
    try {
      await $fetch('/api/mongodb/delete-collection', {
        method: 'POST',
        body: {
          ...getConnectionParams(params.connection.value),
          database: databaseName,
          name,
        },
      });
      return true;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      return false;
    } finally {
      isMutating.value = false;
    }
  };

  return {
    isMutating,
    error,
    createCollection,
    renameCollection,
    deleteCollection,
  };
}
