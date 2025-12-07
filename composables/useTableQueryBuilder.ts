import debounce from 'lodash-es/debounce';
import { toast } from 'vue-sonner';
import { EDatabaseType } from '~/components/modules/management-connection/constants';
import { useQuickQueryLogs } from '~/shared/stores';
import {
  ComposeOperator,
  DEFAULT_DEBOUNCE_INPUT,
  DEFAULT_QUERY,
  DEFAULT_QUERY_COUNT,
  DEFAULT_QUERY_SIZE,
} from '~/utils/constants';
import { formatWhereClause, type FilterSchema } from '~/utils/quickQuery';

export interface OrderBy {
  columnName?: string;
  order?: 'ASC' | 'DESC';
}

export const useTableQueryBuilder = ({
  tableName,
  connectionString,
  primaryKeys,
  columns,
  isPersist = true,
  schemaName,
  workspaceId,
  connectionId,
  initFilters,
  initComposeWith,
}: {
  connectionString: Ref<string>;
  tableName: string;
  primaryKeys: Ref<string[]>;
  columns: Ref<string[]>;
  isPersist?: boolean;
  schemaName: string;
  workspaceId: Ref<string | undefined, string | undefined>;
  connectionId: Ref<string | undefined, string | undefined>;
  initFilters?: FilterSchema[];
  initComposeWith?: ComposeOperator;
}) => {
  const qqLogStore = useQuickQueryLogs();

  const openErrorModal = ref(false);

  const errorMessage = ref('');

  const pagination = reactive({
    limit: DEFAULT_QUERY_SIZE,
    offset: 0,
  });

  const filters = ref<FilterSchema[]>([]);

  const orderBy = reactive<OrderBy>({});

  const isShowFilters = ref(false);

  const composeWith = ref<ComposeOperator>(ComposeOperator.AND);

  const baseQueryString = computed(() => {
    return `${DEFAULT_QUERY} "${schemaName}"."${tableName}"`;
  });

  const whereClauses = computed(() => {
    //if don't apply filter
    if (!isShowFilters.value) {
      return '';
    }

    return formatWhereClause({
      columns: columns.value,
      db: EDatabaseType.PG,
      filters: filters.value,
      composeWith: composeWith.value,
    });
  });

  const queryString = computed(() => {
    let orderClauses = '';

    if (orderBy?.columnName && orderBy?.order) {
      orderClauses = `ORDER BY "${orderBy.columnName}" ${orderBy.order}`;
    } else {
      if (primaryKeys.value[0]) {
        orderClauses = `ORDER BY "${primaryKeys.value[0]}" ASC`;
      } else {
        orderClauses = `ORDER BY "${columns.value[0]}" ASC`;
      }
    }

    const limitClause = `LIMIT ${pagination.limit}`;
    const offsetClause = `OFFSET ${pagination.offset}`;

    return `${DEFAULT_QUERY} "${schemaName}"."${tableName}" ${whereClauses.value || ''} ${orderClauses} ${limitClause} ${offsetClause}`;
  });

  const queryCountString = computed(() => {
    return `${DEFAULT_QUERY_COUNT} "${schemaName}"."${tableName}" ${whereClauses.value || ''}`;
  });

  const addHistoryLog = (log: string, queryTime: number = 0) => {
    const logs = `\n${log}`;

    qqLogStore.createLog({
      tableName,
      schemaName,
      logs,
      queryTime,
    });
  };

  const {
    data,
    status: fetchingTableStatus,
    refresh: refreshTableData,
  } = useFetch('/api/execute', {
    method: 'POST',
    body: {
      query: queryString,
      dbConnectionString: connectionString,
    },
    watch: false,
    immediate: false,
    key: tableName,
    cache: 'default',
    onResponseError: error => {
      const errorData = error.response?._data?.data;

      openErrorModal.value = true;

      errorMessage.value = error.response?._data?.message || '';

      toast(error.response?.statusText, {
        important: true,
        description: JSON.stringify(errorData),
      });
    },
    onResponse: ({ response }) => {
      if (response.ok) {
        addHistoryLog(queryString.value, response._data?.queryTime);
      }
    },
  });

  const {
    refresh: refreshCount,
    data: dataCount,
    status: fetchCountStatus,
  } = useFetch('/api/execute', {
    method: 'POST',
    body: {
      query: queryCountString,
      dbConnectionString: connectionString,
    },
    watch: false,
    immediate: false,
    key: `${tableName}-count`,
    cache: 'default',
    onResponse: ({ response }) => {
      if (response.ok) {
        addHistoryLog(queryCountString.value, response._data?.queryTime);
      }
    },
  });

  const totalRows = computed(() => {
    return Number(dataCount.value?.result?.[0]?.count || 0);
  });

  const isAllowNextPage = computed(() => {
    return pagination.offset + pagination.limit < totalRows.value;
  });

  const isAllowPreviousPage = computed(() => {
    return pagination.offset > 0;
  });

  const onUpdatePagination = ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    // validate
    if (limit <= 0 || offset < 0) {
      return;
    }

    pagination.limit = limit;
    pagination.offset = offset;

    refreshTableData();
  };

  const onUpdateOrderBy = ({ columnName, order }: OrderBy) => {
    orderBy.columnName = columnName;
    orderBy.order = order;

    refreshTableData();
  };

  const onNextPage = () => {
    if (!isAllowNextPage) {
      return;
    }

    pagination.offset += pagination.limit;

    refreshTableData();
  };

  const onPreviousPage = () => {
    if (!isAllowPreviousPage) {
      return;
    }

    const newOffset = pagination.offset - pagination.limit;

    if (newOffset < 0) {
      pagination.offset = 0;
    } else {
      pagination.offset = newOffset;
    }

    refreshTableData();
  };

  const onChangeComposeWith = (value: ComposeOperator) => {
    composeWith.value = value;
    pagination.offset = 0;

    refreshTableData();
    refreshCount();
  };

  const onApplyNewFilter = () => {
    pagination.offset = 0;

    refreshTableData();
    refreshCount();
  };

  const getPersistedKey = () => {
    return `${workspaceId?.value}-${connectionId?.value}-${schemaName}-${tableName}`;
  };

  watch(
    [filters, pagination, orderBy, isShowFilters],
    debounce(() => {
      if (!isPersist) {
        return;
      }

      const persistedKey = getPersistedKey();

      localStorage.setItem(
        persistedKey,
        JSON.stringify({
          filters: filters.value,
          pagination,
          orderBy,
          isShowFilters: isShowFilters.value,
          composeWith: composeWith.value,
        })
      );
    }, DEFAULT_DEBOUNCE_INPUT),
    { deep: true }
  );

  const onLoadPersistedState = () => {
    if (!isPersist) {
      if (initFilters) {
        filters.value = initFilters;
        isShowFilters.value = true;
      }

      if (initComposeWith) {
        composeWith.value = initComposeWith;
      }

      return;
    }

    const persistedKey = getPersistedKey();

    const persistedState = localStorage.getItem(persistedKey);

    if (persistedState) {
      const {
        filters: _filters,
        pagination: _pagination,
        orderBy: _orderBy,
        isShowFilters: _isShowFilters,
        composeWith: _composeWith,
      } = JSON.parse(persistedState);

      if (_orderBy) {
        orderBy.columnName = _orderBy.columnName;
        orderBy.order = _orderBy.order;
      }

      if (_pagination) {
        pagination.limit = _pagination.limit;
        pagination.offset = _pagination.offset;
      }

      if (_filters) {
        filters.value = _filters;
      }

      if (_composeWith) {
        composeWith.value = _composeWith;
      }

      isShowFilters.value = !!_isShowFilters;
    }
  };

  onLoadPersistedState();

  const isFetchingTableData = computed(() => {
    return (
      //TODO: open when then disable pagination
      // fetchCountStatus.value === 'pending' ||
      fetchingTableStatus.value === 'pending'
    );
  });

  const getFormattedRow = (content: unknown, type?: string): string => {
    const isJsonType = type === 'jsonb' || type === 'json';
    const isObjectType =
      (typeof content === 'object' ||
        Object.prototype.toString.call(content) === '[object Object]') &&
      content !== null;

    if (isJsonType || isObjectType) {
      return content ? JSON.stringify(content, null, 2) : '';
    }

    return content as string;
  };

  const tableData = computed(() => {
    return data.value?.result || [];

    // if (!data.value?.result || !Array.isArray(data.value.result)) {
    //   return [];
    // }

    // const mappedRows = data.value.result.map((row: any) => {
    //   const formattedRow: Record<string, string> = {};

    //   Object.keys(row).forEach(key => {
    //     const value = row[key];
    //     formattedRow[key] = getFormattedRow(value);
    //   });

    //   return formattedRow;
    // });

    // return mappedRows || [];
  });

  return {
    whereClauses,
    pagination,
    queryString,
    onUpdatePagination,
    isAllowNextPage,
    isAllowPreviousPage,
    onNextPage,
    onPreviousPage,
    queryCountString,
    data: tableData,
    isFetchingTableData,
    refreshTableData,
    refreshCount,
    totalRows,
    onApplyNewFilter,
    baseQueryString,
    openErrorModal,
    onUpdateOrderBy,
    orderBy,
    errorMessage,
    filters,
    addHistoryLog,
    isShowFilters,
    onChangeComposeWith,
    composeWith,
  };
};
