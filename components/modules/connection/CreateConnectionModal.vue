<script setup lang="ts">
import { computed, reactive, ref, watch, type Ref } from 'vue';
import { ConnectionString as ConnectionStringParser } from 'connection-string';
import dayjs from 'dayjs';
import {
  ArrowLeftIcon,
  CheckIcon,
  DatabaseIcon,
  EllipsisVerticalIcon,
  StickyNoteIcon,
  TagIcon,
  XIcon,
} from 'lucide-vue-next';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { uuidv4 } from '~/lib/utils';
import type {
  BaseDirectConnection,
  SSHTunnelConfig,
  Connection,
  // <-- union đã export ở store
  ConnectionString,
  DirectConnection,
  SSHConnection,
} from '~/shared/services/useConnectionStore';
import ConnectionDerectionForm from './ConnectionDerectionForm.vue';
import ConnectionSSHForm from './ConnectionSSHForm.vue';
import ConnectionStringForm from './ConnectionStringForm.vue';
import DatabaseTypeCard from './DatabaseTypeCard.vue';
import {
  databaseSupports,
  defaultConnectionPort,
  defaultConnectionStringPlaceholder,
  EDatabaseType,
} from './constants';
import { EConnectionMethod } from './type/index';

/** ---------------- Props / Emits ---------------- */
const props = defineProps<{
  open: boolean;
  editingConnection: Connection | null;
  workspaceId: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'addNew', connection: Connection): void;
  (e: 'update', connection: Connection): void;
}>();

/** ---------------- State ---------------- */
type Step = 1 | 2;
const step = ref<Step>(1);

const dbType: Ref<EDatabaseType | null> = ref(null);

const connectionMeta = reactive<{
  name: string;
  method: EConnectionMethod;
  note: string;
  labels: string[];
  readOnlyMode: boolean;
}>({
  labels: [],
  readOnlyMode: false,
  note: '',
  method: EConnectionMethod.ConnectionString,
  name: '',
});

const connectionString = ref<string>('');

const connectionDerection = reactive<BaseDirectConnection>({
  host: '',
  port: '',
  username: '',
  password: '',
  database: '',
  filePath: '',
  ssl: false,
  params: {},
});

const connectionSSHConfig = reactive<SSHTunnelConfig>({
  sshAuth: 'password',
  sshHost: '',
  sshPort: '22',
  sshUser: '',
  sshPassword: '',
  sshPrivateKey: '',
  sshPassphrase: '',
  keepAliveIntervalSec: undefined,
});

/** ---------------- Computed ---------------- */
const defaultPort = computed<string>(() => {
  if (!dbType.value) return '';
  return defaultConnectionPort[dbType.value] ?? '';
});

const placeholderString = computed<string>(() => {
  if (!dbType.value) return '';
  return defaultConnectionStringPlaceholder[dbType.value] ?? '';
});

const isFormValid = computed<boolean>(() => {
  if (!connectionMeta.name?.trim() || !dbType.value) return false;

  if (connectionMeta.method === EConnectionMethod.ConnectionString) {
    return !!connectionString.value.trim();
  }

  const hasHost = !!connectionDerection.host?.trim();
  const hasPort = !!(connectionDerection.port || defaultPort.value);
  return hasHost && hasPort;
});

const cleanedPort = computed<string>(
  () => connectionDerection.port || defaultPort.value || ''
);
const parsedPort = computed<string>(() => {
  const n = Number(cleanedPort.value);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
});

/** ---------------- Test status ---------------- */
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
const testStatus = ref<TestStatus>('idle');
const testError = ref<string>('');

/** ---------------- Helpers ---------------- */
const resetForm = (): void => {
  step.value = 1;
  dbType.value = null;

  connectionMeta.name = '';
  connectionMeta.method = EConnectionMethod.ConnectionString;
  connectionMeta.note = '';
  connectionMeta.labels = [];
  connectionMeta.readOnlyMode = false;

  connectionString.value = '';

  connectionDerection.host = '';
  connectionDerection.port = '';
  connectionDerection.username = '';
  connectionDerection.password = '';
  connectionDerection.database = '';
  connectionDerection.filePath = '';
  connectionDerection.ssl = false;
  connectionDerection.params = {};

  connectionSSHConfig.sshAuth = 'password';
  connectionSSHConfig.sshHost = '';
  connectionSSHConfig.sshPort = '22';
  connectionSSHConfig.sshUser = '';
  connectionSSHConfig.sshPassword = '';
  connectionSSHConfig.sshPrivateKey = '';
  connectionSSHConfig.sshPassphrase = '';
  connectionSSHConfig.keepAliveIntervalSec = undefined;

  testStatus.value = 'idle';
  testError.value = '';
};

