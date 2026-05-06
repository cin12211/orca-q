import { createError } from 'h3';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import { delimiter, extname, join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ExportFormat, NativeBackupRuntimeCapability } from '~/core/types';

export type NativeBackupToolName =
  | 'pg_dump'
  | 'pg_restore'
  | 'psql'
  | 'mysqlpump'
  | 'mysqldump'
  | 'mysql'
  | 'sqlite3'
  | 'expdp'
  | 'impdp';

export type NativeBackupFileKind = 'archive' | 'sql';

export type NativeExportFormat = Extract<ExportFormat, 'plain' | 'custom'>;

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

const POSTGRES_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: 'custom',
    fileExtension: '.dump',
    fileKind: 'archive',
    label: 'PostgreSQL custom archive (.dump)',
    importTool: 'pg_restore',
  },
  {
    format: 'plain',
    fileExtension: '.sql',
    fileKind: 'sql',
    label: 'PostgreSQL plain SQL script (.sql)',
    importTool: 'psql',
  },
];

const MYSQL_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: 'plain',
    fileExtension: '.sql',
    fileKind: 'sql',
    label: 'MySQL SQL dump (.sql)',
    importTool: 'mysql',
  },
];

const SQLITE_FORMAT_OPTIONS: NativeBackupFormatOption[] = [
  {
    format: 'plain',
    fileExtension: '.sql',
    fileKind: 'sql',
    label: 'SQLite SQL dump (.sql)',
    importTool: 'sqlite3',
  },
];

const POSTGRES_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: POSTGRES_FORMAT_OPTIONS,
  defaultExportFormat: 'custom',
  exportToolCandidates: ['pg_dump'],
  importToolCandidates: ['pg_restore', 'psql'],
  label: 'PostgreSQL native backup',
};

const MYSQL_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: MYSQL_FORMAT_OPTIONS,
  defaultExportFormat: 'plain',
  exportToolCandidates: ['mysqlpump', 'mysqldump'],
  importToolCandidates: ['mysql'],
  label: 'MySQL SQL dump',
};

const SQLITE_CAPABILITY: NativeBackupCapability = {
  supported: true,
  formatOptions: SQLITE_FORMAT_OPTIONS,
  defaultExportFormat: 'plain',
  exportToolCandidates: ['sqlite3'],
  importToolCandidates: ['sqlite3'],
  label: 'SQLite SQL dump',
};

const ORACLE_UNSUPPORTED_REASON =
  'Oracle Data Pump writes dump files through a server-side DIRECTORY object. HeraQ needs explicit Oracle DIRECTORY and artifact retrieval configuration before expdp/impdp can be exposed as a downloadable native backup flow.';

function buildNativeBackupToolHint(capability: NativeBackupCapability) {
  return [
    ...new Set([
      ...capability.exportToolCandidates,
      ...capability.importToolCandidates,
    ]),
  ].join(' / ');
}

function formatNativeToolList(tools: NativeBackupToolName[]) {
  return [...new Set(tools)].join(' / ');
}

