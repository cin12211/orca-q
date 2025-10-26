<script setup lang="ts">
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useConnectionsService } from '~/shared/services/useConnectionService';
import ManagementConnection from './ManagementConnection.vue';

const props = defineProps<{
  open: Boolean;
  workspaceId: string;
}>();

const { connStore } = useConnectionsService();

const connections = computed(() => {
  return connStore.connectionsByWorkspaceId(props.workspaceId);
});

const emit = defineEmits(['update:open']);
</script>

<template>
  <Dialog :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent class="w-[95vw]! max-w-[55vw]!">
      <div class="w-full overflow-x-auto">
        <ManagementConnection
          :connections="connections"
          :workspace-id="workspaceId"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
