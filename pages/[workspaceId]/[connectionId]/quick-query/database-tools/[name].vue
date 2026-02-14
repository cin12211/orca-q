<script setup lang="ts">
import ExportOptionsForm from '~/components/modules/management-export/components/ExportOptionsForm.vue';
import { useDatabaseExport } from '~/components/modules/management-export/hooks/useDatabaseExport';
import { useAppContext } from '~/shared/contexts/useAppContext';
import type { ExportOptions, ImportOptions } from '~/shared/types';

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  'workspaceId-connectionId-quick-query-database-tools-name'
);
const { connectionStore, schemaStore } = useAppContext();

const connectionId = computed(() => route.params.connectionId as string);

// Get the database connection
const connectionData = computed(() => {
  if (!connectionId.value) return null;
  return connectionStore.connections.find(c => c.id === connectionId.value);
});

const dbConnectionString = computed(
  () => connectionData.value?.connectionString || ''
);

const databaseName = computed(
  () =>
    connectionData.value?.database || connectionData.value?.name || 'database'
);

// Get available schemas
const availableSchemas = computed(() => {
  if (!connectionId.value) return [];
  return schemaStore.schemas
    .filter(s => s.connectionId === connectionId.value)
    .map(s => s.name);
});

// Active tab
const activeTab = ref<'export' | 'import'>(
  route.params.name as 'export' | 'import'
);

watch(
  () => route.params.name,
  name => {
    activeTab.value = name as 'export' | 'import';
  }
);

// Export composable
const {
  isExporting,
  error: exportError,
  lastExport,
  exportDatabase,
  reset: resetExport,
} = useDatabaseExport(dbConnectionString);

// Import state
const isImporting = ref(false);
const importError = ref<string | null>(null);
const importSuccess = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const importOptions = ref<ImportOptions>({
  noOwner: true,
  noPrivileges: false,
  clean: false,
  dataOnly: false,
  schemaOnly: false,
  exitOnError: true,
});

// Handle export
const onExport = async (options: ExportOptions) => {
  await exportDatabase(databaseName.value, options);
};

// Handle file selection
const onFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
    importError.value = null;
    importSuccess.value = null;
  }
};

// Handle import
const onImport = async () => {
  if (!selectedFile.value || !dbConnectionString.value) return;

  isImporting.value = true;
  importError.value = null;
  importSuccess.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('dbConnectionString', dbConnectionString.value);
    formData.append('options', JSON.stringify(importOptions.value));

    const response = await $fetch('/api/database-import/import-database', {
      method: 'POST',
      body: formData,
    });

    if (response && typeof response === 'object' && 'success' in response) {
      const result = response as { success: boolean; message: string };
      if (result.success) {
        importSuccess.value =
          result.message || 'Database imported successfully';
        selectedFile.value = null;
      } else {
        importError.value = result.message || 'Import failed';
      }
    }
  } catch (err) {
    importError.value =
      err instanceof Error
        ? err.message
        : 'Import failed. Check if pg_restore is installed.';
    console.error('Import error:', err);
  } finally {
    isImporting.value = false;
  }
};

