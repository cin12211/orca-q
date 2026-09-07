import { ref, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDocument } from '../types';

interface MongoQuickQueryMutationResponse {
  document?: MongoDocument | null;
  id?: string;
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

  const updateDocument = async (
    id: string,
    updatedDoc: Record<string, unknown>
  ): Promise<boolean> => {
    isMutating.value = true;
    savingDocId.value = id;

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
        doc => String(doc._id) === String(id)
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
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      toast.error(errorMessage);
      return false;
    } finally {
      isMutating.value = false;
      savingDocId.value = null;
    }
  };

  return {
    isMutating,
    savingDocId,
    updateDocument,
  };
}
