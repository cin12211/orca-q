<script setup lang="ts">
import { computed } from 'vue';
import { Button, Icon } from '#components';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { formatMongoEjsonValue } from '../utils';

interface Props {
  open: boolean;
  docId: unknown | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const documentIdLabel = computed(() => {
  if (props.docId === null) return '';
  const formatted = formatMongoEjsonValue(props.docId);
  if (formatted) return formatted;
  return typeof props.docId === 'string'
    ? props.docId
    : JSON.stringify(props.docId);
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-2 font-medium">
          <Icon name="hugeicons:delete-02" class="size-5 text-destructive" />
          Delete Document
        </AlertDialogTitle>
        <AlertDialogDescription class="space-y-2">
          <p class="text-sm">
            Are you sure you want to delete document with _id:
            <span class="font-medium text-foreground">{{
              documentIdLabel
            }}</span>
            ?
          </p>
          <p class="text-xs text-muted-foreground">
            This action cannot be undone.
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading" @click="emit('cancel')">
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="loading"
          data-testid="btn-confirm-delete-document"
          @click="emit('confirm')"
        >
          <Icon
            v-if="loading"
            name="hugeicons:loading-03"
            class="size-4 mr-2 animate-spin"
          />
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
