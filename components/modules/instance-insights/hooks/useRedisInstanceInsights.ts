import { useIntervalFn } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type {
  InstanceActionResponse,
  RedisInstanceInsights,
} from '~/core/types';

type RedisInsightsSection =
  | 'overview'
  | 'keyspace'
  | 'memory'
  | 'performance'
  | 'clients'
  | 'persistence'
  | 'replication'
  | 'config';

const AUTO_REFRESH_INTERVAL_MS = 5000;

export function useRedisInstanceInsights(options: {
  connection: Ref<Connection | undefined>;
  databaseIndex: Ref<number>;
}) {
  const activeSection = ref<RedisInsightsSection>('overview');
  const autoRefresh = ref(true);
  const error = ref<string | null>(null);
  const isInitialLoading = ref(false);
  const isLoading = ref(false);
  const isActionLoading = ref(false);
  const insights = ref<RedisInstanceInsights | null>(null);
  const isActiveView = ref(true);

  const hasConnection = computed(() => Boolean(options.connection.value));

  onDeactivated(() => {
    isActiveView.value = false;
  });

  onActivated(() => {
    isActiveView.value = true;
  });

  const fetchInsights = async (silent = false) => {
    if (!options.connection.value) {
      insights.value = null;
      return null;
    }

    if (!silent) {
      isLoading.value = true;
    }

    try {
      error.value = null;
      const result = await $fetch<RedisInstanceInsights>(
        '/api/redis/instance-insights/overview',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(options.connection.value),
            method: options.connection.value.method,
            databaseIndex: options.databaseIndex.value,
          },
        }
      );
      insights.value = result;
      return result;
    } catch (err: any) {
      error.value =
        err?.data?.message ||
        err?.message ||
        err?.statusMessage ||
        'Failed to fetch Redis instance insights.';
      return null;
    } finally {
      if (!silent) {
        isLoading.value = false;
      }
    }
  };

  const killClient = async (clientId: string) => {
    if (!options.connection.value) {
      return false;
    }

    isActionLoading.value = true;

    try {
      const result = await $fetch<InstanceActionResponse>(
        '/api/redis/instance-insights/kill-client',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(options.connection.value),
            method: options.connection.value.method,
            databaseIndex: options.databaseIndex.value,
            clientId,
          },
        }
      );

      if (result.success) {
        toast('Redis client terminated', {
          description: result.message,
        });
        await fetchInsights(true);
        return true;
      }

      toast('Failed to terminate client', {
        description: result.message,
      });
      return false;
    } catch (err: any) {
      toast('Failed to terminate client', {
        description:
          err?.data?.message ||
          err?.message ||
          'The Redis client could not be terminated.',
      });
      return false;
    } finally {
      isActionLoading.value = false;
    }
  };

  const refresh = async () => {
    await fetchInsights();
  };

  watch(
    [() => options.connection.value, () => options.databaseIndex.value],
    async ([connection]) => {
      if (!connection) {
        insights.value = null;
        return;
      }

      isInitialLoading.value = true;
      await fetchInsights();
      isInitialLoading.value = false;
    },
    { immediate: true }
  );

  const { pause, resume } = useIntervalFn(
    async () => {
      if (!hasConnection.value || !isActiveView.value) {
        return;
      }

      await fetchInsights(true);
    },
    AUTO_REFRESH_INTERVAL_MS,
    { immediate: false }
  );

  watch(
    () => autoRefresh.value,
    enabled => {
      if (enabled) {
        resume();
      } else {
        pause();
      }
    },
    { immediate: true }
  );

  return {
    activeSection,
    autoRefresh,
    error,
    isInitialLoading,
    isLoading,
    isActionLoading,
    insights,
    refresh,
    killClient,
  };
}
