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
  dangerous?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const title = computed(() => {
  if (props.dangerous) {
    return props.type === 'save'
      ? 'High-Risk: Confirm Save'
      : 'High-Risk: Confirm Delete';
  }

  return props.type === 'save' ? 'Confirm Save' : 'Confirm Delete';
});

const description = computed(() => {
  if (props.dangerous) {
    return 'Caution: No primary key detected. To identify the record, this operation will match all columns in the WHERE clause. This carries a risk of affecting multiple rows if they share identical data. Please verify the SQL below carefully before proceeding:';
  }

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
        <AlertDialogTitle
          class="flex items-center gap-2 text-base font-medium"
          :class="{ 'text-destructive': dangerous }"
        >
          <Icon
            v-if="dangerous"
            name="lucide:alert-triangle"
            class="size-5 text-destructive"
          />
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription
          :class="{ 'text-destructive font-normal': dangerous }"
        >
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
