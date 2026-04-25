import {
  APP_CONFIG_PERSIST_ID,
  normalizeAppConfigState,
  type AppConfigPersistedState,
} from '../../store-state';
import type { AppConfigPersistApi } from '../../types';
import { persistDelete, persistGetOne, persistUpsert } from './primitives';

export const appConfigElectronAdapter: AppConfigPersistApi = {
  get: async () => {
    const value = await persistGetOne<AppConfigPersistedState>(
      'appConfig',
      APP_CONFIG_PERSIST_ID
    );
    return value ? normalizeAppConfigState(value) : null;
  },

  save: async state => {
    const normalized = normalizeAppConfigState(state);
    return persistUpsert<AppConfigPersistedState>(
      'appConfig',
      normalized.id,
      normalized
    );
  },

  delete: async () => {
    await persistDelete(
      'appConfig',
      [{ field: 'id', value: APP_CONFIG_PERSIST_ID }],
      'all'
    );
  },
};
