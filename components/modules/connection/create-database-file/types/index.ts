import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseFileOptions } from '~/core/constants/database-file-options';

export type FileDatabaseType =
  | DatabaseClientType.SQLITE3
  | DatabaseClientType.DUCKDB;

export interface CreateDatabaseFileBody {
  type: FileDatabaseType;
  directory: string;
  fileName: string;
  options?: DatabaseFileOptions;
}
