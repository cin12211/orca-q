<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LoadingOverlay from '~/components/base/LoadingOverlay.vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';

const props = defineProps<{
  open: boolean;
  sql: string;
  title: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const { copied, handleCopy, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const onCopy = () => handleCopy(props.sql);

const onClose = () => {
  emit('update:open', false);
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border w-[55vw]! max-w-[55vw]!">
      <!-- DDL Loading Overlay -->
      <LoadingOverlay :visible="isLoading" />
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center text-base font-medium">
          <Icon name="lucide:code" class="size-4 mr-2" />
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Generated SQL statement. Click copy to use.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <CodeHighlightPreview :code="sql" show-copy-button max-height="24rem" />

      <AlertDialogFooter>
        <AlertDialogCancel class="border font-normal" @click="onClose">
          Close
        </AlertDialogCancel>
        <AlertDialogAction
          class="border font-normal flex gap-1"
          @click="onCopy"
        >
          <Icon :name="getCopyIcon(copied)" class="size-4" />
          {{ getCopyTooltip(copied, 'Copy to Clipboard') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
