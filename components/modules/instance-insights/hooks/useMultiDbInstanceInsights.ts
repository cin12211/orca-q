import { useIntervalFn } from '@vueuse/core';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type {
  InstanceInsightsSectionId,
  InstanceInsightsView,
} from '~/core/types';

interface FetchOptions {
  silent?: boolean;
}

const AUTO_REFRESH_INTERVAL_MS = 5000;

export function useMultiDbInstanceInsights(
  connection: Ref<Connection | undefined>
) {
  const view = ref<InstanceInsightsView | null>(null);
  const activeSection = ref<InstanceInsightsSectionId>('overview');
  const autoRefresh = ref(true);
  const configurationSearch = ref('');

  const error = ref<string | null>(null);
  const isInitialLoading = ref(false);
  const isViewLoading = ref(false);

  const hasConnection = computed(() => Boolean(connection.value));
  const isActive = ref(true);

  onDeactivated(() => {
    isActive.value = false;
  });

  onActivated(() => {
    isActive.value = true;
  });

  const reset = () => {
    error.value = null;
    view.value = null;
    configurationSearch.value = '';
    activeSection.value = 'overview';
  };

  const fetchView = async (options: FetchOptions = {}) => {
    if (!hasConnection.value) {
      reset();
      return null;
    }

    if (!options.silent) {
      isViewLoading.value = true;
    }

    try {
      error.value = null;

      const result = await $fetch<InstanceInsightsView>(
        '/api/instance-insights/view',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
          },
        }
      );

      view.value = result;

      if (
        !result.sections.some(section => section.id === activeSection.value)
      ) {
        activeSection.value = result.sections[0]?.id || 'overview';
      }

      return result;
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.message ||
        err?.statusMessage ||
        'Failed to fetch instance insights';
      error.value = message;
      return null;
    } finally {
      if (!options.silent) {
        isViewLoading.value = false;
      }
    }
  };

  const refreshSection = async (
    _section: InstanceInsightsSectionId = activeSection.value,
    options: FetchOptions = {}
  ) => fetchView(options);

  const refreshAll = async (options: FetchOptions = {}) => fetchView(options);

  const performInitialLoad = async () => {
    if (!hasConnection.value) {
      reset();
      return;
    }

    isInitialLoading.value = true;
    await fetchView();
    isInitialLoading.value = false;
  };

  watch(
    () => connection.value,
    async current => {
      if (!current) {
        reset();
        return;
      }

      await performInitialLoad();
    },
    { immediate: true }
  );

  const { pause, resume } = useIntervalFn(
    async () => {
      if (!hasConnection.value || !isActive.value) {
        return;
      }

      await fetchView({ silent: true });
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
    view,
    activeSection,
    autoRefresh,
    configurationSearch,
    error,
    isInitialLoading,
    isViewLoading,
    refreshSection,
    refreshAll,
  };
}
