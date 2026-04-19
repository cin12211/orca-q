import type { EnvironmentTag } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class EnvironmentTagStorage extends IDBStorage<EnvironmentTag> {
  readonly name = 'environmentTag';

  constructor() {
    super({ dbName: 'environmentTagIDB', storeName: 'environment_tags' });
  }

  async getAll(): Promise<EnvironmentTag[]> {
    return this.getMany();
  }

  async replaceAll(tags: EnvironmentTag[]): Promise<void> {
    // Clear all existing records
    const all = await this.getMany();
    await Promise.all(all.map(t => this.delete(t.id)));
    // Upsert new records
    await Promise.all(tags.map(t => this.upsert(t)));
  }
}

export const environmentTagStorage = new EnvironmentTagStorage();
