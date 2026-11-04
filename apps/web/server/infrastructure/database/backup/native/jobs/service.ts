import { randomUUID } from 'node:crypto';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  assertNativeBackupSupported,
  buildNativeBackupFileName,
  ensureNativeBackupOperationAvailable,
  getNativeBackupCapability,
  getNativeBackupFileKind,
  getNativeBackupImportTool,
} from '../../native-backup';
import {
  estimateExportBytes,
  resolveCliConnection,
  resolveDatabaseName,
} from './connection';
import {
  getMysqlExportCandidates,
  runMysqlExport,
  runPostgresExport,
  runSqliteExport,
} from './export-runners';
import {
  runMysqlImport,
  runPostgresImport,
  runSqliteImport,
} from './import-runners';
import { withCommandFallback } from './process';
import {
  createJobRecord,
  getJob,
  getNativeBackupJobSnapshot,
  getNativeExportDownload,
  scheduleCleanup,
  setJob,
  updateJob,
} from './registry';
import type {
  ExportJobParams,
  ImportJobParams,
  PreparedImportJobParams,
  ResolvedCliConnection,
} from './types';

export {
  getNativeBackupJobSnapshot,
  getNativeExportDownload,
} from './registry';

async function runNativeExportJob(jobId: string, params: ExportJobParams) {
  const record = getJob(jobId);

  if (!record || !params.type) {
    return;
  }

  const startedAt = Date.now();
  let connection: ResolvedCliConnection | null = null;

  try {
    updateJob(jobId, {
      status: 'running',
      stage: 'preparing',
      progress: 5,
      message: 'Preparing native backup job...',
    });

    connection = await resolveCliConnection(params, record.tempDir);
    const estimatedBytes = await estimateExportBytes(params);
    const capability = getNativeBackupCapability(params.type);

    await withCommandFallback(
      params.type === DatabaseClientType.MYSQL ||
        params.type === DatabaseClientType.MARIADB
        ? getMysqlExportCandidates(params)
        : capability.exportToolCandidates,
      async invocation => {
        updateJob(jobId, {
          stage: 'starting',
          progress: 10,
          tool: invocation.displayName,
          message: `Starting ${invocation.displayName}...`,
        });

        if (params.type === DatabaseClientType.POSTGRES) {
          await runPostgresExport(
            invocation,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
          return;
        }

        if (
          params.type === DatabaseClientType.MYSQL ||
          params.type === DatabaseClientType.MARIADB
        ) {
          await runMysqlExport(
            invocation,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
          return;
        }

        if (params.type === DatabaseClientType.SQLITE3) {
          await runSqliteExport(
            invocation,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
        }
      },
      params.runtime
    );

    const fileStat = await stat(record.artifactPath || '');
    updateJob(jobId, {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      bytesProcessed: fileStat.size,
      bytesTotal: fileStat.size,
      message: `Backup is ready. ${fileStat.size} bytes generated.`,
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
      downloadReady: true,
      downloadUrl: `/api/database-export/jobs/${jobId}/download`,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'error',
      stage: 'error',
      progress: null,
      error: error instanceof Error ? error.message : 'Export failed.',
      message: error instanceof Error ? error.message : 'Export failed.',
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } finally {
    await connection?.closeTunnel?.();
    scheduleCleanup(jobId);
  }
}

async function runNativeImportJob(
  jobId: string,
  params: PreparedImportJobParams
) {
  const record = getJob(jobId);

  if (!record || !params.type) {
    return;
  }

  const startedAt = Date.now();
  let connection: ResolvedCliConnection | null = null;

  try {
    updateJob(jobId, {
      status: 'running',
      stage: 'preparing',
      progress: 5,
      message: 'Preparing native restore job...',
    });

    connection = await resolveCliConnection(params, record.tempDir);
    const capability = getNativeBackupCapability(params.type);
    const importToolCandidates =
      params.type === DatabaseClientType.POSTGRES
        ? [getNativeBackupImportTool(params.type, params.uploadFileName)]
        : capability.importToolCandidates;

    await withCommandFallback(
      importToolCandidates,
      async invocation => {
        updateJob(jobId, {
          stage: 'starting',
          progress: 10,
          tool: invocation.displayName,
          message: `Starting ${invocation.displayName}...`,
        });

        if (params.type === DatabaseClientType.POSTGRES) {
          await runPostgresImport(
            invocation,
            connection!,
            params,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'restoring',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                message,
              });
            }
          );
          return;
        }

        if (
          params.type === DatabaseClientType.MYSQL ||
          params.type === DatabaseClientType.MARIADB
        ) {
          await runMysqlImport(
            invocation,
            connection!,
            params,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'restoring',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                message,
              });
            }
          );
          return;
        }

        if (params.type === DatabaseClientType.SQLITE3) {
          await runSqliteImport(
            invocation,
            connection!,
            params,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'restoring',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                message,
              });
            }
          );
        }
      },
      params.runtime
    );

    updateJob(jobId, {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      message: `${params.uploadFileName} restored successfully.`,
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'error',
      stage: 'error',
      progress: null,
      error: error instanceof Error ? error.message : 'Import failed.',
      message: error instanceof Error ? error.message : 'Import failed.',
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } finally {
    await connection?.closeTunnel?.();
    scheduleCleanup(jobId);
  }
}

export async function startNativeExportJob(params: ExportJobParams) {
  await ensureNativeBackupOperationAvailable(
    params.type,
    'export',
    undefined,
    params.runtime
  );
  assertNativeBackupSupported(params.type);

  const tempDir = await mkdtemp(join(tmpdir(), 'heraq-native-export-'));
  const jobId = randomUUID();
  const artifactName = buildNativeBackupFileName(
    resolveDatabaseName(params),
    params.type,
    new Date(),
    params.options.format
  );
  const fileKind = getNativeBackupFileKind(params.type, params.options.format);
  const record = createJobRecord(
    jobId,
    'export',
    params.type,
    tempDir,
    'pending'
  );

  setJob(jobId, {
    ...record,
    artifactPath: join(tempDir, artifactName),
    artifactContentType:
      fileKind === 'sql'
        ? 'application/sql; charset=utf-8'
        : 'application/octet-stream',
    downloadFileName: artifactName,
  });

  void runNativeExportJob(jobId, params);

  return {
    jobId,
    statusUrl: `/api/database-export/jobs/${jobId}`,
    downloadUrl: `/api/database-export/jobs/${jobId}/download`,
  };
}

export async function startNativeImportJob(params: ImportJobParams) {
  await ensureNativeBackupOperationAvailable(
    params.type,
    'import',
    params.uploadFileName,
    params.runtime
  );
  assertNativeBackupSupported(params.type);

  const tempDir = await mkdtemp(join(tmpdir(), 'heraq-native-import-'));
  const jobId = randomUUID();
  const uploadPath = join(tempDir, params.uploadFileName);
  const record = createJobRecord(
    jobId,
    'import',
    params.type,
    tempDir,
    'pending'
  );

  await writeFile(uploadPath, params.fileData);

  setJob(jobId, {
    ...record,
    uploadPath,
  });

  void runNativeImportJob(jobId, {
    ...params,
    uploadPath,
  });

  return {
    jobId,
    statusUrl: `/api/database-import/jobs/${jobId}`,
  };
}
