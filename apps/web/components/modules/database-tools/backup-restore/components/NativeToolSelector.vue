<script setup lang="ts">
import type {
  NativeBackupRuntimeToolPath,
  NativeBackupToolName,
} from '~/core/types';
import type { BackupRestoreRuntimeToolSelection } from '../types/backup-restore.types';

interface Props {
  title: string;
  description?: string;
  detectedPaths: NativeBackupRuntimeToolPath[];
  toolChoices: NativeBackupToolName[];
  disabled?: boolean;
}

const props = defineProps<Props>();
const model = defineModel<BackupRestoreRuntimeToolSelection>({
  required: true,
});

const hasDetectedPaths = computed(() => props.detectedPaths.length > 0);
const customPathActive = computed(
  () => model.value.useCustomPath || !hasDetectedPaths.value
);
const detectedCountLabel = computed(() =>
  props.detectedPaths.length === 1
    ? '1 executable found'
    : `${props.detectedPaths.length} executables found`
);
const customPathPlaceholder = computed(() => {
  switch (model.value.customTool || props.toolChoices[0]) {
    case 'pg_dump':
      return '/Applications/Postgres.app/.../bin/pg_dump';
    case 'pg_restore':
      return '/Applications/Postgres.app/.../bin/pg_restore';
    case 'psql':
      return '/Applications/Postgres.app/.../bin/psql';
    case 'mysqldump':
      return '/opt/homebrew/Cellar/mysql/.../bin/mysqldump';
    case 'mysqlpump':
      return '/opt/homebrew/Cellar/mysql/.../bin/mysqlpump';
    case 'mysql':
      return '/opt/homebrew/Cellar/mysql/.../bin/mysql';
    case 'sqlite3':
      return '/usr/local/bin/sqlite3';
    default:
      return '/usr/local/bin/native-tool';
  }
});

const setDetectedPath = (value: string) => {
  model.value.selectedPath = value;
};

const setCustomTool = (value: string) => {
  model.value.customTool = value as NativeBackupToolName;
};

const setUseCustomPath = (value: boolean) => {
  model.value.useCustomPath = hasDetectedPaths.value ? value : true;
};

const formatDetectedPathLabel = (toolPath: NativeBackupRuntimeToolPath) => {
  return `${toolPath.tool} • ${toolPath.path}`;
};
</script>

<template>
  <div class="space-y-3 rounded-lg border border-dashed p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <Label class="text-sm font-medium">{{ title }}</Label>
        <p v-if="description" class="text-xs text-muted-foreground">
          {{ description }}
        </p>
      </div>

      <Badge v-if="hasDetectedPaths" variant="secondary" class="shrink-0">
        {{ detectedCountLabel }}
      </Badge>
    </div>

    <div v-if="hasDetectedPaths && !model.useCustomPath" class="space-y-2">
      <Label class="text-xs font-medium text-muted-foreground">
        Detected Executable
      </Label>
      <Select
        :model-value="model.selectedPath"
        :disabled="disabled"
        size="xs"
        @update:model-value="setDetectedPath(String($event))"
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a native tool" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="toolPath in detectedPaths"
            :key="toolPath.path"
            :value="toolPath.path"
          >
            {{ formatDetectedPathLabel(toolPath) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div
      v-if="hasDetectedPaths"
      class="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
    >
      <div class="space-y-1">
        <p class="text-sm font-medium">Use custom executable path</p>
        <p class="text-xs text-muted-foreground">
          Point HeraQ to a specific binary when you need a different version.
        </p>
      </div>
      <Switch
        :model-value="model.useCustomPath"
        :disabled="disabled"
        @update:model-value="setUseCustomPath(Boolean($event))"
      />
    </div>

    <p v-else class="text-xs text-muted-foreground">
      No executable was detected automatically. Enter the full path to the
      driver you want to run.
    </p>

    <div
      v-if="customPathActive"
      class="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]"
    >
      <div class="space-y-1">
        <Label class="text-xs font-medium text-muted-foreground"> Tool </Label>
        <Select
          :model-value="model.customTool || toolChoices[0]"
          :disabled="disabled"
          size="sm"
          @update:model-value="setCustomTool(String($event))"
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a tool" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="tool in toolChoices" :key="tool" :value="tool">
              {{ tool }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1">
        <Label class="text-xs font-medium text-muted-foreground">
          Executable Path
        </Label>
        <Input
          v-model="model.customPath"
          :disabled="disabled"
          :placeholder="customPathPlaceholder"
          class="h-8!"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="text-xs text-muted-foreground">
          Enter the absolute path to the binary you want HeraQ to execute.
        </p>
      </div>
    </div>
  </div>
</template>
