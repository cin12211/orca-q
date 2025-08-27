import { ActivityBarItemType, useActivityBarStore } from '~/shared/stores';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';

export const useActivityMenu = () => {
  const activityStore = useActivityBarStore();
  const appLayoutStore = useAppLayoutStore();

  const { trackEvent } = useAmplitude();

  const activity = computed(() => [
    {
      id: ActivityBarItemType.Explorer,
      title: 'Files',
      icon: 'hugeicons:files-02',
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
