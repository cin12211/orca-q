import type { TabView } from '~/core/types/entities';
import type { DeleteTabViewProps } from '../../../core/persist/types';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { TabViewRow } from '../schema';

class TabViewSQLiteStorage extends SQLite3Storage<TabView> {
  readonly name = 'tabViewSQLite';
  readonly tableName = 'tab_views';

  toRow(tv: TabView): Record<string, unknown> {
    return {
      id: tv.id,
      workspaceId: tv.workspaceId,
      connectionId: tv.connectionId,
      schemaId: tv.schemaId,
      index: tv.index,
      name: tv.name,
      icon: tv.icon,
      iconClass: tv.iconClass ?? null,
      type: tv.type,
      routeName: tv.routeName,
      routeParams: tv.routeParams ? JSON.stringify(tv.routeParams) : null,
      metadata: tv.metadata ? JSON.stringify(tv.metadata) : null,
    };
  }

  fromRow(row: Record<string, unknown>): TabView {
    const r = row as unknown as TabViewRow;
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      connectionId: r.connectionId,
      schemaId: r.schemaId,
      index: Number(r.index),
      name: r.name,
      icon: r.icon,
      iconClass: r.iconClass ?? undefined,
      type: r.type as TabView['type'],
      routeName: r.routeName,
      routeParams: r.routeParams ? JSON.parse(r.routeParams) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    };
  }

  // tab_views has no createdAt field
  protected override getOrderByColumn(): string | null {
    return 'index';
  }

  async getAll(): Promise<TabView[]> {
    return this.getMany();
  }

  async getByContext(ctx: {
    workspaceId: string;
    connectionId: string;
  }): Promise<TabView[]> {
    const rows = (await this.db(this.tableName)
      .where({ workspaceId: ctx.workspaceId, connectionId: ctx.connectionId })
      .orderBy('index', 'asc')) as Record<string, unknown>[];
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

export const tabViewSQLiteStorage = new TabViewSQLiteStorage(getKnex());
