import { toast } from 'vue-sonner';
import { useStrictModeGuard } from '~/components/modules/environment-tag';
import { getBrokerErrorMessage } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';

/**
 * Run one broker change: ask Strict Mode first, then toast the outcome.
 * Resolves true when RabbitMQ accepted the change.
 */
export function useRabbitChange(connection: () => Connection | null) {
  const { checkAndConfirm } = useStrictModeGuard();
  const isSaving = ref(false);

  const run = async (
    successMessage: string,
    change: (target: Connection) => Promise<unknown>
  ) => {
    const target = connection();
    if (!target || !(await checkAndConfirm(target))) return false;

    isSaving.value = true;

    try {
      await change(target);
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error('RabbitMQ did not accept the change', {
        description: getBrokerErrorMessage(error),
      });
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  return { isSaving, run };
}
