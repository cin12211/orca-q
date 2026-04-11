import dayjs from 'dayjs';
import localforage from 'localforage';
import type { EnvironmentTag } from '~/components/modules/environment-tag/types/environmentTag.types';
import type { EnvironmentTagPersistApi } from '../../types';

const store = localforage.createInstance({
  name: 'environmentTagIDB',
  storeName: 'environmentTags',
});

export const environmentTagIDBAdapter: EnvironmentTagPersistApi = {
  getAll: async () => {
    const all: EnvironmentTag[] = [];
    const keys = await store.keys();
    for (const key of keys) {
      const item = await store.getItem<EnvironmentTag>(key);
      if (item) all.push(item);
    }
    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getOne: async id => {
    return store.getItem<EnvironmentTag>(id);
  },

  create: async tag => {
    const entry: EnvironmentTag = {
      ...tag,
      createdAt: tag.createdAt || dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  update: async tag => {
    const existing = await store.getItem<EnvironmentTag>(tag.id);
    if (!existing) return null;
    const updated: EnvironmentTag = { ...existing, ...tag };
    await store.setItem(updated.id, updated);
    return updated;
  },

  delete: async id => {
    await store.removeItem(id);
  },
};
