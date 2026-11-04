import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ExportOptions, ImportOptions } from '~/core/types';
import type {
  ISSLConfig,
  ISSHConfig,
} from '~/core/types/entities/connection.entity';

export const SUPPORTED_LOGICAL_BACKUP_TYPES = new Set<DatabaseClientType>([
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.ORACLE,
]);

export const LOGICAL_BACKUP_VERSION = 1;
export const LOGICAL_BACKUP_KIND = 'heraq-logical-backup';
export const INSERT_BATCH_SIZE = 250;

export type BackupConnectionParams = {
  dbConnectionString: string;
  databaseName?: string;
  type?: DatabaseClientType;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
};

export type LogicalBackupTable = {
  schema: string;
  name: string;
  kind: string;
  owner: string | null;
  comment: string | null;
  dependencies: string[];
  rowCount: number;
  ddl?: string;
  rows?: Record<string, unknown>[];
};

export type LogicalDatabaseBackup = {
  version: number;
  kind: typeof LOGICAL_BACKUP_KIND;
  exportedAt: string;
  dbType: DatabaseClientType;
  databaseName: string;
  scope: ExportOptions['scope'];
  tables: LogicalBackupTable[];
};

export type BuildLogicalBackupParams = BackupConnectionParams & {
  options: ExportOptions;
};

export type RestoreLogicalBackupParams = BackupConnectionParams & {
  options: ImportOptions;
  content: string;
};
