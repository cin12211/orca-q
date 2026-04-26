import { useIntervalFn } from '@vueuse/core';
import type { DatabaseTransferJobSnapshot } from '~/core/types';

function isSettled(snapshot: DatabaseTransferJobSnapshot | null) {
  return Boolean(
    snapshot && (snapshot.status === 'completed' || snapshot.status === 'error')
  );
}

export const useDatabaseTransferJob = () => {
  const job = ref<DatabaseTransferJobSnapshot | null>(null);
  const error = ref<string | null>(null);
  const statusUrl = ref<string | null>(null);
  const isRefreshing = ref(false);
  let pendingResolve: ((snapshot: DatabaseTransferJobSnapshot) => void) | null =
    null;
  let pendingReject: ((error: Error) => void) | null = null;

  const settle = (snapshot: DatabaseTransferJobSnapshot) => {
    pendingResolve?.(snapshot);
    pendingResolve = null;
    pendingReject = null;
  };

  const rejectPending = (reason: Error) => {
    pendingReject?.(reason);
    pendingResolve = null;
    pendingReject = null;
  };

  const refresh = async (): Promise<DatabaseTransferJobSnapshot> => {
    if (!statusUrl.value) {
      throw new Error('Backup job status URL is missing.');
    }

    if (isRefreshing.value) {
      if (job.value) {
        return job.value;
      }

      throw new Error('Backup job refresh is already in progress.');
    }

    isRefreshing.value = true;

    try {
      const snapshot = await $fetch<DatabaseTransferJobSnapshot>(
        statusUrl.value
      );

      job.value = snapshot;

      if (snapshot.status === 'error') {
        error.value = snapshot.error || snapshot.message;
      }

      if (isSettled(snapshot)) {
        pause();
        settle(snapshot);
      }

      return snapshot;
    } catch (cause) {
      const reason =
        cause instanceof Error
          ? cause
          : new Error('Failed to refresh backup job status.');

      error.value = reason.message;
      pause();
      rejectPending(reason);
      throw reason;
    } finally {
      isRefreshing.value = false;
    }
  };

  const { pause, resume, isActive } = useIntervalFn(
    () => {
      void refresh();
    },
    1000,
    {
      immediate: false,
      immediateCallback: false,
    }
  );

  const monitorJob = async (url: string) => {
    statusUrl.value = url;
    error.value = null;

    const initialSnapshot = await refresh();

    if (isSettled(initialSnapshot)) {
      return initialSnapshot;
    }

    resume();

    return await new Promise<DatabaseTransferJobSnapshot>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
    });
  };

  const reset = () => {
    pause();
    statusUrl.value = null;
    job.value = null;
    error.value = null;
    isRefreshing.value = false;
    pendingResolve = null;
    pendingReject = null;
  };

  onScopeDispose(() => {
    pause();
  });

  return {
    job,
    error,
    isRefreshing,
    isPolling: isActive,
    progress: computed(() => job.value?.progress ?? 0),
    message: computed(() => job.value?.message ?? null),
    stage: computed(() => job.value?.stage ?? 'queued'),
    status: computed(() => job.value?.status ?? 'queued'),
    isRunning: computed(
      () => job.value?.status === 'queued' || job.value?.status === 'running'
    ),
    monitorJob,
    refresh,
    reset,
  };
};