const resetImport = () => {
  importError.value = null;
  importSuccess.value = null;
  selectedFile.value = null;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
</script>

<template>
  <div class="flex flex-col h-full p-4">
    <div
      class="flex flex-col h-full border rounded-lg overflow-hidden bg-background"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 px-6 py-4 border-b bg-muted/30">
        <Icon name="lucide:database" class="size-6 text-primary" />
        <div>
          <h2 class="text-lg font-semibold">Database Tools</h2>
          <p class="text-sm text-muted-foreground">{{ databaseName }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b">
        <button
          :class="[
            'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
            activeTab === 'export'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="activeTab = 'export'"
        >
          <Icon name="lucide:download" class="size-4" />
          Export Database
        </button>
        <button
          :class="[
            'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
            activeTab === 'import'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="activeTab = 'import'"
        >
          <Icon name="lucide:upload" class="size-4" />
          Import Database
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Export Tab -->
        <div v-if="activeTab === 'export'" class="max-w-2xl">
          <div class="mb-6">
            <h3 class="text-base font-medium mb-1">Export Database</h3>
            <p class="text-sm text-muted-foreground">
              Export your database schema and/or data using pg_dump.
            </p>
          </div>

          <!-- Export Error -->
          <Alert v-if="exportError" variant="destructive" class="mb-4">
            <Icon name="lucide:alert-circle" class="size-4" />
            <AlertTitle>Export Failed</AlertTitle>
            <AlertDescription>{{ exportError }}</AlertDescription>
            <Button
              size="sm"
              variant="outline"
              class="mt-2"
              @click="resetExport"
            >
              Try Again
            </Button>
          </Alert>

          <!-- Export Success -->
          <Alert v-if="lastExport && !isExporting && !exportError" class="mb-4">
            <Icon name="lucide:check-circle" class="size-4 text-green-500" />
            <AlertTitle>Export Complete</AlertTitle>
            <AlertDescription>
              {{ lastExport.fileName }} downloaded in
              {{ (lastExport.duration / 1000).toFixed(1) }}s
            </AlertDescription>
          </Alert>

          <!-- Export Form -->
          <ExportOptionsForm
            :schemas="availableSchemas"
            :loading="isExporting"
            @submit="onExport"
          />

          <!-- Info -->
          <div
            class="mt-6 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground"
          >
            <div class="flex items-start gap-2">
              <Icon name="lucide:info" class="size-4 mt-0.5 shrink-0" />
              <div>
                <p class="font-medium">Requirements</p>
                <p class="mt-1">
                  <code class="bg-muted px-1 rounded">pg_dump</code> must be
                  installed on the server for export to work.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Import Tab -->
        <div v-if="activeTab === 'import'" class="max-w-2xl">
          <div class="mb-6">
            <h3 class="text-base font-medium mb-1">Import Database</h3>
            <p class="text-sm text-muted-foreground">
              Restore your database from a backup file using pg_restore.
            </p>
          </div>

          <!-- Import Error -->
          <Alert v-if="importError" variant="destructive" class="mb-4">
            <Icon name="lucide:alert-circle" class="size-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>{{ importError }}</AlertDescription>
            <Button
              size="sm"
              variant="outline"
              class="mt-2"
              @click="resetImport"
            >
              Try Again
            </Button>
          </Alert>

          <!-- Import Success -->
          <Alert v-if="importSuccess" class="mb-4">
            <Icon name="lucide:check-circle" class="size-4 text-green-500" />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription>{{ importSuccess }}</AlertDescription>
          </Alert>

          <!-- File Upload -->
          <div class="space-y-4">
            <div>
              <Label class="text-sm font-medium">Backup File</Label>
              <div
                class="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                @click="($refs.fileInput as HTMLInputElement)?.click()"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept=".sql,.dump,.tar"
                  class="hidden"
                  @change="onFileSelect"
                />
                <div v-if="!selectedFile" class="text-muted-foreground">
                  <Icon
                    name="lucide:upload-cloud"
                    class="size-10 mx-auto mb-2 opacity-50"
                  />
                  <p class="text-sm font-medium">Click to select a file</p>
                  <p class="text-xs mt-1">Supports .sql, .dump, .tar files</p>
                </div>
                <div v-else class="flex items-center justify-center gap-3">
                  <Icon name="lucide:file" class="size-8 text-primary" />
                  <div class="text-left">
                    <p class="text-sm font-medium">{{ selectedFile.name }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatFileSize(selectedFile.size) }}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="ml-2"
                    @click.stop="selectedFile = null"
                  >
                    <Icon name="lucide:x" class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- Import Options -->
            <div class="space-y-3">
              <Label class="text-sm font-medium">Options</Label>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center space-x-2">
                  <Switch
                    id="noOwner"
                    :checked="importOptions.noOwner"
                    @update:checked="importOptions.noOwner = $event"
                  />
                  <Label for="noOwner" class="text-sm">Skip Owner</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Switch
                    id="noPrivileges"
                    :checked="importOptions.noPrivileges"
                    @update:checked="importOptions.noPrivileges = $event"
                  />
                  <Label for="noPrivileges" class="text-sm"
                    >Skip Privileges</Label
                  >
                </div>

                <div class="flex items-center space-x-2">
                  <Switch
                    id="clean"
                    :checked="importOptions.clean"
                    @update:checked="importOptions.clean = $event"
                  />
                  <Label for="clean" class="text-sm">Drop Objects First</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Switch
                    id="dataOnly"
                    :checked="importOptions.dataOnly"
                    @update:checked="importOptions.dataOnly = $event"
                  />
                  <Label for="dataOnly" class="text-sm">Data Only</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Switch
                    id="schemaOnly"
                    :checked="importOptions.schemaOnly"
                    @update:checked="importOptions.schemaOnly = $event"
                  />
                  <Label for="schemaOnly" class="text-sm">Schema Only</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Switch
                    id="exitOnError"
                    :checked="importOptions.exitOnError"
                    @update:checked="importOptions.exitOnError = $event"
                  />
                  <Label for="exitOnError" class="text-sm">Exit on Error</Label>
                </div>
              </div>
            </div>

            <!-- Warning -->
            <Alert variant="destructive" class="bg-destructive/10">
              <Icon name="lucide:alert-triangle" class="size-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Importing a database can overwrite existing data. Make sure you
                have a backup before proceeding.
              </AlertDescription>
            </Alert>

            <!-- Import Button -->
            <Button
              class="w-full"
              size="lg"
              :disabled="!selectedFile || isImporting"
              @click="onImport"
            >
              <Icon
                :name="isImporting ? 'lucide:loader-2' : 'lucide:upload'"
                :class="['size-4 mr-2', isImporting && 'animate-spin']"
              />
              {{ isImporting ? 'Importing...' : 'Import Database' }}
            </Button>
          </div>

          <!-- Info -->
          <div
            class="mt-6 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground"
          >
            <div class="flex items-start gap-2">
              <Icon name="lucide:info" class="size-4 mt-0.5 shrink-0" />
              <div>
                <p class="font-medium">Requirements</p>
                <p class="mt-1">
                  <code class="bg-muted px-1 rounded">pg_restore</code> or
                  <code class="bg-muted px-1 rounded">psql</code> must be
                  installed on the server for import to work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
