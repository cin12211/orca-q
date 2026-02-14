import type {
  ExportDatabaseRequest,
  ExportDatabaseResponse,
  ExportOptions,
} from '~/shared/types';

/**
 * Composable for database export operations
 */
export const useDatabaseExport = (dbConnectionString: Ref<string>) => {
  const isExporting = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);
  const lastExport = ref<{ fileName: string; duration: number } | null>(null);

  /**
   * Export database with given options
   */
  const exportDatabase = async (
    databaseName: string,
    options: ExportOptions
  ): Promise<boolean> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return false;
    }

    isExporting.value = true;
    progress.value = 0;
    error.value = null;

    try {
      // Make request to export API
      const response = await $fetch('/api/database-export/export-database', {
        method: 'POST',
        body: {
          dbConnectionString: dbConnectionString.value,
          databaseName,
          options,
        } satisfies ExportDatabaseRequest,
        responseType: 'blob',
        onResponse({ response }) {
          // Get metadata from headers
          const duration = response.headers.get('X-Export-Duration');
          const fileName = response.headers.get('X-Export-FileName');

          if (fileName && duration) {
            lastExport.value = {
              fileName,
              duration: parseInt(duration, 10),
            };
          }
        },
      });

      // Create download link
      const blob = response as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        lastExport.value?.fileName ||
        `${databaseName}_export${getExtension(options.format)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      progress.value = 100;
      return true;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Export failed. Check if pg_dump is installed.';
      console.error('Export error:', err);
      return false;
    } finally {
      isExporting.value = false;
    }
  };

  /**
   * Get file extension for format
   */
  const getExtension = (format: string): string => {
    switch (format) {
      case 'plain':
        return '.sql';
      case 'custom':
        return '.dump';
      case 'tar':
        return '.tar';
      default:
        return '.sql';
    }
  };

  /**
   * Reset state
   */
  const reset = () => {
    isExporting.value = false;
    progress.value = 0;
    error.value = null;
  };

  return {
    isExporting,
    progress,
    error,
    lastExport,
    exportDatabase,
    reset,
  };
};
