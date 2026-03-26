import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

export const useActivityMenu = () => {
  const activityStore = useActivityBarStore();
  const appConfigStore = useAppConfigStore();

  const { trackEvent } = useAmplitude();

  const activity = computed(() => [
    {
      id: ActivityBarItemType.Explorer,
      title: 'Files / Folders',
      icon: 'hugeicons:folder-file-storage',
      isActive: activityStore.activityActive === ActivityBarItemType.Explorer,
    },
    {
      id: ActivityBarItemType.Schemas,
      title: 'Schemas',
      icon: 'hugeicons:database',
      isActive: activityStore.activityActive === ActivityBarItemType.Schemas,
    },
    {
      id: ActivityBarItemType.ErdDiagram,
      title: 'ErdDiagram',
      icon: 'hugeicons:hierarchy-square-02',
      isActive: activityStore.activityActive === ActivityBarItemType.ErdDiagram,
    },
    {
      id: ActivityBarItemType.UsersRoles,
      title: 'Users & Roles',
      icon: 'hugeicons:user-shield-01',
      isActive: activityStore.activityActive === ActivityBarItemType.UsersRoles,
    },
    // {
    //   id: ActivityBarItemType.DatabaseExport,
    //   title: 'Export Database',
    //   icon: 'hugeicons:file-export',
    //   isActive:
    //     activityStore.activityActive === ActivityBarItemType.DatabaseExport,
    // },
    {
      id: ActivityBarItemType.Agent,
      title: 'AI Agent',
      icon: 'hugeicons:robotic',
      isActive: activityStore.activityActive === ActivityBarItemType.Agent,
    },
  ]);

  const onChangeActivity = (
    type: ActivityBarItemType,
    isToggleLeftBar?: boolean
  ) => {
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
