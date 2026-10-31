<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  getDatabaseFileOptionFields,
  getDefaultDatabaseFileOptions,
  type DatabaseFileOptions,
} from '~/core/constants/database-file-options';

const props = defineProps<{
  open: boolean;
  databaseLabel: string;
  databaseType: DatabaseClientType;
  pickDirectory: () => Promise<string | null> | undefined;
  createFile: (input: {
    directory: string;
    fileName: string;
    options: DatabaseFileOptions;
  }) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void;
}>();

const fileName = ref('');
const directory = ref('');
const options = ref<DatabaseFileOptions>({});
const errorMessage = ref('');
const isCreating = ref(false);

const optionFields = computed(() =>
  getDatabaseFileOptionFields(props.databaseType)
);

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
      options: options.value,
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
      options.value = getDefaultDatabaseFileOptions(props.databaseType);
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

        <Accordion type="single" collapsible class="border-t">
          <AccordionItem value="advanced" class="border-b-0">
            <AccordionTrigger
              data-testid="create-database-file-advanced"
              class="py-3 text-sm"
            >
              Advanced
            </AccordionTrigger>
            <AccordionContent class="space-y-3">
              <div
                v-for="field in optionFields"
                :key="field.key"
                class="space-y-1"
              >
                <Label>{{ field.label }}</Label>
                <Select v-model="options[field.key]">
                  <SelectTrigger
                    class="w-full cursor-pointer"
                    :data-testid="`create-database-file-${field.key}`"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="choice in field.choices"
                      :key="choice.value"
                      class="cursor-pointer"
                      :data-testid="`create-database-file-${field.key}-${choice.value}`"
                      :value="choice.value"
                    >
                      {{ choice.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-muted-foreground">
                  {{ field.description }}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
