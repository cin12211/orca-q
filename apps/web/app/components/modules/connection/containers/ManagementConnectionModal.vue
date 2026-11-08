<script setup lang="ts">
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Connection } from '~/core/stores';
import ManagementConnection from './ManagementConnection.vue';

defineProps<{
  open: Boolean;
  connections: Connection[];
  workspaceId: string;
}>();

const emit = defineEmits(['update:open']);
</script>

<template>
  <Dialog :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent
      size="preview"
      class="max-w-[60vw]! w-full max-h-[90vh] flex flex-col overflow-hidden"
      data-testid="management-connection-modal"
    >
      <ManagementConnection
        :connections="connections"
        :workspace-id="workspaceId"
      />
    </DialogContent>
  </Dialog>
</template>
