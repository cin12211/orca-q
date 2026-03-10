<script setup lang="ts">
import { Icon } from '#components';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Connection } from '~/core/stores';
import DatabaseTypeCard from './DatabaseTypeCard.vue';
import { databaseSupports } from '../constants';
import { useConnectionForm } from '../hooks/useConnectionForm';
import { ESSLMode, ESSHAuthMethod } from '../types';

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
              @update:value="connectionMethod = $event as any"
              class="w-full"
            >
              <TabsList class="w-full">
                <TabsTrigger value="string" class="cursor-pointer"
                  >Connection String</TabsTrigger
                >
                <TabsTrigger class="cursor-pointer" value="form"
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
                    class="border-2 font-mono text-sm focus-visible:ring-offset-1"
                  />
                  <p class="text-xs text-muted-foreground">
                    Example: {{ getConnectionPlaceholder() }}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="form" class="space-y-5 pt-4">
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

                <Accordion type="single" collapsible class="w-full">
                  <AccordionItem value="ssl">
                    <AccordionTrigger class="py-2 text-sm font-medium">
                      <div class="flex items-center gap-2">
                        <Icon name="lucide:shield-check" class="size-4" />
                        SSL Configuration
                      </div>
                    </AccordionTrigger>
                    <AccordionContent class="space-y-4 pt-2">
                      <div class="flex items-center justify-between">
                        <Label for="ssl-enabled" class="text-sm"
                          >Enable SSL</Label
                        >
                        <Switch
                          id="ssl-enabled"
                          v-model:checked="formData.sslEnabled"
                        />
                      </div>

                      <template v-if="formData.sslEnabled">
                        <div class="space-y-2">
                          <Label for="ssl-mode" class="text-xs">SSL Mode</Label>
                          <Select v-model="formData.sslMode">
                            <SelectTrigger id="ssl-mode" class="h-8">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                v-for="mode in Object.values(ESSLMode)"
                                :key="mode"
                                :value="mode"
                              >
                                {{ mode }}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div class="space-y-2">
                          <Label for="ssl-ca" class="text-xs"
                            >CA Certificate</Label
                          >
                          <Textarea
                            id="ssl-ca"
                            placeholder="-----BEGIN CERTIFICATE-----..."
                            v-model="formData.sslCA"
                            class="min-h-[80px] font-mono text-xs"
                          />
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                          <div class="space-y-2">
                            <Label for="ssl-cert" class="text-xs"
                              >Client Cert</Label
                            >
                            <Textarea
                              id="ssl-cert"
                              v-model="formData.sslCert"
                              class="min-h-[80px] font-mono text-xs"
                            />
                          </div>
                          <div class="space-y-2">
                            <Label for="ssl-key" class="text-xs"
                              >Client Key</Label
                            >
                            <Textarea
                              id="ssl-key"
                              v-model="formData.sslKey"
                              class="min-h-[80px] font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div class="flex items-center justify-between">
                          <Label for="ssl-verify" class="text-xs"
                            >Reject Unauthorized</Label
                          >
                          <Switch
                            id="ssl-verify"
                            v-model:checked="formData.sslRejectUnauthorized"
                          />
                        </div>
                      </template>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ssh">
                    <AccordionTrigger class="py-2 text-sm font-medium">
                      <div class="flex items-center gap-2">
                        <Icon name="lucide:terminal" class="size-4" />
                        SSH Tunnel
                      </div>
                    </AccordionTrigger>
                    <AccordionContent class="space-y-4 pt-2">
                      <div class="flex items-center justify-between">
                        <Label for="ssh-enabled" class="text-sm"
                          >Enable SSH Tunnel</Label
                        >
                        <Switch
                          id="ssh-enabled"
                          v-model:checked="formData.sshEnabled"
                        />
                      </div>

                      <template v-if="formData.sshEnabled">
                        <div class="grid grid-cols-2 gap-2">
                          <div class="space-y-2">
                            <Label for="ssh-host" class="text-xs"
                              >SSH Host</Label
                            >
                            <Input
                              id="ssh-host"
                              placeholder="ssh.example.com"
                              v-model="formData.sshHost"
                              class="h-8"
                            />
                          </div>
                          <div class="space-y-2">
                            <Label for="ssh-port" class="text-xs"
                              >SSH Port</Label
                            >
                            <Input
                              id="ssh-port"
                              type="number"
                              v-model="formData.sshPort"
                              class="h-8"
                            />
                          </div>
                        </div>

                        <div class="space-y-2">
                          <Label for="ssh-user" class="text-xs"
                            >SSH Username</Label
                          >
                          <Input
                            id="ssh-user"
                            v-model="formData.sshUsername"
                            class="h-8"
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="ssh-auth" class="text-xs"
                            >Auth Method</Label
                          >
                          <Select v-model="formData.sshAuthMethod">
                            <SelectTrigger id="ssh-auth" class="h-8">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                v-for="method in Object.values(ESSHAuthMethod)"
                                :key="method"
                                :value="method"
                              >
                                {{ method }}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div
                          v-if="formData.sshAuthMethod === ESSHAuthMethod.PASSWORD"
                          class="space-y-2"
                        >
                          <Label for="ssh-password" class="text-xs"
                            >SSH Password</Label
                          >
                          <Input
                            id="ssh-password"
                            type="password"
                            v-model="formData.sshPassword"
                            class="h-8"
                          />
                        </div>

                        <div v-else class="space-y-2">
                          <Label for="ssh-key" class="text-xs"
                            >Private Key</Label
                          >
                          <Textarea
                            id="ssh-key"
                            placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                            v-model="formData.sshPrivateKey"
                            class="min-h-[100px] font-mono text-xs"
                          />
                        </div>
                      </template>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
              <Button
                variant="secondary"
                @click="handleTestConnection"
                :disabled="testStatus === 'testing' || !isFormValid()"
              >
                <template v-if="testStatus === 'testing'">
                  <Icon
                    name="hugeicons:loading-03"
                    class="mr-2 size-4! animate-spin"
                  />
                  Testing...
                </template>
                <template v-else> Test Connection </template>
              </Button>
              <Button
                @click="handleCreateConnection"
                :disabled="testStatus === 'testing' || !isFormValid()"
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
