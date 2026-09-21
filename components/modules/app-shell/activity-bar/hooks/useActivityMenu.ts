import { BASE_ACTIVITY_ITEMS } from '~/core/constants/activityBarVisibility';
import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useVisibleActivityItems } from './useVisibleActivityItems';

export const useActivityMenu = () => {
  const activityStore = useActivityBarStore();
  const appConfigStore = useAppConfigStore();

  const { trackEvent } = useAmplitude();

  const { visibleActivityItems } = useVisibleActivityItems();

  const activity = computed(() =>
    BASE_ACTIVITY_ITEMS.filter(item =>
      visibleActivityItems.value.includes(item.id)
    ).map(item => ({
      ...item,
      isActive: activityStore.activityActive === item.id,
    }))
  );

  const onChangeActivity = (
    type: ActivityBarItemType,
    isToggleLeftBar?: boolean
  ) => {
    if (!visibleActivityItems.value.includes(type)) {
      return;
    }

    activityStore.setActivityActive(type);

    if (isToggleLeftBar) {
      appConfigStore.onToggleActivityBarPanel();
    }

    trackEvent('activity_bar', {
      activity: type,
    });
  };

  return {
    activity,
    onChangeActivity,
  };
};
