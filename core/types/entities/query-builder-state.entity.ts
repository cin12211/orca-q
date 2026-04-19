import type { FilterSchema } from '~/components/modules/quick-query/utils/buildWhereClause';
import type { ComposeOperator } from '~/core/constants/operatorSets';

export type Order = 'ASC' | 'DESC';

export type { FilterSchema };

export interface QueryBuilderPagination {
  limit: number;
  offset: number;
}

export interface QueryBuilderOrderBy {
  columnName?: string;
  order?: Order;
}

export interface QueryBuilderState {
  /** Composite key: `${workspaceId}-${connectionId}-${schemaName}-${tableName}` */
  id: string;
  workspaceId: string;
  connectionId: string;
  schemaName: string;
  tableName: string;
  filters: FilterSchema[];
  pagination: QueryBuilderPagination;
  orderBy: QueryBuilderOrderBy;
  isShowFilters: boolean;
  composeWith: ComposeOperator;
  updatedAt: string;
}
