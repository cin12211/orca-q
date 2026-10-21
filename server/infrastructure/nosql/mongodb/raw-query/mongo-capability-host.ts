import { MONGO_RAW_QUERY_LIMITS } from '~/core/constants/mongodb-raw-query';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';
import {
  isMongoWriteCommand,
  isMongoWriteMethod,
  MONGO_COLLECTION_CURSOR_SOURCE_METHODS,
  MONGO_CURSOR_MODIFIERS_BY_SOURCE,
  MONGO_DATABASE_CURSOR_SOURCE_METHODS,
  MONGO_DATABASE_METHODS,
  MONGO_COLLECTION_READ_METHODS,
  MONGO_COLLECTION_WRITE_METHODS,
} from './mongo-operation-catalog';

type NativeCursor = {
  next(): Promise<unknown>;
  close?(): Promise<void> | void;
  [key: string]: any;
};

export type MongoDirectCursor = {
  __mongoCursor: true;
  [key: string]: any;
};

export interface MongoDbFacade {
  collection(name: string): Record<string, (...args: any[]) => any>;
  listCollections: (...args: any[]) => MongoDirectCursor;
  command: (...args: any[]) => Promise<unknown>;
  getSiblingDB(name: string): MongoDbFacade;
}

export interface MongoRuntimeOptions {
  approvedOperations: MongoRawQueryOperation[];
  maxDocuments: number;
  maxValueBytes?: number;
  databaseName?: string;
  getDatabase?: (databaseName: string) => any;
}

let bsonEjson:
  | {
      deserialize(value: any, options?: any): any;
      serialize(value: any, options?: any): any;
    }
  | undefined;
try {
  // Keep the host importable in Bun unit tests where mongodb's v8 snapshot hook is unavailable.
  bsonEjson = require('mongodb').BSON.EJSON;
} catch {
  bsonEjson = undefined;
}

const ejsonDeserialize = (value: unknown): any =>
  bsonEjson?.deserialize(value as any, { relaxed: false }) ?? value;
const ejsonSerialize = (value: unknown): any =>
  bsonEjson?.serialize(value, { relaxed: false }) ?? value;

const aggregateWriteMethod = (
  args: unknown[]
): '$merge' | '$out' | undefined => {
  const pipeline = args[0];
  if (!Array.isArray(pipeline)) return undefined;
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) continue;
    if ('$merge' in stage) return '$merge';
    if ('$out' in stage) return '$out';
  }
  return undefined;
};

export class MongoCapabilityHost {
  private readonly directCursors = new Set<NativeCursor>();
  private readonly directCursorMap = new WeakMap<object, NativeCursor>();
  private readonly database: any;
  private readonly options: MongoRuntimeOptions;

  constructor(database: any, options: MongoRuntimeOptions) {
    this.database = database;
    this.options = options;
  }

  private isApproved(
    target: 'database' | 'collection',
    method: string,
    collection?: string,
    databaseName?: string
  ) {
    return this.options.approvedOperations.some(
      operation =>
        operation.target === target &&
        operation.method === method &&
        (operation.dynamicDatabase ||
          operation.database === databaseName ||
          (!operation.database &&
            databaseName === this.options.databaseName)) &&
        (operation.dynamicTarget || operation.collection === collection)
    );
  }

  private resolveDatabase(databaseName?: string) {
    if (
      databaseName === this.options.databaseName ||
      (!databaseName && !this.options.databaseName)
    ) {
      return this.database;
    }
    const database = this.options.getDatabase?.(databaseName as string);
    if (!database) {
      throw new Error(`Mongo database is unavailable: ${databaseName}`);
    }
    return database;
  }

  private assertMethod(target: 'database' | 'collection', method: string) {
    const allowed =
      target === 'database'
        ? [...MONGO_DATABASE_METHODS, ...MONGO_DATABASE_CURSOR_SOURCE_METHODS]
        : [
            ...MONGO_COLLECTION_READ_METHODS,
            ...MONGO_COLLECTION_CURSOR_SOURCE_METHODS,
            ...MONGO_COLLECTION_WRITE_METHODS,
          ];
    if (!(allowed as readonly string[]).includes(method))
      throw new Error(`Unsupported Mongo method: ${method}`);
  }

  private assertWriteApproved(
    target: 'database' | 'collection',
    method: string,
    collection?: string,
    databaseName?: string
  ) {
    if (
      (target === 'collection' && isMongoWriteMethod(method)) ||
      (target === 'database' &&
        (isMongoWriteCommand(method) || method === 'command'))
    ) {
      if (!this.isApproved(target, method, collection, databaseName))
        throw new Error('Write operation is not approved');
    }
  }

  private assertAggregateWriteApproved(
    target: 'database' | 'collection',
    method: string,
    collection: string | undefined,
    args: unknown[],
    databaseName?: string
  ) {
    if (target !== 'collection' || method !== 'aggregate') return;
    const writeMethod = aggregateWriteMethod(args);
    if (
      writeMethod &&
      !this.isApproved(
        target,
        `aggregate:${writeMethod}`,
        collection,
        databaseName
      )
    ) {
      throw new Error('Write operation is not approved');
    }
  }