const handleNext = (): void => {
  if (step.value === 1 && dbType.value) step.value = 2;
};
const handleBack = (): void => {
  step.value = 1;
  testStatus.value = 'idle';
  testError.value = '';
};
const handleClose = (): void => {
  emit('update:open', false);
  resetForm();
};

/** ---------------- API payload types ---------------- */
type TestBase = {
  type: EDatabaseType | null;
  method: EConnectionMethod;
};

type TestPayload =
  | (TestBase & {
      method: EConnectionMethod.ConnectionString;
      stringConnection: string;
    })
  | (TestBase & {
      method: EConnectionMethod.Direct;
      host: string;
      port: string;
      database?: string;
      username?: string;
      password?: string;
    })
  | (TestBase & {
      method: EConnectionMethod.SSH;
      host: string;
      port: string;
      database?: string;
      username?: string;
      password?: string;
      ssh: SSHTunnelConfig;
    });

/** ---------------- Actions ---------------- */
const handleTestConnection = async (): Promise<boolean> => {
  testStatus.value = 'testing';
  testError.value = '';

  try {
    let body: TestPayload;

    if (connectionMeta.method === EConnectionMethod.ConnectionString) {
      body = {
        type: dbType.value,
        method: EConnectionMethod.ConnectionString,
        stringConnection: connectionString.value.trim(),
      };
    } else if (connectionMeta.method === EConnectionMethod.Direct) {
      body = {
        type: dbType.value,
        method: EConnectionMethod.Direct,
        host: connectionDerection.host.trim(),
        port: parsedPort.value,
        database: connectionDerection.database || undefined,
        username: connectionDerection.username || undefined,
        password: connectionDerection.password || undefined,
      };
    } else {
      body = {
        type: dbType.value,
        method: EConnectionMethod.SSH,
        host: connectionDerection.host.trim(),
        port: parsedPort.value,
        database: connectionDerection.database || undefined,
        username: connectionDerection.username || undefined,
        password: connectionDerection.password || undefined,
        ssh: {
          sshAuth: connectionSSHConfig.sshAuth,
          sshHost: connectionSSHConfig.sshHost,
          sshPort: connectionSSHConfig.sshPort,
          sshUser: connectionSSHConfig.sshUser,
          sshPassword: connectionSSHConfig.sshPassword || undefined,
          sshPrivateKey: connectionSSHConfig.sshPrivateKey || undefined,
          sshPassphrase: connectionSSHConfig.sshPassphrase || undefined,
          keepAliveIntervalSec:
            connectionSSHConfig.keepAliveIntervalSec ?? undefined,
        },
      };
    }

    const result = await $fetch<{
      isConnectedSuccess?: boolean;
      message?: string;
    }>('/api/managment-connection/health-check', { method: 'POST', body });

    if (result?.isConnectedSuccess) {
      testStatus.value = 'success';
      return true;
    }
    testStatus.value = 'error';
    testError.value = result?.message || 'Unknown error';
    return false;
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string };
    testStatus.value = 'error';
    testError.value = e?.data?.message || e?.message || 'Connection failed';
    return false;
  }
};

/** Hỗ trợ parse connection-string có type “an toàn” hơn */
type ParsedConnectionString = {
  hosts?: Array<{ name?: string; host?: string; port?: number } | string>;
  port?: number;
  user?: string;
  password?: string;
  path?: string[];
};

const extractFromConnectionString = (value: string) => {
  const info = new ConnectionStringParser(
    value
  ) as unknown as ParsedConnectionString;

  const hostRaw = info.hosts?.[0];
  const host =
    typeof hostRaw === 'string'
      ? hostRaw
      : (hostRaw?.name ?? hostRaw?.host ?? '');

  const port = info.port ? String(info.port) : '';
  const username = info.user || undefined;
  const password = info.password || undefined;
  const database = info.path?.[0] || undefined;

  return { host, port, username, password, database };
};

