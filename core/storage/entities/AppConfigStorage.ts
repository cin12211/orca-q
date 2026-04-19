import { normalizeAppConfigState } from '~/core/persist/store-state';
import type { AppConfigPersistedState } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

interface AppConfigRecord {
  id: string;
  data: AppConfigPersistedState;
}

class AppConfigStorage extends IDBStorage<AppConfigRecord> {
  readonly name = 'appConfig';
  private static readonly KEY = 'app-config';

  constructor() {
    super({ dbName: 'appConfigIDB', storeName: 'app_config' });
  }

  async get(): Promise<AppConfigPersistedState> {
    const record = await this.getOne(AppConfigStorage.KEY);
    return normalizeAppConfigState(record?.data ?? {});
  }

  async save(state: AppConfigPersistedState): Promise<void> {
    await this.upsert({
      id: AppConfigStorage.KEY,
      data: normalizeAppConfigState(state),
    });
  }

  async deleteConfig(): Promise<void> {
    await this.delete(AppConfigStorage.KEY);
  }
}

export const appConfigStorage = new AppConfigStorage();
