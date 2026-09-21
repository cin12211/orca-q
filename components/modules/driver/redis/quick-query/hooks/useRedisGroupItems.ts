import type { MaybeRefOrGetter, Ref } from 'vue';
import { toRef, watch } from 'vue';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';

interface UseRedisGroupItemsOptions {
  prefix: MaybeRefOrGetter<string>;
  databaseIndex: Ref<number>;
  listGroupKeys: (prefix: string) => Promise<RedisKeyListItem[]>;
}

/**
 * Loads the keys behind a Redis group tab, re-fetching whenever the group
 * prefix or the selected database changes.
 */
export function useRedisGroupItems(options: UseRedisGroupItemsOptions) {
  const prefix = toRef(options.prefix);
  const items = ref<RedisKeyListItem[]>([]);
  const loading = ref(false);

  watch(
    () => [prefix.value, options.databaseIndex.value],
    async () => {
      const requestedPrefix = prefix.value;
      loading.value = true;

      try {
        const result = await options.listGroupKeys(requestedPrefix);

        // Ignore a stale response if the tab switched to another group.
        if (requestedPrefix === prefix.value) {
          items.value = result;
        }
      } catch (error) {
        console.error('[useRedisGroupItems] Failed to load group keys', error);
        items.value = [];
      } finally {
        loading.value = false;
      }
    },
    { immediate: true }
  );

  return { items, loading };
}
