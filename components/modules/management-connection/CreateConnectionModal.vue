<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { Icon } from '#components';
import dayjs from 'dayjs';
import {
  ArrowLeftIcon,
  CheckIcon,
  DatabaseIcon,
  FileTextIcon,
  GlobeIcon,
  HashIcon,
  KeyIcon,
  UserIcon,
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { uuidv4 } from '~/lib/utils';
import type { Connection } from '~/shared/stores';
import DatabaseTypeCard from './DatabaseTypeCard.vue';
import { databaseSupports, EDatabaseType } from './constants';
import { EConnectionMethod } from './type/index';

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

const step = ref<1 | 2>(1);
const dbType = ref<EDatabaseType | null>(EDatabaseType.PG);
const connectionName = ref('');
const connectionMethod = ref<EConnectionMethod>(EConnectionMethod.STRING);
const connectionString = ref('');
const formData = reactive({
  host: '',
  port: '',
  username: '',
  password: '',
  database: '',
});
const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');

const resetForm = () => {
  step.value = 1;
  dbType.value = EDatabaseType.PG;
  connectionName.value = '';
  connectionMethod.value = EConnectionMethod.STRING;
  connectionString.value = '';

  formData.host = '';
  formData.port = '';
  formData.username = '';
  formData.password = '';
  formData.database = '';

  testStatus.value = 'idle';
};

const handleNext = () => {
  if (step.value === 1 && dbType.value) {
    step.value = 2;
  }
};

const handleBack = () => {
  step.value = 1;
  testStatus.value = 'idle';
};

const handleClose = () => {
  emit('update:open', false);
  setTimeout(resetForm, 300);
};

const handleTestConnection = async () => {
  testStatus.value = 'testing';

  const result = await $fetch('/api/managment-connection/health-check', {
    method: 'POST',
    body: {
      stringConnection: connectionString.value,
    },
  });

  if (result.isConnectedSuccess) {
    testStatus.value = 'success';

    return true;
  } else {
    testStatus.value = 'error';

    return false;
  }
};

const handleCreateConnection = async () => {
  const isEdit = props.editingConnection;
  const isCreate = !isEdit;

  if (isCreate) {
    const isConnectedSuccess = await handleTestConnection();

    if (!isConnectedSuccess) {
      return;
    }
  }

  const connection: Connection = {
    workspaceId: props.workspaceId,
    id: props.editingConnection?.id || uuidv4(),
    name: connectionName.value,
    type: dbType.value as EDatabaseType,
    method: connectionMethod.value,
    createdAt: props.editingConnection?.createdAt || dayjs().toISOString(),
  };

  if (connectionMethod.value === 'string') {
    connection.connectionString = connectionString.value;
  } else {
    connection.host = formData.host;
    connection.port = formData.port;
    connection.username = formData.username;
    connection.password = formData.password;
    connection.database = formData.database;
  }

  if (isCreate) {
    emit('addNew', connection);
  } else {
    emit('update', connection);
  }

  handleClose();
};

const getDefaultPort = () => {
  switch (dbType.value) {
    case 'postgres':
      return '5432';
    case 'mysql':
      return '3306';
    // case 'redis':
    //   return '6379';
    default:
      return '';
  }
};

const getConnectionPlaceholder = () => {
  switch (dbType.value) {
    case 'postgres':
      return 'postgresql://username:password@localhost:5432/database';
    case 'mysql':
      return 'mysql://username:password@localhost:3306/database';
    // case 'redis':
    //   return 'redis://username:password@localhost:6379';
    default:
      return '';
  }
};

const isFormValid = () => {
  if (!connectionName.value) return false;

  if (connectionMethod.value === 'string') {
    return !!connectionString.value;
  } else {
    return !!(formData.host && formData.port);
  }
};

// Reset form when modal opens or editing connection changes
watch(
  () => [props.open, props.editingConnection],
  () => {
    if (props.open) {
      if (props.editingConnection) {
        connectionName.value = props.editingConnection.name;
        dbType.value = props.editingConnection.type;
        connectionMethod.value = props.editingConnection.method;
        connectionString.value = props.editingConnection.connectionString || '';

        formData.host = props.editingConnection.host || '';
        formData.port = props.editingConnection.port || '';
        formData.username = props.editingConnection.username || '';
        formData.password = props.editingConnection.password || '';
        formData.database = props.editingConnection.database || '';

        step.value = 2;
      } else {
        resetForm();
      }
    }
  },
  { immediate: true }
);

const databaseOptions = computed(() =>
  databaseSupports.map(e => ({
    ...e,
    isActive: dbType.value === e.type,
    onClick: () => (dbType.value = e.type),
  }))
);
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="max-h-[90vh] max-w-[550px] overflow-y-auto border-2 p-6 sm:max-w-[550px]"
    >
      <template v-if="step === 1">
        <DialogHeader class="mb-4">
          <DialogTitle>Select Database Type</DialogTitle>
          <DialogDescription
            >Choose the type of database you want to connect
            to</DialogDescription
          >
        </DialogHeader>

        <div class="grid grid-cols-3 gap-4 py-6">
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
          <Button variant="outline" @click="handleClose"> Cancel </Button>
          <Button @click="handleNext" :disabled="!dbType"> Next </Button>
        </DialogFooter>
      </template>

      <template v-else>
        <div class="transition-all">
          <DialogHeader class="mb-4">
            <DialogTitle class="text-xl">Connection Details</DialogTitle>
            <DialogDescription
              >Enter the connection details for your
              {{ dbType }} database</DialogDescription
            >
          </DialogHeader>

          <div class="space-y-5 py-4">
            <div class="space-y-2">
              <Label for="connection-name">
                <DatabaseIcon class="h-3.5 w-3.5 text-muted-foreground" />
                Connection Name
              </Label>
              <Input
                id="connection-name"
                placeholder="My Database Connection"
                v-model="connectionName"
              />
            </div>

            <Tabs
              :default-value="connectionMethod"
              @update:value="connectionMethod = $event"
              class="w-full"
            >
              <!-- <TabsList class="w-full">
                <TabsTrigger value="string" class="cursor-pointer"
                  >Connection String</TabsTrigger
                >
                <TabsTrigger class="cursor-pointer" value="form"
                  >Connection Form</TabsTrigger
                >
              </TabsList> -->
              <!-- TODO: open this when support form -->
              <TabsContent value="string" class="space-y-4 pt-0">
                <div class="space-y-2">
                  <Label
                    for="connection-string"
                    class="flex items-center gap-2"
                  >
                    <Icon
                      name="hugeicons:connect"
                      class="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Connection String
                  </Label>
                  <Input
                    id="connection-string"
                    :placeholder="getConnectionPlaceholder()"
                    v-model="connectionString"
                    class="border-2 font-mono text-sm focus-visible:ring-offset-1"
                  />
                  <p class="text-xs text-muted-foreground">
                    Example: {{ getConnectionPlaceholder() }}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="form" class="space-y-5 pt-0">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="host" class="flex items-center gap-2">
                      <GlobeIcon class="h-3.5 w-3.5 text-muted-foreground" />
                      Host
                    </Label>
                    <Input
                      id="host"
                      placeholder="localhost"
                      v-model="formData.host"
                      class="border-2 focus-visible:ring-offset-1"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label for="port" class="flex items-center gap-2">
                      <HashIcon class="h-3.5 w-3.5 text-muted-foreground" />
                      Port
                    </Label>
                    <Input
                      id="port"
                      :placeholder="getDefaultPort()"
                      v-model="formData.port"
                      class="border-2 focus-visible:ring-offset-1"
                    />
                  </div>
                </div>
                <div class="space-y-2">
                  <Label for="username" class="flex items-center gap-2">
                    <UserIcon class="h-3.5 w-3.5 text-muted-foreground" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="username"
                    v-model="formData.username"
                    class="border-2 focus-visible:ring-offset-1"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="password" class="flex items-center gap-2">
                    <KeyIcon class="h-3.5 w-3.5 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    v-model="formData.password"
                    class="border-2 focus-visible:ring-offset-1"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="database" class="flex items-center gap-2">
                    <FileTextIcon class="h-3.5 w-3.5 text-muted-foreground" />
                    Database Name
                  </Label>
                  <Input
                    id="database"
                    placeholder="my_database"
                    v-model="formData.database"
                    class="border-2 focus-visible:ring-offset-1"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div
            v-if="testStatus === 'testing'"
            class="flex items-center gap-2 rounded-md border-2 p-3 text-sm"
          >
            <Icon name="hugeicons:loading-03" class="animate-spin size-5!" />
            <span>Testing connection...</span>
          </div>

          <div
            v-if="testStatus === 'success'"
            class="flex items-center gap-2 rounded-md border-2 border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400"
          >
            <CheckIcon class="shrink-0" />
            <span>Connection successful! Your database is ready to use.</span>
          </div>
          <div
            v-if="testStatus === 'error'"
            class="flex items-center gap-2 rounded-md border-2 border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
          >
            <XIcon class="shrink-0" />
            <span
              >Connection failed. Please check your details and try again.</span
            >
          </div>

          <DialogFooter
            class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-2"
          >
            <div class="flex flex-1 space-x-2">
              <Button variant="outline" @click="handleBack">
                <ArrowLeftIcon class="h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" @click="handleClose"> Cancel </Button>
            </div>
            <div class="flex space-x-2">
              <!-- <Button
                variant="secondary"
                @click="handleTestConnection"
                :disabled="testStatus === 'testing' || !isFormValid()"
              >
                <template v-if="testStatus === 'testing'">
                  <Loader2Icon class="h-4 w-4 animate-spin" />
                  Testing...
                </template>
                <template v-else> Test Connection </template>
              </Button> -->
              <Button
                @click="handleCreateConnection"
                :disabled="testStatus === 'testing'"
              >
                <template v-if="testStatus === 'testing'">
                  <Icon
                    name="hugeicons:loading-03"
                    class="animate-spin size-4!"
                  />
                  Connecting ...
                </template>
                <template v-else>
                  {{ editingConnection ? 'Update' : 'Create' }} Connection
                </template>
              </Button>
            </div>
          </DialogFooter>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
