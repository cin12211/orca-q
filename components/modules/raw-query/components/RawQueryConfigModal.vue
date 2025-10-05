<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EditorConfig from '../../settings/EditorConfig.vue';

defineProps<{
  open: Boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();
</script>
<template>
  <Dialog class="" :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="w-[40vw] h-[50vh] flex flex-col justify-between min-w-[40vw]"
    >
      <DialogHeader>
        <DialogTitle> Editor configs </DialogTitle>
      </DialogHeader>

      <EditorConfig />
    </DialogContent>
  </Dialog>
</template>
