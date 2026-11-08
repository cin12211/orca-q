import type { Ref, ShallowRef } from 'vue';
import { ref } from 'vue';
import { useHotkeys } from '~/core/composables/useHotKeys';
import type MongoCollectionFilter from '../components/MongoCollectionFilter.vue';

interface UseMongoCollectionShortcutsOptions {
  containerRef: Ref<HTMLElement | undefined>;
  mongoFilterRef:
    | Ref<InstanceType<typeof MongoCollectionFilter> | null | undefined>
    | Readonly<ShallowRef<InstanceType<typeof MongoCollectionFilter> | null>>;
  isSkipShortcut?: Ref<boolean>;
  onRefresh?: () => void;
}

export function useMongoCollectionShortcuts({
  containerRef,
  mongoFilterRef,
  isSkipShortcut = ref(false),
  onRefresh,
}: UseMongoCollectionShortcutsOptions) {
  useHotkeys(
    [
      {
        key: 'meta+r',
        callback: () => {
          if (isSkipShortcut.value) return;
          onRefresh?.();
        },
        isPreventDefault: true,
      },
    ],
    {
      target: containerRef,
    }
  );

  // Global (not scoped to containerRef) so the shortcut still fires when
  // focus is outside the container's DOM subtree, matching QuickQuery's
  // useQuickQueryShortcuts meta+f behavior.
  useHotkeys([
    {
      key: 'meta+f',
      callback: async () => {
        if (isSkipShortcut.value) return;
        await mongoFilterRef.value?.onShowSearch();
      },
    },
  ]);
}
