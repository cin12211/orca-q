import { ref } from 'vue';

/**
 * A composable hook for managing the Safe Mode confirmation dialog state and logic.
 */
export function useSafeModeDialog() {
  const safeModeDialogOpen = ref(false);
  const safeModeDialogSql = ref('');
  const safeModeDialogType = ref<'save' | 'delete'>('save');
  let safeModeResolve: ((confirmed: boolean) => void) | null = null;

  const onRequestSafeModeConfirm = (
    sql: string,
    type: 'save' | 'delete'
  ): Promise<boolean> => {
    return new Promise(resolve => {
      safeModeDialogSql.value = sql;
      safeModeDialogType.value = type;
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
    onRequestSafeModeConfirm,
    onSafeModeConfirm,
    onSafeModeCancel,
  };
}
