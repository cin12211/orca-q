import { getConnectionParams } from '@/core/helpers/connection-helper';
import { useStreamingDownload } from '~/core/composables/useStreamingDownload';
import { getNativeBackupExtension } from '~/core/constants/database-backup';
import { type Connection } from '~/core/stores';
import type {
  ExportDatabaseRequest,
  ExportFormat,
  ExportOptions,
  StartDatabaseTransferResponse,
} from '~/core/types';
import { useDatabaseTransferJob } from './useDatabaseTransferJob';

/**
 * Composable for database export operations
 */
export const useDatabaseExport = (
  connection: Ref<Connection | null | undefined>
) => {
  const error = ref<string | null>(null);
  const lastExport = ref<{ fileName: string; duration: number } | null>(null);
  const transferJob = useDatabaseTransferJob();
  const { downloadStream, isDownloading, downloadedBytes } =
    useStreamingDownload();

  const isExporting = computed(
    () => transferJob.isRunning.value || isDownloading.value
  );
  const progress = computed(() => {
    if (isDownloading.value) {
      return 100;
    }

    return transferJob.progress.value;
  });
  const statusMessage = computed(() => {
    if (isDownloading.value) {
      return `Downloading backup artifact (${downloadedBytes.value} bytes)...`;
    }

    return transferJob.message.value;
  });
  const currentJob = computed(() => transferJob.job.value);

  /**
   * Export database with given options
   */
  const exportDatabase = async (
    databaseName: string,
    options: ExportOptions
  ): Promise<boolean> => {
    if (!connection.value) {
      error.value = 'No database connection provided';
      return false;
    }

    error.value = null;
    lastExport.value = null;

    try {
      const response = await $fetch<StartDatabaseTransferResponse>(
        '/api/database-export/export-database',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
            databaseName,
            options,
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
        filename:
          snapshot.downloadFileName ||
          `${databaseName}_backup${getExtension(connection.value?.type, options.format)}`,
      });

      if (!downloadResult.success) {
        error.value = downloadResult.error?.message || 'Download failed.';
        return false;
      }

      lastExport.value = {
        fileName: snapshot.downloadFileName,
        duration: snapshot.duration || 0,
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
