import { ref, type Ref } from 'vue';
import { DEFAULT_QUERY_SIZE } from '~/core/constants';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDocument, MongoQueryMoreOptionsPayload } from '../types';
import { getMongoErrorMessage } from '../utils';

interface MongoQuickQueryResponse {
  documents: MongoDocument[];
  total: number;
  queryTime: number;
}

export function useMongoCollectionQuery(params: {
  connection: Ref<Connection | undefined>;
  collectionName: Ref<string>;
  databaseName?: Ref<string | undefined>;
}) {
  const documents = ref<MongoDocument[]>([]);
  const total = ref(0);
  const queryTime = ref(0);
  const isLoading = ref(false);
  const error = ref<string | undefined>();
  const limit = ref(DEFAULT_QUERY_SIZE);
  const skip = ref(0);
  const activeFilterPayload = ref<Record<string, unknown> | undefined>();
  const activeMoreOptionsPayload = ref<
    MongoQueryMoreOptionsPayload | undefined
  >();

  const fetchDocuments = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<MongoQuickQueryResponse>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
            collection: params.collectionName.value,
            ...(activeFilterPayload.value
              ? { filter: activeFilterPayload.value }
              : {}),
            ...(activeMoreOptionsPayload.value?.project
              ? { project: activeMoreOptionsPayload.value.project }
              : {}),
            ...(activeMoreOptionsPayload.value?.sort
              ? { sort: activeMoreOptionsPayload.value.sort }
              : {}),
            ...(activeMoreOptionsPayload.value?.collation
              ? { collation: activeMoreOptionsPayload.value.collation }
              : {}),
            ...(activeMoreOptionsPayload.value?.hint
              ? { hint: activeMoreOptionsPayload.value.hint }
              : {}),
            ...(activeMoreOptionsPayload.value?.maxTimeMS
              ? { maxTimeMS: activeMoreOptionsPayload.value.maxTimeMS }
              : {}),
            skip: skip.value,
            limit: limit.value,
          },
        }
      );
      documents.value = response.documents;
      total.value = response.total;
      queryTime.value = response.queryTime;
    } catch (fetchError) {
      error.value = getMongoErrorMessage(fetchError);
    } finally {
      isLoading.value = false;
    }
  };

  const applyFilter = (
    filter?: Record<string, unknown>,
    options?: MongoQueryMoreOptionsPayload
  ) => {
    activeFilterPayload.value = filter;
    if (options !== undefined) {
      activeMoreOptionsPayload.value = options;
    }
    skip.value = 0;
    return fetchDocuments();
  };

  const applyMoreOptions = (options?: MongoQueryMoreOptionsPayload) => {
    activeMoreOptionsPayload.value = options;
    skip.value = 0;
    return fetchDocuments();
  };

  const onNextPage = () => {
    skip.value += limit.value;
    fetchDocuments();
  };

  const onPreviousPage = () => {
    skip.value = Math.max(0, skip.value - limit.value);
    fetchDocuments();
  };

  const onRefresh = () => {
    fetchDocuments();
  };

  return {
    documents,
    total,
    queryTime,
    isLoading,
    error,
    limit,
    skip,
    activeFilterPayload,
    activeMoreOptionsPayload,
    applyFilter,
    applyMoreOptions,
    fetchDocuments,
    onNextPage,
    onPreviousPage,
    onRefresh,
  };
}
