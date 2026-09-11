import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';

export type MongoSandboxRpcRequest =
  | { id: string; kind: 'database-call'; method: string; args: unknown[] }
  | {
      id: string;
      kind: 'collection-call';
      collection: string;
      method: string;
      args: unknown[];
    }
  | { id: string; kind: 'cursor-open'; descriptor: MongoCursorDescriptor }
  | { id: string; kind: 'cursor-next'; cursorId: string; batchSize: number }
  | { id: string; kind: 'cursor-close'; cursorId: string };

export interface MongoCursorDescriptor {
  source:
    | {
        target: 'collection';
        collection: string;
        method: 'find' | 'aggregate' | 'listIndexes';
        args: unknown[];
      }
    | { target: 'database'; method: 'listCollections'; args: unknown[] };
  modifiers: { method: string; args: unknown[] }[];
}

export type MongoSandboxRpcResponse =
  | { ok: true; value?: unknown; cursorId?: string }
  | { ok: false; error: string };

export interface MongoRuntimeOptions {
  approvedOperations: MongoRawQueryOperation[];
  maxDocuments: number;
  maxValueBytes?: number;
}

export interface MongoCapabilityHostContract {
  execute(request: MongoSandboxRpcRequest): Promise<MongoSandboxRpcResponse>;
  streamDescriptor(
    descriptor: MongoCursorDescriptor,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void> | void
  ): Promise<{ rowCount: number; truncated: boolean }>;
  closeAll(): Promise<void>;
}
