import { useIntervalFn } from '@vueuse/core';
import { getConnectionParams } from '#shared/helpers/connection-helper';
import type {
  MongoOverviewInsight,
  MongoReplicationInsight,
} from '#shared/types';
import type { Connection } from '~/core/stores';
import { computeMongoOpcounterRates, type MongoOpcounterRates } from '../utils';

export type MongoInsightsSection = 'overview' | 'replication';

interface MongoInsightsSectionDataMap {
  overview: MongoOverviewInsight;
  replication: MongoReplicationInsight;
}

const SECTION_ENDPOINTS: Record<MongoInsightsSection, string> = {
  overview: '/api/mongodb/instance-insights/overview',
  replication: '/api/mongodb/instance-insights/replication',
};

const AUTO_REFRESH_INTERVAL_MS = 5000;

export function useMongoInstanceInsights(options: {
  connection: Ref<Connection | undefined>;
}) {
  const activeSection = ref<MongoInsightsSection>('overview');
  const autoRefresh = ref(true);
  const error = ref<string | null>(null);
  const isInitialLoading = ref(false);
  const isLoading = ref(false);
  const overview = ref<MongoOverviewInsight>();
  const replication = ref<MongoReplicationInsight>();
  const opcounterRates = ref<MongoOpcounterRates | null>(null);
  const loadedSections = ref<Set<MongoInsightsSection>>(new Set());
  const isActiveView = ref(true);
  // Bumped on every completed fetch so the UI can flash the refresh icon.
  const refreshSignal = ref(0);

  onDeactivated(() => {
    isActiveView.value = false;
  });

  onActivated(() => {
    isActiveView.value = true;
  });

  const applyResult = <K extends MongoInsightsSection>(
    section: K,
    result: MongoInsightsSectionDataMap[K]
  ) => {
    if (section === 'overview') {
      const next = result as MongoOverviewInsight;
      opcounterRates.value = computeMongoOpcounterRates(overview.value, next);
      overview.value = next;
      return;
    }
    replication.value = result as MongoReplicationInsight;
  };

  const fetchSection = async (
    section: MongoInsightsSection,
    silent = false
  ) => {
    if (!options.connection.value) return;

    if (!silent) {
      if (loadedSections.value.has(section)) {
        isLoading.value = true;
      } else {
        isInitialLoading.value = true;
      }
    }

    try {
      error.value = null;
      const result = await $fetch<MongoInsightsSectionDataMap[typeof section]>(
        SECTION_ENDPOINTS[section],
        {
          method: 'POST',
          body: getConnectionParams(options.connection.value),
        }
      );

      applyResult(section, result);
      loadedSections.value.add(section);
      refreshSignal.value += 1;
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string };
        message?: string;
      };
      error.value =
        fetchError?.data?.message ||
        fetchError?.message ||
        'Failed to fetch MongoDB instance insights.';
    } finally {
      isInitialLoading.value = false;
      isLoading.value = false;
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
    () => options.connection.value,
    async connection => {
      overview.value = undefined;
      replication.value = undefined;
      opcounterRates.value = null;
      loadedSections.value = new Set();

      if (!connection) return;

      await fetchSection(activeSection.value);
    },
    { immediate: true }
  );

  const { pause, resume } = useIntervalFn(
    async () => {
      if (!options.connection.value || !isActiveView.value) return;
      await fetchSection(activeSection.value, true);
    },
    AUTO_REFRESH_INTERVAL_MS,
    { immediate: false }
  );

  watch(
    () => autoRefresh.value,
    enabled => (enabled ? resume() : pause()),
    { immediate: true }
  );

  return {
    activeSection,
    autoRefresh,
    error,
    isInitialLoading,
    isLoading,
    overview,
    replication,
    opcounterRates,
    refreshSignal,
    refresh,
  };
}
