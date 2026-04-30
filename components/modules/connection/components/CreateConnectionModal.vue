<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '#components';
import { EnvTagPicker } from '@/components/modules/environment-tag';
import { Accordion } from '@/components/ui/accordion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';
import {
  databaseSupports,
  isSqlite3ConnectionsEnabled,
  isSqliteConnectionDisabled,
} from '../constants';
import { useConnectionForm } from '../hooks/useConnectionForm';
import { EConnectionMethod, EManagedSqliteProvider } from '../types';
import ConnectionSSHTunnel from './ConnectionSSHTunnel.vue';
import ConnectionSSLConfig from './ConnectionSSLConfig.vue';
import ConnectionStatusSection from './ConnectionStatusSection.vue';
import ConnectionStepType from './ConnectionStepType.vue';

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

const handleClose = () => {
  emit('update:open', false);
  setTimeout(resetForm, 300);
};

const showPassword = ref(false);
const config = useRuntimeConfig();
const sqlite3ConnectionsEnabled = computed(() =>
  isSqlite3ConnectionsEnabled(config.public.sqlite3ConnectionsEnabled)
);

const {
  step,
  dbType,
  connectionName,
  connectionMethod,
  connectionString,
  formData,
  managedSqlite,
  tagIds,
  testStatus,
  testErrorMessage,
  handleNext,
  handleBack,
  handleTestConnection,
  handleCreateConnection,
  getDefaultPort,
  getConnectionPlaceholder,
  availableConnectionMethods,
  structuredTargetLabel,
  structuredTargetPlaceholder,
  canUseNetworkOptions,
  canPickSqliteFile,
  isFormValid,
  pickSqliteFile,
  resetForm,
} = useConnectionForm({
  open: () => props.open,
  editingConnection: () => props.editingConnection,
  workspaceId: () => props.workspaceId,
  onAddNew: connection => emit('addNew', connection),
  onUpdate: connection => emit('update', connection),
  onClose: handleClose,
});

const databaseOptions = computed(() =>
  databaseSupports.map(e => {
    const isSqliteDisabled = isSqliteConnectionDisabled(
      e,
      sqlite3ConnectionsEnabled.value
    );

    return {
      ...e,
      isSupport: isSqliteDisabled ? false : e.isSupport,
      unsupportedLabel: isSqliteDisabled ? 'Disabled' : e.unsupportedLabel,
      isActive: dbType.value === e.type,
      onClick: () => (dbType.value = e.type),
    };
  })
);

