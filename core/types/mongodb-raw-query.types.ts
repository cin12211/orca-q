import type { DatabaseMetadataRequestParams } from './database-schemas.types';

export type MongoRawQueryResultKind =
  | 'cursor'
  | 'documents'
  | 'document'
  | 'scalar'
  | 'mutation'
  | 'void';

export type MongoRawQueryErrorPhase =
  | 'validation'
  | 'compile'
  | 'approval'
  | 'execution'
  | 'timeout'
  | 'cancelled'
  | 'serialization'
  | 'connection';

export interface MongoRawQueryOperation {
  id: string;
  target: 'database' | 'collection';
  method: string;
  collection?: string;
  dynamicTarget: boolean;
  risk: 'write' | 'destructive';
  summary: string;
}

export interface MongoRawQueryRequest extends DatabaseMetadataRequestParams {
  connectionId: string;
  script: string;
  params?: Record<string, unknown>;
  collectionContext?: string;
  approvalToken?: string;
  timeoutMs?: number;
}

export interface MongoRawQueryMetadataRequest
  extends DatabaseMetadataRequestParams {
  connectionId: string;
  database: string;
  collectionContext?: string;
}

export interface MongoRawQueryMetadata {
  collections: string[];
  fieldsByCollection: Record<string, string[]>;
}

export interface MongoRawQueryLogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  args: unknown[];
  timestamp?: string;
}

export interface MongoRawQueryDiagnostic {
  message: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string | number;
}

export interface MongoRawQueryMutationSummary {
  acknowledged?: boolean;
  insertedCount?: number;
  matchedCount?: number;
  modifiedCount?: number;
  deletedCount?: number;
  upsertedCount?: number;
  upsertedId?: unknown;
}

export type MongoRawQueryStreamMessage =
  | {
      type: 'approval-required';
      challengeId: string;
      operations: MongoRawQueryOperation[];
    }
  | {
      type: 'meta';
      resultKind: MongoRawQueryResultKind;
      fields: { name: string }[];
      command: 'MONGODB';
    }
  | { type: 'rows'; data: Record<string, unknown>[] }
  | {
      type: 'result';
      data: unknown;
      mutationSummary?: MongoRawQueryMutationSummary;
    }
  | { type: 'log'; entry: MongoRawQueryLogEntry }
  | { type: 'done'; rowCount: number; queryTime: number; truncated: boolean }
  | {
      type: 'error';
      phase: MongoRawQueryErrorPhase;
      message: string;
      diagnostic?: MongoRawQueryDiagnostic;
    };

const MONGO_RAW_QUERY_MESSAGE_TYPES = new Set<string>([
  'approval-required',
  'meta',
  'rows',
  'result',
  'log',
  'done',
  'error',
]);

export function isMongoRawQueryStreamMessage(
  value: unknown
): value is MongoRawQueryStreamMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && MONGO_RAW_QUERY_MESSAGE_TYPES.has(type);
}

export interface MongoRawQueryApprovalRequest {
  challengeId: string;
}

export interface MongoRawQueryApprovalResponse {
  approvalToken: string;
  expiresAt: string;
}

export interface MongoRawQueryAnalysis {
  wrappedSource: string;
  operations: MongoRawQueryOperation[];
  hasReturn: boolean;
  diagnostics: MongoRawQueryDiagnostic[];
}
