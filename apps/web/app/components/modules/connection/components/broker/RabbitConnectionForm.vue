<script setup lang="ts">
import { Accordion } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';
import {
  BROKER_CONNECTION_STRING_EXAMPLE,
  useBrokerConnectionForm,
} from '../../hooks/useBrokerConnectionForm';
import ConnectionSSHTunnel from '../ConnectionSSHTunnel.vue';
import ConnectionSSLConfig from '../ConnectionSSLConfig.vue';
import BrokerConnectionFormShell from './BrokerConnectionFormShell.vue';
import BrokerPasswordInput from './BrokerPasswordInput.vue';

const props = defineProps<{
  editingConnection: Connection | null;
  workspaceId: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'save', connection: Connection, isEdit: boolean): void;
}>();

const {
  connectionName,
  tagIds,
  formData,
  connectionMethod,
  connectionString,
  connectionStringError,
  isFormValid,
  testStatus,
  testErrorMessage,
  testErrorHint,
  testErrorDetail,
  handleTestConnection,
  handleSave,
} = useBrokerConnectionForm({
  type: DatabaseClientType.RABBITMQ,
  editingConnection: () => props.editingConnection,
  workspaceId: () => props.workspaceId,
  onSave: (connection, isEdit) => emit('save', connection, isEdit),
});
</script>

<template>
  <BrokerConnectionFormShell
    v-model:connection-name="connectionName"
    v-model:tag-ids="tagIds"
    v-model:connection-method="connectionMethod"
    v-model:connection-string="connectionString"
    :connection-string-example="
      BROKER_CONNECTION_STRING_EXAMPLE[DatabaseClientType.RABBITMQ]
    "
    :connection-string-error="connectionStringError"
    title="RabbitMQ Connection"
    description="OrcaQ reads RabbitMQ through the Management HTTP API (plugin rabbitmq_management, port 15672 by default)."
    :is-editing="Boolean(editingConnection)"
    :is-form-valid="isFormValid"
    :test-status="testStatus"
    :error-message="testErrorMessage"
    :error-hint="testErrorHint"
    :error-detail="testErrorDetail"
    @back="emit('back')"
    @test="handleTestConnection"
    @submit="handleSave"
  >
    <div class="grid grid-cols-4 gap-2">
      <div class="col-span-3 space-y-2">
        <Label for="rabbit-host">
          Host <span class="text-destructive">*</span>
        </Label>
        <Input
          id="rabbit-host"
          v-model="formData.host"
          placeholder="localhost"
        />
      </div>
      <div class="space-y-2">
        <Label for="rabbit-port">Management Port</Label>
        <Input id="rabbit-port" v-model="formData.port" placeholder="15672" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-2">
        <Label for="rabbit-user">
          User <span class="text-destructive">*</span>
        </Label>
        <Input
          id="rabbit-user"
          v-model="formData.username"
          placeholder="guest"
        />
      </div>
      <div class="space-y-2">
        <Label for="rabbit-password">Password</Label>
        <BrokerPasswordInput id="rabbit-password" v-model="formData.password" />
      </div>
    </div>

    <div class="space-y-2">
      <Label for="rabbit-vhost">Default Virtual Host</Label>
      <Input id="rabbit-vhost" v-model="formData.vhost" placeholder="/" />
      <p class="text-xs text-muted-foreground">
        Opened first in the browser. You can switch to any virtual host the user
        can read.
      </p>
    </div>

    <template #string-help>
      <p class="text-xs text-muted-foreground">
        The AMQP port is not used: OrcaQ reads the Management API on 15672
        (15671 for amqps). Add <code>?management_port=</code> to change it.
      </p>
    </template>

    <template #network>
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
    </template>
  </BrokerConnectionFormShell>
</template>
