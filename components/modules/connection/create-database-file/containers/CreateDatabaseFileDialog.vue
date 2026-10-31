<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DatabaseFileAdvancedOptions,
  DatabaseFileLocationFields,
} from '../components';
import { useCreateDatabaseFile } from '../hooks';
import type { FileDatabaseType } from '../types';

const props = defineProps<{
  open: boolean;
  databaseLabel: string;
  databaseType: FileDatabaseType;
}>();

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void;
  (e: 'created', filePath: string): void;
}>();

const {
  fileName,
  directory,
  options,
  errorMessage,
  canConfirm,
  pickDirectory,
  confirm,
} = useCreateDatabaseFile({
  open: () => props.open,
  databaseType: () => props.databaseType,
  onCreated: filePath => {
    emit('created', filePath);
    emit('update:open', false);
  },
});
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md" data-testid="create-database-file-dialog">
      <DialogHeader>
        <DialogTitle>Create {{ databaseLabel }} database</DialogTitle>
        <DialogDescription>
          Creates an empty database file on this computer.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <DatabaseFileLocationFields
          v-model:file-name="fileName"
          :directory="directory"
          @pick-directory="pickDirectory"
        />

        <DatabaseFileAdvancedOptions
          v-model="options"
          :database-type="databaseType"
        />

        <p
          v-if="errorMessage"
          data-testid="create-database-file-error"
          class="text-xs text-destructive"
        >
          {{ errorMessage }}
        </p>
      </div>

      <DialogFooter class="gap-2">
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Cancel
        </Button>
        <Button
          data-testid="create-database-file-confirm"
          type="button"
          :disabled="!canConfirm"
          @click="confirm"
        >
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
