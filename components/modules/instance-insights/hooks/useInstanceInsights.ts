import { useIntervalFn, refDebounced } from '@vueuse/core';
import { toast } from 'vue-sonner';
import type {
  InstanceInsightsConfiguration,
  InstanceInsightsDashboard,
  InstanceInsightsReplication,
  InstanceInsightsState,
  ReplicationSlotDesiredStatus,
} from '~/core/types';

type InsightsSection = 'activity' | 'state' | 'configuration' | 'replication';

interface FetchOptions {
  silent?: boolean;
}

const AUTO_REFRESH_INTERVAL_MS = 5000;

export function useInstanceInsights(dbConnectionString: Ref<string>) {
  const activeSection = ref<InsightsSection>('activity');
  const autoRefresh = ref(true);
  const refreshIntervalMs = ref(AUTO_REFRESH_INTERVAL_MS);

  const error = ref<string | null>(null);
  const isInitialLoading = ref(false);
  const isActionLoading = ref(false);

  const isDashboardLoading = ref(false);
  const isStateLoading = ref(false);
  const isConfigurationLoading = ref(false);
  const isReplicationLoading = ref(false);

  const dashboard = ref<InstanceInsightsDashboard | null>(null);
  const state = ref<InstanceInsightsState | null>(null);
  const configuration = ref<InstanceInsightsConfiguration | null>(null);
  const replication = ref<InstanceInsightsReplication | null>(null);

  const configurationSearch = ref('');
  const debouncedConfigurationSearch = refDebounced(configurationSearch, 350);

  const hasConnection = computed(() => Boolean(dbConnectionString.value));

  const resetData = () => {
    error.value = null;
    dashboard.value = null;
    state.value = null;
    configuration.value = null;
    replication.value = null;
  };

  const withErrorHandling = async <T>(
    task: () => Promise<T>,
    fallbackMessage: string
  ): Promise<T | null> => {
    try {
      error.value = null;
      return await task();
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.message ||
        err?.statusMessage ||
        fallbackMessage;
      error.value = message;
      return null;
    }
  };

  const fetchDashboard = async (options: FetchOptions = {}) => {
    if (!hasConnection.value) return null;
    if (!options.silent) isDashboardLoading.value = true;

    const result = await withErrorHandling(async () => {
      return await $fetch<InstanceInsightsDashboard>(
        '/api/instance-insights/dashboard' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
          },
        }
      );
    }, 'Failed to fetch activity dashboard');

    if (result) {
      dashboard.value = result;
    }

    if (!options.silent) isDashboardLoading.value = false;
    return result;
  };

  const fetchState = async (options: FetchOptions = {}) => {
    if (!hasConnection.value) return null;
    if (!options.silent) isStateLoading.value = true;

    const result = await withErrorHandling(async () => {
      return await $fetch<InstanceInsightsState>(
        '/api/instance-insights/state' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
          },
        }
      );
    }, 'Failed to fetch active sessions and locks');

    if (result) {
      state.value = result;
    }

    if (!options.silent) isStateLoading.value = false;
    return result;
  };

  const fetchConfiguration = async (options: FetchOptions = {}) => {
    if (!hasConnection.value) return null;
    if (!options.silent) isConfigurationLoading.value = true;

    const result = await withErrorHandling(async () => {
      return await $fetch<InstanceInsightsConfiguration>(
        '/api/instance-insights/configuration' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            search: debouncedConfigurationSearch.value || undefined,
          },
        }
      );
    }, 'Failed to fetch PostgreSQL settings');

    if (result) {
      configuration.value = result;
    }

    if (!options.silent) isConfigurationLoading.value = false;
    return result;
  };

  const fetchReplication = async (options: FetchOptions = {}) => {
    if (!hasConnection.value) return null;
    if (!options.silent) isReplicationLoading.value = true;

    const result = await withErrorHandling(async () => {
      return await $fetch<InstanceInsightsReplication>(
        '/api/instance-insights/replication' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
          },
        }
      );
    }, 'Failed to fetch replication status');

    if (result) {
      replication.value = result;
    }

    if (!options.silent) isReplicationLoading.value = false;
    return result;
  };

  const refreshSection = async (
    section: InsightsSection = activeSection.value,
    options: FetchOptions = {}
  ) => {
    switch (section) {
      case 'activity':
        await fetchDashboard(options);
        break;
      case 'state':
        await Promise.all([
          fetchDashboard({ silent: true }),
          fetchState(options),
        ]);
        break;
      case 'configuration':
        await Promise.all([
          fetchDashboard({ silent: true }),
          fetchConfiguration(options),
        ]);
        break;
      case 'replication':
        await Promise.all([
          fetchDashboard({ silent: true }),
          fetchReplication(options),
        ]);
        break;
      default:
        await fetchDashboard(options);
        break;
    }
  };

  const refreshAll = async (options: FetchOptions = {}) => {
    await Promise.all([
      fetchDashboard(options),
      fetchState(options),
      fetchConfiguration(options),
      fetchReplication(options),
    ]);
  };

  const runAction = async (
    task: () => Promise<{ success: boolean; message: string }>,
    successMessage: string
  ) => {
    if (!hasConnection.value) return false;

    isActionLoading.value = true;
    const result = await withErrorHandling(task, 'Action failed');
    isActionLoading.value = false;

    if (!result) {
      toast(error.value || 'Action failed', {
        description: 'Check database permissions and try again.',
      });
      return false;
    }

    if (result.success) {
      toast(successMessage, {
        description: result.message,
      });
    } else {
      toast(result.message, {
        description: 'The server did not complete this action.',
      });
    }

    return result.success;
  };

  const cancelQuery = async (pid: number) => {
    const ok = await runAction(async () => {
      return await $fetch<{ success: boolean; message: string }>(
        '/api/instance-insights/cancel-query' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            pid,
          },
        }
      );
    }, `Cancelled query for PID ${pid}`);

    if (ok) {
      await fetchState({ silent: true });
    }
  };

  const terminateConnection = async (pid: number) => {
    const ok = await runAction(async () => {
      return await $fetch<{ success: boolean; message: string }>(
        '/api/instance-insights/terminate-connection' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            pid,
          },
        }
      );
    }, `Terminated connection for PID ${pid}`);

    if (ok) {
      await fetchState({ silent: true });
      await fetchDashboard({ silent: true });
    }
  };

  const dropReplicationSlot = async (slotName: string) => {
    const ok = await runAction(async () => {
      return await $fetch<{ success: boolean; message: string }>(
        '/api/instance-insights/drop-slot' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            slotName,
          },
        }
      );
    }, `Dropped replication slot "${slotName}"`);

    if (ok) {
      await fetchReplication({ silent: true });
    }
  };

  const toggleReplicationSlotStatus = async (params: {
    slotName: string;
    desiredStatus: ReplicationSlotDesiredStatus;
    activePid?: number | null;
    slotType?: string | null;
  }) => {
    const ok = await runAction(async () => {
      return await $fetch<{ success: boolean; message: string }>(
        '/api/instance-insights/toggle-slot-status' as string,
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            slotName: params.slotName,
            desiredStatus: params.desiredStatus,
            activePid: params.activePid ?? null,
            slotType: params.slotType ?? null,
          },
        }
      );
    }, `Turned ${params.desiredStatus} slot "${params.slotName}"`);

    if (ok) {
      await fetchReplication({ silent: true });
    }
  };

  const performInitialLoad = async () => {
    if (!hasConnection.value) {
      resetData();
      return;
    }

    isInitialLoading.value = true;
    await refreshAll();
    isInitialLoading.value = false;
  };

  watch(
    () => dbConnectionString.value,
    async current => {
      if (!current) {
        resetData();
        return;
      }

      await performInitialLoad();
    },
    { immediate: true }
  );

  watch(
    () => debouncedConfigurationSearch.value,
    async () => {
      if (activeSection.value !== 'configuration' || !hasConnection.value)
        return;
      await fetchConfiguration({ silent: true });
    }
  );

  watch(
    () => activeSection.value,
    async section => {
      if (!hasConnection.value) return;

      if (section === 'state' && !state.value) {
        await fetchState();
      }

      if (section === 'configuration' && !configuration.value) {
        await fetchConfiguration();
      }

      if (section === 'replication' && !replication.value) {
        await fetchReplication();
      }
    }
  );

  const { pause, resume, isActive } = useIntervalFn(
    async () => {
      if (!hasConnection.value) return;
      await refreshSection(activeSection.value, { silent: true });
    },
    refreshIntervalMs,
    { immediate: false }
  );

  watch(
    () => autoRefresh.value,
    enabled => {
      if (enabled) resume();
      else pause();
    },
    { immediate: true }
  );

  return {
    activeSection,
    autoRefresh,
    isAutoRefreshRunning: isActive,
    error,
    isInitialLoading,
    isActionLoading,
    isDashboardLoading,
    isStateLoading,
    isConfigurationLoading,
    isReplicationLoading,
    dashboard,
    state,
    configuration,
    replication,
    configurationSearch,
    refreshSection,
    refreshAll,
    fetchDashboard,
    fetchState,
    fetchConfiguration,
    fetchReplication,
    cancelQuery,
    terminateConnection,
    dropReplicationSlot,
    toggleReplicationSlotStatus,
  };
}
