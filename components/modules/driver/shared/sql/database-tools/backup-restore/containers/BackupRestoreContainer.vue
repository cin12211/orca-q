<script setup lang="ts">
import LoadingOverlay from '~/components/base/loading-overlay/LoadingOverlay.vue';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { getDatabaseClientLabel } from '~/core/constants/database-backup';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { isDesktopApp } from '~/core/helpers/environment';
import { useSchemaStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import type { ExportOptions, NativeBackupToolName } from '~/core/types';
import BackupProfileCard from '../components/BackupProfileCard.vue';
import BackupRestoreUnsupportedAlert from '../components/BackupRestoreUnsupportedAlert.vue';
import ExportOptionsForm from '../components/ExportOptionsForm.vue';
import ImportFileDropzone from '../components/ImportFileDropzone.vue';
import ImportOptionsForm from '../components/ImportOptionsForm.vue';
import NativeToolSelector from '../components/NativeToolSelector.vue';
import RestoreConfirmDialog from '../components/RestoreConfirmDialog.vue';
import TransferProgressCard from '../components/TransferProgressCard.vue';
import { useDatabaseExport } from '../hooks/useDatabaseExport';
import { useDatabaseImport } from '../hooks/useDatabaseImport';
import { useNativeBackupCapability } from '../hooks/useNativeBackupCapability';
import { useNativeBackupToolSelection } from '../hooks/useNativeBackupToolSelection';
import type {
  BackupRestoreSection,
  BackupRestoreTab,
} from '../types/backup-restore.types';

interface Props {
  connectionId: string;
  initialTab: BackupRestoreTab;
}

const props = defineProps<Props>();

// ─── Connection ────────────────────────────────────────────────────────────────
const { workspaceId } = useWorkspaceConnectionRoute();
const connectionStore = useManagementConnectionStore();
const schemaStore = useSchemaStore();

const connectionData = computed(() => {
  if (!props.connectionId) return undefined;
  return connectionStore.connections.find(c => c.id === props.connectionId);
});

const connectionType = computed(() => connectionData.value?.type);
const databaseName = computed(
  () =>
    connectionData.value?.database || connectionData.value?.name || 'database'
);
const connectionLabel = computed(() =>
  getDatabaseClientLabel(connectionType.value)
);
const {
  capability,
  isLoading: isCapabilityLoading,
  error: capabilityError,
  refresh: refreshCapability,
} = useNativeBackupCapability(connectionType);

const isRefreshing = ref(false);
const desktopRuntimeSelectionEnabled = computed(() => isDesktopApp());

const handleReload = async () => {
  isRefreshing.value = true;
  try {
    await refreshCapability();
  } finally {
    isRefreshing.value = false;
  }
};
const nativeBackupSupported = computed(
  () => capability.value?.supported ?? false
);
const exportAvailable = computed(
  () => capability.value?.exportAvailable ?? false
);
const importAvailable = computed(
  () => capability.value?.importAvailable ?? false
);
const exportSectionEnabled = computed(
  () =>
    nativeBackupSupported.value &&
    (exportAvailable.value || desktopRuntimeSelectionEnabled.value)
);
const importSectionEnabled = computed(
  () =>
    nativeBackupSupported.value &&
    (importAvailable.value || desktopRuntimeSelectionEnabled.value)
);
const supportMessage = computed(() => {
  if (capabilityError.value) {
    return capabilityError.value;
  }

  if (capability.value) {
    return capability.value.supportMessage;
  }

  if (connectionType.value) {
    return `Checking ${connectionLabel.value} native tools...`;
  }

  return 'Select a connection to open database tools.';
});
const nativeToolHint = computed(
  () => capability.value?.toolHint || 'Native database tools'
);
const nativeBackupFormats = computed(
  () => capability.value?.formatOptions || []
);
const nativeBackupAcceptExtensions = computed(
  () => capability.value?.acceptExtensions || '.sql'
);
const nativeBackupExtensionSummary = computed(
  () => nativeBackupFormats.value.map(f => f.extension).join(' / ') || '.sql'
);
const partialAvailabilityMessage = computed(() => {
  if (
    isCapabilityLoading.value ||
    !nativeBackupSupported.value ||
    (exportAvailable.value && importAvailable.value)
  ) {
    return null;
  }

  return [
    !exportAvailable.value ? capability.value?.exportMessage : null,
    !importAvailable.value ? capability.value?.importMessage : null,
  ]
    .filter(Boolean)
    .join(' ');
});
const availableSchemas = computed(() => {
  if (!props.connectionId) return [];
  const wsId = workspaceId.value || connectionData.value?.workspaceId;

  return (schemaStore.schemas[props.connectionId] || [])
    .filter(
      s =>
        s.connectionId === props.connectionId &&
        (!wsId || s.workspaceId === wsId)
    )
    .map(s => s.name);
});
const isSchemaLoading = computed(
  () => schemaStore.loading[props.connectionId] || false
);
const schemaLoadError = ref<string | null>(null);

const loadAvailableSchemas = async () => {
  const connection = connectionData.value;
  const wsId = workspaceId.value || connection?.workspaceId;

  if (!props.connectionId || !wsId || !connection) {
    return;
  }

  const hasSchemasForContext = (
    schemaStore.schemas[props.connectionId] || []
  ).some(
    schema =>
      schema.connectionId === props.connectionId && schema.workspaceId === wsId
  );

  if (hasSchemasForContext) {
    schemaLoadError.value = null;
    return;
  }

  try {
    schemaLoadError.value = null;
    await schemaStore.fetchSchemas({
      connectionId: props.connectionId,
      workspaceId: wsId,
      connection,
    });
  } catch (error) {
    schemaLoadError.value =
      error instanceof Error ? error.message : 'Failed to load schemas.';
  }
};

watch(
  [connectionData, () => workspaceId.value],
  () => {
    void loadAvailableSchemas();
  },
  { immediate: true }
);

// ─── Tab management ────────────────────────────────────────────────────────────
const sections: BackupRestoreSection[] = [
  {
    id: 'export',
    tabLabel: 'Create Backup',
    subtitle: 'Generate native backup artifacts for the current connection.',
    icon: 'hugeicons:download-01',
  },
  {
    id: 'import',
    tabLabel: 'Restore Backup',
    subtitle: 'Apply a native backup artifact back into this connection.',
    icon: 'hugeicons:upload-01',
  },
];

const activeTab = ref<BackupRestoreTab>(props.initialTab);
const activeSectionMeta = computed(() =>
  sections.find(s => s.id === activeTab.value)
);

watch(
  () => props.initialTab,
  tab => {
    activeTab.value = tab;
  }
);

watch(
  [activeTab, exportSectionEnabled, importSectionEnabled],
  ([tab, canExport, canImport]) => {
    if (tab === 'export' && !canExport && canImport) {
      activeTab.value = 'import';
      return;
    }

    if (tab === 'import' && !canImport && canExport) {
      activeTab.value = 'export';
    }
  },
  { immediate: true }
);

const selectToolTab = (type: BackupRestoreTab) => {
  activeTab.value = type;
};

// ─── Export ────────────────────────────────────────────────────────────────────
const {
  isExporting,
  progress: exportProgress,
  error: exportError,
  lastExport,
  currentJob: exportJob,
  statusMessage: exportStatusMessage,
  exportDatabase,
  reset: resetExport,
} = useDatabaseExport(connectionData, capability);

const buildToolChoices = (available: string[] = [], missing: string[] = []) =>
  [...new Set([...available, ...missing])] as NativeBackupToolName[];

const exportToolChoices = computed(() =>
  buildToolChoices(
    capability.value?.availableExportTools || [],
    capability.value?.missingExportTools || []
  )
);
const exportDetectedToolPaths = computed(
  () => capability.value?.availableExportToolPaths || []
);
const {
  selection: exportToolSelection,
  filteredToolPaths: exportToolPaths,
  runtimeSelection: exportRuntimeSelection,
  canSubmit: canExportWithRuntime,
} = useNativeBackupToolSelection(
  exportDetectedToolPaths,
  exportToolChoices,
  desktopRuntimeSelectionEnabled
);
const openExportSaveDirectory = async () => {
  const directoryPath = lastExport.value?.saveDirectoryPath;

  if (!directoryPath || !window.electronAPI?.window.openPath) {
    return;
  }

  await window.electronAPI.window.openPath(directoryPath);
};

const onExport = async (options: ExportOptions) => {
  await exportDatabase(databaseName.value, {
    options,
    runtime: exportRuntimeSelection.value,
    promptForSaveLocation: desktopRuntimeSelectionEnabled.value,
    saveDirectoryPath: undefined,
  });
};

// ─── Import ────────────────────────────────────────────────────────────────────
const {
  isImporting,
  progress: importProgress,
  statusMessage: importStatusMessage,
  currentJob: importJob,
  error: importError,
  success: importSuccess,
  selectedFile,
  fileInputRef,
  options: importOptions,
  extensionSummary: importExtensionSummary,
  onFileSelect,
  openFilePicker,
  clearSelectedFile,
  importDatabase,
  reset: resetImport,
} = useDatabaseImport(connectionData, capability);

const baseImportToolChoices = computed(() =>
  buildToolChoices(
    capability.value?.availableImportTools || [],
    capability.value?.missingImportTools || []
  )
);
const importToolChoices = computed(() => {
  if (
    connectionType.value !== DatabaseClientType.POSTGRES ||
    !selectedFile.value?.name
  ) {
    return baseImportToolChoices.value;
  }

  return [
    selectedFile.value.name.toLowerCase().endsWith('.dump')
      ? 'pg_restore'
      : 'psql',
  ] as NativeBackupToolName[];
});
const importDetectedToolPaths = computed(() =>
  (capability.value?.availableImportToolPaths || []).filter(toolPath =>
    importToolChoices.value.includes(toolPath.tool)
  )
);
const {
  selection: importToolSelection,
  filteredToolPaths: importToolPaths,
  runtimeSelection: importRuntimeSelection,
  canSubmit: canImportWithRuntime,
} = useNativeBackupToolSelection(
  importDetectedToolPaths,
  importToolChoices,
  desktopRuntimeSelectionEnabled
);

// ─── Restore confirm dialog ──────────────────────────────────────────────────────────
const showRestoreConfirm = ref(false);

const onRestoreClick = () => {
  showRestoreConfirm.value = true;
};

const onRestoreConfirmed = async () => {
  showRestoreConfirm.value = false;
  await importDatabase(importRuntimeSelection.value);
};

const onRestoreCancelled = () => {
  showRestoreConfirm.value = false;
};
</script>

<template>
  <div class="flex flex-col h-full gap-3 overflow-hidden p-3">
    <!-- Restore confirm dialog -->
    <RestoreConfirmDialog
      :open="showRestoreConfirm"
      @confirm="onRestoreConfirmed"
      @cancel="onRestoreCancelled"
    />

    <!-- Header -->
    <ToolPageHeader
      icon="hugeicons:database-import"
      title="Backup &amp; Restore"
    >
      <template #context>
        <span class="font-medium text-foreground">{{ databaseName }}</span>
        <span class="text-muted-foreground/60">· {{ connectionLabel }}</span>
      </template>
    </ToolPageHeader>

    <!-- Tab bar -->
    <div class="flex items-center justify-between gap-2">
      <Tabs v-model="activeTab" class="min-w-0 flex-1 gap-0">
        <TabsList size="sm" class="max-w-full justify-start! overflow-x-auto">
          <TabsTrigger
            size="xs"
            v-for="section in sections"
            :key="section.id"
            :value="section.id"
            class="min-w-fit shrink-0 cursor-pointer rounded-sm"
            :disabled="
              isCapabilityLoading ||
              (section.id === 'export'
                ? !exportSectionEnabled
                : !importSectionEnabled)
            "
            @click="selectToolTab(section.id)"
          >
            <Icon :name="section.icon" class="shrink-0 size-3.5" />
            {{ section.tabLabel }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="text-xs text-muted-foreground">
        {{ activeSectionMeta?.subtitle }}
      </div>
    </div>

    <!-- Content -->
    <div
      class="relative flex-1 overflow-y-auto rounded-lg border bg-background p-4"
    >
      <LoadingOverlay v-if="isCapabilityLoading && !isRefreshing" visible />

      <Alert
        v-if="(!isCapabilityLoading || isRefreshing) && capabilityError"
        variant="destructive"
      >
        <Icon name="hugeicons:alert-circle" class="size-4" />
        <AlertTitle>Capability Check Failed</AlertTitle>
        <AlertDescription>{{ supportMessage }}</AlertDescription>
      </Alert>

      <!-- Unsupported alert with install instructions -->
      <BackupRestoreUnsupportedAlert
        v-else-if="
          (!isCapabilityLoading || isRefreshing) && !nativeBackupSupported
        "
        :support-message="supportMessage"
        :connection-type="connectionType"
        :is-loading="isRefreshing"
        @reload="handleReload"
      />

      <template v-else-if="!isCapabilityLoading && !isRefreshing">
        <Alert v-if="partialAvailabilityMessage">
          <Icon name="hugeicons:alert-circle" class="size-4" />
          <AlertTitle>Partial Native Tool Support</AlertTitle>
          <AlertDescription>{{ partialAvailabilityMessage }}</AlertDescription>
        </Alert>

        <!-- Export tab -->
        <div v-show="activeTab === 'export'" class="space-y-4">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
          >
            <div>
              <h3 class="text-base font-medium">Create Backup</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Export {{ databaseName }} using {{ nativeToolHint }}.
              </p>
            </div>
          </div>

          <Alert v-if="exportError" variant="destructive">
            <Icon name="hugeicons:alert-circle" class="size-4" />
            <AlertTitle>Backup Failed</AlertTitle>
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

          <TransferProgressCard
            v-if="isExporting || exportJob"
            :tool="exportJob?.tool || nativeToolHint"
            :stage="exportJob?.stage || 'queued'"
            :status-message="exportStatusMessage || ''"
            :progress="exportProgress"
            :is-running="isExporting"
            :action-label="
              lastExport?.saveDirectoryPath && !isExporting ? 'Open' : undefined
            "
            @action="openExportSaveDirectory"
          />

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div class="rounded-lg border p-4 space-y-4">
              <NativeToolSelector
                v-if="desktopRuntimeSelectionEnabled"
                v-model="exportToolSelection"
                title="Backup Driver"
                description="Choose the exact executable OrcaQ should run for this backup job."
                :detected-paths="exportToolPaths"
                :tool-choices="exportToolChoices"
                :disabled="isExporting"
              />

              <ExportOptionsForm
                :schemas="availableSchemas"
                :schema-loading="isSchemaLoading"
                :schema-error="schemaLoadError"
                :loading="isExporting"
                :disabled="
                  desktopRuntimeSelectionEnabled && !canExportWithRuntime
                "
                :format-options="nativeBackupFormats"
                :default-format="capability?.defaultExportFormat"
                :tool-hint="nativeToolHint"
                @submit="onExport"
              />
            </div>

            <BackupProfileCard
              title="Backup Profile"
              description="Exports run on the local runtime host and stream the artifact directly into a downloadable file."
              :formats="nativeBackupFormats"
              :tool-hint="nativeToolHint"
              :target-name="databaseName"
              formats-label="Supported Files"
            />
          </div>
        </div>

        <!-- Import tab -->
        <div v-show="activeTab === 'import'" class="space-y-4">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
          >
            <div>
              <h3 class="text-base font-medium">Restore Backup</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Restore a {{ nativeBackupExtensionSummary }} backup into
                {{ databaseName }}.
              </p>
            </div>
          </div>

          <Alert v-if="importError" variant="destructive">
            <Icon name="hugeicons:alert-circle" class="size-4" />
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

          <Alert v-if="importSuccess">
            <Icon
              name="hugeicons:checkmark-circle-02"
              class="size-4 text-green-500"
            />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription>{{ importSuccess }}</AlertDescription>
          </Alert>

          <TransferProgressCard
            v-if="isImporting || importJob"
            :tool="importJob?.tool || nativeToolHint"
            :stage="importJob?.stage || 'queued'"
            :status-message="importStatusMessage || ''"
            :progress="importProgress"
            :is-running="isImporting"
            progress-class="bg-emerald-500"
          />

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div class="rounded-lg border p-4 space-y-4">
              <ImportFileDropzone
                :selected-file="selectedFile"
                :accept="nativeBackupAcceptExtensions"
                :extension-summary="importExtensionSummary"
                @change="onFileSelect"
                @clear="clearSelectedFile"
              />

              <NativeToolSelector
                v-if="desktopRuntimeSelectionEnabled"
                v-model="importToolSelection"
                title="Restore Driver"
                description="Choose the executable HeraQ should use to restore this backup artifact."
                :detected-paths="importToolPaths"
                :tool-choices="importToolChoices"
                :disabled="isImporting"
              />

              <ImportOptionsForm v-model="importOptions" />

              <Button
                class="w-full"
                :disabled="
                  !selectedFile ||
                  isImporting ||
                  (desktopRuntimeSelectionEnabled && !canImportWithRuntime)
                "
                @click="onRestoreClick"
              >
                <Icon
                  :name="
                    isImporting ? 'hugeicons:loading-03' : 'hugeicons:upload-01'
                  "
                  :class="['size-4 mr-2', isImporting && 'animate-spin']"
                />
                {{ isImporting ? 'Restoring...' : 'Restore Backup' }}
              </Button>

              <p
                class="text-muted-foreground text-xs inline-flex items-center gap-0.5"
              >
                <polyline
                  class="text-destructive gap-0.5 items-center inline-flex"
                >
                  <Icon
                    name="hugeicons:alert-circle"
                    class="size-4 text-destructive"
                  />
                  Warning:
                </polyline>
                Importing a database can overwrite existing data. Make sure you
                have a backup before proceeding.
              </p>
            </div>

            <BackupProfileCard
              title="Restore Profile"
              description="Use a backup file produced for the same database family and runtime toolchain."
              :formats="nativeBackupFormats"
              :tool-hint="nativeToolHint"
              :target-name="databaseName"
              formats-label="Accepted Files"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
