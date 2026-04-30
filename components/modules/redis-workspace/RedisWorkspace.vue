<script setup lang="ts">
import type { Connection } from '~/core/stores';
import { TabViewType, type TabView } from '~/core/stores/useTabViewsStore';
import RedisPubSubPanel from './components/RedisPubSubPanel.vue';
import RedisValueEditor from './components/RedisValueEditor.vue';
import { useRedisWorkspace } from './hooks/useRedisWorkspace';

const props = defineProps<{
  connection?: Connection;
  tabInfo?: TabView;
}>();

const workspace = useRedisWorkspace({
  connection: () => props.connection,
  tabInfo: () => props.tabInfo,
});
const {
  canEditSelectedValue,
  databases,
  editUnavailableReason,
  loadingKeys,
  loadingSelectedKeyDetail,
  savingValue,
  selectedDatabaseIndex,
  selectedKeyDetail,
} = workspace;

const activeType = computed(
  () => props.tabInfo?.type || TabViewType.RedisBrowser
);
</script>

<template>
  <RedisPubSubPanel
    v-if="activeType === TabViewType.RedisPubSub"
    :connection="props.connection"
    :database-index="selectedDatabaseIndex"
    :databases="databases"
    @update:database-index="workspace.selectedDatabaseIndex.value = $event"
  />

  <RedisValueEditor
    v-else
    :detail="selectedKeyDetail"
    :loading="loadingKeys || loadingSelectedKeyDetail"
    :saving="savingValue"
    :can-edit="canEditSelectedValue"
    :unavailable-reason="editUnavailableReason"
    @save="workspace.saveSelectedValue"
    @refresh="selectedKeyDetail && workspace.focusKey(selectedKeyDetail.key)"
  />
</template>
