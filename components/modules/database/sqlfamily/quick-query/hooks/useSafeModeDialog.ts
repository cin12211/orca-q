import { ref } from 'vue';
import { QuickQueryMutationAction } from '../constants';

/**
 * A composable hook for managing the Safe Mode confirmation dialog state and logic.
 */
export function useSafeModeDialog() {
  const safeModeDialogOpen = ref(false);
  const safeModeDialogSql = ref('');
  const safeModeDialogType = ref(QuickQueryMutationAction.Save);
  const isDangerous = ref(false);
  let safeModeResolve: ((confirmed: boolean) => void) | null = null;

  const onRequestSafeModeConfirm = (
    sql: string,
    type: QuickQueryMutationAction,
    dangerous = false
  ): Promise<boolean> => {
    return new Promise(resolve => {
      safeModeDialogSql.value = sql;
      safeModeDialogType.value = type;
      isDangerous.value = dangerous;
      safeModeDialogOpen.value = true;
      safeModeResolve = resolve;
    });
  };

  const onSafeModeConfirm = () => {
    if (safeModeResolve) {
      safeModeResolve(true);
      safeModeResolve = null;
    }
    safeModeDialogOpen.value = false;
  };

  const onSafeModeCancel = () => {
    if (safeModeResolve) {
      safeModeResolve(false);
      safeModeResolve = null;
    }
    safeModeDialogOpen.value = false;
  };

  return {
    safeModeDialogOpen,
    safeModeDialogSql,
    safeModeDialogType,
    isDangerous,
    onRequestSafeModeConfirm,
    onSafeModeConfirm,
    onSafeModeCancel,
  };
}