const handleCreateConnection = async (): Promise<void> => {
  const isEdit = !!props.editingConnection;

  if (!isEdit) {
    const ok = await handleTestConnection();
    if (!ok) return;
  }

  if (!dbType.value) return; // type guard

  const now = dayjs().toISOString();

  // Base fields chung
  const base = {
    workspaceId: props.workspaceId,
    id: props.editingConnection?.id || uuidv4(),
    name: connectionMeta.name.trim(),
    type: dbType.value,
    method: connectionMeta.method,
    createdAt: props.editingConnection?.createdAt || now,
    updatedAt: now,
    // meta optional
    labels: connectionMeta.labels.length ? connectionMeta.labels : undefined,
    readOnlyMode: connectionMeta.readOnlyMode || undefined,
    note: connectionMeta.note?.trim() ? connectionMeta.note.trim() : undefined,
  } as const;

  let connection: Connection;

  if (connectionMeta.method === EConnectionMethod.ConnectionString) {
    const raw = connectionString.value.trim();
    const parsed = extractFromConnectionString(raw);

    const c: ConnectionString = {
      ...base,
      method: EConnectionMethod.ConnectionString,
      connectionString: raw,
      ...parsed,
    };
    connection = c;
  } else if (connectionMeta.method === EConnectionMethod.Direct) {
    const c: DirectConnection = {
      ...base,
      method: EConnectionMethod.Direct,
      host: connectionDerection.host.trim(),
      port: parsedPort.value,
      username: connectionDerection.username || undefined,
      password: connectionDerection.password || undefined,
      database: connectionDerection.database || undefined,
      filePath: connectionDerection.filePath || undefined,
      ssl: connectionDerection.ssl || undefined,
      params:
        connectionDerection.params &&
        Object.keys(connectionDerection.params).length
          ? connectionDerection.params
          : undefined,
    };
    connection = c;
  } else {
    const c: SSHConnection = {
      ...base,
      method: EConnectionMethod.SSH,
      host: connectionDerection.host.trim(),
      port: parsedPort.value,
      username: connectionDerection.username || undefined,
      password: connectionDerection.password || undefined,
      database: connectionDerection.database || undefined,
      filePath: connectionDerection.filePath || undefined,
      ssl: connectionDerection.ssl || undefined,
      params:
        connectionDerection.params &&
        Object.keys(connectionDerection.params).length
          ? connectionDerection.params
          : undefined,
      ssh: {
        sshAuth: connectionSSHConfig.sshAuth,
        sshHost: connectionSSHConfig.sshHost,
        sshPort: connectionSSHConfig.sshPort,
        sshUser: connectionSSHConfig.sshUser,
        sshPassword: connectionSSHConfig.sshPassword || undefined,
        sshPrivateKey: connectionSSHConfig.sshPrivateKey || undefined,
        sshPassphrase: connectionSSHConfig.sshPassphrase || undefined,
        keepAliveIntervalSec:
          connectionSSHConfig.keepAliveIntervalSec ?? undefined,
      },
    };
    connection = c;
  }

  if (!isEdit) emit('addNew', connection);
  else emit('update', connection);

  handleClose();
};