async function hasExecutable(candidatePath: string) {
  try {
    await access(
      candidatePath,
      process.platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK
    );
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutablePath(command: NativeBackupToolName) {
  const pathValue = process.env.PATH || '';

  if (!pathValue) {
    return null;
  }

  const pathEntries = pathValue.split(delimiter).filter(Boolean);
  const hasKnownExtension = extname(command).length > 0;
  const candidateNames =
    process.platform === 'win32' && !hasKnownExtension
      ? [
          command,
          ...(process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
            .split(';')
            .filter(Boolean)
            .map(extension => `${command}${extension.toLowerCase()}`),
        ]
      : [command];

  for (const pathEntry of pathEntries) {
    for (const candidateName of candidateNames) {
      const candidatePath = join(pathEntry, candidateName);

      if (await hasExecutable(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

async function resolveAvailableTools(candidates: NativeBackupToolName[]) {
  const uniqueCandidates = [...new Set(candidates)];
  const results = await Promise.all(
    uniqueCandidates.map(async tool => ({
      tool,
      path: await resolveExecutablePath(tool),
    }))
  );

  return results.filter(result => Boolean(result.path));
}

function buildRuntimeUnavailableMessage(
  actionLabel: 'backup' | 'restore',
  tools: NativeBackupToolName[]
) {
  return `Native ${actionLabel} requires ${formatNativeToolList(tools)} on PATH.`;
}

export async function getNativeBackupRuntimeCapability(
  type?: DatabaseClientType | null
): Promise<NativeBackupRuntimeCapability> {
  const capability = getNativeBackupCapability(type);
  const availableExportTools = capability.supported
    ? await resolveAvailableTools(capability.exportToolCandidates)
    : [];
  const availableImportTools = capability.supported
    ? await resolveAvailableTools(capability.importToolCandidates)
    : [];
  const exportToolNames = availableExportTools.map(tool => tool.tool);
  const importToolNames = availableImportTools.map(tool => tool.tool);
  const missingExportTools = capability.exportToolCandidates.filter(
    tool => !exportToolNames.includes(tool)
  );
  const missingImportTools = capability.importToolCandidates.filter(
    tool => !importToolNames.includes(tool)
  );
  const exportAvailable = capability.supported && exportToolNames.length > 0;
  const importAvailable = capability.supported && importToolNames.length > 0;
  const available = exportAvailable || importAvailable;
  const exportMessage = !capability.supported
    ? capability.reason ||
      `${type || 'Unknown'} native backup is not supported.`
    : exportAvailable
      ? `Native backup is ready via ${formatNativeToolList(exportToolNames)}.`
      : `${buildRuntimeUnavailableMessage('backup', capability.exportToolCandidates)} Install the missing tool and retry.`;
  const importMessage = !capability.supported
    ? capability.reason ||
      `${type || 'Unknown'} native restore is not supported.`
    : importAvailable
      ? `Native restore is ready via ${formatNativeToolList(importToolNames)}.`
      : `${buildRuntimeUnavailableMessage('restore', capability.importToolCandidates)} Install the missing tool and retry.`;

  let supportMessage =
    capability.reason || 'Select a connection to use native backup tools.';

  if (capability.supported) {
    if (exportAvailable && importAvailable) {
      supportMessage = `${capability.label} is ready. ${exportMessage} ${importMessage}`;
    } else if (available) {
      supportMessage = `Native tool availability is partial. ${exportMessage} ${importMessage}`;
    } else {
      supportMessage = `Native tools are missing. ${exportMessage} ${importMessage}`;
    }
  }

  return {
    type: type || null,
    label: capability.label,
    toolHint: buildNativeBackupToolHint(capability),
    supported: capability.supported,
    available,
    exportAvailable,
    importAvailable,
    formatOptions: capability.formatOptions.map(option => ({
      format: option.format,
      extension: option.fileExtension,
      label: option.label,
      fileKind: option.fileKind,
      importTool: option.importTool,
    })),
    acceptExtensions: getNativeBackupImportExtensions(type).join(',') || '.sql',
    defaultExportFormat: capability.defaultExportFormat,
    availableExportTools: exportToolNames,
    availableImportTools: importToolNames,
    missingExportTools,
    missingImportTools,
    supportMessage,
    exportMessage,
    importMessage,
    reason: capability.reason,
  };
}

export async function ensureNativeBackupOperationAvailable(
  type: DatabaseClientType | null | undefined,
  operation: 'export' | 'import',
  fileName?: string
) {
  const capability = await getNativeBackupRuntimeCapability(type);

  if (!capability.supported || !type) {
    throw createError({
      statusCode: 501,
      statusMessage:
        capability.reason ||
        `${type || 'Unknown'} native backup is not supported.`,
    });
  }

  if (operation === 'export' && !capability.exportAvailable) {
    throw createError({
      statusCode: 503,
      statusMessage: capability.exportMessage,
    });
  }

  if (operation === 'import') {
    if (!capability.importAvailable) {
      throw createError({
        statusCode: 503,
        statusMessage: capability.importMessage,
      });
    }

    if (type === DatabaseClientType.POSTGRES && fileName) {
      const requiredImportTool = getNativeBackupImportTool(type, fileName);

      if (!capability.availableImportTools.includes(requiredImportTool)) {
        throw createError({
          statusCode: 503,
          statusMessage: `${requiredImportTool} is required to restore ${fileName}. ${capability.importMessage}`,
        });
      }
    }
  }
}

export function getNativeBackupCapability(
  type?: DatabaseClientType | null
): NativeBackupCapability {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return POSTGRES_CAPABILITY;
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MARIADB:
      return {
        ...MYSQL_CAPABILITY,
        label:
          type === DatabaseClientType.MARIADB
            ? 'MariaDB SQL dump'
            : MYSQL_CAPABILITY.label,
      };
    case DatabaseClientType.SQLITE3:
      return SQLITE_CAPABILITY;
    case DatabaseClientType.ORACLE:
      return {
        supported: false,
        formatOptions: [
          {
            format: 'custom',
            fileExtension: '.dmp',
            fileKind: 'archive',
            label: 'Oracle Data Pump dump (.dmp)',
            importTool: 'impdp',
          },
        ],
        defaultExportFormat: 'custom',
        exportToolCandidates: ['expdp'],
        importToolCandidates: ['impdp'],
        label: 'Oracle Data Pump dump',
        reason: ORACLE_UNSUPPORTED_REASON,
      };
    default:
      return {
        supported: false,
        formatOptions: [],
        defaultExportFormat: null,
        exportToolCandidates: [],
        importToolCandidates: [],
        label: 'Native backup',
        reason: type
          ? `${type} native backup is not supported in this release.`
          : 'Select a connection to use native backup tools.',
      };
  }
}

export function resolveNativeExportFormat(
  type: DatabaseClientType,
  requestedFormat?: ExportFormat | null
): NativeExportFormat {
  const capability = getNativeBackupCapability(type);

  if (!capability.supported || !capability.defaultExportFormat) {
    throw createError({
      statusCode: 501,
      statusMessage:
        capability.reason || `${type} native backup is not supported.`,
    });
  }

  if (!requestedFormat || requestedFormat === 'native') {
    return capability.defaultExportFormat;
  }

  if (requestedFormat !== 'plain' && requestedFormat !== 'custom') {
    throw createError({
      statusCode: 400,
      statusMessage: `${requestedFormat} export format is not supported for ${type}.`,
    });
  }

  if (
    !capability.formatOptions.some(option => option.format === requestedFormat)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `${requestedFormat} export format is not supported for ${type}.`,
    });
  }

  return requestedFormat;
}

export function getNativeBackupFormatOption(
  type: DatabaseClientType,
  requestedFormat?: ExportFormat | null
) {
  const capability = getNativeBackupCapability(type);
  const resolvedFormat = resolveNativeExportFormat(type, requestedFormat);

  return capability.formatOptions.find(
    option => option.format === resolvedFormat
  )!;
}

export function getNativeBackupFileExtension(
  type: DatabaseClientType,
  requestedFormat?: ExportFormat | null
) {
  return getNativeBackupFormatOption(type, requestedFormat).fileExtension;
}

export function getNativeBackupFileKind(
  type: DatabaseClientType,
  requestedFormat?: ExportFormat | null
) {
  return getNativeBackupFormatOption(type, requestedFormat).fileKind;
}

export function getNativeBackupImportExtensions(
  type?: DatabaseClientType | null
) {
  if (!type) {
    return [];
  }

  return [
    ...new Set(
      getNativeBackupCapability(type).formatOptions.map(
        option => option.fileExtension
      )
    ),
  ];
}

export function getNativeBackupImportTool(
  type: DatabaseClientType,
  fileName: string
) {
  const capability = getNativeBackupCapability(type);
  const extension = fileName.toLowerCase().split('.').pop();
  const matched = capability.formatOptions.find(
    option => option.fileExtension.toLowerCase() === `.${extension}`
  );

  if (!matched) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported backup file type for ${type}: ${fileName}`,
    });
  }

  return matched.importTool;
}

export function sanitizeBackupFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-');
}

export function buildNativeBackupFileName(
  databaseName: string,
  type: DatabaseClientType,
  now = new Date(),
  requestedFormat?: ExportFormat | null
) {
  const capability = getNativeBackupCapability(type);

  if (!capability.supported) {
    throw createError({
      statusCode: 501,
      statusMessage:
        capability.reason || `${type} native backup is not supported.`,
    });
  }

  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `${sanitizeBackupFileSegment(databaseName)}_${timestamp}${getNativeBackupFileExtension(type, requestedFormat)}`;
}

export function assertNativeBackupSupported(
  type?: DatabaseClientType | null
): asserts type is DatabaseClientType {
  const capability = getNativeBackupCapability(type);

  if (!capability.supported || !type) {
    throw createError({
      statusCode: 501,
      statusMessage:
        capability.reason ||
        `${type || 'Unknown'} native backup is not supported.`,
    });
  }
}

export function getOracleNativeBackupUnsupportedReason() {
  return ORACLE_UNSUPPORTED_REASON;
}
