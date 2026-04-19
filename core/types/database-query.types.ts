import type { DatabaseError } from 'pg';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { NormalizationError } from '~/core/helpers/database-error';

export interface QueryResult {
  result: Record<string, unknown>[];
  queryTime: number;
}

export interface DatabaseField {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

export interface RawQueryResultWithMetadata {
  rows: Record<string, unknown>[];
  fields: DatabaseField[] | any[];
  queryTime: number;
}

export interface BaseDatabaseError extends Error {
  dbType: DatabaseClientType | 'unknown';
  normalizeError?: NormalizationError & {
    dbType: DatabaseClientType | 'unknown';
  };
}

export type PostgresDatabaseError = {
  dbType: DatabaseClientType.POSTGRES;
} & DatabaseError;

export interface MysqlDatabaseError extends BaseDatabaseError {
  dbType: DatabaseClientType.MYSQL;
  code?: string;
  errno?: number;
  sqlMessage?: string;
  sqlState?: string;
}

export interface SqliteDatabaseError extends BaseDatabaseError {
  dbType: DatabaseClientType.SQLITE3;
  code?: string;
  errno?: number;
}

export interface UnknownDatabaseError extends BaseDatabaseError {
  dbType: 'unknown';
}

export type DatabaseDriverError =
  | PostgresDatabaseError
  | MysqlDatabaseError
  | SqliteDatabaseError
  | UnknownDatabaseError;
