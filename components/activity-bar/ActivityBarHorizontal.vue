<script setup lang="ts">
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import WorkspaceSelector from '../modules/selectors/WorkspaceSelector.vue';

const activityStore = useActivityBarStore();

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
</script>

<template>
  <div class="flex items-center gap-1">
    <Tooltip v-for="item in activity">
      <TooltipTrigger as-child>
        <Button
          size="iconMd"
          :variant="item.isActive ? 'default' : 'ghost'"
          @click="activityStore.setActivityActive(item.id)"
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
