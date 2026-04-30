import type { ExportFormat } from '~/core/types';
import { DatabaseClientType } from './database-client-type';

export const LEGACY_LOGICAL_BACKUP_EXTENSION = '.heraq-db.json';
export const LEGACY_LOGICAL_BACKUP_LABEL =
  'HeraQ Logical Backup (.heraq-db.json)';

type NativeExportFormat = Extract<ExportFormat, 'plain' | 'custom'>;

interface NativeBackupFormatOption {
  format: NativeExportFormat;
  extension: string;
  label: string;
}

interface NativeBackupInfo {
  label: string;
  tools: string;
  supported: boolean;
  defaultFormat: NativeExportFormat;
  formats: NativeBackupFormatOption[];
  reason?: string;
}

const NATIVE_BACKUP_INFO = {
  [DatabaseClientType.POSTGRES]: {
    label: 'PostgreSQL native backup artifacts',
    tools: 'pg_dump / pg_restore / psql',
    supported: true,
    defaultFormat: 'custom',
    formats: [
      {
        format: 'custom',
        extension: '.dump',
        label: 'PostgreSQL custom archive (.dump)',
      },
      {
        format: 'plain',
        extension: '.sql',
        label: 'PostgreSQL plain SQL script (.sql)',
      },
    ],
  },
  [DatabaseClientType.MYSQL]: {
    label: 'MySQL native SQL dump (.sql)',
    tools: 'mysqlpump or mysqldump / mysql',
    supported: true,
    defaultFormat: 'plain',
    formats: [
      {
        format: 'plain',
        extension: '.sql',
        label: 'MySQL native SQL dump (.sql)',
      },
    ],
  },
  [DatabaseClientType.MARIADB]: {
    label: 'MariaDB native SQL dump (.sql)',
    tools: 'mysqlpump or mysqldump / mysql',
    supported: true,
    defaultFormat: 'plain',
    formats: [
      {
        format: 'plain',
        extension: '.sql',
        label: 'MariaDB native SQL dump (.sql)',
      },
    ],
  },
  [DatabaseClientType.SQLITE3]: {
    label: 'SQLite native SQL dump (.sql)',
    tools: 'sqlite3 .dump / sqlite3',
    supported: true,
    defaultFormat: 'plain',
    formats: [
      {
        format: 'plain',
        extension: '.sql',
        label: 'SQLite native SQL dump (.sql)',
      },
    ],
  },
  [DatabaseClientType.ORACLE]: {
    label: 'Oracle Data Pump dump (.dmp)',
    tools: 'expdp / impdp',
    supported: false,
    defaultFormat: 'custom',
    formats: [
      {
        format: 'custom',
        extension: '.dmp',
        label: 'Oracle Data Pump dump (.dmp)',
      },
    ],
    reason:
      'Oracle native backup is not enabled yet because Data Pump writes files to a server-side DIRECTORY object. HeraQ needs explicit Oracle DIRECTORY and artifact retrieval configuration before this can be offered safely.',
  },
} as const satisfies Partial<Record<DatabaseClientType, NativeBackupInfo>>;

type SupportedNativeBackupType = keyof typeof NATIVE_BACKUP_INFO;

export function getDatabaseClientLabel(type?: DatabaseClientType | null) {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return 'PostgreSQL';
    case DatabaseClientType.MYSQL:
      return 'MySQL';
    case DatabaseClientType.MARIADB:
      return 'MariaDB';
    case DatabaseClientType.SQLITE3:
      return 'SQLite';
    case DatabaseClientType.ORACLE:
      return 'Oracle';
    case DatabaseClientType.MSSQL:
      return 'SQL Server';
    case DatabaseClientType.REDIS:
      return 'Redis';
    case DatabaseClientType.SNOWFLAKE:
      return 'Snowflake';
    default:
      return type || 'database';
  }
}

function getNativeBackupInfo(type?: DatabaseClientType | null) {
  if (!type) {
    return null;
  }

  return NATIVE_BACKUP_INFO[type as SupportedNativeBackupType] || null;
}

function resolveNativeBackupFormatOption(
  type?: DatabaseClientType | null,
  requestedFormat?: ExportFormat | null
) {
  const info = getNativeBackupInfo(type);

  if (!info) {
    return null;
  }

  if (!requestedFormat || requestedFormat === 'native') {
    return (
      info.formats.find(format => format.format === info.defaultFormat) ||
      info.formats[0] ||
      null
    );
  }

  if (requestedFormat !== 'plain' && requestedFormat !== 'custom') {
    return null;
  }

  return info.formats.find(format => format.format === requestedFormat) || null;
}

export function isNativeBackupSupported(
  type?: DatabaseClientType | null
): boolean {
  return Boolean(getNativeBackupInfo(type)?.supported);
}

export function getNativeBackupFormatOptions(type?: DatabaseClientType | null) {
  return getNativeBackupInfo(type)?.formats || [];
}

export function getDefaultNativeBackupFormat(type?: DatabaseClientType | null) {
  return getNativeBackupInfo(type)?.defaultFormat || 'plain';
}

export function getNativeBackupExtension(
  type?: DatabaseClientType | null,
  requestedFormat?: ExportFormat | null
) {
  return (
    resolveNativeBackupFormatOption(type, requestedFormat)?.extension || '.sql'
  );
}

export function getNativeBackupAcceptExtensions(
  type?: DatabaseClientType | null
) {
  const extensions = getNativeBackupFormatOptions(type).map(
    format => format.extension
  );

  return [...new Set(extensions)].join(',') || '.sql';
}

export function getNativeBackupLabel(
  type?: DatabaseClientType | null,
  requestedFormat?: ExportFormat | null
) {
  return (
    resolveNativeBackupFormatOption(type, requestedFormat)?.label ||
    getNativeBackupInfo(type)?.label ||
    'Native database backup artifact'
  );
}

export function getNativeBackupToolHint(type?: DatabaseClientType | null) {
  return getNativeBackupInfo(type)?.tools || 'Native database tools';
}

export function getNativeBackupSupportMessage(
  type?: DatabaseClientType | null
) {
  if (!type) {
    return 'Select a connection to open database tools.';
  }

  const info = getNativeBackupInfo(type);

  if (!info) {
    return `${getDatabaseClientLabel(type)} native backup is not supported in this release.`;
  }

  if (info.supported) {
    const supportedFormats = info.formats
      .map(format => format.extension)
      .join(' / ');
    return `${getDatabaseClientLabel(type)} native backup supports ${supportedFormats} via ${info.tools}.`;
  }

  return info.reason;
}

export const HERAQ_LOGICAL_BACKUP_EXTENSION = LEGACY_LOGICAL_BACKUP_EXTENSION;
export const HERAQ_LOGICAL_BACKUP_LABEL = LEGACY_LOGICAL_BACKUP_LABEL;
export const LOGICAL_BACKUP_SUPPORTED_TYPES: DatabaseClientType[] = [];
export const isLogicalBackupSupported = isNativeBackupSupported;
export const getLogicalBackupSupportMessage = getNativeBackupSupportMessage;
