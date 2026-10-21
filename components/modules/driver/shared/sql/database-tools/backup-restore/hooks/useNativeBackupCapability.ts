import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { isDesktopApp } from '~/core/helpers/environment';
import type { NativeBackupRuntimeCapability } from '~/core/types';

export const useNativeBackupCapability = (
  connectionType: Ref<DatabaseClientType | null | undefined>
) => {
  const capability = ref<NativeBackupRuntimeCapability | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let requestId = 0;

  const refresh = async () => {
    const type = connectionType.value;
    const currentRequestId = ++requestId;

    if (!type) {
      capability.value = null;
      error.value = null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<NativeBackupRuntimeCapability>(
        '/api/database-backup/capability',
        {
          query: {
            type,
            discoverAll: isDesktopApp(),
          },
        }
      );

      if (currentRequestId !== requestId) {
        return;
      }

      capability.value = response;
    } catch (err) {
      if (currentRequestId !== requestId) {
        return;
      }

      capability.value = null;
      error.value =
        err instanceof Error
          ? err.message
          : 'Unable to detect native backup tools.';
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false;
      }
    }
  };

  watch(
    connectionType,
    () => {
      void refresh();
    },
    { immediate: true }
  );

  return {
    capability,
    isLoading,
    error,
    refresh,
  };
};
