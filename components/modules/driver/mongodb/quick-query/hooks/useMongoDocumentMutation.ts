import { ref, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDocument } from '../types';
import { getMongoDocumentKey, getMongoErrorMessage } from '../utils';

interface MongoQuickQueryMutationResponse {
  document?: MongoDocument | null;
  id?: unknown;
  deletedCount?: number;
}

export function useMongoDocumentMutation(params: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
  collectionName: Ref<string>;
  documents: Ref<MongoDocument[]>;
}) {
  const isMutating = ref(false);
  const savingDocId = ref<string | null>(null);
  const deletingDocId = ref<string | null>(null);

  const updateDocument = async (
    id: unknown,
    updatedDoc: Record<string, unknown>
  ): Promise<boolean> => {
    const documentKey = getMongoDocumentKey(id);
    isMutating.value = true;
    savingDocId.value = documentKey;

    // Omit _id from update payload so MongoDB does not reject immutable field changes
    const { _id: _ignored, ...updates } = updatedDoc;

    try {
      const response = await $fetch<MongoQuickQueryMutationResponse>(
        '/api/mongodb/quick-query-mutation',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
            collection: params.collectionName.value,
            operation: 'update',
            id,
            document: updates,
          },
        }
      );

      const docIndex = params.documents.value.findIndex(
        doc => getMongoDocumentKey(doc._id) === documentKey
      );

      if (docIndex !== -1) {
        const nextDoc: MongoDocument = response.document ?? {
          ...params.documents.value[docIndex],
          ...updates,
          _id: id,
        };
        const updatedList = [...params.documents.value];
        updatedList[docIndex] = nextDoc;
        params.documents.value = updatedList;
      }

      toast.success('Document updated successfully!');
      return true;
    } catch (fetchError) {
      const errorMessage = getMongoErrorMessage(fetchError);
      toast.error(errorMessage);
      return false;
    } finally {
      isMutating.value = false;
      savingDocId.value = null;
    }
  };

  const deleteDocument = async (id: unknown): Promise<boolean> => {
    const documentKey = getMongoDocumentKey(id);
    isMutating.value = true;
    deletingDocId.value = documentKey;

    try {
      await $fetch<MongoQuickQueryMutationResponse>(
        '/api/mongodb/quick-query-mutation',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
            collection: params.collectionName.value,
            operation: 'delete',
            id,
          },
        }
      );

      params.documents.value = params.documents.value.filter(
        doc => getMongoDocumentKey(doc._id) !== documentKey
      );

      toast.success('Document deleted successfully!');
      return true;
    } catch (fetchError) {
      const errorMessage = getMongoErrorMessage(fetchError);
      toast.error(errorMessage);
      return false;
    } finally {
      isMutating.value = false;
      deletingDocId.value = null;
    }
  };

  return {
    isMutating,
    savingDocId,
    deletingDocId,
    updateDocument,
    deleteDocument,
  };
}
