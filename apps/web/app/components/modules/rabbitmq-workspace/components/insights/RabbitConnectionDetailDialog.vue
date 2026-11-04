<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BrokerKeyValueTable,
  formatDateTime,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { rabbitmqService } from '../../services';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';

const props = defineProps<{
  connection: Connection;
  connectionName: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const detail = useBrokerRequest(() =>
  props.connectionName
    ? rabbitmqService.connectionDetail(props.connection, props.connectionName)
    : Promise.resolve(null)
);

const data = computed(() => detail.data.value);
const overviewRows = computed(() => {
  const value = data.value;
  if (!value) return {};

  return {
    User: value.user,
    'Virtual host': value.vhost,
    Peer: value.peer,
    Protocol: value.protocol,
    State: value.state,
    'SASL mechanism': value.authMechanism || '-',
    'Heartbeat (s)': value.heartbeatSeconds ?? '-',
    'Frame max': value.frameMax ?? '-',
    'Channel max': value.channelMax ?? '-',
    'Connected at': formatDateTime(value.connectedAt),
    TLS: value.tls ? `${value.tls.protocol} · ${value.tls.cipher}` : 'No',
    ...(value.tls?.peerCertificateSubject
      ? {
          'Peer certificate': value.tls.peerCertificateSubject,
          Issuer: value.tls.peerCertificateIssuer ?? '-',
          Validity: value.tls.peerCertificateValidity ?? '-',
        }
      : {}),
  };
});

watch(open, value => {
  if (value) void detail.load();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="break-all">
          {{ data?.clientName ?? connectionName }}
        </DialogTitle>
        <DialogDescription class="break-all">
          {{ connectionName }}
        </DialogDescription>
      </DialogHeader>

      <BaseNotice v-if="detail.error.value" variant="destructive">
        {{ detail.error.value }}
      </BaseNotice>
      <div v-else class="relative space-y-4 min-h-24">
        <LoadingOverlay :visible="detail.isLoading.value && !data" />
        <RabbitInsightsSectionTitle title="Details" />
        <BrokerKeyValueTable :entries="overviewRows" />
        <RabbitInsightsSectionTitle title="Client properties" />
        <BrokerKeyValueTable :entries="data?.clientProperties ?? {}" />
        <RabbitInsightsSectionTitle
          :title="`Channels (${data?.channelList.length ?? 0})`"
        />
        <BrokerKeyValueTable
          empty-text="No channels."
          :entries="
            Object.fromEntries(
              (data?.channelList ?? []).map(channel => [
                `#${channel.number}`,
                `${channel.mode} · prefetch ${channel.prefetchCount} · unacked ${channel.messagesUnacknowledged} · ${channel.consumerCount} consumers`,
              ])
            )
          "
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
