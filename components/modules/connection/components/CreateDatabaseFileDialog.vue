<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  open: boolean;
  databaseLabel: string;
  pickDirectory: () => Promise<string | null> | undefined;
  createFile: (input: { directory: string; fileName: string }) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void;
}>();

const fileName = ref('');
const directory = ref('');
const errorMessage = ref('');
const isCreating = ref(false);

const canConfirm = computed(
  () => !!fileName.value.trim() && !!directory.value && !isCreating.value
);

const handlePickDirectory = async () => {
  const selectedDirectory = await props.pickDirectory();

  if (selectedDirectory) {
    directory.value = selectedDirectory;
  }
};

const handleConfirm = async () => {
  isCreating.value = true;
  errorMessage.value = '';

  try {
    await props.createFile({
      directory: directory.value,
      fileName: fileName.value.trim(),
    });
    emit('update:open', false);
  } catch (error: unknown) {
    const failure = error as { data?: { message?: string }; message?: string };
    errorMessage.value =
      failure.data?.message || failure.message || 'Could not create the file.';
  } finally {
    isCreating.value = false;
  }
};

watch(
  () => props.open,
  open => {
    if (open) {
      fileName.value = '';
      directory.value = '';
      errorMessage.value = '';
    }
  }
);
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
        <div class="space-y-2">
          <Label for="database-file-name">File name</Label>
          <Input
            id="database-file-name"
            data-testid="create-database-file-name"
            placeholder="analytics"
            v-model="fileName"
          />
        </div>

        <div class="space-y-2">
          <Label for="database-file-directory">Location</Label>
          <div class="flex gap-2">
            <Input
              id="database-file-directory"
              data-testid="create-database-file-directory"
              placeholder="Choose a folder"
              readonly
              :model-value="directory"
            />
            <Button
              data-testid="create-database-file-browse"
              type="button"
              variant="outline"
              @click="handlePickDirectory"
            >
              Browse
            </Button>
          </div>
        </div>

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
          @click="handleConfirm"
        >
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
