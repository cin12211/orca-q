<script setup lang="ts">
import type { Connection } from '~/core/stores';
import type { TabView } from '~/core/stores/useTabViewsStore';
import RedisDeleteKeyDialog from '../components/RedisDeleteKeyDialog.vue';
import RedisKeyDetailPanel from '../components/RedisKeyDetailPanel.vue';
import { useRedisWorkspace } from '../hooks/useRedisWorkspace';

const props = defineProps<{
  connection?: Connection;
  tabInfo?: TabView;
}>();

const workspace = useRedisWorkspace({
  connection: () => props.connection,
  tabInfo: () => props.tabInfo,
  mode: 'browser',
});
const {
  canEditSelectedValue,
  editUnavailableReason,
  isDeletingKey,
  loadingKeys,
  loadingSelectedKeyDetail,
  loadingSelectedKeyInfo,
  savingValue,
  selectedKeyDetail,
  selectedKeyInfo,
} = workspace;

const isDeleteDialogOpen = ref(false);
const selectedKey = computed(
  () => selectedKeyDetail.value?.key ?? selectedKeyInfo.value?.key ?? null
);

const confirmDelete = async () => {
  if (!selectedKeyDetail.value) {
    return;
  }

  await workspace.deleteKey(selectedKeyDetail.value.key);
  isDeleteDialogOpen.value = false;
};
</script>

<template>
  <RedisKeyDetailPanel
    :info="selectedKeyInfo"
    :detail="selectedKeyDetail"
    :loading-info="loadingKeys || loadingSelectedKeyInfo"
    :loading-value="loadingKeys || loadingSelectedKeyDetail"
    :saving="savingValue"
    :can-edit="canEditSelectedValue"
    :unavailable-reason="editUnavailableReason"
    @save="workspace.saveSelectedValue"
    @refresh="selectedKey && workspace.focusKey(selectedKey)"
    @delete="isDeleteDialogOpen = true"
  />

  <RedisDeleteKeyDialog
    :open="isDeleteDialogOpen"
    mode="key"
    :target-key="selectedKeyDetail?.key ?? ''"
    :loading="isDeletingKey"
    @update:open="value => !isDeletingKey && (isDeleteDialogOpen = value)"
    @confirm="confirmDelete"
  />
</template>
