import type { EnvironmentTag } from '~/core/types/entities';
import { ENVIRONMENT_TAG_IDB } from '../idbRegistry';
import { IDBStorage } from '../base/IDBStorage';

class EnvironmentTagStorage extends IDBStorage<EnvironmentTag> {
  readonly name = 'environmentTag';

  constructor() {
    super(ENVIRONMENT_TAG_IDB);
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
