import { useIntervalFn } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type {
  InstanceActionResponse,
  RedisClientInsight,
  RedisConfigEntry,
  RedisInstanceInsights,
  RedisKeyspaceInsight,
  RedisMemoryInsight,
  RedisOverviewMetrics,
  RedisPerformanceInsight,
  RedisPersistenceInsight,
  RedisReplicationInsight,
} from '~/core/types';

export type RedisInsightsSection =
  | 'overview'
  | 'keyspace'
  | 'memory'
  | 'performance'
  | 'clients'
  | 'persistence'
  | 'replication'
  | 'config';

interface RedisInsightsSectionDataMap {
  overview: RedisOverviewMetrics;
  keyspace: RedisKeyspaceInsight;
  memory: RedisMemoryInsight;
  performance: RedisPerformanceInsight;
  clients: RedisClientInsight;
  persistence: RedisPersistenceInsight;
  replication: RedisReplicationInsight;
  config: RedisConfigEntry[];
}

const SECTION_ENDPOINTS: Record<RedisInsightsSection, string> = {
  overview: '/api/redis/instance-insights/overview',
  keyspace: '/api/redis/instance-insights/keyspace',
  memory: '/api/redis/instance-insights/memory',
  performance: '/api/redis/instance-insights/performance',
  clients: '/api/redis/instance-insights/clients',
  persistence: '/api/redis/instance-insights/persistence',
  replication: '/api/redis/instance-insights/replication',
  config: '/api/redis/instance-insights/config',
};

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
  const insights = ref<Partial<RedisInstanceInsights>>({});
  const loadedSections = ref<Set<RedisInsightsSection>>(new Set());
  const isActiveView = ref(true);
  // Bumped on every completed fetch (silent or not) so the UI can flash the
  // refresh icon to show an auto-refresh just happened.
  const refreshSignal = ref(0);

  const hasConnection = computed(() => Boolean(options.connection.value));

  onDeactivated(() => {
    isActiveView.value = false;
  });

  onActivated(() => {
    isActiveView.value = true;
  });

  const fetchSection = async <K extends RedisInsightsSection>(
    section: K,
    silent = false
  ): Promise<RedisInsightsSectionDataMap[K] | null> => {
    if (!options.connection.value) {
      return null;
    }

    const isFirstLoadForSection = !loadedSections.value.has(section);

    if (!silent) {
      if (isFirstLoadForSection) {
        isInitialLoading.value = true;
      } else {
        isLoading.value = true;
      }
    }

    try {
      error.value = null;
      const endpoint: string = SECTION_ENDPOINTS[section];
      const result = (await ($fetch as any)(endpoint, {
        method: 'POST',
        body: {
          ...getConnectionParams(options.connection.value),
          method: options.connection.value.method,
          databaseIndex: options.databaseIndex.value,
        },
      })) as RedisInsightsSectionDataMap[K];

      insights.value = {
        ...insights.value,
        [section]: result,
      } as Partial<RedisInstanceInsights>;
      loadedSections.value.add(section);
      refreshSignal.value += 1;

      return result;
    } catch (err: any) {
      error.value =
        err?.data?.message ||
        err?.message ||
        err?.statusMessage ||
        'Failed to fetch Redis instance insights.';
      return null;
    } finally {
      isInitialLoading.value = false;
      isLoading.value = false;
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
        await fetchSection('clients', true);
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
    await fetchSection(activeSection.value);
  };

  watch(
    () => activeSection.value,
    section => {
      if (!loadedSections.value.has(section)) {
        fetchSection(section);
      }
    }
  );

  watch(
    [() => options.connection.value, () => options.databaseIndex.value],
    async ([connection]) => {
      insights.value = {};
      loadedSections.value = new Set();

      if (!connection) {
        return;
      }

      await fetchSection(activeSection.value);
    },
    { immediate: true }
  );

  const { pause, resume } = useIntervalFn(
    async () => {
      if (!hasConnection.value || !isActiveView.value) {
        return;
      }

      await fetchSection(activeSection.value, true);
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
    refreshSignal,
    refresh,
    killClient,
  };
}
