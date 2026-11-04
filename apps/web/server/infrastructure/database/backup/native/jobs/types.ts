import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DatabaseTransferJobSnapshot,
  ExportOptions,
  ImportOptions,
  NativeBackupRuntimeSelection,
} from '~/core/types';
import type {
  ISSLConfig,
  ISSHConfig,
} from '~/core/types/entities/connection.entity';
import type { NativeBackupToolName } from '../../native-backup';

export const NATIVE_BACKUP_TTL_MS = 30 * 60 * 1000;

export type NativeBackupConnectionParams = {
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
  runtime?: NativeBackupRuntimeSelection;
};

export type ExportJobParams = NativeBackupConnectionParams & {
  options: ExportOptions;
};

export type ImportJobParams = NativeBackupConnectionParams & {
  options: ImportOptions;
  fileData: Buffer;
  uploadFileName: string;
};

export type PreparedImportJobParams = NativeBackupConnectionParams & {
  options: ImportOptions;
  uploadPath: string;
  uploadFileName: string;
};

export type TempSslFiles = {
  caPath?: string;
  certPath?: string;
  keyPath?: string;
};

export type ResolvedCliConnection = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  sslFiles?: TempSslFiles;
  closeTunnel?: () => Promise<void>;
};

export type NativeBackupJobRecord = DatabaseTransferJobSnapshot & {
  artifactPath?: string;
  artifactContentType?: string;
  tempDir: string;
  uploadPath?: string;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

export type ResolvedNativeToolInvocation = {
  tool: NativeBackupToolName;
  command: string;
  displayName: string;
};

export type JobProgressUpdater = (
  progress: number | null,
  message: string,
  bytes?: number
) => void;
