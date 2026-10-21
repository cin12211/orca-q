import { storeToRefs } from 'pinia';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type { TabMetadata } from '~/core/types/entities/tab-view.entity';

/**
 * Shared plumbing for every `[tabViewId].vue` page: resolves the tab record
 * backing the current route so each page only renders one container and does
 * not have to re-implement the lookup.
 */
export function useTabViewPage<TMetadata extends TabMetadata = TabMetadata>() {
  const route = useRoute();
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();
  const tabViewStore = useTabViewsStore();
  const { tabViews } = storeToRefs(tabViewStore);

  const tabViewId = computed(() => {
    const value = route.params.tabViewId;

    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  });

  const tabInfo = computed(() =>
    tabViews.value.find(tab => tab.id === tabViewId.value)
  );

  const metadata = computed(
    () => tabInfo.value?.metadata as TMetadata | undefined
  );

  return {
    connectionId,
    metadata,
    tabInfo,
    tabViewId,
    workspaceId,
  };
}
