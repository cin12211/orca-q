import type { ComposeOperator } from '~/core/constants/operatorSets';
import type { FilterSchema } from '~/core/helpers/sql-where-clause';

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
