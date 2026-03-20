<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '#components';
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

const showPassword = ref(false);

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
  open: () => props.open,
  editingConnection: () => props.editingConnection,
  workspaceId: () => props.workspaceId,
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
      class="max-w-[50vw]! w-full h-[60vh]! max-h-[90vh] p-0 flex flex-col overflow-hidden"
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
                class="grid w-fit grid-cols-2"
                id="tour-connection-method-tabs"
              >
                <TabsTrigger value="string" class="cursor-pointer">
                  <span id="tour-connection-string-tab">
                    Connection String
                  </span>
                </TabsTrigger>
                <TabsTrigger value="form" class="cursor-pointer">
                  <span id="tour-connection-form-tab"> Connection Form </span>
                </TabsTrigger>
              </TabsList>

              <div class="space-y-2 mt-2">
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
                    <Label for="database"
                      >Database <span class="text-destructive">*</span></Label
                    >
                    <Input
                      id="database"
                      placeholder="my_database"
                      v-model="formData.database"
                    />
                  </div>
                </div>

                <div class="space-y-4">
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
            </Tabs>

            <ConnectionStatusSection :test-status="testStatus" />
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