/** ---------------- Hydrate when open/edit ---------------- */
watch(
  () => [props.open, props.editingConnection],
  () => {
    if (!props.open) return;

    if (props.editingConnection) {
      const currentConnection = props.editingConnection;
      step.value = 2;
      dbType.value = currentConnection.type ?? null;

      connectionMeta.name = currentConnection.name || '';
      connectionMeta.method =
        currentConnection.method || EConnectionMethod.ConnectionString;
      connectionMeta.labels = Array.isArray(currentConnection.labels)
        ? currentConnection.labels
        : [];
      connectionMeta.readOnlyMode = !!currentConnection.readOnlyMode;
      connectionMeta.note = currentConnection.note || '';

      if (currentConnection.method === EConnectionMethod.ConnectionString) {
        connectionString.value = currentConnection.connectionString || '';
        // nếu đã normalize host/port/username... thì cũng fill vào Direct view cho vui
        connectionDerection.host =
          (currentConnection as unknown as DirectConnection).host || '';
        connectionDerection.port =
          (currentConnection as unknown as DirectConnection).port || '';
        connectionDerection.username =
          (currentConnection as unknown as DirectConnection).username || '';
        connectionDerection.password =
          (currentConnection as unknown as DirectConnection).password || '';
        connectionDerection.database =
          (currentConnection as unknown as DirectConnection).database || '';
      } else {
        // Direct / SSH chung
        connectionString.value = '';
        connectionDerection.host =
          (currentConnection as DirectConnection | SSHConnection).host || '';
        connectionDerection.port =
          (currentConnection as DirectConnection | SSHConnection).port || '';
        connectionDerection.username =
          (currentConnection as DirectConnection | SSHConnection).username ||
          '';
        connectionDerection.password =
          (currentConnection as DirectConnection | SSHConnection).password ||
          '';
        connectionDerection.database =
          (currentConnection as DirectConnection | SSHConnection).database ||
          '';

        if (currentConnection.method === EConnectionMethod.SSH) {
          const s = (currentConnection as SSHConnection).ssh;
          connectionSSHConfig.sshAuth = s.sshAuth;
          connectionSSHConfig.sshHost = s.sshHost;
          connectionSSHConfig.sshPort = s.sshPort;
          connectionSSHConfig.sshUser = s.sshUser;
          connectionSSHConfig.sshPassword = s.sshPassword || '';
          connectionSSHConfig.sshPrivateKey = s.sshPrivateKey || '';
          connectionSSHConfig.sshPassphrase = s.sshPassphrase || '';
          connectionSSHConfig.keepAliveIntervalSec = s.keepAliveIntervalSec;
        } else {
          // reset SSH fields khi chuyển qua Direct
          connectionSSHConfig.sshAuth = 'password';
          connectionSSHConfig.sshHost = '';
          connectionSSHConfig.sshPort = '22';
          connectionSSHConfig.sshUser = '';
          connectionSSHConfig.sshPassword = '';
          connectionSSHConfig.sshPrivateKey = '';
          connectionSSHConfig.sshPassphrase = '';
          connectionSSHConfig.keepAliveIntervalSec = undefined;
        }
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

/** ---------------- Database options ---------------- */
type DatabaseOption = {
  type: EDatabaseType;
  name: string;
  icon: any;
  isActive: boolean;
  onClick: () => void;
};

const databaseOptions = computed<DatabaseOption[]>(() =>
  databaseSupports.map(e => ({
    ...e,
    isActive: dbType.value === e.type,
    onClick: () => {
      dbType.value = e.type;
      if (!connectionDerection.port)
        connectionDerection.port = defaultPort.value;
    },
  }))
);
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="max-h-[90vh] w-[95vw]! max-w-[55vw]! overflow-y-auto border p-6"
    >
      <!-- STEP 1 -->
      <template v-if="step === 1">
        <DialogHeader class="mb-4">
          <DialogTitle>Select Database Type</DialogTitle>
          <DialogDescription
            >Choose the type of database you want to connect
            to</DialogDescription
          >
        </DialogHeader>

        <div class="grid grid-cols-5 gap-4 py-6">
          <DatabaseTypeCard
            v-for="option in databaseOptions"
            :key="option.type"
            :name="option.name"
            :icon="option.icon"
            :selected="option.isActive"
            @click="option.onClick"
            iconClass="size-14!"
          />
        </div>

        <DialogFooter class="mt-4">
          <Button variant="outline" @click="handleClose">Cancel</Button>
          <Button :disabled="!dbType" @click="handleNext">Next</Button>
        </DialogFooter>
      </template>

      <!-- STEP 2 -->
      <template v-else>
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl">Connection Details</DialogTitle>
          <DialogDescription
            >Enter the connection details for your
            {{ dbType }} database</DialogDescription
          >
        </DialogHeader>

        <div class="space-y-6">
          <!-- Name -->
          <div class="space-y-2">
            <Label for="connection-name" class="flex items-center gap-2">
              <DatabaseIcon class="h-3.5 w-3.5 text-muted-foreground" />
              Connection Name
            </Label>
            <Input
              id="connection-name"
              placeholder="My Database Connection"
              v-model="connectionMeta.name"
            />
          </div>

          <!-- Meta (labels, read-only, note) -->
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-3 space-y-2">
              <Label class="flex items-center gap-2">
                <TagIcon class="h-3.5 w-3.5 text-muted-foreground" />
                Labels
              </Label>

              <TagsInput v-model="connectionMeta.labels">
                <TagsInputItem
                  v-for="item in connectionMeta.labels"
                  :key="item"
                  :value="item"
                >
                  <TagsInputItemText />
                  <TagsInputItemDelete />
                </TagsInputItem>
                <TagsInputInput placeholder="dev..." />
              </TagsInput>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Switch
              id="readonly"
              v-model:model-value="connectionMeta.readOnlyMode"
            />
            <Label for="readonly" class="flex items-center gap-2">
              <EllipsisVerticalIcon class="h-3.5 w-3.5 text-muted-foreground" />
              Open sessions in read-only mode
            </Label>
          </div>

          <div class="space-y-2">
            <Label class="flex items-center gap-2">
              <StickyNoteIcon class="h-3.5 w-3.5 text-muted-foreground" />
              Notes
            </Label>
            <Textarea
              v-model="connectionMeta.note"
              rows="2"
              placeholder="Short note for teammates…"
              class="resize-y"
            />
          </div>

          <Separator />

          <!-- Method -->
          <Tabs
            :default-value="connectionMeta.method"
            class="w-full"
            @update:value="connectionMeta.method = $event as EConnectionMethod"
          >
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger
                class="cursor-pointer"
                :value="EConnectionMethod.ConnectionString"
                >Connection String</TabsTrigger
              >
              <TabsTrigger
                class="cursor-pointer"
                :value="EConnectionMethod.Direct"
                disabled
                >Direct (Host/Port)</TabsTrigger
              >
              <TabsTrigger
                class="cursor-pointer"
                :value="EConnectionMethod.SSH"
                disabled
                >SSH Tunnel</TabsTrigger
              >
            </TabsList>

            <TabsContent
              :value="EConnectionMethod.ConnectionString"
              class="pt-4 space-y-2"
            >
              <ConnectionStringForm
                :placeholder-string="placeholderString"
                :connection-string="connectionString"
                @update:connection-string="connectionString = $event"
              />
            </TabsContent>

            <TabsContent
              :value="EConnectionMethod.Direct"
              class="pt-4 space-y-5"
            >
              <ConnectionDerectionForm
                :form-data="connectionDerection"
                :defaultPort="defaultPort"
              />
            </TabsContent>

            <TabsContent :value="EConnectionMethod.SSH" class="pt-4 space-y-6">
              <ConnectionSSHForm
                :ssh="connectionSSHConfig"
                :formData="connectionDerection"
                :defaultPort="defaultPort"
              />
            </TabsContent>
          </Tabs>
        </div>

        <div
          v-if="testStatus === 'testing'"
          class="mt-4 flex items-center gap-2 rounded-md border p-3 text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5 animate-spin"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" stroke-opacity=".25" />
            <path d="M22 12a10 10 0 0 1-10 10" />
          </svg>
          <span>Testing connection...</span>
        </div>

        <div
          v-if="testStatus === 'success'"
          class="mt-4 flex items-center gap-2 rounded-md border border-green-2 00 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40"
        >
          <CheckIcon class="shrink-0" />
          <span>Connection successful! Your database is ready to use.</span>
        </div>

        <div
          v-if="testStatus === 'error'"
          class="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40"
        >
          <XIcon class="shrink-0" />
          <span class="break-all"
            >Connection failed.
            {{ testError || 'Please check your details and try again.' }}</span
          >
        </div>

        <!-- Footer -->
        <DialogFooter
          class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-2"
        >
          <div class="flex flex-1 space-x-2">
            <Button variant="outline" @click="handleBack">
              <ArrowLeftIcon class="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="outline" @click="handleClose">Cancel</Button>
          </div>
          <div class="flex space-x-2">
            <Button
              variant="secondary"
              @click="handleTestConnection"
              :disabled="testStatus === 'testing' || !isFormValid"
            >
              <template v-if="testStatus === 'testing'">
                <svg
                  viewBox="0 0 24 24"
                  class="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-opacity=".25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                Testing...
              </template>
              <template v-else>Test Connection</template>
            </Button>
            <Button
              :disabled="testStatus === 'testing' || !isFormValid"
              @click="handleCreateConnection"
            >
              <template v-if="testStatus === 'testing'">
                <svg
                  viewBox="0 0 24 24"
                  class="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-opacity=".25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                Connecting ...
              </template>
              <template v-else
                >{{
                  editingConnection ? 'Update' : 'Create'
                }}
                Connection</template
              >
            </Button>
          </div>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>
