import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import {
  getDefaultDatabaseFileOptions,
  type DatabaseFileOptions,
} from '#shared/constants/database-file-options';
import { CREATE_FILE_DEFAULT_ERROR } from '../constants';
import { databaseFileService } from '../services';
import type { FileDatabaseType } from '../types';

export function useCreateDatabaseFile(props: {
  open: MaybeRefOrGetter<boolean>;
  databaseType: MaybeRefOrGetter<FileDatabaseType>;
  onCreated: (filePath: string) => void;
}) {
  const fileName = ref('');
  const directory = ref('');
  const options = ref<DatabaseFileOptions>({});
  const errorMessage = ref('');
  const isCreating = ref(false);

  const canConfirm = computed(
    () => !!fileName.value.trim() && !!directory.value && !isCreating.value
  );

  const pickDirectory = async () => {
    const selectedDirectory = await databaseFileService.pickDirectory();

    if (selectedDirectory) {
      directory.value = selectedDirectory;
    }
  };

  const confirm = async () => {
    isCreating.value = true;
    errorMessage.value = '';

    try {
      const { filePath } = await databaseFileService.create({
        type: toValue(props.databaseType),
        directory: directory.value,
        fileName: fileName.value.trim(),
        options: options.value,
      });

      props.onCreated(filePath);
    } catch (error: unknown) {
      const failure = error as {
        data?: { message?: string };
        message?: string;
      };

      errorMessage.value =
        failure.data?.message || failure.message || CREATE_FILE_DEFAULT_ERROR;
    } finally {
      isCreating.value = false;
    }
  };

  const reset = () => {
    fileName.value = '';
    directory.value = '';
    errorMessage.value = '';
    options.value = getDefaultDatabaseFileOptions(toValue(props.databaseType));
  };

  watch(
    () => toValue(props.open),
    open => {
      if (open) {
        reset();
      }
    }
  );

  return {
    fileName,
    directory,
    options,
    errorMessage,
    canConfirm,
    pickDirectory,
    confirm,
  };
}
