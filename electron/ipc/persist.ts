import { ipcMain } from 'electron';
import {
  persistDelete,
  persistFind,
  persistGetAll,
  persistGetAllPaginated,
  persistGetOne,
  persistReplaceAll,
  persistUpsert,
  type PersistCollection,
  type PersistFilter,
  type PersistMatchMode,
} from '../persist/store';

export function registerPersistHandlers(): void {
  ipcMain.handle(
    'persist:get-all',
    (_event, { collection }: { collection: PersistCollection }) =>
      persistGetAll(collection)
  );

  ipcMain.handle(
    'persist:get-one',
    (
      _event,
      { collection, id }: { collection: PersistCollection; id: string }
    ) => persistGetOne(collection, id)
  );

  ipcMain.handle(
    'persist:find',
    (
      _event,
      {
        collection,
        filters,
        matchMode,
      }: {
        collection: PersistCollection;
        filters: PersistFilter[];
        matchMode: PersistMatchMode;
      }
    ) => persistFind(collection, filters, matchMode)
  );

  ipcMain.handle(
    'persist:upsert',
    (
      _event,
      {
        collection,
        id,
        value,
      }: {
        collection: PersistCollection;
        id: string;
        value: Record<string, unknown>;
      }
    ) => persistUpsert(collection, id, value)
  );

  ipcMain.handle(
    'persist:delete',
    (
      _event,
      {
        collection,
        filters,
        matchMode,
      }: {
        collection: PersistCollection;
        filters: PersistFilter[];
        matchMode: PersistMatchMode;
      }
    ) => persistDelete(collection, filters, matchMode)
  );

  ipcMain.handle(
    'persist:replace-all',
    (
      _event,
      {
        collection,
        values,
      }: {
        collection: PersistCollection;
        values: Record<string, unknown>[];
      }
    ) => persistReplaceAll(collection, values)
  );

  ipcMain.handle(
    'persist:get-all-paginated',
    (
      _event,
      {
        collection,
        page,
        pageSize,
      }: {
        collection: PersistCollection;
        page: number;
        pageSize: number;
      }
    ) => persistGetAllPaginated(collection, page, pageSize)
  );
}
