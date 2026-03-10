<script setup lang="ts">
import { Icon } from '#components';
import { ArrowLeftIcon, DatabaseIcon } from 'lucide-vue-next';
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
import type { Connection } from '~/core/stores';
import { databaseSupports } from '../constants';
import { useConnectionForm } from '../hooks/useConnectionForm';
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

const {
  step,
  dbType,
  connectionName,
  connectionMethod,
  connectionString,
  formData,
  testStatus,
  handleNext,
  handleBack,
  handleTestConnection,
  handleCreateConnection,
  getDefaultPort,
  getConnectionPlaceholder,
  isFormValid,
  resetForm,
} = useConnectionForm({
  open: props.open,
  editingConnection: props.editingConnection,
  workspaceId: props.workspaceId,
  onAddNew: connection => emit('addNew', connection),
  onUpdate: connection => emit('update', connection),
  onClose: handleClose,
});

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
      class="max-w-[50vw]! w-full h-[50vh]! max-h-[90vh] p-0 flex flex-col overflow-hidden"
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
          <DialogHeader class="p-4">
            <DialogTitle class="text-xl">Connection Details</DialogTitle>
            <DialogDescription>
              Enter the details for your {{ dbType }} database
            </DialogDescription>
          </DialogHeader>

          <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div class="space-y-2">
              <Label for="connection-name" class="flex items-center gap-2">
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
              @update:value="connectionMethod = $event as any"
              class="w-full"
            >
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="string" class="cursor-pointer"
                  >Connection String</TabsTrigger
                >
                <TabsTrigger value="form" class="cursor-pointer"
                  >Connection Form</TabsTrigger
                >
              </TabsList>

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
                    Connection String
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

              <TabsContent value="form" class="space-y-6 pt-4">
                <div class="space-y-4">
                  <!-- Group: Host & Port -->
                  <div class="grid grid-cols-4 gap-4">
                    <div class="col-span-3 space-y-2">
                      <Label for="host">Host</Label>
                      <Input
                        id="host"
                        placeholder="localhost"
                        v-model="formData.host"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label for="port">Port</Label>
                      <Input
                        id="port"
                        :placeholder="getDefaultPort()"
                        v-model="formData.port"
                      />
                    </div>
                  </div>

                  <!-- Group: Authentication -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <Label for="username">User</Label>
                      <Input
                        id="username"
                        placeholder="username"
                        v-model="formData.username"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label for="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        v-model="formData.password"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label for="database">Database</Label>
                    <Input
                      id="database"
                      placeholder="my_database"
                      v-model="formData.database"
                    />
                  </div>
                </div>

                <div class="space-y-4">
                  <Accordion type="single" collapsible class="w-full">
                    <ConnectionSSLConfig :form-data="formData" />
                  </Accordion>

                  <Accordion type="single" collapsible class="w-full">
                    <ConnectionSSHTunnel :form-data="formData" />
                  </Accordion>
                </div>
              </TabsContent>
            </Tabs>

            <ConnectionStatusSection :test-status="testStatus" />
          </div>

          <DialogFooter
            class="p-6 border-t flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-2"
          >
            <div class="flex flex-1 space-x-2">
              <Button variant="ghost" @click="handleBack" size="sm">
                <ArrowLeftIcon class="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            <div class="flex space-x-2">
              <Button
                variant="outline"
                @click="handleTestConnection"
                size="sm"
                :disabled="testStatus === 'testing' || !isFormValid()"
              >
                <Icon
                  v-if="testStatus === 'testing'"
                  name="hugeicons:loading-03"
                  class="mr-2 size-4 animate-spin"
                />
                Test
              </Button>
              <Button
                @click="handleCreateConnection"
                size="sm"
                :disabled="testStatus === 'testing' || !isFormValid()"
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
