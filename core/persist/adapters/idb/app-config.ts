import localforage from 'localforage';
import {
  APP_CONFIG_PERSIST_ID,
  normalizeAppConfigState,
  type AppConfigPersistedState,
} from '../../store-state';
import type { AppConfigPersistApi } from '../../types';

const store = localforage.createInstance({
  name: 'appConfigIDB',
  storeName: 'appConfig',
});

export const appConfigIDBAdapter: AppConfigPersistApi = {
  get: async () => {
    const value = await store.getItem<AppConfigPersistedState>(
      APP_CONFIG_PERSIST_ID
    );
    return value ? normalizeAppConfigState(value) : null;
  },

  save: async state => {
    const normalized = normalizeAppConfigState(state);
    await store.setItem(normalized.id, normalized);
    return normalized;
  },

  delete: async () => {
    await store.removeItem(APP_CONFIG_PERSIST_ID);
  },
};
