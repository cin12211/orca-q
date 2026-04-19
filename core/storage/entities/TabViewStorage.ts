import type { DeleteTabViewProps } from '~/core/persist/types';
import type { TabView } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class TabViewStorage extends IDBStorage<TabView> {
  readonly name = 'tabView';

  constructor() {
    super({ dbName: 'tabViewIDB', storeName: 'tab_views' });
  }

  async getAll(): Promise<TabView[]> {
    return this.getMany();
  }

  async getByContext(ctx: {
    workspaceId: string;
    connectionId: string;
  }): Promise<TabView[]> {
    const all = await this.getMany();
    return all.filter(
      tv =>
        tv.workspaceId === ctx.workspaceId &&
        tv.connectionId === ctx.connectionId
    );
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

  async replaceAll(tabs: TabView[]): Promise<void> {
    // Clear all existing records
    const all = await this.getMany();
    await Promise.all(all.map(tv => this.delete(tv.id)));
    // Upsert new records
    await Promise.all(tabs.map(tab => this.upsert(tab)));
  }
}

export const tabViewStorage = new TabViewStorage();
