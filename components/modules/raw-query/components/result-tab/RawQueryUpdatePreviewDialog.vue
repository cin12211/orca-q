<script setup lang="ts">
import { CodeHighlightPreview, LoadingOverlay } from '#components';
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
import type { RawQueryMutationAction } from '../../hooks/useRawQueryMutation';
import type {
  RawQueryDeleteGroup,
  RawQueryUpdateGroup,
} from '../../utils/buildRawQueryUpdates';

const props = defineProps<{
  open: boolean;
  action: RawQueryMutationAction;
  /** Used when action === 'update' */
  updateGroups?: RawQueryUpdateGroup[];
  totalUpdates?: number;
  updateHasNoPkWarning?: boolean;
  /** Used when action === 'delete' */
  deleteGroups?: RawQueryDeleteGroup[];
  totalDeletes?: number;
  deleteHasNoPkWarning?: boolean;
  isMutating: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const isDelete = computed(() => props.action === 'delete');

// dangerous = no PK detected (same semantics as QuickQuery's `dangerous` prop)
const dangerous = computed(() =>
  isDelete.value
    ? (props.deleteHasNoPkWarning ?? false)
    : (props.updateHasNoPkWarning ?? false)
);

const title = computed(() => {
  if (dangerous.value) {
    return isDelete.value
      ? 'High-Risk: Confirm Delete'
      : 'High-Risk: Confirm Save';
  }
  return isDelete.value ? 'Confirm Delete' : 'Confirm Save';
});

const description = computed(() => {
  if (dangerous.value) {
    return 'Caution: No primary key detected. To identify the record, this operation will match all columns in the WHERE clause. This carries a risk of affecting multiple rows if they share identical data. Please verify the SQL below carefully before proceeding:';
  }
  return isDelete.value
    ? 'The following SQL will be executed to delete the selected rows:'
    : 'The following SQL will be executed to save your changes:';
});

const actionLabel = computed(() => (isDelete.value ? 'Delete' : 'Save'));

/** All SQL statements across all groups, with a header comment per table group. */
const sql = computed(() => {
  const groups = isDelete.value
    ? (props.deleteGroups ?? [])
    : (props.updateGroups ?? []);

  if (groups.length === 0) return '';

  return groups
    .map(g => {
      const header = `-- ${g.schemaName}.${g.tableName}`;
      return `${header}\n${g.sqlStatements.join('\n')}`;
    })
    .join('\n\n');
});

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};
</script>

<template>
  <AlertDialog
    :open="open"
    @update:open="!$event && !isMutating && emit('cancel')"
  >
    <AlertDialogContent size="preview">
      <LoadingOverlay :visible="!!isMutating" />
      <AlertDialogHeader>
        <AlertDialogTitle
          class="flex items-center gap-2 text-base font-medium"
          :class="{ 'text-destructive': dangerous || isDelete }"
        >
          <Icon
            v-if="dangerous || isDelete"
            :name="dangerous ? 'lucide:alert-triangle' : 'lucide:trash-2'"
            class="size-5"
            :class="dangerous ? 'text-destructive' : 'text-destructive'"
          />
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription
          :class="{ 'text-destructive font-normal': dangerous }"
        >
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <CodeHighlightPreview
        :code="sql"
        language="sql"
        show-copy-button
        max-height="24rem"
      />

      <AlertDialogFooter>
        <AlertDialogCancel class="border font-normal" @click="onCancel">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          class="border font-normal flex gap-1"
          :class="{
            'bg-destructive hover:bg-destructive/90': isDelete,
          }"
          @click="onConfirm"
        >
          <Icon
            :name="isDelete ? 'lucide:trash-2' : 'lucide:save'"
            class="size-4"
          />
          {{ actionLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
