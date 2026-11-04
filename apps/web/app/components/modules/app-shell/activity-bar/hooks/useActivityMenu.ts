import { getConnectionCapabilityProfile } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores';
import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  BASE_ACTIVITY_ITEMS,
  DEFAULT_CONNECTION_CONTEXT,
} from '../constants/activityBarVisibility';
import { getVisibleActivityItems } from '../utils/getVisibleActivityItems';

export const useActivityMenu = () => {
  const activityStore = useActivityBarStore();
  const appConfigStore = useAppConfigStore();
  const managementConnectionStore = useManagementConnectionStore();

  const { trackEvent } = useAmplitude();

  const capabilityProfile = computed(() =>
    getConnectionCapabilityProfile(
      managementConnectionStore.selectedConnection ?? DEFAULT_CONNECTION_CONTEXT
    )
  );

  const selectedConnectionType = computed(
    () =>
      managementConnectionStore.selectedConnection?.type as
        | DatabaseClientType
        | undefined
  );

  const visibleActivityItems = computed(() =>
    getVisibleActivityItems(
      capabilityProfile.value.visibleActivityItems,
      selectedConnectionType.value
    )
  );

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
