<script setup lang="ts">
import dayjs from 'dayjs';
import { toast } from 'vue-sonner';
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
import ImportFileDropzone from '~/components/modules/database-tools/backup-restore/components/ImportFileDropzone.vue';
import { useStrictModeGuard } from '~/components/modules/environment-tag';
import {
  getBrokerErrorMessage,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import { useStreamingDownload } from '~/core/composables/useStreamingDownload';
import { getBrokerConnectionPayload } from '~/core/helpers/broker-connection';
import type { Connection } from '~/core/stores';
import type { RabbitDefinitionsSummary } from '~/core/types/rabbitmq.types';
import {
  RABBIT_DEFINITIONS_SECTIONS,
  RABBIT_TAB_ICONS,
  type RabbitDefinitionsMode,
} from '../constants';
import { rabbitmqService } from '../services';
import {
  formatDefinitionsSection,
  isRabbitDefinitions,
  summarizeRabbitDefinitions,
} from '../utils';

const ALL_VHOSTS = '__all__';

const props = defineProps<{
  connection: Connection;
  /** Tabs opened before Export/Import were merged remember their mode. */
  initialMode?: RabbitDefinitionsMode;
}>();

const { checkAndConfirm } = useStrictModeGuard();
const { downloadStream, isDownloading } = useStreamingDownload();
const vhosts = useBrokerRequest(() => rabbitmqService.vhosts(props.connection));

const activeTab = ref<RabbitDefinitionsMode>(props.initialMode ?? 'export');
const exportScope = ref(ALL_VHOSTS);
const selectedFile = ref<File | null>(null);
const definitions = shallowRef<Record<string, unknown> | null>(null);
const summary = shallowRef<RabbitDefinitionsSummary | null>(null);
const fileError = ref<string | null>(null);
const importVhost = ref('');
const isConfirmOpen = ref(false);
const isImporting = ref(false);

const isExport = computed(() => activeTab.value === 'export');
const activeSection = computed(() =>
  RABBIT_DEFINITIONS_SECTIONS.find(section => section.id === activeTab.value)
);
const isSingleVhostFile = computed(
  () => summary.value?.format === 'single_virtual_host'
);
const canImport = computed(
  () =>
    Boolean(definitions.value) &&
    (!isSingleVhostFile.value || Boolean(importVhost.value)) &&
    !isImporting.value
);

const exportDefinitions = async () => {
  const vhost =
    exportScope.value === ALL_VHOSTS ? undefined : exportScope.value;
  const scope = vhost ? `${vhost}_` : '';

  await downloadStream({
    url: '/api/rabbitmq/definitions-export',
    body: {
      connection: getBrokerConnectionPayload(props.connection),
      vhost,
    },
    filename: `rabbit_${props.connection.name}_${scope}${dayjs().format('YYYY-MM-DD')}.json`,
    contentType: 'application/json',
    successTitle: 'Definitions exported',
  });
};

const clearFile = () => {
  selectedFile.value = null;
  definitions.value = null;
  summary.value = null;
  fileError.value = null;
};

const onFileChange = async (event: Event) => {
  clearFile();
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  selectedFile.value = file;

  try {
    const parsed: unknown = JSON.parse(await file.text());

    if (!isRabbitDefinitions(parsed)) {
      fileError.value =
        'This file does not look like RabbitMQ definitions (no users, vhosts, queues, exchanges...).';
      return;
    }

    definitions.value = parsed;
    summary.value = summarizeRabbitDefinitions(parsed);
    const originalVhost = parsed.original_vhost_name;
    importVhost.value =
      typeof originalVhost === 'string' &&
      (vhosts.data.value ?? []).includes(originalVhost)
        ? originalVhost
        : '';
  } catch {
    fileError.value = 'The file is not valid JSON.';
  }
};

const requestImport = async () => {
  if (!canImport.value) return;
  if (!(await checkAndConfirm(props.connection))) return;
  isConfirmOpen.value = true;
};

const runImport = async () => {
  if (!definitions.value) return;

  isConfirmOpen.value = false;
  isImporting.value = true;

  try {
    await rabbitmqService.importDefinitions(
      props.connection,
      definitions.value,
      isSingleVhostFile.value ? importVhost.value : undefined
    );
    toast.success('Definitions imported', {
      description: selectedFile.value?.name,
    });
    clearFile();
  } catch (error) {
    toast.error('Could not import definitions', {
      description: getBrokerErrorMessage(error),
    });
  } finally {
    isImporting.value = false;
  }
};

onMounted(() => vhosts.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      :icon="RABBIT_TAB_ICONS.definitions"
      title="Management Definitions"
      description="Users, virtual hosts, permissions, queues, exchanges, bindings and policies as one JSON file, like the Management UI."
    >
      <template #context>
        <span class="font-medium text-foreground">{{ connection.name }}</span>
      </template>
    </ToolPageHeader>

    <div class="flex items-center justify-between gap-2">
      <Tabs v-model="activeTab" class="min-w-0 flex-1 gap-0">
        <TabsList size="sm" class="max-w-full justify-start! overflow-x-auto">
          <TabsTrigger
            v-for="section in RABBIT_DEFINITIONS_SECTIONS"
            :key="section.id"
            size="xs"
            :value="section.id"
            class="min-w-fit shrink-0 cursor-pointer rounded-sm"
          >
            <Icon :name="section.icon" class="shrink-0 size-3.5" />
            {{ section.label }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="text-xs text-muted-foreground">
        {{ activeSection?.subtitle }}
      </div>
    </div>

    <BaseNotice v-if="vhosts.error.value" variant="destructive">
      {{ vhosts.error.value }}
    </BaseNotice>

    <section
      v-if="isExport"
      class="max-w-2xl space-y-3 rounded-lg border bg-background p-4"
    >
      <div class="space-y-1.5">
        <Label for="rabbit-export-scope">Scope</Label>
        <Select v-model="exportScope">
          <SelectTrigger id="rabbit-export-scope" class="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_VHOSTS">Whole broker</SelectItem>
            <SelectItem
              v-for="vhost in vhosts.data.value ?? []"
              :key="vhost"
              :value="vhost"
            >
              Virtual host: {{ vhost }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BaseNotice variant="secondary">
        Whole-broker exports include users with their password hashes. Keep the
        file somewhere safe. Messages inside queues are not exported.
      </BaseNotice>

      <Button size="sm" :disabled="isDownloading" @click="exportDefinitions">
        <Icon
          :name="
            isDownloading ? 'hugeicons:loading-03' : 'hugeicons:download-04'
          "
          :class="['size-4', isDownloading && 'animate-spin']"
        />
        Download definitions
      </Button>
    </section>

    <section
      v-else
      class="max-w-2xl space-y-3 rounded-lg border bg-background p-4"
    >
      <ImportFileDropzone
        :selected-file="selectedFile"
        accept=".json,application/json"
        extension-summary=".json definitions"
        @change="onFileChange"
        @clear="clearFile"
      />

      <BaseNotice v-if="fileError" variant="destructive">{{
        fileError
      }}</BaseNotice>

      <template v-if="summary">
        <div class="space-y-1">
          <p class="text-xs text-muted-foreground">
            {{
              summary.format === 'single_virtual_host'
                ? 'One virtual host'
                : 'Whole broker'
            }}
            <template v-if="summary.rabbitmqVersion">
              · exported from RabbitMQ {{ summary.rabbitmqVersion }}
            </template>
          </p>
          <dl
            class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-xs"
          >
            <template v-for="(count, section) in summary.counts" :key="section">
              <dt class="capitalize text-muted-foreground">
                {{ formatDefinitionsSection(String(section)) }}
              </dt>
              <dd class="tabular-nums">{{ count }}</dd>
            </template>
          </dl>
        </div>

        <div v-if="isSingleVhostFile" class="space-y-1.5">
          <Label for="rabbit-import-vhost">Import into virtual host</Label>
          <Select v-model="importVhost">
            <SelectTrigger id="rabbit-import-vhost" class="w-72">
              <SelectValue placeholder="Choose a virtual host" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="vhost in vhosts.data.value ?? []"
                :key="vhost"
                :value="vhost"
              >
                {{ vhost }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <BaseNotice variant="secondary">
          Import merges into the broker: existing objects with the same name are
          updated, nothing is deleted. It needs the "administrator" tag.
        </BaseNotice>

        <Button size="sm" :disabled="!canImport" @click="requestImport">
          <Icon
            :name="
              isImporting
                ? 'hugeicons:loading-03'
                : RABBIT_TAB_ICONS.importDefinitions
            "
            :class="['size-4', isImporting && 'animate-spin']"
          />
          Import definitions
        </Button>
      </template>
    </section>

    <AlertDialog v-model:open="isConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            >Import definitions into {{ connection.name }}?</AlertDialogTitle
          >
          <AlertDialogDescription>
            {{ selectedFile?.name }} will be merged into
            {{
              isSingleVhostFile
                ? `virtual host "${importVhost}"`
                : 'the whole broker'
            }}. Users, permissions, queues and exchanges in the file are created
            or updated. This cannot be undone from OrcaQ.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="runImport">Import</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
