import { delimiter } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  NativeBackupFileKind,
  NativeBackupTool,
  NativeExportFormat,
  type NativeBackupToolName,
} from '~/core/types';

export interface NativeBackupFormatOption {
  format: NativeExportFormat;
  fileExtension: string;
  fileKind: NativeBackupFileKind;
  label: string;
  importTool: NativeBackupToolName;
}

export interface NativeBackupCapability {
  supported: boolean;
  formatOptions: NativeBackupFormatOption[];
  defaultExportFormat: NativeExportFormat | null;
  exportToolCandidates: NativeBackupToolName[];
  importToolCandidates: NativeBackupToolName[];
  label: string;
  reason?: string;
}

export const DARWIN_STANDARD_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/Applications/Postgres.app/Contents/Versions/latest/bin',
];

export const LINUX_STANDARD_PATHS = [
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];

export const WIN32_STANDARD_PATHS = [
  'C:\\Program Files\\PostgreSQL\\16\\bin',
  'C:\\Program Files\\PostgreSQL\\15\\bin',
  'C:\\Program Files\\PostgreSQL\\14\\bin',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin',
  'C:\\tools\\sqlite',
  'C:\\sqlite',
];

export const KNOWN_TOOL_DIRECTORY_PATTERNS: Partial<
  Record<NativeBackupToolName, string[]>
> = {
  [NativeBackupTool.PG_DUMP]: [
    '/Applications/Postgres.app/Contents/Versions/*/bin',
    '/Library/PostgreSQL/*/bin',
    '/opt/homebrew/Cellar/libpq*/*/bin',
    '/opt/homebrew/Cellar/postgresql*/*/bin',
    '/usr/local/Cellar/libpq*/*/bin',
    '/usr/local/Cellar/postgresql*/*/bin',
  ],
  [NativeBackupTool.PG_RESTORE]: [
    '/Applications/Postgres.app/Contents/Versions/*/bin',
    '/Library/PostgreSQL/*/bin',
    '/opt/homebrew/Cellar/libpq*/*/bin',
    '/opt/homebrew/Cellar/postgresql*/*/bin',
    '/usr/local/Cellar/libpq*/*/bin',
    '/usr/local/Cellar/postgresql*/*/bin',
  ],
  [NativeBackupTool.PSQL]: [
    '/Applications/Postgres.app/Contents/Versions/*/bin',
    '/Library/PostgreSQL/*/bin',
    '/opt/homebrew/Cellar/libpq*/*/bin',
    '/opt/homebrew/Cellar/postgresql*/*/bin',
    '/usr/local/Cellar/libpq*/*/bin',
    '/usr/local/Cellar/postgresql*/*/bin',
  ],
  [NativeBackupTool.MYSQLPUMP]: [
    '/opt/homebrew/Cellar/mysql*/*/bin',
    '/opt/homebrew/Cellar/mariadb*/*/bin',
    '/usr/local/Cellar/mysql*/*/bin',
    '/usr/local/Cellar/mariadb*/*/bin',
  ],
  [NativeBackupTool.MYSQLDUMP]: [
    '/opt/homebrew/Cellar/mysql*/*/bin',
    '/opt/homebrew/Cellar/mariadb*/*/bin',
    '/usr/local/Cellar/mysql*/*/bin',
    '/usr/local/Cellar/mariadb*/*/bin',
  ],
  [NativeBackupTool.MYSQL]: [
    '/opt/homebrew/Cellar/mysql*/*/bin',
    '/opt/homebrew/Cellar/mariadb*/*/bin',
    '/usr/local/Cellar/mysql*/*/bin',
    '/usr/local/Cellar/mariadb*/*/bin',
  ],
};

const POSTGRES_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: NativeExportFormat.CUSTOM,
    fileExtension: '.dump',
    fileKind: NativeBackupFileKind.ARCHIVE,
    label: 'PostgreSQL custom archive (.dump)',
    importTool: NativeBackupTool.PG_RESTORE,
  },
  {
    format: NativeExportFormat.PLAIN,
    fileExtension: '.sql',
    fileKind: NativeBackupFileKind.SQL,
    label: 'PostgreSQL plain SQL script (.sql)',
    importTool: NativeBackupTool.PSQL,
  },
];

const MYSQL_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: NativeExportFormat.PLAIN,
    fileExtension: '.sql',
    fileKind: NativeBackupFileKind.SQL,
    label: 'MySQL SQL dump (.sql)',
    importTool: NativeBackupTool.MYSQL,
  },
];

const SQLITE_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: NativeExportFormat.PLAIN,
    fileExtension: '.sql',
    fileKind: NativeBackupFileKind.SQL,
    label: 'SQLite SQL dump (.sql)',
    importTool: NativeBackupTool.SQLITE3,
  },
];

export const POSTGRES_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: POSTGRES_FORMAT_OPTIONS,
  defaultExportFormat: NativeExportFormat.CUSTOM,
  exportToolCandidates: [NativeBackupTool.PG_DUMP],
  importToolCandidates: [NativeBackupTool.PG_RESTORE, NativeBackupTool.PSQL],
  label: 'PostgreSQL native backup',
};

export const MYSQL_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: MYSQL_FORMAT_OPTIONS,
  defaultExportFormat: NativeExportFormat.PLAIN,
  exportToolCandidates: [
    NativeBackupTool.MYSQLPUMP,
    NativeBackupTool.MYSQLDUMP,
  ],
  importToolCandidates: [NativeBackupTool.MYSQL],
  label: 'MySQL SQL dump',
};

export const SQLITE_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: SQLITE_FORMAT_OPTIONS,
  defaultExportFormat: NativeExportFormat.PLAIN,
  exportToolCandidates: [NativeBackupTool.SQLITE3],
  importToolCandidates: [NativeBackupTool.SQLITE3],
  label: 'SQLite SQL dump',
};

export const ORACLE_UNSUPPORTED_REASON =
  'Oracle Data Pump writes dump files through a server-side DIRECTORY object. HeraQ needs explicit Oracle DIRECTORY and artifact retrieval configuration before expdp/impdp can be exposed as a downloadable native backup flow.';

export function applyPlatformPathFallbacks() {
  const currentPaths = (process.env.PATH || '').split(delimiter);
  const newPaths = [...currentPaths];

  let platformPaths: string[] = [];
  if (process.platform === 'darwin') {
    platformPaths = DARWIN_STANDARD_PATHS;
  } else if (process.platform === 'linux') {
    platformPaths = LINUX_STANDARD_PATHS;
  } else if (process.platform === 'win32') {
    platformPaths = WIN32_STANDARD_PATHS;
  }

  let hasAdded = false;
  for (const pathEntry of platformPaths) {
    if (!newPaths.includes(pathEntry)) {
      newPaths.push(pathEntry);
      hasAdded = true;
    }
  }

  if (hasAdded) {
    process.env.PATH = newPaths.join(delimiter);
  }
}

export function buildNativeBackupToolHint(capability: NativeBackupCapability) {
  return [
    ...new Set([
      ...capability.exportToolCandidates,
      ...capability.importToolCandidates,
    ]),
  ].join(' / ');
}

export function formatNativeToolList(tools: NativeBackupToolName[]) {
  return [...new Set(tools)].join(' / ');
}

export function getMysqlFamilyCapability(type: DatabaseClientType) {
  return {
    ...MYSQL_CAPABILITY,
    label:
      type === DatabaseClientType.MARIADB
        ? 'MariaDB SQL dump'
        : MYSQL_CAPABILITY.label,
  };
}