const structuredTargetModel = computed({
  get: () =>
    dbType.value === DatabaseClientType.ORACLE
      ? formData.serviceName
      : formData.database,
  set: value => {
    if (dbType.value === DatabaseClientType.ORACLE) {
      formData.serviceName = value;
      return;
    }

    formData.database = value;
  },
});
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="max-w-[60vw]! w-full h-[60vh]! max-h-[90vh] p-0 flex flex-col overflow-hidden"
    >
      <template v-if="step === 1">
        <ConnectionStepType
          :database-options="databaseOptions"
          :db-type="dbType"
          @next="handleNext"
          @close="handleClose"
        />
      </template>

      <template v-else>
        <div class="flex flex-col h-full overflow-hidden">
          <DialogHeader class="p-6 pb-2">
            <DialogTitle>Connection Details</DialogTitle>
            <DialogDescription>
              Enter the details for your {{ dbType }} database
            </DialogDescription>
          </DialogHeader>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <Tabs v-model="connectionMethod" class="w-full">
              <TabsList
                class="grid w-fit"
                :style="{
                  gridTemplateColumns: `repeat(${availableConnectionMethods.length}, minmax(0, 1fr))`,
                }"
                id="tour-connection-method-tabs"
              >
                <TabsTrigger
                  v-for="method in availableConnectionMethods"
                  :key="method"
                  :value="method"
                  class="cursor-pointer"
                >
                  <span
                    v-if="method === EConnectionMethod.STRING"
                    id="tour-connection-string-tab"
                  >
                    Connection String
                  </span>
                  <span
                    v-else-if="method === EConnectionMethod.FORM"
                    id="tour-connection-form-tab"
                  >
                    Connection Form
                  </span>
                  <span v-else-if="method === EConnectionMethod.MANAGED">
                    Managed SQLite
                  </span>
                  <span v-else>Database File</span>
                </TabsTrigger>
              </TabsList>

              <div class="grid grid-cols-3 gap-3 mt-2">
                <div class="col-span-2 space-y-2">
                  <Label for="connection-name" class="flex items-center gap-2">
                    <Icon
                      name="hugeicons:database"
                      class="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Connection Name <span class="text-destructive">*</span>
                  </Label>
                  <Input
                    id="connection-name"
                    placeholder="My Database Connection"
                    v-model="connectionName"
                  />
                </div>

                <div class="col-span-1 space-y-2">
                  <Label class="flex items-center gap-2">
                    <Icon
                      name="hugeicons:tag-01"
                      class="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Environment Tags
                  </Label>
                  <EnvTagPicker v-model="tagIds" />
                </div>
              </div>

              <TabsContent value="string" class="space-y-4 pt-4">
                <div class="space-y-2">
                  <Label
                    for="connection-string"
                    class="flex items-center gap-2"
                  >
                    <Icon
                      name="hugeicons:connect"
                      class="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Connection String <span class="text-destructive">*</span>
                  </Label>
                  <Input
                    id="connection-string"
                    :placeholder="getConnectionPlaceholder()"
                    v-model="connectionString"
                    class="font-mono text-sm"
                  />
                  <p class="text-xs text-muted-foreground">
                    Example: {{ getConnectionPlaceholder() }}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="form" class="space-y-6 pt-2">
                <div class="space-y-4">
                  <!-- Group: Host & Port -->
                  <div class="grid grid-cols-4 gap-2">
                    <div class="col-span-3 space-y-2">
                      <Label for="host"
                        >Host <span class="text-destructive">*</span></Label
                      >
                      <Input
                        id="host"
                        placeholder="localhost"
                        v-model="formData.host"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label for="port"
                        >Port <span class="text-destructive">*</span></Label
                      >
                      <Input
                        id="port"
                        :placeholder="getDefaultPort()"
                        v-model="formData.port"
                      />
                    </div>
                  </div>

                  <!-- Group: Authentication -->
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-2">
                      <Label for="username"
                        >User <span class="text-destructive">*</span></Label
                      >
                      <Input
                        id="username"
                        placeholder="username"
                        v-model="formData.username"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label for="password">Password</Label>
                      <div class="relative">
                        <Input
                          id="password"
                          :type="showPassword ? 'text' : 'password'"
                          placeholder="••••••••"
                          v-model="formData.password"
                          class="pr-8"
                        />
                        <button
                          type="button"
                          class="absolute right-2 top-1/2 h-5 cursor-pointer -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          @click="showPassword = !showPassword"
                          :aria-label="
                            showPassword ? 'Hide password' : 'Show password'
                          "
                        >
                          <Icon
                            :name="
                              showPassword
                                ? 'hugeicons:view'
                                : 'hugeicons:view-off'
                            "
                            class="size-4!"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label for="structured-target"
                      >{{ structuredTargetLabel }}
                      <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="structured-target"
                      :placeholder="structuredTargetPlaceholder"
                      v-model="structuredTargetModel"
                    />
                  </div>
                </div>

                <div v-if="canUseNetworkOptions" class="space-y-4">
                  <Accordion
                    type="single"
                    collapsible
                    class="w-full border px-4 rounded-lg shadow"
                  >
                    <ConnectionSSLConfig :form-data="formData" />
                  </Accordion>

                  <Accordion
                    type="single"
                    collapsible
                    class="w-full border px-4 rounded-lg shadow"
                  >
                    <ConnectionSSHTunnel :form-data="formData" />
                  </Accordion>
                </div>
              </TabsContent>

              <TabsContent value="file" class="space-y-4 pt-4">
                <div class="space-y-2">
                  <Label for="file-path" class="flex items-center gap-2">
                    <Icon
                      name="hugeicons:file-01"
                      class="h-3.5 w-3.5 text-muted-foreground"
                    />
                    SQLite File <span class="text-destructive">*</span>
                  </Label>
                  <div class="flex gap-2">
                    <Input
                      id="file-path"
                      placeholder="/Users/you/data/app.sqlite"
                      v-model="formData.filePath"
                      :readonly="canPickSqliteFile"
                    />
                    <Button
                      v-if="canPickSqliteFile"
                      type="button"
                      variant="outline"
                      @click="pickSqliteFile"
                    >
                      Browse
                    </Button>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    <template v-if="canPickSqliteFile">
                      Choose a local SQLite database file from the desktop app.
                    </template>
                    <template v-else-if="sqlite3ConnectionsEnabled">
                      Enter a SQLite file path that this app runtime can read.
                      In hosted web deployments, this path is on the server.
                    </template>
                    <template v-else>
                      SQLite file connections are disabled in this deployment.
                    </template>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="managed" class="space-y-6 pt-2">
                <div class="space-y-3">
                  <Label>SQLite Provider</Label>
                  <div class="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      :variant="
                        managedSqlite.provider ===
                        EManagedSqliteProvider.CLOUDFLARE_D1
                          ? 'default'
                          : 'outline'
                      "
                      class="justify-start h-auto py-3"
                      @click="
                        managedSqlite.provider =
                          EManagedSqliteProvider.CLOUDFLARE_D1
                      "
                    >
                      <div class="text-left">
                        <div class="font-medium">
                          <Icon
                            name="devicon:cloudflare"
                            class="h-4 w-4 inline-block"
                          />
                          Cloudflare D1
                        </div>
                        <div class="text-xs opacity-80">
                          Remote SQLite over the Cloudflare API
                        </div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      :variant="
                        managedSqlite.provider === EManagedSqliteProvider.TURSO
                          ? 'default'
                          : 'outline'
                      "
                      class="justify-start h-auto py-3"
                      @click="
                        managedSqlite.provider = EManagedSqliteProvider.TURSO
                      "
                    >
                      <div class="text-left">
                        <div class="font-medium">
                          <Icon
                            name="simple-icons:turso"
                            class="text-[#4ff8d2]"
                          />
                          Turso
                        </div>
                        <div class="text-xs opacity-80">
                          libSQL endpoint with optional branch routing
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                <div
                  v-if="
                    managedSqlite.provider ===
                    EManagedSqliteProvider.CLOUDFLARE_D1
                  "
                  class="grid grid-cols-2 gap-3"
                >
                  <div class="space-y-2">
                    <Label for="d1-account-id"
                      >Account ID <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="d1-account-id"
                      v-model="managedSqlite.accountId"
                      placeholder="Cloudflare account ID"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label for="d1-database-id"
                      >Database ID
                      <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="d1-database-id"
                      v-model="managedSqlite.databaseId"
                      placeholder="D1 database ID"
                    />
                  </div>
                  <div class="col-span-2 space-y-2">
                    <Label for="d1-database-name">Database Name</Label>
                    <Input
                      id="d1-database-name"
                      v-model="managedSqlite.databaseName"
                      placeholder="Optional display name"
                    />
                  </div>
                  <div class="col-span-2 space-y-2">
                    <Label for="d1-api-token"
                      >API Token <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="d1-api-token"
                      type="password"
                      v-model="managedSqlite.apiToken"
                      placeholder="Cloudflare API token"
                    />
                  </div>
                </div>

                <div v-else class="grid grid-cols-2 gap-3">
                  <div class="col-span-2 space-y-2">
                    <Label for="turso-url"
                      >Database URL
                      <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="turso-url"
                      v-model="managedSqlite.url"
                      placeholder="libsql://your-db.turso.io"
                      class="font-mono text-sm"
                    />
                  </div>
                  <div class="col-span-2 space-y-2">
                    <Label for="turso-auth-token"
                      >Auth Token <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="turso-auth-token"
                      type="password"
                      v-model="managedSqlite.authToken"
                      placeholder="Turso auth token"
                    />
                  </div>
                  <div class="col-span-2 space-y-2">
                    <Label for="turso-branch-name">Branch</Label>
                    <Input
                      id="turso-branch-name"
                      v-model="managedSqlite.branchName"
                      placeholder="main"
                    />
                  </div>
                </div>

                <p class="text-xs text-muted-foreground">
                  Managed SQLite providers stay on the SQL-family workspace
                  after validation, but use provider-specific transport under
                  the hood.
                </p>
              </TabsContent>
            </Tabs>

            <ConnectionStatusSection
              :test-status="testStatus"
              :error-message="testErrorMessage"
            />
          </div>

          <DialogFooter
            class="p-6 pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-2"
          >
            <div class="flex flex-1 space-x-2">
              <Button variant="outline" @click="handleBack" size="sm">
                <Icon name="hugeicons:arrow-left-02" />
                Back
              </Button>
            </div>
            <div class="flex space-x-2">
              <Button
                variant="outline"
                @click="handleTestConnection"
                size="sm"
                :disabled="testStatus === 'testing' || !isFormValid"
              >
                <Icon
                  v-if="testStatus === 'testing'"
                  name="hugeicons:loading-03"
                  class="mr-2 size-4 animate-spin"
                />
                Test
              </Button>
              <Button
                id="tour-create-update-connection-btn"
                @click="handleCreateConnection"
                size="sm"
                :disabled="testStatus === 'testing' || !isFormValid"
              >
                {{ editingConnection ? 'Update' : 'Create' }}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
