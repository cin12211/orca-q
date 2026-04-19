import type { DeleteQQueryLogsProps } from '~/core/persist/types';
import type { QuickQueryLog } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class QuickQueryLogStorage extends IDBStorage<QuickQueryLog> {
  readonly name = 'quickQueryLog';

  constructor() {
    super({ dbName: 'quickQueryLogIDB', storeName: 'quick_query_logs' });
  }

  async getAll(): Promise<QuickQueryLog[]> {
    return this.getMany();
  }

  async getByContext(ctx: { connectionId: string }): Promise<QuickQueryLog[]> {
    return this.getMany({
      connectionId: ctx.connectionId,
    } as Partial<QuickQueryLog>);
  }

  async deleteByConnectionProps(props: DeleteQQueryLogsProps): Promise<void> {
    const all = await this.getMany();
    const toDelete = all.filter(log => {
      if ('workspaceId' in props) return log.workspaceId === props.workspaceId;
      if ('schemaName' in props) {
        return (
          log.connectionId === props.connectionId &&
          log.schemaName === props.schemaName &&
          log.tableName === props.tableName
        );
      }
      return log.connectionId === props.connectionId;
    });
    await Promise.all(toDelete.map(log => this.delete(log.id)));
  }
}

export const quickQueryLogStorage = new QuickQueryLogStorage();
