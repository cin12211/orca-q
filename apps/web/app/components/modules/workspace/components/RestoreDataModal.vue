<script setup lang="ts">
import { ref } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RestoreDataPanel } from '~/components/modules/settings/components/backup-restore';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const importPanelRef = ref<{
  canClose: () => boolean;
  resetState: () => void;
} | null>(null);

const handleClose = () => {
  if (importPanelRef.value && !importPanelRef.value.canClose()) return;

  importPanelRef.value?.resetState();
  emit('update:open', false);
};
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-2xl flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:file-download" class="size-4!" />
          Restore Data
        </DialogTitle>
      </DialogHeader>

      <RestoreDataPanel
        ref="importPanelRef"
        layout="modal"
        success-action-label="Close"
        success-action-mode="emit"
        @success-action="handleClose"
      />
    </DialogContent>
  </Dialog>
</template>
