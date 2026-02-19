<script setup lang="ts">
import { LoadingOverlay } from '#components';
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

const props = defineProps<{
  open: boolean;
  sql: string;
  type: 'save' | 'delete';
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const title = computed(() => {
  return props.type === 'save'
    ? 'Confirm Save Operation'
    : 'Confirm Delete Operation';
});

const description = computed(() => {
  return props.type === 'save'
    ? 'The following SQL will be executed to save your changes:'
    : 'The following SQL will be executed to delete the selected rows:';
});

const actionLabel = computed(() => {
  return props.type === 'save' ? 'Save' : 'Delete';
});

const onConfirm = () => {
  emit('confirm');
  emit('update:open', false);
};

const onCancel = () => {
  emit('cancel');
  emit('update:open', false);
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border w-[55vw]! max-w-[55vw]!">
      <LoadingOverlay :visible="!!loading" />
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center text-base font-medium">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <CodeHighlightPreview :code="sql" show-copy-button max-height="24rem" />

      <AlertDialogFooter>
        <AlertDialogCancel class="border font-normal" @click="onCancel">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          class="border font-normal flex gap-1"
          @click="onConfirm"
        >
          <Icon
            :name="type === 'save' ? 'lucide:save' : 'lucide:trash-2'"
            class="size-4"
          />
          {{ actionLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
