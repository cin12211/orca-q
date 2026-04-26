<script setup lang="ts">
import { Badge, Label } from '#components';
import {
  getDefaultNativeBackupFormat,
  getNativeBackupFormatOptions,
  getNativeBackupToolHint,
} from '~/core/constants/database-backup';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ExportFormat, ExportScope, ExportOptions } from '~/core/types';

interface Props {
  schemas: string[];
  loading?: boolean;
  connectionType?: DatabaseClientType | null;
}

interface Emits {
  (e: 'submit', options: ExportOptions): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const scope = ref<ExportScope>('full');
const selectedFormat = ref<ExportFormat>(
  getDefaultNativeBackupFormat(props.connectionType)
);
const selectedSchemas = ref<string[]>([]);

const formatOptions = computed(() =>
  getNativeBackupFormatOptions(props.connectionType)
);

watch(
  formatOptions,
  options => {
    if (!options.some(option => option.format === selectedFormat.value)) {
      selectedFormat.value =
        options[0]?.format ||
        getDefaultNativeBackupFormat(props.connectionType);
    }
  },
  { immediate: true }
);

// Scope options
const scopeOptions = [
  { value: 'full', label: 'Full (schema + data)' },
  { value: 'schema-only', label: 'Schema only (no data)' },
  { value: 'data-only', label: 'Data only (no schema)' },
];

const onSubmit = () => {
  const options: ExportOptions = {
    format: selectedFormat.value,
    scope: scope.value,
  };

  options.schemas =
    selectedSchemas.value.length > 0 ? selectedSchemas.value : props.schemas;

  emit('submit', options);
};
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label>Backup Format</Label>
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="format in formatOptions"
          :key="format.format"
          type="button"
          class="rounded-lg border p-3 text-left transition-colors"
          :class="
            selectedFormat === format.format
              ? 'border-primary bg-primary/5'
              : 'hover:border-primary/40 hover:bg-muted/20'
          "
          @click="selectedFormat = format.format"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ format.label }}</p>
            <Badge variant="secondary" class="font-normal">
              {{ format.extension }}
            </Badge>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            Runtime uses {{ getNativeBackupToolHint(props.connectionType) }}.
          </p>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <Label>Export Scope</Label>
      <Select v-model="scope">
        <SelectTrigger size="sm" class="h-7!">
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in scopeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="schemas.length > 0" class="space-y-2">
      <Label>Schemas (optional)</Label>
      <div
        class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md"
      >
        <Badge
          v-for="schema in schemas"
          :key="schema"
          :variant="selectedSchemas.includes(schema) ? 'default' : 'outline'"
          class="cursor-pointer"
          @click="
            () =>
              selectedSchemas.includes(schema)
                ? (selectedSchemas = selectedSchemas.filter(
                    (s: any) => s !== schema
                  ))
                : selectedSchemas.push(schema)
          "
        >
          {{ schema }}
        </Badge>
      </div>
      <p class="text-xs text-muted-foreground">
        {{
          selectedSchemas.length
            ? `${selectedSchemas.length} selected`
            : 'All visible schemas'
        }}
      </p>
    </div>

    <Button class="w-full" :disabled="loading" @click="onSubmit">
      <Icon
        v-if="loading"
        name="hugeicons:loading-03"
        class="size-4 mr-2 animate-spin"
      />
      <Icon v-else name="lucide:download" class="size-4 mr-2" />
      {{ loading ? 'Creating Backup...' : 'Create Backup' }}
    </Button>
  </div>
</template>
