import { ref } from 'vue';
import type { Connection } from '~/core/stores';
import { useEnvironmentTagStore } from '~/core/stores';
import type { EnvironmentTag } from '../types/environmentTag.types';

const strictModeDialogOpen = ref(false);
const activeStrictModeTags = ref<EnvironmentTag[]>([]);
let strictModeDecisionResolver: ((value: boolean) => void) | null = null;

/** Shared guard state — consumed by StrictModeGuardProvider mounted at root. */
export function useStrictModeGuardState() {
  const confirmStrictModeDialog = () => {
    strictModeDialogOpen.value = false;
    strictModeDecisionResolver?.(true);
    strictModeDecisionResolver = null;
  };

  const cancelStrictModeDialog = () => {
    strictModeDialogOpen.value = false;
    strictModeDecisionResolver?.(false);
    strictModeDecisionResolver = null;
  };

  return {
    strictModeDialogOpen,
    activeStrictModeTags,
    confirmStrictModeDialog,
    cancelStrictModeDialog,
  };
}

/** Use this composable to guard a connect action. */
export function useStrictModeGuard() {
  const tagStore = useEnvironmentTagStore();

  const checkAndConfirm = (connection: Connection): Promise<boolean> => {
    const strictTags = tagStore
      .getTagsByIds(connection.tagIds ?? [])
      .filter(t => t.strictMode);

    if (strictTags.length === 0) {
      return Promise.resolve(true);
    }

    activeStrictModeTags.value = strictTags;
    strictModeDialogOpen.value = true;

    return new Promise<boolean>(resolve => {
      strictModeDecisionResolver = resolve;
    });
  };

  return { checkAndConfirm };
}
