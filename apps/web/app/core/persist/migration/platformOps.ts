import { isElectron } from '#shared/helpers/environment';
import type { PersistCollection } from '#shared/storage/idbRegistry';
import {
  persistGetAll as electronGetAll,
  persistReplaceAll as electronReplaceAll,
} from '~/core/persist/adapters/electron/primitives';
import {
  idbGetAll,
  idbReplaceAll,
} from '~/core/persist/adapters/idb/primitives';

export type GetAll = <T>(collection: PersistCollection) => Promise<T[]>;
export type ReplaceAll = <T extends { id: string }>(
  collection: PersistCollection,
  values: T[]
) => Promise<void>;

export function getPlatformOps(): { getAll: GetAll; replaceAll: ReplaceAll } {
  if (isElectron()) {
    return {
      getAll: electronGetAll as GetAll,
      replaceAll: electronReplaceAll as unknown as ReplaceAll,
    };
  }
  return { getAll: idbGetAll, replaceAll: idbReplaceAll };
}
