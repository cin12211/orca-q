import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  NativeBackupFileKind,
  NativeBackupTool,
  NativeExportFormat,
  type ExportFormat,
} from '~/core/types';
import {
  getMysqlFamilyCapability,
  type NativeBackupCapability,
  ORACLE_UNSUPPORTED_REASON,
  POSTGRES_CAPABILITY,
  SQLITE_CAPABILITY,
} from './constants';

export function getNativeBackupCapability(
  type?: DatabaseClientType | null
): NativeBackupCapability {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return POSTGRES_CAPABILITY;
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MARIADB:
      return getMysqlFamilyCapability(type);
    case DatabaseClientType.SQLITE3:
      return SQLITE_CAPABILITY;
    case DatabaseClientType.ORACLE:
      return {
        supported: false,
        formatOptions: [
          {
            format: NativeExportFormat.CUSTOM,
            fileExtension: '.dmp',
            fileKind: NativeBackupFileKind.ARCHIVE,
            label: 'Oracle Data Pump dump (.dmp)',
            importTool: NativeBackupTool.IMPDP,
          },
        ],
        defaultExportFormat: NativeExportFormat.CUSTOM,
        exportToolCandidates: [NativeBackupTool.EXPDP],
        importToolCandidates: [NativeBackupTool.IMPDP],
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

  if (
    requestedFormat !== NativeExportFormat.PLAIN &&
    requestedFormat !== NativeExportFormat.CUSTOM
  ) {
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

  return requestedFormat as NativeExportFormat;
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
