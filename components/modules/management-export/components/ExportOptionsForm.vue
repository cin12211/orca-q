<script setup lang="ts">
import type { ExportFormat, ExportScope, ExportOptions } from '~/core/types';

interface Props {
  schemas: string[];
  loading?: boolean;
}

interface Emits {
  (e: 'submit', options: ExportOptions): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const format = ref<ExportFormat>('plain');
const scope = ref<ExportScope>('full');
const selectedSchemas = ref<string[]>([]);
const noOwner = ref(false);
const noPrivileges = ref(false);
const clean = ref(false);
const createDb = ref(false);
const compressLevel = ref(6);
const jobs = ref(4);

// Format options
const formatOptions = [
  { value: 'plain', label: 'Plain SQL (.sql)', icon: 'lucide:file-text' },
  { value: 'custom', label: 'Custom (.dump)', icon: 'lucide:archive' },
  { value: 'tar', label: 'Tar Archive (.tar)', icon: 'lucide:package' },
  { value: 'directory', label: 'Directory (parallel)', icon: 'lucide:folder' },
];

// Scope options
const scopeOptions = [
  { value: 'full', label: 'Full (schema + data)' },
  { value: 'schema-only', label: 'Schema only (no data)' },
  { value: 'data-only', label: 'Data only (no schema)' },
];

const showCompression = computed(
  () => format.value === 'custom' || format.value === 'directory'
);

const showParallel = computed(() => format.value === 'directory');

const onSubmit = () => {
  const options: ExportOptions = {
    format: format.value,
    scope: scope.value,
    noOwner: noOwner.value,
    noPrivileges: noPrivileges.value,
    clean: clean.value,
    createDb: createDb.value,
  };

  if (selectedSchemas.value.length > 0) {
    options.schemas = selectedSchemas.value;
  }

  if (showCompression.value) {
    options.compressLevel = compressLevel.value;
  }

  if (showParallel.value) {
    options.jobs = jobs.value;
  }

  emit('submit', options);
};
</script>

<template>
  <div class="space-y-4">
    <!-- Format Selection -->
    <div class="space-y-2">
      <Label>Output Format</Label>
      <RadioGroup v-model="format" class="grid grid-cols-2 gap-2">
        <div
          v-for="opt in formatOptions"
          :key="opt.value"
          class="flex items-center space-x-2"
        >
          <RadioGroupItem :value="opt.value" :id="`format-${opt.value}`" />
          <Label
            :for="`format-${opt.value}`"
            class="flex items-center gap-2 cursor-pointer"
          >
            <Icon :name="opt.icon" class="size-4 text-muted-foreground" />
            {{ opt.label }}
          </Label>
        </div>
      </RadioGroup>
    </div>

    <!-- Scope Selection -->
    <div class="space-y-2">
      <Label>Export Scope</Label>
      <Select v-model="scope">
        <SelectTrigger>
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

    <!-- Schema Filter -->
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
            selectedSchemas.includes(schema)
              ? (selectedSchemas = selectedSchemas.filter(s => s !== schema))
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
            : 'All schemas'
        }}
      </p>
    </div>

    <!-- Compression (for custom/directory) -->
    <div v-if="showCompression" class="space-y-2">
      <Label>Compression Level (0-9)</Label>
      <div class="flex items-center gap-3">
        <Slider
          :model-value="[compressLevel]"
          :min="0"
          :max="9"
          :step="1"
          class="flex-1"
          @update:model-value="(val: number[]) => (compressLevel = val[0])"
        />
        <span class="text-sm font-mono w-6">{{ compressLevel }}</span>
      </div>
    </div>

    <!-- Parallel Jobs (for directory) -->
    <div v-if="showParallel" class="space-y-2">
      <Label>Parallel Jobs</Label>
      <Input v-model.number="jobs" type="number" min="1" max="16" />
    </div>

    <!-- Additional Options -->
    <div class="space-y-2">
      <Label>Options</Label>
      <div class="grid grid-cols-2 gap-2">
        <div class="flex items-center space-x-2">
          <Checkbox id="noOwner" v-model:model-value="noOwner" />
          <Label for="noOwner" class="text-sm cursor-pointer">No owner</Label>
        </div>
        <div class="flex items-center space-x-2">
          <Checkbox id="noPrivileges" v-model:model-value="noPrivileges" />
          <Label for="noPrivileges" class="text-sm cursor-pointer"
            >No privileges</Label
          >
        </div>
        <div class="flex items-center space-x-2">
          <Checkbox id="clean" v-model:model-value="clean" />
          <Label for="clean" class="text-sm cursor-pointer"
            >Add DROP statements</Label
          >
        </div>
        <div class="flex items-center space-x-2">
          <Checkbox id="createDb" v-model:model-value="createDb" />
          <Label for="createDb" class="text-sm cursor-pointer"
            >Add CREATE DATABASE</Label
          >
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <Button class="w-full" :disabled="loading" @click="onSubmit">
      <Icon
        v-if="loading"
        name="lucide:loader-2"
        class="size-4 mr-2 animate-spin"
      />
      <Icon v-else name="lucide:download" class="size-4 mr-2" />
      {{ loading ? 'Exporting...' : 'Export Database' }}
    </Button>
  </div>
</template>
