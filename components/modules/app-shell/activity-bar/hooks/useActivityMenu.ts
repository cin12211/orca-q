import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';

export const useActivityMenu = () => {
  const activityStore = useActivityBarStore();
  const appLayoutStore = useAppLayoutStore();

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
  ]);

  const onChangeActivity = (
    type: ActivityBarItemType,
    isToggleLeftBar?: boolean
  ) => {
    activityStore.setActivityActive(type);

    if (isToggleLeftBar) {
      appLayoutStore.onToggleActivityBarPanel();
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
