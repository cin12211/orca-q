import { getConnectionParams } from '@/core/helpers/connection-helper';
import {
  getDatabaseClientLabel,
  getNativeBackupFormatOptions,
} from '~/core/constants/database-backup';
import type { Connection } from '~/core/stores';
import type {
  ImportOptions,
  StartDatabaseTransferResponse,
} from '~/core/types';
import { useDatabaseTransferJob } from './useDatabaseTransferJob';

export const useDatabaseImport = (
  connection: Ref<Connection | null | undefined>
) => {
  const transferJob = useDatabaseTransferJob();

  const isImporting = computed(() => transferJob.isRunning.value);
  const progress = computed(() => transferJob.progress.value);
  const statusMessage = computed(() => transferJob.message.value);
  const currentJob = computed(() => transferJob.job.value);

  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const selectedFile = ref<File | null>(null);
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const options = ref<ImportOptions>({
    clean: false,
    dataOnly: false,
    schemaOnly: false,
    exitOnError: true,
  });

  const connectionType = computed(() => connection.value?.type);
  const formats = computed(() =>
    getNativeBackupFormatOptions(connectionType.value)
  );
  const connectionLabel = computed(() =>
    getDatabaseClientLabel(connectionType.value)
  );
  const extensionSummary = computed(() =>
    formats.value.map(f => f.extension).join(' / ')
  );

  const clearSelectedFile = () => {
    selectedFile.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.value?.click();
  };

  const onFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const isSupported = formats.value.some(fmt =>
      file.name.toLowerCase().endsWith(fmt.extension.toLowerCase())
    );

    if (!isSupported) {
      clearSelectedFile();
      error.value = `Unsupported file type. Use ${extensionSummary.value} for ${connectionLabel.value}.`;
      success.value = null;
      return;
    }

    selectedFile.value = file;
    error.value = null;
    success.value = null;
  };

  const importDatabase = async () => {
    if (!selectedFile.value || !connection.value) return;

    error.value = null;
    success.value = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile.value);

      const params = getConnectionParams(connection.value);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
      });

      formData.append('options', JSON.stringify(options.value));

      const response = await $fetch<StartDatabaseTransferResponse>(
        '/api/database-import/import-database',
        { method: 'POST', body: formData }
      );

      const snapshot = await transferJob.monitorJob(response.statusUrl);

      if (snapshot.status === 'completed') {
        success.value = snapshot.message || 'Database imported successfully';
        clearSelectedFile();
        return;
      }

      error.value = snapshot.error || snapshot.message || 'Import failed';
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Import failed. Check the backup file and connection compatibility.';
      console.error('Import error:', err);
    }
  };

  const reset = () => {
    transferJob.reset();
    error.value = null;
    success.value = null;
    clearSelectedFile();
  };

  return {
    isImporting,
    progress,
    statusMessage,
    currentJob,
    error,
    success,
    selectedFile,
    fileInputRef,
    options,
    extensionSummary,
    clearSelectedFile,
    openFilePicker,
    onFileSelect,
    importDatabase,
    reset,
  };
};
