import {
  type ConnectionActivityItem,
  getConnectionCapabilityProfile,
} from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores';
import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

const ACTIVITY_ITEM_MAP: Record<ConnectionActivityItem, ActivityBarItemType> = {
  Explorer: ActivityBarItemType.Explorer,
  Schemas: ActivityBarItemType.Schemas,
  ERDiagram: ActivityBarItemType.ErdDiagram,
  UsersRoles: ActivityBarItemType.UsersRoles,
  DatabaseTools: ActivityBarItemType.DatabaseTools,
  Agent: ActivityBarItemType.Agent,
};

const DEFAULT_CONNECTION_CONTEXT = {
  type: DatabaseClientType.POSTGRES,
  method: EConnectionMethod.STRING,
};

const BASE_ACTIVITY_ITEMS = [
  {
    id: ActivityBarItemType.Explorer,
    title: 'Explorer',
    icon: 'hugeicons:folder-file-storage',
  },
  {
    id: ActivityBarItemType.Schemas,
    title: 'Schemas',
    icon: 'hugeicons:database',
  },
  {
    id: ActivityBarItemType.ErdDiagram,
    title: 'ErdDiagram',
    icon: 'hugeicons:hierarchy-square-02',
  },
  {
    id: ActivityBarItemType.UsersRoles,
    title: 'Users & Roles',
    icon: 'hugeicons:user-shield-01',
  },
  {
    id: ActivityBarItemType.DatabaseTools,
    title: 'Database Tools',
    icon: 'hugeicons:block-game',
  },
  {
    id: ActivityBarItemType.Agent,
    title: 'AI Agent',
    icon: 'hugeicons:robotic',
  },
] as const;

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

  const shouldHideRestrictedItems = computed(() =>
    [
      DatabaseClientType.REDIS,
      DatabaseClientType.SQLITE3,
      DatabaseClientType.BETTER_SQLITE3,
    ].includes(
      managementConnectionStore.selectedConnection?.type as DatabaseClientType
    )
  );

  const visibleActivityItems = computed(() =>
    capabilityProfile.value.visibleActivityItems
      .filter(item => {
        if (!shouldHideRestrictedItems.value) {
          return true;
        }

        return (
          item !== ActivityBarItemType.UsersRoles &&
          item !== ActivityBarItemType.Agent
        );
      })
      .map(item => ACTIVITY_ITEM_MAP[item])
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
