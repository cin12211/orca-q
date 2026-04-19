import type { QueryBuilderState } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { QueryBuilderStateRow } from '../schema';

class QueryBuilderStateSQLiteStorage extends SQLite3Storage<QueryBuilderState> {
  readonly name = 'queryBuilderStateSQLite';
  readonly tableName = 'query_builder_states';

  toRow(s: QueryBuilderState): Record<string, unknown> {
    return {
      id: s.id,
      workspace_id: s.workspaceId,
      connection_id: s.connectionId,
      schema_name: s.schemaName,
      table_name: s.tableName,
      filters: JSON.stringify(s.filters),
      pagination: JSON.stringify(s.pagination),
      order_by: JSON.stringify(s.orderBy),
      is_show_filters: s.isShowFilters ? 1 : 0,
      compose_with: s.composeWith,
      updated_at: s.updatedAt,
    };
  }

  fromRow(row: Record<string, unknown>): QueryBuilderState {
    const r = row as unknown as QueryBuilderStateRow;
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      connectionId: r.connection_id,
      schemaName: r.schema_name,
      tableName: r.table_name,
      filters: JSON.parse(r.filters),
      pagination: JSON.parse(r.pagination),
      orderBy: JSON.parse(r.order_by),
      isShowFilters: Boolean(r.is_show_filters),
      composeWith: r.compose_with as QueryBuilderState['composeWith'],
      updatedAt: r.updated_at,
    };
  }

  protected override addDefaultOrder(sql: string): string {
    return `${sql} ORDER BY updated_at ASC`;
  }

  async load(key: string): Promise<QueryBuilderState | null> {
    return this.getOne(key);
  }

  async save(state: QueryBuilderState): Promise<void> {
    await this.upsert(state);
  }

  async remove(key: string): Promise<void> {
    await this.delete(key);
  }

  // No createdAt for qbs records
  protected override applyTimestamps(
    entity: QueryBuilderState
  ): QueryBuilderState {
    return { ...entity, updatedAt: new Date().toISOString() };
  }
}

export const queryBuilderStateSQLiteStorage =
  new QueryBuilderStateSQLiteStorage(getDB());
