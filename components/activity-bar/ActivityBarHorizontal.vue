<script setup lang="ts">
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';

const activityStore = useActivityBarStore();
const { trackEvent } = useAmplitude();

// This is sample data
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
    icon: 'hugeicons:chart-relationship',
    isActive: activityStore.activityActive === ActivityBarItemType.Schemas,
  },
  {
    id: ActivityBarItemType.ErdDiagram,
    title: 'ErdDiagram',
    icon: 'hugeicons:hierarchy-square-02',
    isActive: activityStore.activityActive === ActivityBarItemType.ErdDiagram,
  },
]);

const onChangeActivity = (type: ActivityBarItemType) => {
  activityStore.setActivityActive(type);

  trackEvent('activity_bar', {
    activity: type,
  });
};
</script>

<template>
  <div class="flex items-center gap-1">
    <Tooltip v-for="item in activity">
      <TooltipTrigger as-child>
        <Button
          size="iconMd"
          :variant="item.isActive ? 'default' : 'ghost'"
          @click="onChangeActivity(item.id)"
        >
          <Icon :name="item.icon" class="size-5!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{{ item.title }}</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
