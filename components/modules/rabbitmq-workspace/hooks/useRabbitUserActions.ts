import { toast } from 'vue-sonner';
import { useStrictModeGuard } from '~/components/modules/environment-tag';
import { getBrokerErrorMessage } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { rabbitmqService } from '../services';
import { useRabbitTabs } from './useRabbitTabs';
import { useRabbitUsersChanged } from './useRabbitUsersChanged';

/**
 * Admin changes to RabbitMQ users. Each change asks Strict Mode first, shows a
 * toast, and tells the Users sidebar to reload.
 */
export function useRabbitUserActions(connection: () => Connection | null) {
  const { checkAndConfirm } = useStrictModeGuard();
  const tabViewStore = useTabViewsStore();
  const { userTabId } = useRabbitTabs();
  const usersChanged = useRabbitUsersChanged();
  const isSaving = ref(false);

  /** Returns true when the change went through. */
  const run = async (
    userName: string,
    successMessage: string,
    change: (target: Connection) => Promise<unknown>,
    isDeleted = false
  ) => {
    const target = connection();
    if (!target || !(await checkAndConfirm(target))) return false;

    isSaving.value = true;

    try {
      await change(target);
      toast.success(successMessage);
      usersChanged.emit({ connectionId: target.id, userName, isDeleted });
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

  const deleteUser = async (userName: string) => {
    const isDeleted = await run(
      userName,
      `User "${userName}" deleted`,
      item => rabbitmqService.deleteUser(item, userName),
      true
    );

    if (isDeleted) {
      const tabId = userTabId(userName);
      if (tabViewStore.tabViews.some(tab => tab.id === tabId)) {
        await tabViewStore.closeTab(tabId);
      }
    }

    return isDeleted;
  };

  return { isSaving, run, deleteUser };
}
