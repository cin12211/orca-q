import { createError } from 'h3';
import { rm } from 'node:fs/promises';
import { basename } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseTransferJobSnapshot } from '~/core/types';
import { type NativeBackupJobRecord, NATIVE_BACKUP_TTL_MS } from './types';

const nativeBackupJobs = new Map<string, NativeBackupJobRecord>();

export function setJob(jobId: string, record: NativeBackupJobRecord) {
  nativeBackupJobs.set(jobId, record);
}

export function updateJob(
  jobId: string,
  patch: Partial<NativeBackupJobRecord>
) {
  const current = nativeBackupJobs.get(jobId);

  if (!current) {
    return;
  }

  nativeBackupJobs.set(jobId, {
    ...current,
    ...patch,
  });
}

export function getJob(jobId: string) {
  return nativeBackupJobs.get(jobId);
}

async function destroyNativeBackupJob(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    return;
  }

  if (record.cleanupTimer) {
    clearTimeout(record.cleanupTimer);
  }

  nativeBackupJobs.delete(jobId);
  await rm(record.tempDir, { recursive: true, force: true });
}

export function scheduleCleanup(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    return;
  }

  record.cleanupTimer?.refresh?.();

  if (record.cleanupTimer) {
    clearTimeout(record.cleanupTimer);
  }

  const timer = setTimeout(() => {
    void destroyNativeBackupJob(jobId);
  }, NATIVE_BACKUP_TTL_MS);

  timer.unref?.();
  updateJob(jobId, { cleanupTimer: timer });
}

export function createJobRecord(
  jobId: string,
  operation: 'export' | 'import',
  type: DatabaseClientType,
  tempDir: string,
  tool: string
): NativeBackupJobRecord {
  return {
    jobId,
    operation,
    status: 'queued',
    stage: 'queued',
    databaseType: type,
    tool,
    progress: 0,
    message: 'Queued',
    startedAt: new Date().toISOString(),
    tempDir,
  };
}

export function getNativeBackupJobSnapshot(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Backup job not found or has expired.',
    });
  }

  return {
    jobId: record.jobId,
    operation: record.operation,
    status: record.status,
    stage: record.stage,
    databaseType: record.databaseType,
    tool: record.tool,
    progress: record.progress,
    message: record.message,
    bytesProcessed: record.bytesProcessed,
    bytesTotal: record.bytesTotal,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    duration: record.duration,
    downloadReady: record.downloadReady,
    downloadFileName: record.downloadFileName,
    downloadUrl: record.downloadUrl,
    warnings: record.warnings,
    error: record.error,
  } satisfies DatabaseTransferJobSnapshot;
}

export function getNativeExportDownload(jobId: string) {
  const record = getJob(jobId);

  if (!record || record.operation !== 'export' || !record.artifactPath) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Export artifact not found or has expired.',
    });
  }

  if (record.status !== 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Export artifact is not ready yet.',
    });
  }

  return {
    filePath: record.artifactPath,
    fileName: record.downloadFileName || basename(record.artifactPath),
    contentType: record.artifactContentType || 'application/octet-stream',
  };
}
