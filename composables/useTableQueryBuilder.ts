import { toast } from 'vue-sonner';

export const DEFAULT_QUERY = 'SELECT * from';
export const DEFAULT_QUERY_COUNT = 'SELECT COUNT(*) as count from';
export const DEFAULT_QUERY_SIZE = 30;

export interface OrderBy {
  columnName?: string;
  order?: 'ASC' | 'DESC';
}

export const useTableQueryBuilder = async ({
  tableName,
  connectionString,
  primaryKeys,
}: {
  connectionString: string;
  tableName: string;
  primaryKeys: string[];
  //TODO: allow persist data of this table
  //   isPersist?: boolean;
}) => {
  const whereClauses = ref<string>();

  const totalRows = ref(0);

  const openErrorModal = ref(false);

  const errorMessage = ref('');

  const pagination = reactive({
    limit: DEFAULT_QUERY_SIZE,
    offset: 0,
  });

  const orderBy = reactive<OrderBy>({});

  const baseQueryString = computed(() => {
    return `${DEFAULT_QUERY} ${tableName}`;
  });

  const queryString = computed(() => {
    let orderClauses = '';
    if (orderBy?.columnName && orderBy?.order) {
      orderClauses = `ORDER BY ${orderBy.columnName} ${orderBy.order}`;
    } else {
      orderClauses = `ORDER BY ${primaryKeys[0]} ASC`;
    }

    const limitClause = `LIMIT ${pagination.limit}`;
    const offsetClause = `OFFSET ${pagination.offset}`;

    return `${DEFAULT_QUERY} ${tableName} ${whereClauses.value || ''} ${orderClauses} ${limitClause} ${offsetClause}`;
  });

  const queryCountString = computed(() => {
    return `${DEFAULT_QUERY_COUNT} ${tableName} ${whereClauses.value || ''}`;
  });

  const {
    data,
    status,
    refresh: refreshTableData,
  } = await useFetch('/api/execute', {
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
  });

  const { refresh: refreshCount } = await useFetch('/api/execute', {
    method: 'POST',
    body: {
      query: queryCountString,
      dbConnectionString: connectionString,
    },
    watch: false,
    immediate: false,
    key: `${tableName}-count`,
    cache: 'default',
    onResponse: response => {
      console.log('response.response._data', response.response._data);

      totalRows.value = Number(response.response._data?.[0]?.count || 0);
    },
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
    console.log('columnName, order', columnName, order);

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

    pagination.offset -= pagination.limit;

    refreshTableData();
  };

  const onApplyNewFilter = (whereClause: string) => {
    whereClauses.value = whereClause;
    refreshTableData();
  };

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
    data,
    status,
    refreshTableData,
    refreshCount,
    totalRows,
    onApplyNewFilter,
    baseQueryString,
    openErrorModal,
    onUpdateOrderBy,
    orderBy,
    errorMessage,
  };
};
