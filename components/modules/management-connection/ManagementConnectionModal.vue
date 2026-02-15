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
    <DialogContent class="w-[95vw]! max-w-[55vw]!">
      <!-- <DialogHeader>
        <DialogTitle> hello </DialogTitle>
      </DialogHeader> -->
      <div class="w-full overflow-x-auto">
        <ManagementConnection
          :connections="connections"
          :workspace-id="workspaceId"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
