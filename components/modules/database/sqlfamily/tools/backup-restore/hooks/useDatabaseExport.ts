import { getConnectionParams } from '@/core/helpers/connection-helper';
import { useStreamingDownload } from '~/core/composables/useStreamingDownload';
import { getNativeBackupExtension } from '~/core/constants/database-backup';
import { formatBytes } from '~/core/helpers';
import { type Connection } from '~/core/stores';
import type {
  ExportDatabaseRequest,
  ExportFormat,
  ExportOptions,
  NativeBackupRuntimeCapability,
  NativeBackupRuntimeSelection,
  StartDatabaseTransferResponse,
} from '~/core/types';
import { useDatabaseTransferJob } from './useDatabaseTransferJob';

interface ExportExecutionRequest {
  options: ExportOptions;
  runtime?: NativeBackupRuntimeSelection;
  promptForSaveLocation?: boolean;
  saveDirectoryPath?: string;
  saveFilePath?: string;
}

const sanitizeBackupFileSegment = (value: string) =>
  (value || 'database')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'database';

const createBackupTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-');

const joinDirectoryAndFileName = (directoryPath: string, fileName: string) =>
  `${directoryPath.replace(/[\\/]$/, '')}/${fileName}`;

const formatDuration = (durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '0.0s';
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
};

/**
 * Composable for database export operations
 */
export const useDatabaseExport = (
  connection: Ref<Connection | null | undefined>,
  capability?: Ref<NativeBackupRuntimeCapability | null>
) => {
  const error = ref<string | null>(null);
  const lastExport = ref<{
    fileName: string;
    duration: number;
    size: number;
    saveDirectoryPath?: string;
    saveFilePath?: string;
  } | null>(null);
  const transferJob = useDatabaseTransferJob();
  const { downloadStream, isDownloading, downloadedBytes } =
    useStreamingDownload();

  const isExporting = computed(
    () => transferJob.isRunning.value || isDownloading.value
  );
  const progress = computed(() => {
    if (lastExport.value) {
      return 100;
    }

    if (isDownloading.value) {
      return 100;
    }

    return transferJob.progress.value;
  });
  const statusMessage = computed(() => {
    if (lastExport.value) {
      return `Backup is ready. ${formatBytes(lastExport.value.size)} generated in ${formatDuration(lastExport.value.duration)}.`;
    }

    if (isDownloading.value) {
      return `Saving backup artifact (${formatBytes(downloadedBytes.value)})...`;
    }

    return transferJob.message.value;
  });
  const currentJob = computed(() => transferJob.job.value);

  /**
   * Export database with given options
   */
  const exportDatabase = async (
    databaseName: string,
    request: ExportExecutionRequest
  ): Promise<boolean> => {
    if (!connection.value) {
      error.value = 'No database connection provided';
      return false;
    }

    const { options, runtime, promptForSaveLocation } = request;

    if (
      capability?.value &&
      !capability.value.exportAvailable &&
      !runtime?.executablePath?.trim()
    ) {
      error.value = capability.value.exportMessage;
      return false;
    }

    error.value = null;
    lastExport.value = null;

    try {
      let saveDirectoryPath = request.saveDirectoryPath?.trim() || undefined;
      let saveFilePath = request.saveFilePath?.trim() || undefined;
      const fileName = `${sanitizeBackupFileSegment(databaseName)}_backup_${createBackupTimestamp()}${getExtension(connection.value?.type, options.format)}`;

      if (
        !saveDirectoryPath &&
        !saveFilePath &&
        promptForSaveLocation &&
        window.electronAPI?.window.pickDirectory
      ) {
        const pickedPath = await window.electronAPI.window.pickDirectory();

        if (!pickedPath) {
          error.value = 'No save location was selected.';
          return false;
        }

        saveDirectoryPath = pickedPath;
      }

      if (!saveFilePath && saveDirectoryPath) {
        saveFilePath = joinDirectoryAndFileName(saveDirectoryPath, fileName);
      }

      const response = await $fetch<StartDatabaseTransferResponse>(
        '/api/database-export/export-database',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
            databaseName,
            options,
            runtime,
          } as ExportDatabaseRequest & Record<string, unknown>,
        }
      );

      const snapshot = await transferJob.monitorJob(response.statusUrl);

      if (snapshot.status === 'error') {
        error.value = snapshot.error || snapshot.message;
        return false;
      }

      if (!snapshot.downloadUrl || !snapshot.downloadFileName) {
        error.value = 'Export finished but no download artifact was returned.';
        return false;
      }

      const downloadResult = await downloadStream({
        url: snapshot.downloadUrl,
        method: 'GET',
        filename: saveFilePath
          ? fileName
          : snapshot.downloadFileName || fileName,
        saveFilePath,
        openPath: saveDirectoryPath,
        successTitle: 'Backup is ready',
        getSuccessDescription: sizeBytes =>
          `${formatBytes(sizeBytes)} generated in ${formatDuration(snapshot.duration || 0)}.`,
      });

      if (!downloadResult.success) {
        error.value = downloadResult.error?.message || 'Download failed.';
        return false;
      }

      lastExport.value = {
        fileName: saveFilePath ? fileName : snapshot.downloadFileName,
        duration: snapshot.duration || 0,
        size: downloadResult.size || 0,
        saveDirectoryPath,
        saveFilePath,
      };

      return true;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Export failed. Check the connection and backup configuration.';
      console.error('Export error:', err);
      return false;
    }
  };

  /**
   * Get file extension for the resolved database family
   */
  const getExtension = (
    type?: Connection['type'],
    format?: ExportFormat | null
  ): string => {
    return getNativeBackupExtension(type, format);
  };

  /**
   * Reset state
   */
  const reset = () => {
    transferJob.reset();
    error.value = null;
    lastExport.value = null;
  };

  return {
    isExporting,
    progress,
    error,
    lastExport,
    currentJob,
    statusMessage,
    exportDatabase,
    reset,
  };
};