  private async callNative(
    target: 'database' | 'collection',
    method: string,
    args: unknown[],
    collection?: string,
    databaseName?: string
  ) {
    this.assertMethod(target, method);
    this.assertWriteApproved(target, method, collection, databaseName);
    this.assertAggregateWriteApproved(
      target,
      method,
      collection,
      args,
      databaseName
    );
    const owner =
      target === 'database'
        ? this.resolveDatabase(databaseName)
        : this.resolveDatabase(databaseName).collection(collection);
    const value = await owner[method](...args.map(ejsonDeserialize));
    const serialized = ejsonSerialize(value);
    if (
      Buffer.byteLength(JSON.stringify(serialized), 'utf8') >
      (this.options.maxValueBytes ?? MONGO_RAW_QUERY_LIMITS.maxValueBytes)
    ) {
      throw new Error('Mongo result exceeds the configured value limit');
    }
    return serialized;
  }

  private createDirectCursor(
    target: 'database' | 'collection',
    method: string,
    args: unknown[],
    collection?: string,
    databaseName?: string
  ): MongoDirectCursor {
    this.assertMethod(target, method);
    this.assertAggregateWriteApproved(
      target,
      method,
      collection,
      args,
      databaseName
    );
    const owner =
      target === 'database'
        ? this.resolveDatabase(databaseName)
        : this.resolveDatabase(databaseName).collection(collection);
    const cursor = owner[method](...args.map(ejsonDeserialize)) as NativeCursor;
    const facade: MongoDirectCursor = {
      __mongoCursor: true,
    };
    this.directCursors.add(cursor);
    this.directCursorMap.set(facade, cursor);
    const cursorModifiers = MONGO_CURSOR_MODIFIERS_BY_SOURCE as Record<
      string,
      readonly string[]
    >;
    const allowed = cursorModifiers[method] ?? [];
    for (const modifier of allowed) {
      facade[modifier] = (...modifierArgs: unknown[]) => {
        cursor[modifier](...modifierArgs.map(ejsonDeserialize));
        return facade;
      };
    }
    return facade;
  }

  createFacade(databaseName = this.options.databaseName): MongoDbFacade {
    const collection = (name: string) => {
      const facade: Record<string, (...args: any[]) => any> = {};
      for (const method of [
        ...MONGO_COLLECTION_READ_METHODS,
        ...MONGO_COLLECTION_CURSOR_SOURCE_METHODS,
        ...MONGO_COLLECTION_WRITE_METHODS,
      ]) {
        facade[method] = (...args: unknown[]) =>
          (
            MONGO_COLLECTION_CURSOR_SOURCE_METHODS as readonly string[]
          ).includes(method)
            ? this.createDirectCursor(
                'collection',
                method,
                args,
                name,
                databaseName
              )
            : this.callNative('collection', method, args, name, databaseName);
      }
      return facade;
    };

    return {
      collection,
      listCollections: (...args) =>
        this.createDirectCursor(
          'database',
          'listCollections',
          args,
          undefined,
          databaseName
        ),
      command: (...args) =>
        this.callNative('database', 'command', args, undefined, databaseName),
      getSiblingDB: name => {
        if (!name || typeof name !== 'string') {
          throw new Error('Mongo database name must be a non-empty string');
        }
        if (!this.options.getDatabase) {
          throw new Error('Mongo database switching is unavailable');
        }
        return this.createFacade(name);
      },
    };
  }

  async streamCursor(
    facade: MongoDirectCursor,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void> | void
  ) {
    if (!isMongoDirectCursor(facade)) throw new Error('Invalid Mongo cursor');
    const cursor = this.directCursorMap.get(facade);
    if (!cursor) throw new Error('Mongo cursor is missing or closed');
    let rowCount = 0;
    let truncated = false;
    try {
      while (rowCount < this.options.maxDocuments) {
        const rows: Record<string, unknown>[] = [];
        while (
          rows.length < Math.min(100, this.options.maxDocuments - rowCount)
        ) {
          const value = await cursor.next();
          if (value == null) break;
          rows.push(ejsonSerialize(value));
        }
        if (!rows.length) break;
        rowCount += rows.length;
        await onBatch(rows);
      }
      truncated = rowCount >= this.options.maxDocuments;
      return { rowCount, truncated };
    } finally {
      await cursor.close?.();
      this.directCursors.delete(cursor);
    }
  }

  async closeAll() {
    await Promise.all(
      [...this.directCursors].map(async cursor => {
        await cursor.close?.();
        this.directCursors.delete(cursor);
      })
    );
  }
}

export function isMongoDirectCursor(
  value: unknown
): value is MongoDirectCursor {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as MongoDirectCursor).__mongoCursor === true
  );
}

export function createMongoCapabilityHost(
  database: any,
  options: MongoRuntimeOptions
) {
  return new MongoCapabilityHost(database, options);
}
