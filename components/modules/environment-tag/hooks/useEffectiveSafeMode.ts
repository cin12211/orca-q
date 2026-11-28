import { computed, type Ref } from 'vue';
import type { Connection } from '~/core/stores';
import { useEnvironmentTagStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

/**
 * Whether the connection carries at least one tag with Strict Mode on.
 */
export function useIsStrictConnection(
  connection: Ref<Connection | null | undefined>
) {
  const tagStore = useEnvironmentTagStore();

  return computed(() => {
    const tagIds = connection.value?.tagIds;
    if (!tagIds?.length) return false;

    return tagStore.getTagsByIds(tagIds).some(tag => tag.strictMode);
  });
}

/**
 * Safe Mode as it applies to one connection: the global setting, forced on
 * when the connection has a Strict Mode tag.
 */
export function useEffectiveSafeMode(
  connection: Ref<Connection | null | undefined>
) {
  const appConfigStore = useAppConfigStore();
  const isStrictConnection = useIsStrictConnection(connection);

  return computed(
    () => appConfigStore.quickQuerySafeModeEnabled || isStrictConnection.value
  );
}
