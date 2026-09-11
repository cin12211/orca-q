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
import type {
  MongoCapabilityHostContract,
  MongoCursorDescriptor,
  MongoRuntimeOptions,
  MongoSandboxRpcRequest,
  MongoSandboxRpcResponse,
} from './mongo-sandbox-protocol';

type NativeCursor = {
  next(): Promise<unknown>;
  close?(): Promise<void> | void;
  [key: string]: any;
};

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

export class MongoCapabilityHost implements MongoCapabilityHostContract {
  private readonly cursors = new Map<string, NativeCursor>();
  private cursorSequence = 0;
  private readonly database: any;
  private readonly options: MongoRuntimeOptions;

  constructor(database: any, options: MongoRuntimeOptions) {
    this.database = database;
    this.options = options;
  }

  private isApproved(
    target: 'database' | 'collection',
    method: string,
    collection?: string
  ) {
    return this.options.approvedOperations.some(
      operation =>
        operation.target === target &&
        operation.method === method &&
        (operation.dynamicTarget || operation.collection === collection)
    );
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
    collection?: string
  ) {
    if (
      (target === 'collection' && isMongoWriteMethod(method)) ||
      (target === 'database' && isMongoWriteCommand(method))
    ) {
      if (!this.isApproved(target, method, collection))
        throw new Error('Write operation is not approved');
    }
  }

  async execute(
    request: MongoSandboxRpcRequest
  ): Promise<MongoSandboxRpcResponse> {
    if (request.kind === 'cursor-open')
      return this.openCursor(request.descriptor);
    if (request.kind === 'cursor-next')
      return this.nextCursor(request.cursorId, request.batchSize);
    if (request.kind === 'cursor-close')
      return this.closeCursor(request.cursorId);
    const target = request.kind === 'database-call' ? 'database' : 'collection';
    this.assertMethod(target, request.method);
    this.assertWriteApproved(
      target,
      request.method,
      request.kind === 'collection-call' ? request.collection : undefined
    );
    const owner =
      request.kind === 'database-call'
        ? this.database
        : this.database.collection(request.collection);
    const value = await owner[request.method](
      ...request.args.map(ejsonDeserialize)
    );
    const serialized = ejsonSerialize(value);
    if (
      Buffer.byteLength(JSON.stringify(serialized), 'utf8') >
      (this.options.maxValueBytes ?? MONGO_RAW_QUERY_LIMITS.maxValueBytes)
    ) {
      throw new Error('Mongo result exceeds the configured value limit');
    }
    return { ok: true, value: serialized };
  }

  private async openCursor(
    descriptor: MongoCursorDescriptor
  ): Promise<MongoSandboxRpcResponse> {
    const { source } = descriptor;
    this.assertMethod(source.target, source.method);
    const owner =
      source.target === 'database'
        ? this.database
        : this.database.collection(source.collection);
    const cursor = owner[source.method](
      ...source.args.map(ejsonDeserialize)
    ) as NativeCursor;
    const allowed = MONGO_CURSOR_MODIFIERS_BY_SOURCE[
      source.method
    ] as readonly string[];
    for (const modifier of descriptor.modifiers) {
      if (!allowed.includes(modifier.method))
        throw new Error(`Unsupported cursor modifier: ${modifier.method}`);
      cursor[modifier.method](...modifier.args.map(ejsonDeserialize));
    }
    const cursorId = `cursor-${++this.cursorSequence}`;
    this.cursors.set(cursorId, cursor);
    return { ok: true, cursorId };
  }

  private async nextCursor(
    cursorId: string,
    batchSize: number
  ): Promise<MongoSandboxRpcResponse> {
    const cursor = this.cursors.get(cursorId);
    if (!cursor) throw new Error('Cursor is missing or closed');
    const rows: any[] = [];
    const count = Math.max(
      1,
      Math.min(batchSize || 1, this.options.maxDocuments)
    );
    for (let index = 0; index < count; index += 1) {
      const value = await cursor.next();
      if (value == null) break;
      rows.push(ejsonSerialize(value));
    }
    return { ok: true, value: rows };
  }

  private async closeCursor(
    cursorId: string
  ): Promise<MongoSandboxRpcResponse> {
    const cursor = this.cursors.get(cursorId);
    if (cursor) {
      await cursor.close?.();
      this.cursors.delete(cursorId);
    }
    return { ok: true };
  }

  async streamDescriptor(
    descriptor: MongoCursorDescriptor,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void> | void
  ) {
    const opened = await this.openCursor(descriptor);
    if (!opened.ok || !opened.cursorId)
      throw new Error('Unable to open Mongo cursor');
    let rowCount = 0;
    let truncated = false;
    try {
      while (rowCount < this.options.maxDocuments) {
        const next = await this.nextCursor(
          opened.cursorId,
          Math.min(100, this.options.maxDocuments - rowCount)
        );
        const rows = (next.ok ? next.value : []) as Record<string, unknown>[];
        if (!rows.length) break;
        rowCount += rows.length;
        await onBatch(rows);
      }
      truncated = rowCount >= this.options.maxDocuments;
      return { rowCount, truncated };
    } finally {
      await this.closeCursor(opened.cursorId);
    }
  }

  async closeAll() {
    await Promise.all(
      [...this.cursors.keys()].map(cursorId => this.closeCursor(cursorId))
    );
  }
}

export function createMongoCapabilityHost(
  database: any,
  options: MongoRuntimeOptions
) {
  return new MongoCapabilityHost(database, options);
}
