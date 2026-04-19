import type { DeleteTabViewProps } from '../../../core/persist/types';
import type { TabView } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { TabViewRow } from '../schema';

class TabViewSQLiteStorage extends SQLite3Storage<TabView> {
  readonly name = 'tabViewSQLite';
  readonly tableName = 'tab_views';

  toRow(tv: TabView): Record<string, unknown> {
    return {
      id: tv.id,
      workspace_id: tv.workspaceId,
      connection_id: tv.connectionId,
      schema_id: tv.schemaId,
      tab_index: tv.index,
      name: tv.name,
      icon: tv.icon,
      icon_class: tv.iconClass ?? null,
      type: tv.type,
      route_name: tv.routeName,
      route_params: tv.routeParams ? JSON.stringify(tv.routeParams) : null,
      metadata: tv.metadata ? JSON.stringify(tv.metadata) : null,
    };
  }

  fromRow(row: Record<string, unknown>): TabView {
    const r = row as unknown as TabViewRow;
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      connectionId: r.connection_id,
      schemaId: r.schema_id,
      index: Number(r.tab_index),
      name: r.name,
      icon: r.icon,
      iconClass: r.icon_class ?? undefined,
      type: r.type as TabView['type'],
      routeName: r.route_name,
      routeParams: r.route_params ? JSON.parse(r.route_params) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    };
  }

  // tab_views has no created_at column
  protected override addDefaultOrder(sql: string): string {
    return `${sql} ORDER BY tab_index ASC`;
  }

  async getAll(): Promise<TabView[]> {
    return this.getMany();
  }

  async getByContext(ctx: {
    workspaceId: string;
    connectionId: string;
  }): Promise<TabView[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM tab_views WHERE workspace_id = ? AND connection_id = ? ORDER BY tab_index ASC`
      )
      .all(ctx.workspaceId, ctx.connectionId) as Record<string, unknown>[];
    return rows.map(r => this.fromRow(r));
  }

  async deleteByProps(props: DeleteTabViewProps): Promise<void> {
    const all = await this.getMany();
    const toDelete = all.filter(tv => {
      if (props.id) return tv.id === props.id;
      if (props.connectionId && props.schemaId) {
        return (
          tv.connectionId === props.connectionId &&
          tv.schemaId === props.schemaId
        );
      }
      if (props.connectionId) return tv.connectionId === props.connectionId;
      return false;
    });
    await Promise.all(toDelete.map(tv => this.delete(tv.id)));
  }

  async bulkDeleteByProps(propsArray: DeleteTabViewProps[]): Promise<void> {
    await Promise.all(propsArray.map(p => this.deleteByProps(p)));
  }
}

export const tabViewSQLiteStorage = new TabViewSQLiteStorage(getDB());
