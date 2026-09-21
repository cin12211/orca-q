import { useIntervalFn } from '@vueuse/core';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoInstanceInsights } from '~/core/types/instance-insights.types';
import {
  MONGO_INSIGHTS_ENDPOINTS,
  MONGO_INSIGHTS_REFRESH_INTERVAL_MS,
} from '../constants';
import type { MongoInsightsSection } from '../types';
import { getErrorMessage } from '../utils';

export function useMongoInstanceInsights(options: {
  connection: Ref<Connection | undefined>;
}) {
  const activeSection = ref<MongoInsightsSection>('overview');
  const autoRefresh = ref(true);
  const error = ref<string | null>(null);
  const isInitialLoading = ref(false);
  const isLoading = ref(false);
  const insights = ref<Partial<MongoInstanceInsights>>({});
  const loadedSections = ref(new Set<MongoInsightsSection>());
  const isActiveView = ref(true);
  // Bumped on every completed fetch so the UI can signal an auto-refresh.
  const refreshSignal = ref(0);

  onDeactivated(() => {
    isActiveView.value = false;
  });

  onActivated(() => {
    isActiveView.value = true;
  });

  const setLoading = (section: MongoInsightsSection, silent: boolean) => {
    if (silent) return;
    if (loadedSections.value.has(section)) {
      isLoading.value = true;
    } else {
      isInitialLoading.value = true;
    }
  };

  const fetchSection = async <K extends MongoInsightsSection>(
    section: K,
    silent = false
  ) => {
    if (!options.connection.value) return;

    setLoading(section, silent);

    try {
      error.value = null;
      const result = await $fetch<MongoInstanceInsights[K]>(
        MONGO_INSIGHTS_ENDPOINTS[section],
        {
          method: 'POST',
          body: getConnectionParams(options.connection.value),
        }
      );

      insights.value = { ...insights.value, [section]: result };
      loadedSections.value.add(section);
      refreshSignal.value += 1;
    } catch (err) {
      error.value = getErrorMessage(
        err,
        'Failed to fetch MongoDB instance insights.'
      );
    } finally {
      isInitialLoading.value = false;
      isLoading.value = false;
    }
  };

  const refresh = () => fetchSection(activeSection.value);

  watch(activeSection, section => {
    if (!loadedSections.value.has(section)) {
      fetchSection(section);
    }
  });

  watch(
    () => options.connection.value,
    async connection => {
      insights.value = {};
      loadedSections.value = new Set();

      if (connection) {
        await fetchSection(activeSection.value);
      }
    },
    { immediate: true }
  );

  const { pause, resume } = useIntervalFn(
    async () => {
      if (!options.connection.value || !isActiveView.value) return;
      await fetchSection(activeSection.value, true);
    },
    MONGO_INSIGHTS_REFRESH_INTERVAL_MS,
    { immediate: false }
  );

  watch(autoRefresh, enabled => (enabled ? resume() : pause()), {
    immediate: true,
  });

  return {
    activeSection,
    autoRefresh,
    error,
    isInitialLoading,
    isLoading,
    insights,
    refreshSignal,
    refresh,
  };
}
