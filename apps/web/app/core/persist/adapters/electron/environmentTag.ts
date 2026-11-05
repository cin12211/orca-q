import dayjs from 'dayjs';
import type { EnvironmentTag } from '~/components/modules/environment-tag/types/environmentTag.types';
import type { EnvironmentTagPersistApi } from '../../types';
import {
  persistDelete,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  sortByCreatedAt,
} from './primitives';

export const environmentTagElectronAdapter: EnvironmentTagPersistApi = {
  getAll: async () => {
    return sortByCreatedAt(
      await persistGetAll<EnvironmentTag>('environment-tags')
    );
  },

  getOne: async id => {
    return persistGetOne<EnvironmentTag>('environment-tags', id);
  },

  create: async tag => {
    const entry: EnvironmentTag = {
      ...tag,
      createdAt: tag.createdAt || dayjs().toISOString(),
    };
    return persistUpsert<EnvironmentTag>('environment-tags', entry.id, entry);
  },

  update: async tag => {
    const existing = await persistGetOne<EnvironmentTag>(
      'environment-tags',
      tag.id
    );
    if (!existing) return null;
    const updated: EnvironmentTag = { ...existing, ...tag };
    return persistUpsert<EnvironmentTag>(
      'environment-tags',
      updated.id,
      updated
    );
  },

  delete: async id => {
    await persistDelete<EnvironmentTag>(
      'environment-tags',
      [{ field: 'id', value: id }],
      'all'
    );
  },
};
