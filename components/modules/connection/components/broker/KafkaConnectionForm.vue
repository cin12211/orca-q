<script setup lang="ts">
import { Accordion } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';
import { KAFKA_SASL_MECHANISM_OPTIONS } from '../../constants';
import { useBrokerConnectionForm } from '../../hooks/useBrokerConnectionForm';
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
  needsKafkaCredentials,
  isFormValid,
  testStatus,
  testErrorMessage,
  testErrorHint,
  testErrorDetail,
  handleTestConnection,
  handleSave,
} = useBrokerConnectionForm({
  type: DatabaseClientType.KAFKA,
  editingConnection: () => props.editingConnection,
  workspaceId: () => props.workspaceId,
  onSave: (connection, isEdit) => emit('save', connection, isEdit),
});
</script>

<template>
  <BrokerConnectionFormShell
    v-model:connection-name="connectionName"
    v-model:tag-ids="tagIds"
    title="Apache Kafka Connection"
    description="Connect to Kafka 3.5 or newer (Confluent Platform 7.5+, Redpanda and other Kafka-compatible brokers)."
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
    <div class="space-y-2">
      <Label for="kafka-brokers">
        Bootstrap Servers <span class="text-destructive">*</span>
      </Label>
      <Textarea
        id="kafka-brokers"
        v-model="formData.brokers"
        class="font-mono text-sm min-h-16"
        placeholder="localhost:9092, broker-2:9092"
      />
      <p class="text-xs text-muted-foreground">
        One or more host:port, separated by commas or new lines.
      </p>
    </div>

    <div class="space-y-2">
      <Label for="kafka-sasl">Authentication</Label>
      <Select v-model="formData.saslMechanism">
        <SelectTrigger id="kafka-sasl" class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in KAFKA_SASL_MECHANISM_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="needsKafkaCredentials" class="grid grid-cols-2 gap-2">
      <div class="space-y-2">
        <Label for="kafka-user">
          Username <span class="text-destructive">*</span>
        </Label>
        <Input id="kafka-user" v-model="formData.username" />
      </div>
      <div class="space-y-2">
        <Label for="kafka-password">
          Password <span class="text-destructive">*</span>
        </Label>
        <BrokerPasswordInput id="kafka-password" v-model="formData.password" />
      </div>
    </div>

    <Accordion
      type="single"
      collapsible
      class="w-full border px-4 rounded-lg shadow"
    >
      <ConnectionSSLConfig :form-data="formData" />
    </Accordion>

    <p class="text-xs text-muted-foreground">
      SSH tunnels are not available for Kafka: clients connect to every broker
      address the cluster advertises.
    </p>
  </BrokerConnectionFormShell>
</template>
